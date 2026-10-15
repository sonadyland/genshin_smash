import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { inspectAssets } from './upload-art.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function moduleLoader(globals = {}, base = '/', assetBase = '') {
  const context = vm.createContext({ console, Buffer, process, Uint8ClampedArray, URL, ...globals });
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    if (filename.endsWith('.json')) return { __esModule: true, default: JSON.parse(fs.readFileSync(filename, 'utf8')) };
    const source = fs.readFileSync(filename, 'utf8')
      .replaceAll('import.meta.env.BASE_URL', JSON.stringify(base))
      .replaceAll('import.meta.env.VITE_GAME_ASSET_BASE_URL', JSON.stringify(assetBase));
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const mod = { exports: {} }; modules.set(filename, mod);
    vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename })(mod.exports, specifier =>
      specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), specifier.endsWith('.json') ? specifier : `${specifier}.ts`)) : require(specifier), mod);
    return mod.exports;
  }
  return load;
}
const { fingerprintArtAssets, publicAssetCache } = moduleLoader()(path.join(root, 'build/public-asset-cache.ts'));
const { createArtCatalog } = moduleLoader()(path.join(root, 'build/art-inventory.ts'));
const shipped = fingerprintArtAssets(path.join(root, 'public'));
const cases = [];
const test = (name, run) => cases.push({ name, run });
const emittedBytes = (logical, source) => path.extname(logical).toLowerCase() === '.json'
  ? Buffer.from(source.toString('utf8').replace(/\r\n/g, '\n')) : source;

function productionCatalog() {
  return JSON.parse(publicAssetCache().config({ root }, { command: 'build' }).define.__GAME_ART_CATALOG__);
}

