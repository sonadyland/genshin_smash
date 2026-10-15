import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

export const DEFAULT_ORIGINS = ['http://180.76.101.97:18021', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const fields = { allowedOrigin: 'AllowedOrigin', allowedMethod: 'AllowedMethod', allowedHeader: 'AllowedHeader', exposeHeader: 'ExposeHeader', maxAgeSeconds: 'MaxAgeSeconds' };
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const escapeXML = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);

export function makePlan(configuration = {}, origins = DEFAULT_ORIGINS) {
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || origin.includes('*')) throw new Error('Origins must be exact HTTP(S) origins including the port, without paths or wildcards.');
  }
  for (const key of Object.keys(configuration)) if (!['CORSRule', 'ResponseVary'].includes(key)) throw new Error('Unknown CORS configuration field; refusing to discard it.');
  const rules = structuredClone(array(configuration.CORSRule));
  for (const rule of rules) for (const key of Object.keys(rule)) if (!Object.values(fields).includes(key)) throw new Error('Unknown CORS rule field; refusing to discard it.');
  const missing = origins.filter(origin => !rules.some(rule => array(rule.AllowedOrigin).includes(origin) && ['GET', 'HEAD'].every(method => array(rule.AllowedMethod).includes(method))));
  if (missing.length) rules.push({ AllowedOrigin: missing, AllowedMethod: ['GET', 'HEAD'], MaxAgeSeconds: '3600' });
  if (rules.length > 20) throw new Error('Merging would exceed the OSS limit of 20 CORS rules; no rules were removed.');
  const responseVary = configuration.ResponseVary ?? true;
  if (responseVary != null && !['true', 'false'].includes(String(responseVary))) throw new Error('Invalid existing ResponseVary; refusing to change it.');
  const tags = (tag, value) => array(value).map(item => `<${tag}>${escapeXML(item)}</${tag}>`).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration>' + rules.map(rule => '<CORSRule>' + Object.entries(rule).map(([key, value]) => tags(key, value)).join('') + '</CORSRule>').join('') + (responseVary == null ? '' : tags('ResponseVary', responseVary)) + '</CORSConfiguration>';
  if (Buffer.byteLength(xml) > 16384) throw new Error('Merged CORS XML exceeds 16 KiB; no changes made.');
  return { rules, responseVary: responseVary ?? '(absent; OSS default false)', addedOrigins: missing, changed: missing.length > 0, xml };
}

export async function mergeBucketCors(client, bucket, apply = false, origins = DEFAULT_ORIGINS) {
  let configuration;
  try {
    // SDK 6.23.0 getBucketCORS/putBucketCORS discard ResponseVary. Use the
    // SDK signed request layer with the official REST XML schema to retain it.
    const result = await client.request({ method: 'GET', bucket, subres: 'cors', xmlResponse: true, successStatuses: [200] });
    configuration = result.data || {};
  } catch (error) {
    if (error.code !== 'NoSuchCORSConfiguration') throw error;
    configuration = {};
  }
  const plan = makePlan(configuration, origins);
  if (apply && plan.changed) await client.request({ method: 'PUT', bucket, subres: 'cors', content: plan.xml, mime: 'xml', successStatuses: [200] });
  return plan;
}

async function main() {
  const raw = process.argv.slice(2);
  const origins = [...DEFAULT_ORIGINS];
  const args = [];
  for (let index = 0; index < raw.length; index++) {
    if (raw[index] === '--origin' && raw[index + 1]) origins.push(raw[++index]);
    else args.push(raw[index]);
  }
  if (args.some(arg => !['--apply', '--inspect', '--dry-run'].includes(arg)) || args.filter(arg => arg !== '--dry-run').length > 1 || (args.includes('--dry-run') && args.length > 1)) throw new Error('Usage: node scripts/configure-oss-cors.mjs [--dry-run | --inspect | --apply]');
  try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Unable to load project .env.'); }
  const bucket = process.env.OSS_BUCKET?.trim();
  console.log(`Bucket: ${bucket || '(set OSS_BUCKET before inspecting/applying)'}`);
  makePlan({}, origins);
  console.log(`Origins: ${origins.join(', ')}`);
  console.log('New rule: GET / HEAD; no request-header or exposed-header permissions; preflight max age 3600 seconds.');
  if (!args.includes('--apply') && !args.includes('--inspect')) { console.log('Local dry run: no network requests or cloud changes. --inspect reads the full merged plan; --apply reads, preserves existing rules and ResponseVary, then writes only CORS.'); return; }
  if (!bucket || !process.env.OSS_REGION || !process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) throw new Error('Set OSS_BUCKET, OSS_REGION and server-side OSS credentials.');
  const { default: OSS } = await import('ali-oss');
  const region = process.env.OSS_REGION.replace(/^oss-/, '');
  const client = new OSS({ bucket, region: `oss-${region}`, accessKeyId: process.env.OSS_ACCESS_KEY_ID, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, stsToken: process.env.OSS_SESSION_TOKEN || undefined, authorizationV4: true, secure: true });
  const plan = await mergeBucketCors(client, bucket, args.includes('--apply'), origins);
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'inspect (read only)', ruleCount: plan.rules.length, addedOrigins: plan.addedOrigins, responseVary: plan.responseVary, rules: plan.rules }, null, 2));
  console.log(plan.changed ? (args.includes('--apply') ? 'CORS merged successfully. ACL and bucket policy were not modified.' : 'Review complete; no cloud changes made.') : 'Origins already covered; no write needed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('CORS configuration failed. Check credentials, permissions, existing rule limits and network in a secure terminal. Provider details are suppressed to protect credentials.'); process.exitCode = 1; });
