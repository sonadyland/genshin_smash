import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function configuration(env = process.env) {
  const requested = env.GAME_ART_MODE || 'auto';
  if (!['auto', 'local', 'direct', 'signed'].includes(requested)) throw new Error('Invalid GAME_ART_MODE.');
  const fields = ['OSS_BUCKET', 'OSS_REGION', 'OSS_ENDPOINT', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
  const complete = fields.every(key => env[key]?.trim());
  const partial = fields.some(key => env[key]?.trim());
  const mode = requested === 'auto' ? (complete ? 'signed' : 'local') : requested;
  if (requested === 'auto' && partial && !complete) throw new Error('Incomplete OSS configuration.');
  if (mode === 'signed' && !complete) throw new Error('Signed artwork requires complete OSS configuration.');
  const prefix = (env.OSS_ART_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  if (prefix && !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(prefix)) throw new Error('Invalid OSS_ART_PREFIX.');
  const ttl = Number(env.OSS_SIGNED_URL_TTL_SECONDS || 3600);
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 86400) throw new Error('Invalid OSS_SIGNED_URL_TTL_SECONDS.');
  const style = env.OSS_ADDRESSING_STYLE || 'virtual';
  if (!['virtual', 'cname'].includes(style)) throw new Error('Signer supports virtual or cname addressing.');
  let endpoint;
  if (mode === 'signed') {
    endpoint = new URL(env.OSS_ENDPOINT.includes('://') ? env.OSS_ENDPOINT : `https://${env.OSS_ENDPOINT}`);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' || /-internal\./.test(endpoint.hostname)) throw new Error('Use a public HTTPS OSS endpoint.');
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.OSS_BUCKET)) throw new Error('Invalid OSS_BUCKET.');
  }
  let base = '';
  if (mode === 'direct') {
    const url = new URL(env.GAME_ASSET_BASE_URL || '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid GAME_ASSET_BASE_URL.');
    base = url.href.replace(/\/+$/, '');
  }
  return { mode, prefix, ttl, endpoint: endpoint?.origin, base, style, env };
}

export function validateManifest(manifest) {
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object' || !Object.keys(manifest).length) throw new Error('Missing artwork manifest; run npm run build.');
  for (const [logical, output] of Object.entries(manifest)) {
    if (!/^(animations|backgrounds|characters|effects|lobby)\/[A-Za-z0-9_./-]+$/.test(logical) || logical.split('/').includes('..') || !/^assets\/cache\/[a-f0-9]{64}\.(png|webp|json)$/.test(output)) throw new Error('Invalid artwork allowlist.');
  }
  return manifest;
}

export function createArtServer({ config, manifest, sign, now = Date.now }) {
  validateManifest(manifest);
  let cached;
  let pending;
  const requests = new Map();
  return http.createServer(async (req, res) => {
    const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    if (req.url === '/health' && req.method === 'GET') return respond(200, { ok: true });
    if (req.url !== '/api/art-urls') return respond(404, { error: 'Not found' });
    if (req.method !== 'GET') return respond(405, { error: 'GET required' });
    // Nginx preserves Host; browser Origins must match the public game origin.
    if (req.headers.origin) {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { return respond(403, { error: 'Origin rejected' }); }
      if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) return respond(403, { error: 'Origin rejected' });
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') return respond(403, { error: 'Origin rejected' });
    const current = now();
    const address = config.env.TRUST_PROXY === 'true' ? String(req.headers['x-real-ip'] || req.socket.remoteAddress || '') : req.socket.remoteAddress || '';
    for (const [key, value] of requests) if (current - value.start >= 60000) requests.delete(key);
    const window = requests.get(address) || { start: current, count: 0 };
    requests.set(address, window);
    if (++window.count > 240) return respond(429, { error: 'Too many artwork requests' });
    try {
      if (!cached || config.mode === 'signed' && current >= cached.expiresAt - 120000) {
        pending ||= (async () => {
          const urls = {};
          for (const [logical, output] of Object.entries(manifest)) urls[logical] = config.mode === 'signed' ? await sign(`${config.prefix ? `${config.prefix}/` : ''}${output}`, config.ttl) : config.mode === 'direct' ? `${config.base}/${output}` : `/${output}`;
          cached = { mode: config.mode, urls, expiresAt: config.mode === 'signed' ? current + config.ttl * 1000 : 0 };
        })();
        try { await pending; } finally { pending = undefined; }
      }
      return respond(200, { ...cached, serverTime: current });
    } catch { return respond(503, { error: 'Artwork signing unavailable' }); }
  });
}

export async function main() {
  const config = configuration();
  const manifest = JSON.parse(readFileSync(process.env.ART_MANIFEST_PATH || new URL('../dist-server/art-manifest.json', import.meta.url), 'utf8'));
  let sign;
  if (config.mode === 'signed') sign = await createSigner(config);
  const server = createArtServer({ config, manifest, sign });
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log(`Artwork API ready (${config.mode}).`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
}

// Official ali-oss V4 presigning is local: no artwork body is downloaded.
export async function createSigner(config) {
  const { default: OSS } = await import('ali-oss');
  const client = new OSS({ region: config.env.OSS_REGION.startsWith('oss-') ? config.env.OSS_REGION : `oss-${config.env.OSS_REGION}`, endpoint: config.endpoint, bucket: config.env.OSS_BUCKET, accessKeyId: config.env.OSS_ACCESS_KEY_ID, accessKeySecret: config.env.OSS_ACCESS_KEY_SECRET, ...(config.env.OSS_SESSION_TOKEN ? { stsToken: config.env.OSS_SESSION_TOKEN } : {}), secure: true, authorizationV4: true, cname: config.style === 'cname' });
  return (key, expires) => client.signatureUrlV4('GET', expires, { headers: {} }, key);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Artwork API configuration/startup failed; check server settings securely.'); process.exitCode = 1; });
