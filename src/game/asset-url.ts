import { artRuntime, artUsesSignedUrls, signedArtUrl } from './art-url-session';
declare const __GAME_ART_URLS__: Readonly<Record<string, string>> | undefined;

// Builds provide per-file hashes. Development and standalone regression tools
// retain logical URLs so editing a sprite remains visible immediately.
const artwork = typeof __GAME_ART_URLS__ === 'undefined' ? {} : __GAME_ART_URLS__ ?? {};


const runtimeConfig = artRuntime;
// runtime-config.js runs before the app so one Docker image can use any asset host.
const configuredBase = runtimeConfig?.artAssetBaseUrl?.trim() || import.meta.env.VITE_GAME_ASSET_BASE_URL?.trim();
function normalizeAssetBase(value: string): string {
  const invalid = () => new Error('Invalid artwork asset base URL: use an HTTP(S) URL without credentials, query or fragment.');
  // Keep the same public URL contract as the Docker runtime configuration writer.
  const match = /^https?:\/\/[A-Za-z0-9.-]+(?::([0-9]+))?(?:\/[A-Za-z0-9._~!$&()*+,;=:%@/-]*)?$/i.exec(value);
  if (!match || Number(match[1] ?? 0) > 65535) throw invalid();
  return `${value.replace(/\/+$/, '')}/`;
}
const assetBase = artUsesSignedUrls() ? import.meta.env.BASE_URL : configuredBase ? normalizeAssetBase(configuredBase) : import.meta.env.BASE_URL;

/** Resolve art under its optional host/prefix while preserving per-file hashes. */
export function assetUrl(logicalPath: string): string {
  const authorized = signedArtUrl(logicalPath);
  if (authorized) return authorized;
  return `${assetBase}${artwork[logicalPath] ?? `assets/${logicalPath}`}`;
}
