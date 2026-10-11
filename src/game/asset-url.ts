declare const __GAME_ART_URLS__: Readonly<Record<string, string>> | undefined;

// Builds provide per-file hashes. Development and standalone regression tools
// retain logical URLs so editing a sprite remains visible immediately.
const artwork = typeof __GAME_ART_URLS__ === 'undefined' ? {} : __GAME_ART_URLS__ ?? {};

/** Resolve a logical path relative to public/assets, including the Vite base. */
export function assetUrl(logicalPath: string): string {
  return `${import.meta.env.BASE_URL}${artwork[logicalPath] ?? `assets/${logicalPath}`}`;
}