test('every production art URL hashes the exact emitted bytes, with JSON line endings normalized', () => {
  assert.ok(Object.keys(shipped.urls).length > 100);
  for (const [logical, output] of Object.entries(shipped.urls)) {
    const source = emittedBytes(logical, fs.readFileSync(path.join(root, 'public/assets', logical)));
    assert.equal(output, `assets/cache/${createHash('sha256').update(source).digest('hex')}${path.extname(logical)}`);
    assert.ok(shipped.files.get(output).equals(source));
  }
  assert.ok(!Object.keys(shipped.urls).some(name => /^(audio|previews)\//.test(name)));
  assert.ok(!Object.keys(shipped.urls).some(name => name.endsWith('.md')));
});

test('LF and CRLF checkouts emit identical hashes, JSON bytes and download sizes without changing images', async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-art-newlines-'));
  try {
    const publicDirectory = path.join(fixture, 'public');
    const assetDirectory = path.join(publicDirectory, 'assets');
    const ids = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja', 'corrin'];
    const packs = Object.fromEntries(ids.map(id => [id, `${id}-fixture`]));
    const jsonFiles = new Map();
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0xff, 0x00]);
    function write(logical, bytes) {
      const filename = path.join(assetDirectory, logical);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, bytes);
      if (logical.endsWith('.json')) jsonFiles.set(filename, bytes);
    }
    fs.mkdirSync(path.join(fixture, 'src/game'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'src/game/animation-packs.json'), JSON.stringify(packs));
    fs.writeFileSync(path.join(fixture, 'src/game/summoner-art-manifest.json'), '{"assets":{}}');
    for (const id of ids) {
      write(`lobby/${id}.webp`, image);
      write(`animations/${packs[id]}/idle.png`, image);
      write(`animations/${packs[id]}/manifest.json`, JSON.stringify({ character: id,
        clips: { idle: { image: 'idle.png', frames: [] } } }, null, 2) + '\n');
    }
    for (const logical of ['lobby/liyue-dawn.webp', 'effects/elemental-bursts-v3.png',
      'effects/secondary-effects-v1.png', 'effects/xiao-plunge-v3.png']) write(logical, image);
    for (const logical of ['effects/secondary-effects-v1.json', 'effects/xiao-plunge-v3.json']) {
      write(logical, '{\n  "label": "中文",\n  "frame": 1\n}\n');
    }
    function build() {
      const plugin = publicAssetCache();
      const config = plugin.config({ root: fixture }, { command: 'build' });
      const files = new Map();
      plugin.generateBundle.call({ emitFile: file => files.set(file.fileName, file.source) });
      return { urls: JSON.parse(config.define.__GAME_ART_URLS__),
        catalog: JSON.parse(config.define.__GAME_ART_CATALOG__), files };
    }
    const lf = build();
    for (const [filename, source] of jsonFiles) fs.writeFileSync(filename, source.replaceAll('\n', '\r\n'));
    const crlf = build();
    assert.deepEqual(crlf.urls, lf.urls);
    assert.deepEqual(crlf.catalog, lf.catalog);
    for (const [logical, output] of Object.entries(crlf.urls)) {
      const bytes = crlf.files.get(output);
      assert.ok(bytes.equals(lf.files.get(output)), logical);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), path.basename(output).split('.')[0]);
      assert.equal(crlf.catalog.sizes[logical], bytes.length, 'catalog must match actual download bytes');
      if (logical.endsWith('.json')) assert.ok(!bytes.includes(Buffer.from('\r\n')), logical);
      else assert.ok(bytes.equals(image), 'binary image CRLF and invalid UTF-8 bytes must stay unchanged');
    }
    const dev = JSON.parse(publicAssetCache().config({ root: fixture }, { command: 'serve' }).define.__GAME_ART_CATALOG__);
    for (const [filename, source] of jsonFiles) {
      const logical = path.relative(assetDirectory, filename).replaceAll('\\', '/');
      assert.equal(fs.readFileSync(filename, 'utf8'), source.replaceAll('\n', '\r\n'), 'build must not rewrite source art');
      assert.equal(dev.sizes[logical], fs.statSync(filename).size, 'dev downloads original CRLF files');
      assert.ok(dev.sizes[logical] > crlf.catalog.sizes[logical]);
    }
    const cacheDirectory = path.join(fixture, 'emitted-cache');
    fs.mkdirSync(cacheDirectory);
    for (const [output, bytes] of crlf.files) fs.writeFileSync(path.join(cacheDirectory, path.basename(output)), bytes);
    const inspected = await inspectAssets(cacheDirectory);
    assert.equal(inspected.count, crlf.files.size);
    assert.equal(inspected.bytes, [...crlf.files.values()].reduce((total, bytes) => total + bytes.length, 0));
    // Exercise the real loader's strict byte-count check against built files.
    const loaderModule = { exports: {} };
    const loaderCode = ts.transpileModule(fs.readFileSync(path.join(root, 'src/game/asset-loading.ts'), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(`(function(exports, require, module) { ${loaderCode}\n})`,
      { console, setTimeout, clearTimeout, queueMicrotask, AbortController, Error })(loaderModule.exports, specifier => {
      const dependencies = { './asset-catalog': { ART_CATALOG: crlf.catalog },
        './art-url-session': { onArtUrlsChanged: () => {} },
        './asset-url': { assetUrl: logical => crlf.urls[logical] }, './art': {} };
      assert.ok(dependencies[specifier], specifier);
      return dependencies[specifier];
    }, loaderModule);
    const downloads = [];
    const loader = loaderModule.exports.createAssetLoading(crlf.catalog, {
      resolveUrl: logical => crlf.urls[logical],
      fetch: async url => { downloads.push(url); return new Response(crlf.files.get(url)); },
      decodeHome: async () => {},
      acquireArt: () => ({ ready: Promise.resolve(), release() {} }),
    });
    const preparation = loader.prepareBattle(ids);
    await preparation.ready;
    assert.equal(preparation.getSnapshot().phase, 'ready');
    assert.ok(downloads.some(url => url.endsWith('.json')), 'real loader must validate normalized JSON downloads');
    preparation.release();
    const changedPath = 'effects/secondary-effects-v1.json';
    const changedFile = path.join(assetDirectory, changedPath);
    fs.writeFileSync(changedFile, fs.readFileSync(changedFile, 'utf8').replace('"frame": 1', '"frame": 2'));
    const changed = build();
    assert.notEqual(changed.urls[changedPath], crlf.urls[changedPath]);
    for (const logical of Object.keys(crlf.urls).filter(logical => logical !== changedPath)) {
      assert.equal(changed.urls[logical], crlf.urls[logical], logical);
    }
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test('one changed image invalidates only itself; repeat/restore retain URLs and duplicate bytes share output', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-art-cache-'));
  try {
    const directory = path.join(fixture, 'assets/animations'); fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'run.png'), 'original-image');
    fs.writeFileSync(path.join(directory, 'idle.png'), 'original-image');
    fs.writeFileSync(path.join(directory, 'manifest.json'), '{"image":"run.png"}');
    const original = fingerprintArtAssets(fixture);
    assert.deepEqual(fingerprintArtAssets(fixture).urls, original.urls);
    assert.equal(original.files.size, 2);
    fs.writeFileSync(path.join(directory, 'run.png'), 'updated-image');
    const changed = fingerprintArtAssets(fixture);
    assert.notEqual(changed.urls['animations/run.png'], original.urls['animations/run.png']);
    assert.equal(changed.urls['animations/idle.png'], original.urls['animations/idle.png']);
    assert.equal(changed.urls['animations/manifest.json'], original.urls['animations/manifest.json']);
    fs.writeFileSync(path.join(directory, 'run.png'), 'original-image');
    assert.deepEqual(fingerprintArtAssets(fixture).urls, original.urls);
    fs.mkdirSync(path.join(fixture, 'assets/cache'));
    assert.throws(() => fingerprintArtAssets(fixture), /reserved/);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test('URL resolver respects root, relative, subpath and CDN bases, with unhashed dev fallback', () => {
  const logical = 'characters/eula-v2.png';
  for (const base of ['/', './', '/games/smash/', 'https://cdn.example.test/smash/']) {
    const { assetUrl } = moduleLoader({ __GAME_ART_URLS__: shipped.urls }, base)(path.join(root, 'src/game/asset-url.ts'));
    assert.equal(assetUrl(logical), `${base}${shipped.urls[logical]}`);
    assert.equal(assetUrl('audio/music.json'), `${base}assets/audio/music.json`);
    const dev = moduleLoader({}, base)(path.join(root, 'src/game/asset-url.ts'));
    assert.equal(dev.assetUrl(logical), `${base}assets/${logical}`);
  }
});

test('runtime art host overrides build-time host and normalizes its optional prefix without changing app base', () => {
  const logical = 'characters/eula-v2.png';
  const resolve = (runtime, build = '', hashed = true) => moduleLoader({
    ...(hashed ? { __GAME_ART_URLS__: shipped.urls } : {}),
    ...(runtime === undefined ? {} : { __GAME_RUNTIME_CONFIG__: { artAssetBaseUrl: runtime } }),
  }, '/game/', build)(path.join(root, 'src/game/asset-url.ts')).assetUrl;
  for (const configured of ['https://art.example.test', ' https://art.example.test/ ', 'https://art.example.test///']) {
    assert.equal(resolve(configured, 'https://build.example.test')(logical), `https://art.example.test/${shipped.urls[logical]}`);
  }
  assert.equal(resolve('https://art.example.test/releases/v1///')(logical), `https://art.example.test/releases/v1/${shipped.urls[logical]}`);
  assert.equal(resolve('http://localhost:0/art-prefix///')(logical), `http://localhost:0/art-prefix/${shipped.urls[logical]}`);
  for (const runtime of [undefined, '', '   ']) {
    assert.equal(resolve(runtime, ' https://build.example.test/dev/// ')(logical), `https://build.example.test/dev/${shipped.urls[logical]}`);
    assert.equal(resolve(runtime, '  ')(logical), `/game/${shipped.urls[logical]}`);
  }
  assert.equal(resolve('', 'https://dev.example.test/art', false)(logical), `https://dev.example.test/art/assets/${logical}`);
  for (const invalid of ['/relative/art', '//art.example.test', 'ftp://art.example.test', 'https://user:secret@art.example.test',
    'https://art.example.test?query', 'https://art.example.test/#fragment', 'https://art.example.test/path with space',
    'https://art.example.test/"injection', 'https://art.example.test/\\path', 'https://art.example.test:65536']) {
    assert.throws(() => resolve(invalid), /Invalid artwork asset base URL/);
    assert.throws(() => resolve('', invalid), /Invalid artwork asset base URL/);
  }
});

test('default runtime configuration is empty and its classic script blocks before the app module', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'public/runtime-config.js'), 'utf8'), context);
  assert.equal(context.__GAME_RUNTIME_CONFIG__.artAssetBaseUrl, '');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(match => match[1]);
  const runtimeIndex = scripts.findIndex(attributes => /src="\/runtime-config\.js"/.test(attributes));
  const moduleIndex = scripts.findIndex(attributes => /type="module"/.test(attributes));
  assert.ok(runtimeIndex >= 0 && moduleIndex > runtimeIndex);
  assert.ok(!/\b(async|defer|type)\b/.test(scripts[runtimeIndex]), 'runtime configuration must execute before module initialization');
});

