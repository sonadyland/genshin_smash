import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const artDirectories = ['animations', 'backgrounds', 'characters', 'effects'];
export interface FingerprintedArt {
  urls: Record<string, string>;
  files: Map<string, Buffer>;
}

/** Fingerprint each image/registration independently. No runtime prefetch list. */
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
      if (!entry.isFile() || !['.png', '.json'].includes(extension)) continue;
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
  let artwork: FingerprintedArt;
  return {
    name: 'content-hashed-game-art',
    apply: 'build',
    config(config) {
      const root = path.resolve(config.root ?? process.cwd());
      artwork = config.publicDir === false
        ? { urls: {}, files: new Map() }
        : fingerprintArtAssets(path.resolve(root, config.publicDir ?? 'public'));
      return { define: { __GAME_ART_URLS__: JSON.stringify(artwork.urls) } };
    },
    generateBundle() {
      for (const [fileName, source] of artwork.files) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
