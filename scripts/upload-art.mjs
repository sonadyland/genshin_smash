import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json' };

export function uploadTarget(env, dryRun = false) {
  const bucket = env.OSS_BUCKET?.trim() || (dryRun ? 'example-bucket' : '');
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('Set a valid OSS_BUCKET.');
  const prefix = (env.OSS_ART_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  if (prefix && !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(prefix)) throw new Error('OSS_ART_PREFIX must contain safe path segments only.');
  if (env.GAME_ASSET_BASE_URL?.trim()) {
    let base;
    try { base = new URL(env.GAME_ASSET_BASE_URL.trim()); } catch { throw new Error('GAME_ASSET_BASE_URL must be an HTTPS URL.'); }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('GAME_ASSET_BASE_URL must be a public HTTPS base URL without credentials, query, or fragment.');
    if (base.pathname.replace(/^\/+|\/+$/g, '') !== prefix) throw new Error('OSS_ART_PREFIX must match the path in GAME_ASSET_BASE_URL.');
  }
  const style = env.OSS_ADDRESSING_STYLE || 'virtual';
  if (!['virtual', 'path', 'cname'].includes(style)) throw new Error('Invalid OSS_ADDRESSING_STYLE.');
  return { destination: `oss://${bucket}/${prefix ? `${prefix}/` : ''}assets/cache/`, style };
}

export async function inspectAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  if (!entries.length) throw new Error('No cached art found. Run npm run build first.');
  const extensions = new Set();
  let bytes = 0;
  for (const entry of entries) {
    const match = /^([a-f0-9]{64})(\.[a-z]+)$/.exec(entry.name);
    if (!entry.isFile() || !match || !types[match[2]]) throw new Error('Unexpected cache entry; only content-hashed art and JSON files may be uploaded.');
    const content = await readFile(path.join(directory, entry.name));
    if (createHash('sha256').update(content).digest('hex') !== match[1]) throw new Error('Cache content hash mismatch. Rebuild before uploading.');
    extensions.add(match[2]);
    bytes += content.length;
  }
  return { count: entries.length, bytes, extensions: [...extensions].sort() };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--dry-run', '--help'].includes(arg))) throw new Error('Usage: npm run upload:art -- [--dry-run]');
  if (args.includes('--help')) { console.log('Upload built content-hashed art using ossutil 2.x. --dry-run validates locally without credentials, ossutil, or network.'); return; }
  try { loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Unable to load project .env.'); }
  const dryRun = args.includes('--dry-run');
  const { destination, style } = uploadTarget(process.env, dryRun);
  const source = path.join(root, 'dist/assets/cache');
  let inventory;
  try { inventory = await inspectAssets(source); } catch (error) { if (error.code === 'ENOENT') throw new Error('Run npm run build before upload:art.'); throw error; }
  console.log(`${dryRun ? 'Local dry run' : 'Upload'}: ${inventory.count} verified hash files (${inventory.bytes} bytes).`);
  console.log(`Target: ${destination}${dryRun && !process.env.OSS_BUCKET ? ' (example bucket; set OSS_BUCKET for deployment)' : ''}`);
  if (dryRun) { console.log('No network requests. MIME types and immutable cache headers validated; no remote files will be deleted.'); return; }
  if (!process.env.OSS_REGION?.trim()) throw new Error('Set OSS_REGION (for example cn-hangzhou).');
  const version = spawnSync('ossutil', ['version'], { encoding: 'utf8', windowsHide: true });
  if (version.error || version.status !== 0 || !/\b2\.\d+\.\d+\b/.test(`${version.stdout} ${version.stderr}`)) throw new Error('Install official ossutil 2.x and add it to PATH.');
  // Credentials are inherited as environment variables, never command arguments.
  // Each MIME group has its own Content-Type; source ends with a separator so
  // ossutil places the contents directly under the destination cache prefix.
  for (const extension of inventory.extensions) {
    const command = ['cp', `${source}${path.sep}`, destination, '--recursive', '--force', '--include', `*${extension}`, '--content-type', types[extension], '--cache-control', 'public,max-age=31536000,immutable', '--addressing-style', style, '--no-progress'];
    const result = spawnSync('ossutil', command, { encoding: 'utf8', windowsHide: true, env: process.env });
    // Avoid echoing provider errors that could contain signed URLs or credentials.
    if (result.error || result.status !== 0) throw new Error(`ossutil upload failed for ${extension}; check credentials, endpoint, permissions, and network in a secure terminal.`);
  }
  console.log('Upload complete. Verify CDN CORS and resource responses before enabling GAME_ASSET_BASE_URL.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
