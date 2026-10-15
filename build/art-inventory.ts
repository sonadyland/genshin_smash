import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ArtCatalog } from '../src/game/asset-catalog';

interface ClipImages { image?: string; sheets?: { image: string }[]; frames: { image?: string }[] }
interface Manifest { character: string; clips: Record<string, ClipImages>; variants?: Record<string, ClipImages> }
interface SummonRegistration { assets: Record<string, { owner: string; image: string }> }
const characterOrder = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja', 'corrin'];

/** Only live clips, their optional frame sheets and owned summons enter the queue. */
export function createArtCatalog(root: string, publicDirectory: string): ArtCatalog {
  const assetDirectory = path.resolve(publicDirectory, 'assets');
  const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
  const packs = readJson<Record<string, string>>(path.join(root, 'src/game/animation-packs.json'));
  const summons = readJson<SummonRegistration>(path.join(root, 'src/game/summoner-art-manifest.json'));
  const home = ['lobby/liyue-dawn.webp', ...characterOrder.map(id => `lobby/${id}.webp`)];
  const shared = ['lobby/liyue-dawn.webp', 'effects/elemental-bursts-v3.png',
    'effects/secondary-effects-v1.png', 'effects/secondary-effects-v1.json'];
  const characters: Record<string, string[]> = {};
  for (const id of characterOrder) {
    if (!packs[id]) throw new Error(`Missing active animation pack: ${id}`);
    const prefix = `animations/${packs[id]}/`;
    const manifestPath = `${prefix}manifest.json`;
    const manifest = readJson<Manifest>(path.join(assetDirectory, manifestPath));
    if (manifest.character !== id) throw new Error(`Wrong character in ${manifestPath}`);
    const resources = new Set([`lobby/${id}.webp`, manifestPath]);
    for (const clip of [...Object.values(manifest.clips), ...Object.values(manifest.variants ?? {})]) {
      if (clip.image) resources.add(prefix + clip.image);
      for (const sheet of clip.sheets ?? []) resources.add(prefix + sheet.image);
      for (const frame of clip.frames) if (frame.image) resources.add(prefix + frame.image);
    }
    for (const summon of Object.values(summons.assets)) {
      if (summon.owner === id) resources.add(`animations/${summon.image}`);
    }
    if (id === 'xiao') {
      resources.add('effects/xiao-plunge-v3.png');
      resources.add('effects/xiao-plunge-v3.json');
    }
    characters[id] = [...resources];
  }
  const sizes: Record<string, number> = {};
  for (const logical of new Set([...home, ...shared, ...Object.values(characters).flat()])) {
    const filename = path.resolve(assetDirectory, logical);
    const relative = path.relative(assetDirectory, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !/\.(png|webp|json)$/.test(logical)) {
      throw new Error(`Invalid queued artwork path: ${logical}`);
    }
    const stat = statSync(filename);
    if (!stat.isFile() || stat.size <= 0) throw new Error(`Missing or empty queued artwork: ${logical}`);
    sizes[logical] = stat.size;
  }
  return { home, shared, characters, sizes };
}
