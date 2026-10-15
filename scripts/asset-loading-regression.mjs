import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const empty = { home: [], shared: [], characters: {}, sizes: {} };
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/game/asset-loading.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
const decodedHomeImages = [];
class HomeImage {
  naturalWidth = 1; naturalHeight = 1;
  set src(value) {
    assert.equal(this.crossOrigin, 'anonymous', 'home decode must match the CORS fetch before setting src');
    decodedHomeImages.push(value);
  }
  async decode() {}
}
vm.runInNewContext(`(function(exports,require,module){${source}\n})`, { console, setTimeout, clearTimeout, queueMicrotask, AbortController, Error, Image: HomeImage })(mod.exports, id => {
  if (id === './asset-catalog') return { ART_CATALOG: empty };
  if (id === './art-url-session') return { ensureArtUrls: async () => {}, onArtUrlsChanged: () => {} };
  if (id === './asset-url') return { assetUrl: value => `/assets/${value}` };
  if (id === './art') return { acquireGameArt: () => { throw new Error('fixture must provide art'); } };
  throw new Error(`Unexpected dependency: ${id}`);
}, mod);
const tick = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
const waitFor = async (condition, reason) => {
  for (let i = 0; i < 100; i++) { if (condition()) return; await tick(); }
  assert.fail(reason);
};
function catalog(home = ['home.webp'], chars = { raiden: ['r-a.png', 'r-b.png'], jean: ['j-a.png'], furina: ['f-a.png', 'f-b.png'] }, shared = ['fx.png']) {
  const all = [...new Set([...home, ...shared, ...Object.values(chars).flat()])];
  return { home, shared, characters: chars, sizes: Object.fromEntries(all.map(file => [file, 100])) };
}
function harness(catalogue, overrides = {}) {
  const requests = [], pending = new Map(), decodes = [], leases = [], deferredHome = new Map();
  let decoding = () => Promise.resolve();
  const loader = mod.exports.createAssetLoading(catalogue, {
    idleTimeoutMs: 1000, decodeTimeoutMs: 1000,
    resolveUrl: file => `/assets/${file}`,
    fetch: async (url, init) => {
      assert.equal(init.cache, 'default');
      requests.push(url);
      let control;
      const body = new ReadableStream({ start(controller) { control = controller; } });
      init.signal.addEventListener('abort', () => control.error(new Error('abort')));
      pending.set(url, { control, url, received: 0 });
      return { ok: true, status: 200, body, headers: { get: () => '12' } };
    },
    decodeHome: async url => { decodes.push(url); if (deferredHome.has(url)) await deferredHome.get(url); },
    acquireArt: (ids, options) => {
      assert.equal(options.strict, true);
      const lease = { ids: [...ids], released: 0, ready: decoding(), release() { this.released++; } };
      leases.push(lease); return lease;
    },
    ...overrides,
  });
  const key = file => `/assets/${file}`;
  const chunk = (file, count) => {
    const request = pending.get(key(file)); assert.ok(request, `pending ${file}`);
    request.control.enqueue(new Uint8Array(count)); request.received += count;
  };
  const finish = (file, count) => {
    const request = pending.get(key(file)); assert.ok(request, `pending ${file}`);
    const remaining = count ?? catalogue.sizes[file] - request.received;
    if (remaining) chunk(file, remaining);
    request.control.close(); pending.delete(key(file));
  };
  const finishAll = async () => {
    for (let i = 0; i < 30; i++) {
      await tick();
      if (!pending.size) return;
      for (const url of [...pending.keys()]) finish(url.replace('/assets/', ''));
    }
    assert.fail('downloads did not drain');
  };
  return { loader, requests, pending, decodes, leases, chunk, finish, finishAll, deferredHome, setDecode(fn) { decoding = fn; } };
}
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('default homepage image decode uses anonymous CORS before releasing its ready URL', async () => {
  const h = harness(catalog(['home.webp'], {}, []), { decodeHome: undefined });
  const leave = h.loader.enterLobby(); await tick();
  h.finish('home.webp');
  await waitFor(() => h.loader.getSnapshot().home.status === 'ready', 'home image did not finish decoding');
  assert.deepEqual(decodedHomeImages, ['/assets/home.webp']);
  assert.deepEqual([...h.loader.getSnapshot().homeReadyUrls], ['/assets/home.webp']);
  leave();
});

