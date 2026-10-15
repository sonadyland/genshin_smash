import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan, mergeBucketCors, DEFAULT_ORIGINS } from './configure-oss-cors.mjs';

test('adds only exact read origins and preserves existing configuration and Vary', () => {
  const old = { AllowedOrigin: 'https://old.example', AllowedMethod: ['PUT', 'GET'], AllowedHeader: 'x-test', ExposeHeader: 'ETag', MaxAgeSeconds: '12' };
  const input = { CORSRule: old, ResponseVary: 'false' };
  const plan = makePlan(input);
  assert.deepEqual(plan.rules[0], old);
  assert.equal(plan.responseVary, 'false');
  assert.deepEqual(plan.rules[1], { AllowedOrigin: DEFAULT_ORIGINS, AllowedMethod: ['GET', 'HEAD'], MaxAgeSeconds: '3600' });
  assert.deepEqual(input, { CORSRule: old, ResponseVary: 'false' });
  assert.equal(makePlan({ CORSRule: plan.rules, ResponseVary: 'false' }).changed, false);
});
test('new configuration enables Vary and escapes XML without broadening origins', () => {
  assert.equal(makePlan().responseVary, true);
  const plan = makePlan({ CORSRule: { AllowedOrigin: 'https://old.example?a="<&', AllowedMethod: 'GET' } });
  assert.match(plan.xml, /&quot;&lt;&amp;/);
  assert.throws(() => makePlan({}, ['https://example.com/path']));
  assert.throws(() => makePlan({}, ['https://*.example.com']));
  assert.throws(() => makePlan({ Other: 'unknown' }));
  assert.throws(() => makePlan({ CORSRule: { NewField: 'unknown' } }));
});
test('limits fail without deleting rules', () => {
  const old = { AllowedOrigin: 'https://old.example', AllowedMethod: 'GET' };
  assert.throws(() => makePlan({ CORSRule: Array(20).fill(old) }), /20/);
  assert.throws(() => makePlan({ CORSRule: { ...old, AllowedHeader: 'x'.repeat(17000) } }), /16 KiB/);
});
test('inspect reads only; apply GETs before PUT and absent CORS alone is empty', async () => {
  const calls = [];
  const client = { async request(params) { calls.push(params); if (params.method === 'GET') throw Object.assign(new Error(), { code: 'NoSuchCORSConfiguration' }); return {}; } };
  await mergeBucketCors(client, 'bucket');
  assert.deepEqual(calls.map(call => call.method), ['GET']);
  await mergeBucketCors(client, 'bucket', true);
  assert.deepEqual(calls.map(call => call.method), ['GET', 'GET', 'PUT']);
  assert.match(calls[2].content, /<ResponseVary>true<\/ResponseVary>/);
  assert.equal(calls[2].subres, 'cors');
  let writes = 0;
  await assert.rejects(mergeBucketCors({ async request() { writes++; throw Object.assign(new Error(), { code: 'AccessDenied' }); } }, 'bucket', true));
  assert.equal(writes, 1);
});
