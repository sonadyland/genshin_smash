export interface ArtCatalog {
  readonly home: readonly string[];
  readonly shared: readonly string[];
  readonly characters: Readonly<Record<string, readonly string[]>>;
  readonly sizes: Readonly<Record<string, number>>;
}

declare const __GAME_ART_CATALOG__: ArtCatalog | undefined;

/** Vite reads the active manifests and source byte sizes for dev and builds. */
export const ART_CATALOG: ArtCatalog = typeof __GAME_ART_CATALOG__ === 'undefined'
  ? { home: [], shared: [], characters: {}, sizes: {} }
  : __GAME_ART_CATALOG__;