test('build plugin defines independent URL map and emits each unique file through the asset API', () => {
  const plugin = publicAssetCache();
  const config = plugin.config({ root }, { command: 'build' });
  assert.deepEqual(JSON.parse(config.define.__GAME_ART_URLS__), JSON.parse(JSON.stringify(shipped.urls)));
  const catalog = createArtCatalog(root, path.join(root, 'public'));
  for (const logical of Object.keys(catalog.sizes)) catalog.sizes[logical] = shipped.files.get(shipped.urls[logical]).length;
  assert.deepEqual(JSON.parse(config.define.__GAME_ART_CATALOG__), JSON.parse(JSON.stringify(catalog)));
  const emitted = [];
  plugin.generateBundle.call({ emitFile: file => emitted.push(file) });
  assert.equal(emitted.length, shipped.files.size);
  for (const file of emitted) {
    assert.equal(file.type, 'asset');
    assert.ok(shipped.files.get(file.fileName).equals(file.source));
  }
});

test('development exposes the same live catalog but retains editable logical URLs', () => {
  const plugin = publicAssetCache();
  const config = plugin.config({ root }, { command: 'serve' });
  assert.deepEqual(JSON.parse(config.define.__GAME_ART_URLS__), {});
  const catalog = JSON.parse(config.define.__GAME_ART_CATALOG__);
  assert.equal(catalog.home.length, 10);
  assert.deepEqual(Object.keys(catalog.characters), ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja', 'corrin']);
  const exported = moduleLoader({ __GAME_ART_CATALOG__: catalog })(path.join(root, 'src/game/asset-catalog.ts'));
  assert.deepEqual(exported.ART_CATALOG, catalog);
  const none = publicAssetCache().config({ root, publicDir: false }, { command: 'build' });
  assert.deepEqual(JSON.parse(none.define.__GAME_ART_CATALOG__), { home: [], shared: [], characters: {}, sizes: {} });
});

test('queue inventory uses emitted bytes and contains complete active packs without legacy/review art', () => {
  const catalog = productionCatalog();
  const paths = [...new Set([...catalog.home, ...catalog.shared, ...Object.values(catalog.characters).flat()])];
  assert.deepEqual(Object.keys(catalog.sizes).sort(), paths.sort());
  for (const logical of paths) {
    assert.equal(catalog.sizes[logical], shipped.files.get(shipped.urls[logical]).length, logical);
    assert.ok(shipped.urls[logical], logical);
    assert.ok(!/actions-v3|secondary-v1|preview|characters\//.test(logical), logical);
  }
  assert.ok(catalog.home.every(logical => logical.startsWith('lobby/') && logical.endsWith('.webp')));
  assert.ok(catalog.home.reduce((total, logical) => total + catalog.sizes[logical], 0) < 2 * 1024 * 1024, 'display-sized lobby stays under 2 MiB');
  assert.ok(catalog.shared.includes('lobby/liyue-dawn.webp'));
  assert.ok(catalog.characters.xiao.includes('effects/xiao-plunge-v3.json'));
  const packs = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
  for (const [id, directory] of Object.entries(packs)) {
    assert.ok(catalog.characters[id].includes(`lobby/${id}.webp`));
    assert.ok(catalog.characters[id].includes(`animations/${directory}/manifest.json`));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations', directory, 'manifest.json'), 'utf8'));
    for (const clip of [...Object.values(manifest.clips), ...Object.values(manifest.variants ?? {})]) {
      for (const image of [clip.image, ...(clip.sheets ?? []).map(sheet => sheet.image), ...clip.frames.filter(frame => frame.image).map(frame => frame.image)].filter(Boolean)) {
        assert.ok(catalog.characters[id].includes(`animations/${directory}/${image}`), `${id}: ${image}`);
      }
    }
  }
  const summons = JSON.parse(fs.readFileSync(path.join(root, 'src/game/summoner-art-manifest.json'), 'utf8'));
  for (const asset of Object.values(summons.assets)) assert.ok(catalog.characters[asset.owner].includes(`animations/${asset.image}`));
});

function imageDimensions(bytes) {
  if (bytes.toString('ascii', 1, 4) === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), data = offset + 8;
    if (type === 'VP8X') return [1 + bytes.readUIntLE(data + 4, 3), 1 + bytes.readUIntLE(data + 7, 3)];
    if (type === 'VP8 ') return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    if (type === 'VP8L') { const bits = bytes.readUInt32LE(data + 1); return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)]; }
    offset = data + size + (size % 2);
  }
  throw new Error('WebP image dimensions missing');
}

