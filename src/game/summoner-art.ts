import registration from './summoner-art-manifest.json';

export type SummonArtKind = 'geo-pillar' | 'geo-meteor' | 'usher' | 'chevalmarin' | 'crabaletta';
interface RegisteredFrame {
  sourceRect: { x: number; y: number; width: number; height: number };
  footAnchor: { x: number; y: number };
  duration?: number;
}
interface RegisteredAsset {
  owner: string; image: string; width: number; height: number;
  standingBodyHeightPixels: number; frames: RegisteredFrame[];
}
const assets: Record<SummonArtKind, RegisteredAsset> = registration.assets;
const owners = new Map<string, { references: number; ready: Promise<void>; images: Map<SummonArtKind, HTMLImageElement> }>();

/** Artwork lifetime follows the same match/preview lease as its summoner. */
export function acquireSummonerArt(character: string): { ready: Promise<void>; release: () => void } {
  if (character !== 'zhongli' && character !== 'furina') return { ready: Promise.resolve(), release() {} };
  let owner = owners.get(character);
  if (!owner) {
    const entry = { references: 0, ready: Promise.resolve(), images: new Map<SummonArtKind, HTMLImageElement>() };
    owner = entry; owners.set(character, entry);
    entry.ready = Promise.allSettled(Object.entries(assets).filter(([, asset]) => asset.owner === character).map(async ([name, asset]) => {
      const image = new Image(); image.decoding = 'async';
      image.src = `${import.meta.env.BASE_URL}assets/animations/${asset.image}`;
      await image.decode();
      if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) throw new Error(`Invalid summon atlas: ${name}`);
      if (owners.get(character) === entry) entry.images.set(name as SummonArtKind, image);
    })).then(() => undefined);
  }
  owner.references++;
  const retained = owner; let released = false;
  return { ready: retained.ready, release() {
    if (released) return; released = true;
    if (--retained.references || owners.get(character) !== retained) return;
    owners.delete(character); retained.images.clear();
  } };
}

/** Simulation-frame clock only; drawing never starts an attack or advances time. */
export function drawSummonArt(context: CanvasRenderingContext2D, kind: SummonArtKind, x: number, feetY: number, height: number,
  options: { age?: number; attackProgress?: number; facing?: 1 | -1; alpha?: number } = {}): boolean {
  const asset = assets[kind], image = owners.get(asset.owner)?.images.get(kind);
  if (!image) return false;
  const isPet = asset.frames.length > 1;
  const index = !isPet ? 0 : options.attackProgress === undefined
    ? Math.floor(Math.max(0, options.age ?? 0) / 12) % 4
    : 4 + Math.min(7, Math.floor(Math.max(0, Math.min(1, options.attackProgress)) * 8));
  const frame = asset.frames[index], source = frame.sourceRect, scale = height / asset.standingBodyHeightPixels;
  context.save(); context.translate(x, feetY); context.scale(options.facing ?? 1, 1);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, source.x + 1, source.y + 1, source.width - 2, source.height - 2,
    (1 - source.width * frame.footAnchor.x) * scale, (1 - source.height * frame.footAnchor.y) * scale,
    (source.width - 2) * scale, (source.height - 2) * scale);
  context.restore(); return true;
}
