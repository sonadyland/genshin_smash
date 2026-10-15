import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/game/art-url-session.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function session(config = { artMode: 'signed', artUrlsEndpoint: '/api/art-urls' }) {
  let now = 1_000_000, calls = 0, fail = false, generation = 0;
  const context = { exports: {}, __GAME_RUNTIME_CONFIG__: config, Date: { now: () => now }, AbortController, setTimeout, clearTimeout,
    fetch: async (endpoint, init) => {
      calls++; assert.equal(endpoint, '/api/art-urls'); assert.equal(init.cache, 'no-store');
      if (fail) return { ok: false, status: 503 };
      generation++;
      return { ok: true, json: async () => ({ mode: 'signed', urls: { 'lobby/a.webp': `https://private.example/a.hash.webp?signature=${generation}`, 'animations/a.json': `https://private.example/a.hash.json?signature=${generation}` }, expiresAt: 50_000, serverTime: 10_000 }) };
    } };
  vm.runInNewContext(source, context);
  return { api: context.exports, advance: ms => now += ms, calls: () => calls, fail: value => fail = value };
}
const local = session({}); await local.api.ensureArtUrls(); assert.equal(local.calls(), 0);
const s = session();
await Promise.all([s.api.ensureArtUrls(), s.api.ensureArtUrls(), s.api.ensureArtUrls()]);
assert.equal(s.calls(), 1);
const first = s.api.signedArtUrl('lobby/a.webp');
assert.throws(() => s.api.signedArtUrl('../secret'));
assert.throws(() => s.api.signedArtUrl('unlisted.webp'));
assert.match(first, /signature=1$/);
await s.api.ensureArtUrls(); assert.equal(s.calls(), 1);
let updates = 0; s.api.onArtUrlsChanged(() => updates++);
s.advance(33_000);
await Promise.all([s.api.ensureArtUrls(), s.api.ensureArtUrls()]);
assert.equal(s.calls(), 2); assert.equal(updates, 1);
assert.notEqual(s.api.signedArtUrl('lobby/a.webp'), first);
assert.match(s.api.signedArtUrl('animations/a.json'), /signature=2$/, 'each object has its own complete URL');
s.advance(33_000); s.fail(true);
await assert.rejects(s.api.ensureArtUrls(), /503/);
await assert.rejects(s.api.ensureArtUrls(), /503/);
assert.equal(s.calls(), 3, 'failed manifests must not loop automatically');
s.fail(false); await s.api.ensureArtUrls(true); assert.equal(s.calls(), 4);
assert.match(s.api.signedArtUrl('lobby/a.webp'), /signature=3$/);
const missing = session({ artMode: 'signed' }); await assert.rejects(missing.api.ensureArtUrls(), /未配置/);
const boot = fs.readFileSync('src/bootstrap.ts', 'utf8');
assert.ok(boot.indexOf('await ensureArtUrls(true)') < boot.indexOf("await import('./main')"), 'authorization must finish before module-level image URLs initialize');
assert.match(boot, /retry.onclick/);
console.log('PASS local bootstrap, signed bootstrap ordering, per-object URLs, unknown-path denial, no-store, clock skew, single-flight expiry refresh, bounded failure, explicit retry');

const loaderSource = ts.transpileModule(fs.readFileSync('src/game/asset-loading.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const live = session(); await live.api.ensureArtUrls();
const catalog = { home: ['lobby/a.webp'], shared: [], characters: { raiden: ['animations/a.json'] }, sizes: {} };
const empty = { home: [], shared: [], characters: {}, sizes: {} };
const loaderModule = { exports: {} }; const transfers = [], decodes = []; let released = 0;
vm.runInNewContext(`(function(exports,require,module){${loaderSource}\n})`, { setTimeout, clearTimeout, queueMicrotask, AbortController, console })(loaderModule.exports, id => {
  if (id === './art-url-session') return live.api;
  if (id === './asset-catalog') return { ART_CATALOG: empty };
  if (id === './asset-url') return { assetUrl: path => live.api.signedArtUrl(path) };
  if (id === './art') return { acquireGameArt: () => { decodes.push(live.api.signedArtUrl('animations/a.json')); return { ready: Promise.resolve(), release: () => released++ }; } };
  throw new Error(id);
}, loaderModule);
const loader = loaderModule.exports.createAssetLoading(catalog, {
  fetch: async url => { transfers.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; },
  decodeHome: async () => {},
});
const tick = async () => { for (let i = 0; i < 15; i++) await new Promise(resolve => setImmediate(resolve)); };
const leave = loader.enterLobby(); await tick();
assert.equal(loader.getSnapshot().characters.raiden.status, 'ready');
const battle1 = loader.prepareBattle(['raiden']); await battle1.ready;
assert.match(decodes[0], /signature=1$/);
live.advance(33_000); await live.api.ensureArtUrls(); await tick();
assert.equal(released, 0, 'URL refresh must not interrupt an existing decoded battle lease');
battle1.release(); leave();
const battle2 = loader.prepareBattle(['raiden']); await battle2.ready;
assert.match(decodes[1], /signature=2$/);
assert.ok(transfers.includes(decodes[1]), 'the exact new decode URL must be warmed after expiry');
assert.equal(transfers.filter(url => url === decodes[1]).length, 1, 'logical asset state must not create duplicate transfers');
battle2.release();
console.log('PASS signed loader expiry rewarms current URLs once, retains logical transfer state, preserves active decoded leases, and prepares a new battle');