function artHarness(reject = () => false, base = '/', runtimeBase) {
  const images = [], fetched = [];
  const artBase = runtimeBase ?? base;
  let pixelReads = 0;
  const getBytes = url => {
    assert.ok(url.startsWith(`${artBase}assets/cache/`), `unfingerprinted runtime artwork: ${url}`);
    const bytes = shipped.files.get(url.slice(artBase.length));
    assert.ok(bytes, `unemitted runtime artwork: ${url}`);
    return bytes;
  };
  class Image {
    _src = ''; naturalWidth = 0; naturalHeight = 0;
    set src(value) {
      assert.equal(this.crossOrigin, 'anonymous', `CORS must be selected before requesting ${value}`);
      this._src = value;
    }
    get src() { return this._src; }
    async decode() {
      images.push(this.src);
      const bytes = getBytes(this.src);
      [this.naturalWidth, this.naturalHeight] = imageDimensions(bytes);
    }
  }
  const noop = () => undefined;
  const createCanvas = () => {
    let image;
    const draw = new Proxy({}, { get: (_target, key) => {
      if (key === 'drawImage') return value => { image = value; };
      if (key === 'getImageData') return () => {
        assert.equal(image.crossOrigin, 'anonymous', 'canvas pixel reads require CORS-enabled images');
        pixelReads++;
        return { data: new Uint8ClampedArray(0) };
      };
      return noop;
    } });
    return { width: 0, height: 0, getContext: () => draw };
  };
  const load = moduleLoader({ __GAME_ART_URLS__: shipped.urls, Image,
    ...(runtimeBase ? { __GAME_RUNTIME_CONFIG__: { artAssetBaseUrl: runtimeBase } } : {}),
    fetch: async url => { fetched.push(url); return { ok: !reject(url), json: async () => JSON.parse(getBytes(url).toString()) }; },
    document: { createElement: createCanvas },
  }, base);
  return { art: load(path.join(root, 'src/game/art.ts')), images, fetched, get pixelReads() { return pixelReads; } };
}

