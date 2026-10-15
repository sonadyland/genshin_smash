import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const base of ['/', '/games/smash/', './']) {
  const result = await build({
    root, base, logLevel: 'silent',
    build: { write: false, reportCompressedSize: false },
  });
  assert.ok(!Array.isArray(result) && 'output' in result);
  const html = result.output.find(file => file.fileName === 'index.html');
  assert.ok(html?.type === 'asset');
  const scripts = [...String(html.source).matchAll(/<script\b([^>]*)>/g)].map(match => match[1]);
  const runtime = scripts.filter(attributes => attributes.includes('runtime-config.js'));
  assert.equal(runtime.length, 1, `one separate runtime script for ${base}`);
  assert.ok(runtime[0].includes(`src="${base}runtime-config.js"`));
  assert.ok(!/\b(async|defer|type)\b/.test(runtime[0]), 'runtime script stays a blocking classic script');
  assert.ok(scripts.some(attributes => /type="module"/.test(attributes)), 'app keeps its deferred module entry');
  assert.ok(!result.output.some(file => file.type === 'chunk' && /__GAME_RUNTIME_CONFIG__\s*=/.test(file.code)), 'runtime configuration must not be bundled');
  console.log(`PASS ${base} build keeps its same-origin runtime configuration at ${base}runtime-config.js`);
}
console.log('3/3 runtime configuration build checks passed.');
