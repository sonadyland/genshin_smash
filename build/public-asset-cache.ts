import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { createArtCatalog } from './art-inventory';

const artDirectories = ['animations', 'backgrounds', 'characters', 'effects', 'lobby'];
export interface FingerprintedArt {
  urls: Record<string, string>;
  files: Map<string, Buffer>;
}

/** Fingerprint each image/registration independently, including display-sized WebP. */
export function fingerprintArtAssets(publicDirectory: string): FingerprintedArt {
  const assetDirectory = path.join(publicDirectory, 'assets');
  if (existsSync(path.join(assetDirectory, 'cache'))) {
    throw new Error('public/assets/cache is reserved for generated content-hashed artwork');
  }
  const urls: Record<string, string> = {};
  const files = new Map<string, Buffer>();
  function visit(directory: string, relative: string) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const logicalPath = `${relative}/${entry.name}`;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(filename, logicalPath); continue; }
      const extension = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !['.png', '.webp', '.json'].includes(extension)) continue;
      const source = readFileSync(filename);
      const digest = createHash('sha256').update(source).digest('hex');
      const output = `assets/cache/${digest}${extension}`;
      const existing = files.get(output);
      if (existing && !existing.equals(source)) throw new Error(`Artwork fingerprint collision: ${logicalPath}`);
      urls[logicalPath] = output;
      files.set(output, source);
    }
  }
  for (const directory of artDirectories) visit(path.join(assetDirectory, directory), directory);
  return { urls, files };
}

/** Vite still copies public source URLs for existing art review pages. */
export function publicAssetCache(): Plugin {
  let artwork: FingerprintedArt = { urls: {}, files: new Map() };
  let catalogInputs: string[] = [];
  return {
    name: 'content-hashed-game-art',
    config(config, environment) {
      const root = path.resolve(config.root ?? process.cwd());
      const publicDirectory = path.resolve(root, config.publicDir || 'public');
      const catalog = config.publicDir === false ? { home: [], shared: [], characters: {}, sizes: {} }
        : createArtCatalog(root, publicDirectory);
      if (environment.command === 'build' && config.publicDir !== false) artwork = fingerprintArtAssets(publicDirectory);
      catalogInputs = [path.join(publicDirectory, 'assets'), path.join(root, 'src/game/animation-packs.json'),
        path.join(root, 'src/game/summoner-art-manifest.json')].map(filename => filename.replaceAll('\\', '/'));
      return { define: { __GAME_ART_URLS__: JSON.stringify(artwork.urls), __GAME_ART_CATALOG__: JSON.stringify(catalog) } };
    },
    async handleHotUpdate(context) {
      // Re-evaluate byte totals and the live dependency graph after editing art.
      // Development still uses the original URLs and normal Vite cache policy.
      const filename = context.file.replaceAll('\\', '/');
      if (catalogInputs.some(input => filename === input || filename.startsWith(`${input}/`))) {
        await context.server.restart();
        return [];
      }
    },
    generateBundle() {
      for (const [fileName, source] of artwork.files) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