test('all nine production packs, multi-sheet frames, summons and legacy registrations load via independent hashes', async () => {
  const packs = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
  const h = artHarness();
  const lease = h.art.acquireGameArt(Object.keys(packs), { legacy: true }); await lease.ready;
  for (const [id, directory] of Object.entries(packs)) {
    assert.equal(h.art.getCharacterAnimationStatus(id).status, 'ready', id);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations', directory, 'manifest.json'), 'utf8'));
    for (const clip of [...Object.values(manifest.clips), ...Object.values(manifest.variants ?? {})]) {
      for (const image of [clip.image, ...(clip.sheets ?? []).map(sheet => sheet.image), ...clip.frames.filter(frame => frame.image).map(frame => frame.image)].filter(Boolean)) {
        assert.ok(h.images.includes(`/${shipped.urls[`animations/${directory}/${image}`]}`), `${id}: ${image}`);
      }
    }
  }
  const summons = JSON.parse(fs.readFileSync(path.join(root, 'src/game/summoner-art-manifest.json'), 'utf8'));
  for (const asset of Object.values(summons.assets)) assert.ok(h.images.includes(`/${shipped.urls[`animations/${asset.image}`]}`));
  for (const id of ['raiden', 'jean', 'eula', 'diluc', 'xiao']) {
    for (const suffix of ['actions-v3', 'secondary-v1']) assert.ok(h.fetched.includes(`/${shipped.urls[`animations/${id}-${suffix}.json`]}`));
  }
  for (const name of ['secondary-effects-v1', 'xiao-plunge-v3']) assert.ok(h.fetched.includes(`/${shipped.urls[`effects/${name}.json`]}`));
  lease.release();
  assert.equal(h.art.getCharacterAnimationStatus('furina').status, 'loading', 'leases still release decoded art');
});

