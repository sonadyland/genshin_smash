declare const __GAME_ART_URLS__: Readonly<Record<string, string>> | undefined;

export interface ArtUrlManifest {
  mode: 'local' | 'direct' | 'signed';
  urls: Record<string, string>;
  expiresAt: number;
  serverTime: number;
}
interface RuntimeConfig { artAssetBaseUrl?: string; artMode?: string; artUrlsEndpoint?: string }
export const artRuntime = (globalThis as typeof globalThis & { __GAME_RUNTIME_CONFIG__?: RuntimeConfig }).__GAME_RUNTIME_CONFIG__;
let manifest: ArtUrlManifest | undefined;
let refreshAt = 0;
let pending: Promise<void> | undefined;
let failure: unknown;
const listeners = new Set<() => void>();
export function onArtUrlsChanged(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function signedArtUrl(path: string): string | undefined {
  if (manifest?.mode !== 'signed') return manifest?.urls[path];
  if (!Object.hasOwn(manifest.urls, path)) throw new Error(`素材未授权: ${path}`);
  return manifest.urls[path];
}
export function artUsesSignedUrls() { return manifest?.mode === 'signed' || artRuntime?.artMode === 'signed'; }
export function ensureArtUrls(force = false): Promise<void> {
  if (pending) return pending;
  if (force) failure = undefined;
  if (failure) return Promise.reject(failure);
  const endpoint = artRuntime?.artUrlsEndpoint;
  if (!endpoint) return artRuntime?.artMode === 'signed' ? Promise.reject(new Error('私有素材服务未配置')) : Promise.resolve();
  if (!force && manifest && (manifest.mode !== 'signed' || Date.now() < refreshAt)) return Promise.resolve();
  pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error(`素材授权失败 (${response.status})`);
      const value = await response.json() as ArtUrlManifest;
      if (!['local', 'direct', 'signed'].includes(value.mode) || !value.urls || typeof value.urls !== 'object' || Array.isArray(value.urls) ||
        !Number.isFinite(value.expiresAt) || !Number.isFinite(value.serverTime) ||
        Object.entries(value.urls).some(([path, url]) => !/^[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').includes('..') || typeof url !== 'string' ||
          (value.mode === 'signed' && !/^https?:\/\//.test(url))) ||
        (value.mode === 'signed' && (value.expiresAt <= value.serverTime || !Object.keys(value.urls).length))) throw new Error('素材授权响应无效');
      const expected = typeof __GAME_ART_URLS__ === 'undefined' ? {} : __GAME_ART_URLS__ ?? {};
      if (value.mode === 'signed' && Object.keys(expected).some(path => !Object.hasOwn(value.urls, path))) throw new Error('素材授权清单不完整');
      if (artRuntime?.artMode === 'signed' && value.mode !== 'signed') throw new Error('私有素材授权模式不匹配');
      manifest = value;
      const lifetime = value.expiresAt - value.serverTime;
      refreshAt = Date.now() + lifetime - Math.min(60_000, lifetime * .2);
      for (const listener of listeners) listener();
    } finally { clearTimeout(timer); }
  })().catch(error => { failure = error; throw error; }).finally(() => { pending = undefined; });
  return pending;
}
