import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function moduleLoader(globals = {}, base = '/') {
  const context = vm.createContext({ console, Buffer, process, Uint8ClampedArray, ...globals });
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    if (filename.endsWith('.json')) return { __esModule: true, default: JSON.parse(fs.readFileSync(filename, 'utf8')) };
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify(base));
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

test('every production art URL is its exact SHA-256, with music/previews excluded', () => {
  assert.ok(Object.keys(shipped.urls).length > 100);
  for (const [logical, output] of Object.entries(shipped.urls)) {
    const source = fs.readFileSync(path.join(root, 'public/assets', logical));
    assert.equal(output, `assets/cache/${createHash('sha256').update(source).digest('hex')}${path.extname(logical)}`);
    assert.ok(shipped.files.get(output).equals(source));
  }
  assert.ok(!Object.keys(shipped.urls).some(name => /^(audio|previews)\//.test(name)));
  assert.ok(!Object.keys(shipped.urls).some(name => name.endsWith('.md')));
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

test('build plugin defines independent URL map and emits each unique file through the asset API', () => {
  const plugin = publicAssetCache();
  const config = plugin.config({ root }, { command: 'build' });
  assert.deepEqual(JSON.parse(config.define.__GAME_ART_URLS__), JSON.parse(JSON.stringify(shipped.urls)));
  assert.deepEqual(JSON.parse(config.define.__GAME_ART_CATALOG__), JSON.parse(JSON.stringify(createArtCatalog(root, path.join(root, 'public')))));
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
  assert.equal(catalog.home.length, 8);
  assert.deepEqual(Object.keys(catalog.characters), ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina']);
  const exported = moduleLoader({ __GAME_ART_CATALOG__: catalog })(path.join(root, 'src/game/asset-catalog.ts'));
  assert.deepEqual(exported.ART_CATALOG, catalog);
  const none = publicAssetCache().config({ root, publicDir: false }, { command: 'build' });
  assert.deepEqual(JSON.parse(none.define.__GAME_ART_CATALOG__), { home: [], shared: [], characters: {}, sizes: {} });
});

test('queue inventory uses real bytes and contains complete active packs without legacy/review art', () => {
  const catalog = createArtCatalog(root, path.join(root, 'public'));
  const paths = [...new Set([...catalog.home, ...catalog.shared, ...Object.values(catalog.characters).flat()])];
  assert.deepEqual(Object.keys(catalog.sizes).sort(), paths.sort());
  for (const logical of paths) {
    assert.equal(catalog.sizes[logical], fs.statSync(path.join(root, 'public/assets', logical)).size, logical);
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
      for (const image of [clip.image, ...clip.frames.filter(frame => frame.image).map(frame => frame.image)]) {
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

function artHarness(reject = () => false, base = '/') {
  const images = [], fetched = [];
  const getBytes = url => {
    assert.ok(url.startsWith(`${base}assets/cache/`), `unfingerprinted runtime artwork: ${url}`);
    const bytes = shipped.files.get(url.slice(base.length));
    assert.ok(bytes, `unemitted runtime artwork: ${url}`);
    return bytes;
  };
  class Image {
    src = ''; naturalWidth = 0; naturalHeight = 0;
    async decode() {
      images.push(this.src);
      const bytes = getBytes(this.src);
      [this.naturalWidth, this.naturalHeight] = imageDimensions(bytes);
    }
  }
  const noop = () => undefined;
  const draw = new Proxy({}, { get: (_target, key) => key === 'getImageData'
    ? () => ({ data: new Uint8ClampedArray(0) }) : noop });
  const load = moduleLoader({ __GAME_ART_URLS__: shipped.urls, Image,
    fetch: async url => { fetched.push(url); return { ok: !reject(url), json: async () => JSON.parse(getBytes(url).toString()) }; },
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) },
  }, base);
  return { art: load(path.join(root, 'src/game/art.ts')), images, fetched };
}

test('all seven production packs, multi-sheet frames, summons and legacy registrations load via independent hashes', async () => {
  const packs = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
  const h = artHarness();
  const lease = h.art.acquireGameArt(Object.keys(packs), { legacy: true }); await lease.ready;
  for (const [id, directory] of Object.entries(packs)) {
    assert.equal(h.art.getCharacterAnimationStatus(id).status, 'ready', id);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations', directory, 'manifest.json'), 'utf8'));
    for (const clip of [...Object.values(manifest.clips), ...Object.values(manifest.variants ?? {})]) {
      for (const image of [clip.image, ...clip.frames.filter(frame => frame.image).map(frame => frame.image)]) {
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

let failures = 0;
for (const { name, run } of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} asset cache regression checks passed.`);
process.exitCode = failures ? 1 : 0;