test('homepage download and decode gate one complete character at a time, without decoding background atlases', async () => {
  const h = harness(catalog());
  let decodeHome; h.deferredHome.set('/assets/home.webp', new Promise(resolve => { decodeHome = resolve; }));
  const leave = h.loader.enterLobby(); await tick();
  assert.deepEqual(h.requests, ['/assets/home.webp']);
  h.finish('home.webp'); await tick();
  assert.equal(h.loader.getSnapshot().home.status, 'loading');
  assert.equal(h.loader.getSnapshot().homeReadyUrls.length, 0);
  assert.equal(h.requests.length, 1);
  decodeHome(); await tick();
  assert.deepEqual([...h.loader.getSnapshot().homeReadyUrls], ['/assets/home.webp']);
  assert.deepEqual(h.requests.slice(1), ['/assets/fx.png', '/assets/r-a.png']);
  assert.equal(h.loader.getSnapshot().characters.raiden.status, 'loading');
  assert.equal(h.loader.getSnapshot().characters.jean.status, 'waiting', 'shared progress does not make every card appear active');
  h.finish('r-a.png'); await tick();
  assert.equal(h.requests.at(-1), '/assets/r-b.png');
  h.finish('r-b.png'); await tick();
  assert.equal(h.requests.includes('/assets/j-a.png'), false, 'shared FX is part of a complete character');
  h.finish('fx.png'); await tick();
  assert.equal(h.requests.at(-1), '/assets/j-a.png');
  await h.finishAll(); leave();
  assert.equal(h.leases.length, 0, 'background downloads never retain decoded character images');
  assert.ok(Object.values(h.loader.getSnapshot().characters).every(item => item.status === 'ready'));
});

test('byte progress uses decoded catalog sizes rather than compressed Content-Length or file counts', async () => {
  const data = catalog([], { raiden: ['small.json', 'large.png'] }, []);
  data.sizes['small.json'] = 20; data.sizes['large.png'] = 980;
  const h = harness(data); const prep = h.loader.prepareBattle(['raiden']); await tick();
  h.finish('small.json'); h.chunk('large.png', 480); await tick();
  const state = prep.getSnapshot();
  assert.equal(state.loadedBytes, 500); assert.equal(state.totalBytes, 1000); assert.equal(state.percent, 50);
  h.finish('large.png'); await prep.ready; assert.equal(prep.getSnapshot().phase, 'ready'); prep.release();
  assert.equal(h.leases[0].released, 1);
});

test('Tharja adds only a homepage portrait, queues after the seven originals and reuses downloaded art on selection', async () => {
  const order = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja'];
  const characters = Object.fromEntries(['tharja', ...order.slice(0, -1)].map(id => [id, [`${id}.webp`]]));
  const h = harness(catalog(['home.webp', 'tharja-portrait.webp'], characters, []));
  const leave = h.loader.enterLobby(); await tick();
  assert.ok(h.requests.every(url => url === '/assets/home.webp' || url === '/assets/tharja-portrait.webp'));
  await h.finishAll();
  assert.deepEqual(h.requests.filter(url => !url.includes('home.webp') && !url.includes('portrait')).map(url => url.slice(8, -5)), order);
  assert.deepEqual(h.decodes, ['/assets/home.webp', '/assets/tharja-portrait.webp']);
  const before = h.requests.length, selected = h.loader.prepareBattle(['tharja']); await selected.ready;
  assert.equal(h.requests.length, before); assert.deepEqual(h.leases.at(-1).ids, ['tharja']);
  selected.release(); leave();
});

test('entering battle prioritizes selected files, reuses in-flight URLs and pauses other characters', async () => {
  const h = harness(catalog([], { raiden: ['r-a.png', 'r-b.png'], jean: ['j-a.png'], furina: ['f-a.png', 'f-b.png'] }, []));
  const leave = h.loader.enterLobby(); await tick();
  assert.equal(h.pending.size, 2); leave();
  const prep = h.loader.prepareBattle(['furina']); await tick();
  assert.equal(h.pending.size, 2, 'do not abort and restart large in-flight images');
  h.finish('r-a.png'); await tick(); assert.equal(h.requests.at(-1), '/assets/f-a.png');
  h.finish('r-b.png'); await tick(); assert.equal(h.requests.at(-1), '/assets/f-b.png');
  await h.finishAll(); await prep.ready; prep.release(); await tick();
  assert.equal(h.requests.includes('/assets/j-a.png'), false);
  const leaveAgain = h.loader.enterLobby(); await h.finishAll(); leaveAgain();
  assert.equal(h.requests.filter(url => url.endsWith('r-a.png')).length, 1);
  assert.equal(h.requests.filter(url => url.endsWith('f-a.png')).length, 1);
  assert.ok(h.requests.includes('/assets/j-a.png'));
});

test('StrictMode cancellation and rapid navigation share downloads but never start the canceled engine decode', async () => {
  const h = harness(catalog([], { raiden: ['same.png'] }, []));
  const first = h.loader.prepareBattle(['raiden']); await tick(); first.release(); first.release();
  await assert.rejects(first.ready, /取消/);
  const second = h.loader.prepareBattle(['raiden']); await tick();
  assert.equal(h.requests.length, 1);
  let releaseDecode; h.setDecode(() => new Promise(resolve => { releaseDecode = resolve; }));
  h.finish('same.png'); await tick();
  assert.equal(h.leases.length, 1); assert.equal(second.getSnapshot().phase, 'decode');
  assert.equal(second.getSnapshot().status, 'loading');
  assert.equal(h.leases[0].released, 0);
  releaseDecode(); await second.ready;
  assert.equal(h.leases[0].released, 0, 'art stays retained for synchronous engine handoff');
  second.release(); assert.equal(h.leases[0].released, 1);
});

