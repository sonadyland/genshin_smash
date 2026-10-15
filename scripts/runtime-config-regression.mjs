import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const shell = process.env.TEST_SH ?? (process.platform === 'win32' ? 'sh' : '/bin/sh');
const directory = mkdtempSync(path.join(tmpdir(), 'game-runtime-config-'));
try {
  const output = path.join(directory, 'config.js');
  const script = path.join(directory, 'entrypoint.sh');
  const shellOutput = output.replaceAll('\\', '/');
  writeFileSync(script, readFileSync(new URL('../docker/40-game-runtime-config.sh', import.meta.url), 'utf8')
    .replace('/tmp/game-runtime-config.js', shellOutput));
  const run = (value, mode = 'direct') => spawnSync(shell, [script], {
    env: { ...process.env, GAME_ASSET_BASE_URL: value, GAME_ART_MODE: mode, OSS_ACCESS_KEY_SECRET: 'regression-secret-never-publish' }, encoding: 'utf8',
  });
  const validCases = [
    ['', ''], ['  \n', ''], ['https://cdn.example.com', 'https://cdn.example.com'],
    [' https://cdn.example.com/art/// ', 'https://cdn.example.com/art'],
    ['HTTP://localhost:0/prefix/a%20b', 'HTTP://localhost:0/prefix/a%20b'],
    ['https://cdn.example.com:65535/a!$&()*+,;=:@_-~.webp', 'https://cdn.example.com:65535/a!$&()*+,;=:@_-~.webp'],
  ];
  for (const [input, expected] of validCases) {
    const result = run(input);
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const context = {};
    vm.runInNewContext(readFileSync(output, 'utf8'), context);
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artAssetBaseUrl, expected);
    assert.deepEqual(Object.keys(context.__GAME_RUNTIME_CONFIG__), ['artAssetBaseUrl', 'artMode', 'artUrlsEndpoint']);
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artMode, 'direct');
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artUrlsEndpoint, '/api/art-urls');
    assert.doesNotMatch(readFileSync(output, 'utf8'), /regression-secret-never-publish/);
  }
  const invalidCases = ['//cdn.example.com', 'ftp://cdn.example.com', 'https://u:p@cdn.example.com',
    'https://cdn.example.com?q=1', 'https://cdn.example.com#x', 'https://cdn.example.com:65536',
    'https://cdn.example.com/a";alert(1)//', "https://cdn.example.com/a'b", 'https://cdn.example.com/a\\b',
    'https://cdn.example.com/a\nb', 'https://cdn.example.com/<script>', 'https://cdn.example.com/中文'];
  for (const input of invalidCases) {
    assert.notEqual(run(input).status, 0, `accepted invalid URL: ${JSON.stringify(input)}`);
  }
  for (const mode of ['local', 'direct', 'signed', 'auto', '']) {
    const result = run('https://cdn.example.com/art', mode);
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const context = {};
    const text = readFileSync(output, 'utf8');
    vm.runInNewContext(text, context);
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artMode, mode || 'auto');
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artUrlsEndpoint, '/api/art-urls');
    assert.equal(context.__GAME_RUNTIME_CONFIG__.artAssetBaseUrl, ['local', 'direct'].includes(mode) ? 'https://cdn.example.com/art' : '');
    assert.deepEqual(Object.keys(context.__GAME_RUNTIME_CONFIG__), ['artAssetBaseUrl', 'artMode', 'artUrlsEndpoint']);
    assert.doesNotMatch(text, /regression-secret-never-publish|OSS_ACCESS_KEY/);
  }
  for (const mode of ['signed', 'auto']) {
    assert.equal(run('bad-public-base";alert(1)//', mode).status, 0);
    assert.doesNotMatch(readFileSync(output, 'utf8'), /bad-public-base|alert|regression-secret-never-publish/);
  }
  for (const mode of ['unknown', 'SIGNED', 'signed";alert(1)//']) assert.notEqual(run('', mode).status, 0);
  const nginx = readFileSync(new URL('../docker/nginx.conf', import.meta.url), 'utf8');
  assert.doesNotMatch(readFileSync(new URL('../docker/40-game-runtime-config.sh', import.meta.url), 'utf8'), /\r/);
  assert.match(nginx, /location = \/runtime-config\.js\s*\{[^}]*alias \/tmp\/game-runtime-config\.js;[^}]*Cache-Control "no-store" always;/);
  const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8');
  assert.match(compose, /GAME_ASSET_BASE_URL: \$\{GAME_ASSET_BASE_URL:-\}/);
  assert.doesNotMatch(compose, /env_file:/);
  const gameSection = compose.slice(compose.indexOf('  game:'), compose.lastIndexOf('\n  signer:'));
  assert.doesNotMatch(gameSection, /OSS_ACCESS_KEY|OSS_SESSION_TOKEN/);
  assert.match(compose, /GAME_ART_MODE: \$\{GAME_ART_MODE:-auto\}/);
  assert.match(compose, /OSS_ACCESS_KEY_SECRET: \$\{OSS_ACCESS_KEY_SECRET:-\}/);
  assert.match(nginx, /location = \/api\/art-urls\s*\{[^}]*proxy_pass http:\/\/signer:3001;/);
  const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /ENV GAME_ASSET_BASE_URL="" GAME_ART_MODE=auto/);
  console.log(`Runtime config regression passed (${validCases.length} valid, ${invalidCases.length} invalid; nginx/Compose contracts).`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
