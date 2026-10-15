import assert from 'node:assert/strict';
import { configuration, createArtServer, validateManifest, createSigner } from '../server/art-server.mjs';
const hash = 'a'.repeat(64);
const manifest = { 'characters/test.webp': `assets/cache/${hash}.webp` };
assert.equal(configuration({}).mode, 'local');
assert.throws(() => configuration({ OSS_BUCKET: 'partial' }), /Incomplete/);
assert.throws(() => validateManifest({ 'characters/../bad': manifest['characters/test.webp'] }));
assert.throws(() => validateManifest({ 'characters/test.webp': 'other/private.json' }));
const env = { GAME_ART_MODE: 'signed', OSS_BUCKET: 'example-bucket', OSS_REGION: 'cn-hangzhou', OSS_ENDPOINT: 'https://oss-cn-hangzhou.aliyuncs.com', OSS_ACCESS_KEY_ID: 'fixture-id', OSS_ACCESS_KEY_SECRET: 'fixture-secret', OSS_ART_PREFIX: 'game/art', GAME_ASSET_BASE_URL: 'broken-ignored' };
const config = configuration(env);
assert.equal(config.mode, 'signed');
assert.throws(() => configuration({ ...env, OSS_ENDPOINT: 'https://oss-cn-hangzhou-internal.aliyuncs.com' }));
let time = 1000000;
let signed = 0;
const server = createArtServer({ config, manifest, now: () => time, sign: async (key, ttl) => { signed++; assert.equal(key, `game/art/assets/cache/${hash}.webp`); assert.equal(ttl, 3600); await new Promise(resolve => setTimeout(resolve, 5)); return `https://example-bucket.oss-cn-hangzhou.aliyuncs.com/${key}?signed=${signed}`; } });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const [first, second] = await Promise.all([fetch(`${base}/api/art-urls`), fetch(`${base}/api/art-urls`)]);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  const data = await first.json();
  assert.deepEqual(data, await second.json());
  assert.equal(signed, 1);
  assert.equal(data.expiresAt, time + 3600000);
  assert.equal(data.serverTime, time);
  assert.equal(data.mode, 'signed');
  assert.equal((await fetch(`${base}/api/art-urls?key=secret`)).status, 404);
  assert.equal((await fetch(`${base}/api/art-urls`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/art-urls`, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/art-urls`, { headers: { Origin: base } })).status, 200);
  time += 3480001;
  const refreshed = await (await fetch(`${base}/api/art-urls`)).json();
  assert.equal(signed, 2);
  assert.ok(refreshed.expiresAt > data.expiresAt);
  for (let i = 0; i < 241; i++) await fetch(`${base}/api/art-urls`);
  assert.equal((await fetch(`${base}/api/art-urls`)).status, 429);
  assert.equal((await fetch(`${base}/health`)).status, 200);
} finally { await new Promise(resolve => server.close(resolve)); }
// Real official SDK signs offline with fixture credentials, without contacting OSS.
const { default: OSS } = await import('ali-oss');
const client = new OSS({ bucket: env.OSS_BUCKET, region: 'oss-cn-hangzhou', endpoint: env.OSS_ENDPOINT, accessKeyId: env.OSS_ACCESS_KEY_ID, accessKeySecret: env.OSS_ACCESS_KEY_SECRET, secure: true, authorizationV4: true });
const url = new URL(await client.signatureUrlV4('GET', 3600, { headers: {} }, `game/art/assets/cache/${hash}.webp`));
assert.equal(url.hostname, 'example-bucket.oss-cn-hangzhou.aliyuncs.com');
assert.equal(url.searchParams.get('x-oss-signature-version'), 'OSS4-HMAC-SHA256');
assert.ok(url.searchParams.get('x-oss-signature'));
console.log('Private art server regression passed: fixed allowlist, offline V4 GET signing, batch reuse/refresh, origin, methods, query rejection, and rate limit.');

const cnameSigner = await createSigner(configuration({ ...env, OSS_ENDPOINT: 'https://art.example.com', OSS_ADDRESSING_STYLE: 'cname' }));
assert.equal(new URL(await cnameSigner(`game/art/assets/cache/${hash}.webp`, 3600)).hostname, 'art.example.com');