test('failed background pack does not block later characters and explicit retry resumes the failed file', async () => {
  const h = harness(catalog([], { raiden: ['r.png'], jean: ['j.png'] }, []));
  const leave = h.loader.enterLobby(); await tick();
  h.finish('r.png', 20); await tick();
  assert.equal(h.loader.getSnapshot().characters.raiden.status, 'error');
  assert.equal(h.requests.at(-1), '/assets/j.png');
  h.finish('j.png'); await tick(); h.loader.retryCharacter('raiden'); await tick();
  assert.equal(h.requests.filter(url => url.endsWith('r.png')).length, 2);
  h.finish('r.png'); await tick(); leave();
  assert.equal(h.loader.getSnapshot().characters.raiden.status, 'ready');
});

test('failed homepage image is retryable and does not lock all later background characters', async () => {
  const h = harness(catalog()); const leave = h.loader.enterLobby(); await tick();
  h.finish('home.webp', 10); await tick();
  assert.equal(h.loader.getSnapshot().home.status, 'error');
  assert.ok(h.requests.includes('/assets/r-a.png'));
  await h.finishAll(); h.loader.retryHome(); await tick();
  h.finish('home.webp'); await tick(); leave();
  assert.equal(h.loader.getSnapshot().home.status, 'ready');
});

test('battle decode failures reject readiness, release ownership and support a fresh generation retry', async () => {
  const h = harness(catalog([], { furina: ['pet.png'] }, []));
  h.setDecode(() => Promise.reject(new Error('invalid pet')));
  const first = h.loader.prepareBattle(['furina']); await h.finishAll();
  await assert.rejects(first.ready, /invalid pet/);
  assert.equal(first.getSnapshot().status, 'error');
  assert.equal(h.loader.getSnapshot().characters.furina.status, 'error');
  assert.equal(h.leases[0].released, 1); first.release();
  h.setDecode(() => Promise.resolve());
  const retry = h.loader.prepareBattle(['furina']); await retry.ready;
  assert.equal(h.leases.length, 2); retry.release();
  assert.equal(h.leases[1].released, 1);
});

test('two foreground consumers deduplicate transfers and cancellation does not release another art lease', async () => {
  const h = harness(catalog([], { raiden: ['r.png'] }, ['fx.png']));
  const first = h.loader.prepareBattle(['raiden']); const second = h.loader.prepareBattle(['raiden']);
  await h.finishAll(); await Promise.all([first.ready, second.ready]);
  assert.equal(h.requests.length, 2); assert.equal(h.leases.length, 2);
  first.release(); assert.equal(h.leases[1].released, 0); second.release();
});

test('a fresh page asks the browser cache again rather than persisting a false loaded flag', async () => {
  const data = catalog([], { raiden: ['r.png'] }, []);
  for (let page = 0; page < 2; page++) {
    const h = harness(data); const prep = h.loader.prepareBattle(['raiden']); await h.finishAll(); await prep.ready; prep.release();
    assert.deepEqual(h.requests, ['/assets/r.png']);
  }
});

test('stalled requests report a retryable timeout while completed artwork never becomes ready on HTTP failure', async () => {
  const h = harness(catalog([], { raiden: ['r.png'] }, []), { idleTimeoutMs: 15 });
  const prep = h.loader.prepareBattle(['raiden']);
  await assert.rejects(prep.ready, /网络长时间无响应/); prep.release();
  assert.equal(h.leases.length, 0);
  const broken = harness(catalog([], { raiden: ['r.png'] }, []), {
    fetch: async () => ({ ok: false, status: 404 }),
  });
  const missing = broken.loader.prepareBattle(['raiden']);
  await assert.rejects(missing.ready, /404/); missing.release(); assert.equal(broken.leases.length, 0);
});

test('Corrin follows the eight existing fighters and prepares both forms before battle', async () => {
  const ids = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja', 'corrin'];
  const chars = Object.fromEntries(ids.map(id => [id, id === 'corrin' ? ['human.webp', 'dragon.webp', 'transform.webp', 'water.webp'] : [`${id}.webp`]]));
  const h = harness(catalog(['home.webp', 'portrait-corrin.webp'], chars, []));
  const leave = h.loader.enterLobby(); await h.finishAll();
  assert.deepEqual(h.requests, ['/assets/home.webp', '/assets/portrait-corrin.webp', ...ids.slice(0, -1).map(id => `/assets/${id}.webp`), '/assets/human.webp', '/assets/dragon.webp', '/assets/transform.webp', '/assets/water.webp']);
  assert.deepEqual(h.decodes, ['/assets/home.webp', '/assets/portrait-corrin.webp']);
  assert.equal(h.leases.length, 0, 'lobby prefetch does not decode character atlases');
  assert.equal(h.loader.getSnapshot().characters.corrin.status, 'ready');
  const prep = h.loader.prepareBattle(['corrin']); await prep.ready;
  assert.equal(h.leases.length, 1); assert.deepEqual(h.leases[0].ids, ['corrin']);
  assert.equal(h.requests.length, 14, 'battle uses the completed transfers for both forms');
  prep.release(); leave();
});

let failures = 0;
for (const { name, run } of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} asset loading regression checks passed.`);
process.exitCode = failures ? 1 : 0;