test('missing hashed pack retains legacy fallback, including under subpath base', async () => {
  const base = '/games/smash/';
  const packs = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
  const missing = `${base}${shipped.urls[`animations/${packs.eula}/manifest.json`]}`;
  const h = artHarness(url => url === missing, base);
  const lease = h.art.acquireGameArt(['eula']); await lease.ready;
  assert.equal(h.art.getCharacterAnimationStatus('eula').status, 'fallback');
  for (const suffix of ['actions-v3', 'secondary-v1']) {
    assert.ok(h.images.includes(`${base}${shipped.urls[`animations/eula-${suffix}.png`]}`));
    assert.ok(h.fetched.includes(`${base}${shipped.urls[`animations/eula-${suffix}.json`]}`));
  }
  lease.release();
});

test('runtime CDN prefix loads every actor, summon and JSON while portraits remain readable by canvas', async () => {
  const base = 'https://art.example.test/release-2026/';
  const packs = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
  const h = artHarness(undefined, '/game/', base);
  const lease = h.art.acquireGameArt(Object.keys(packs), { legacy: true, strict: true });
  await lease.ready;
  for (const id of Object.keys(packs)) assert.equal(h.art.getCharacterAnimationStatus(id).status, 'ready', id);
  assert.equal(h.pixelReads, Object.keys(packs).length, 'every portrait completed its transparent-pixel bounds scan');
  assert.ok(h.images.length > 100);
  assert.ok(h.fetched.length > Object.keys(packs).length);
  assert.ok([...h.images, ...h.fetched].every(url => url.startsWith(`${base}assets/cache/`)));
  lease.release();
});

let failures = 0;
for (const { name, run } of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} asset cache regression checks passed.`);
process.exitCode = failures ? 1 : 0;
