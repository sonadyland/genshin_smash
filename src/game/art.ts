import { selectActionFrame } from './animation';
import type { FighterAnimation } from './animation';

/** Shared, locally hosted artwork for the lobby and the canvas arena. */
const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
export const CHARACTER_ART: Record<string, string> = {
  raiden: asset('characters/raiden-v2.png'), jean: asset('characters/jean-v2.png'),
  eula: asset('characters/eula-v2.png'), diluc: asset('characters/diluc-v2.png'),
  xiao: asset('characters/xiao-v3.png'),
};
export const BACKGROUND_ART = asset('backgrounds/liyue-dawn-v2.png');
export const ACTION_ART: Record<string, string> = Object.fromEntries(
  Object.keys(CHARACTER_ART).map(id => [id, asset(`animations/${id}-actions-v3.png`)]),
);
export const ELEMENT_EFFECT_ART = asset('effects/elemental-bursts-v3.png');
export const XIAO_PLUNGE_ART = asset('effects/xiao-plunge-v3.png');
export const SECONDARY_ACTION_ART: Record<string, string> = Object.fromEntries(
  Object.keys(CHARACTER_ART).map(id => [id, asset(`animations/${id}-secondary-v1.png`)]),
);
export const SECONDARY_EFFECT_ART = asset('effects/secondary-effects-v1.png');
interface SourceRect { x: number; y: number; width: number; height: number }
interface PlungeRegistration {
  width: number; height: number;
  frames: { row: number; column: number; sourceRect: SourceRect }[];
}
interface ActionRegistration {
  width: number; height: number;
  standingBodyHeightPixels: number;
  frames: { row: number; column: number; sourceRect: { x: number; y: number; width: number; height: number }; footAnchor: { x: number; y: number } }[];
}
interface SecondaryEffectRegistration {
  width: number; height: number;
  frames: { id: string; row: number; column: number; sourceRect: SourceRect }[];
}
interface ActionSheet { image: HTMLImageElement; flash: HTMLCanvasElement | null; registration: ActionRegistration }
interface ArtImage {
  image: HTMLImageElement;
  bounds: { x: number; y: number; width: number; height: number };
  flash: HTMLCanvasElement | null;
}
const loaded = new Map<string, ArtImage>();
let loading: Promise<void> | undefined;
const actionSheets = new Map<string, ActionSheet>();
const secondarySheets = new Map<string, ActionSheet>();
let effects: HTMLImageElement | undefined;
let plungeEffects: { image: HTMLImageElement; registration: PlungeRegistration } | undefined;
let secondaryEffects: { image: HTMLImageElement; registration: SecondaryEffectRegistration } | undefined;
function validSourceRect(rect: SourceRect | undefined, image: HTMLImageElement): boolean {
  return !!rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 2 && rect.height > 2 &&
    rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= image.naturalWidth && rect.y + rect.height <= image.naturalHeight;
}
async function loadActionSheet(id: string, url: string, secondary = false) {
  const image = new Image();
  image.decoding = 'async'; image.src = url;
  await image.decode();
  if (image.naturalWidth < 4 || image.naturalHeight < 4) return;
  const response = await fetch(url.replace(/\.png$/, '.json'));
  if (!response.ok) throw new Error(`Missing action registration: ${id}`);
  const registration: ActionRegistration = await response.json();
  const columns = secondary ? 2 : 4, count = secondary ? 4 : 16;
  if (registration.width !== image.naturalWidth || registration.height !== image.naturalHeight ||
      !Number.isFinite(registration.standingBodyHeightPixels) || registration.standingBodyHeightPixels <= 0 || !Array.isArray(registration.frames) || registration.frames.length !== count ||
      !registration.frames.every((frame, index) => {
        if (!frame) return false;
        const r = frame.sourceRect, a = frame.footAnchor;
        return frame.row === Math.floor(index / columns) && frame.column === index % columns &&
          validSourceRect(r, image) && a && [a.x, a.y].every(Number.isFinite) &&
          (!secondary || (r.x === frame.column * image.naturalWidth / 2 && r.y === frame.row * image.naturalHeight / 2 && r.width === image.naturalWidth / 2 && r.height === image.naturalHeight / 2)) &&
          a.x >= 0 && a.x <= 1 && a.y >= 0 && a.y <= 1;
      })) throw new Error(`Invalid action registration: ${id}`);
  const flash = document.createElement('canvas');
  flash.width = image.naturalWidth; flash.height = image.naturalHeight;
  const g = flash.getContext('2d');
  if (g) {
    g.drawImage(image, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff9ed'; g.fillRect(0, 0, flash.width, flash.height);
  }
  (secondary ? secondarySheets : actionSheets).set(id, { image, flash: g ? flash : null, registration });
}
async function loadSecondaryEffects() {
  const image = new Image(); image.decoding = 'async'; image.src = SECONDARY_EFFECT_ART;
  await image.decode();
  const response = await fetch(SECONDARY_EFFECT_ART.replace(/\.png$/, '.json'));
  if (!response.ok) throw new Error('Missing secondary effect registration');
  const registration: SecondaryEffectRegistration = await response.json();
  const ids = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'impact'];
  if (registration.width !== image.naturalWidth || registration.height !== image.naturalHeight || !Array.isArray(registration.frames) || registration.frames.length !== ids.length ||
      !registration.frames.every((frame, index) => {
        if (!frame) return false;
        const r = frame.sourceRect;
        return frame.id === ids[index] && frame.row === Math.floor(index / 3) && frame.column === index % 3 && validSourceRect(r, image) &&
          r.x === frame.column * image.naturalWidth / 3 && r.y === frame.row * image.naturalHeight / 2 && r.width === image.naturalWidth / 3 && r.height === image.naturalHeight / 2;
      })) throw new Error('Invalid secondary effect registration');
  secondaryEffects = { image, registration };
}
async function loadEffects() {
  const image = new Image(); image.decoding = 'async'; image.src = ELEMENT_EFFECT_ART;
  await image.decode();
  if (image.naturalWidth >= 4 && image.naturalHeight >= 2) effects = image;
}
async function loadPlungeEffects() {
  const image = new Image(); image.decoding = 'async'; image.src = XIAO_PLUNGE_ART;
  await image.decode();
  const response = await fetch(XIAO_PLUNGE_ART.replace(/\.png$/, '.json'));
  if (!response.ok) throw new Error('Missing Xiao plunge registration');
  const registration: PlungeRegistration = await response.json();
  if (registration.width !== image.naturalWidth || registration.height !== image.naturalHeight || registration.frames?.length !== 2 ||
      !registration.frames.every((frame, index) => {
        const r = frame.sourceRect;
        return frame.row === 0 && frame.column === index && r && [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
          r.width > 2 && r.height > 2 && r.x >= 0 && r.y >= 0 && r.x + r.width <= image.naturalWidth && r.y + r.height <= image.naturalHeight;
      })) throw new Error('Invalid Xiao plunge registration');
  plungeEffects = { image, registration };
}
async function loadImage(key: string, url: string, trim: boolean) {
  const image = new Image();
  image.decoding = 'async'; image.src = url;
  await image.decode();
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height) return;
  const bounds = { x: 0, y: 0, width, height };
  let flash: HTMLCanvasElement | null = null;
  if (trim) {
    const probe = document.createElement('canvas');
    probe.width = width; probe.height = height;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] >= 128) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      }
      if (right >= left && bottom >= top) {
        bounds.x = left; bounds.y = top;
        bounds.width = right - left + 1; bounds.height = bottom - top + 1;
      }
      flash = document.createElement('canvas');
      flash.height = Math.min(512, bounds.height);
      flash.width = Math.max(1, Math.round(flash.height * bounds.width / bounds.height));
      const flashContext = flash.getContext('2d');
      if (flashContext) {
        flashContext.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, flash.width, flash.height);
        flashContext.globalCompositeOperation = 'source-in';
        flashContext.fillStyle = '#fff9ed';
        flashContext.fillRect(0, 0, flash.width, flash.height);
      }
      probe.width = 1; probe.height = 1;
    }
  }
  loaded.set(key, { image, bounds, flash });
}
export function loadGameArt(): Promise<void> {
  loading ??= Promise.allSettled([
    ...Object.entries(CHARACTER_ART).filter(([id]) => !loaded.has(id)).map(([id, url]) => loadImage(id, url, true)),
    ...(!loaded.has('arena') ? [loadImage('arena', BACKGROUND_ART, false)] : []),
    ...Object.entries(ACTION_ART).filter(([id]) => !actionSheets.has(id)).map(([id, url]) => loadActionSheet(id, url)),
    ...Object.entries(SECONDARY_ACTION_ART).filter(([id]) => !secondarySheets.has(id)).map(([id, url]) => loadActionSheet(id, url, true)),
    ...(!effects ? [loadEffects()] : []),
    ...(!plungeEffects ? [loadPlungeEffects()] : []),
    ...(!secondaryEffects ? [loadSecondaryEffects()] : []),
  ]).then(() => { loading = undefined; });
  return loading;
}
/** Battle-only artwork. HUD and lobby retain the full-resolution portrait. */
export function drawFighterArt(context: CanvasRenderingContext2D, id: string, x: number, feetY: number, height: number, animation: FighterAnimation, options: Pick<CharacterArtOptions, 'facing' | 'flash' | 'alpha'> = {}): boolean {
  const frame = selectActionFrame(animation);
  const secondary = frame.pose === 'secondary';
  const sheet = (secondary ? secondarySheets : actionSheets).get(id);
  if (!sheet) {
    // The caller has a geometric fighter fallback. Never substitute an unrelated
    // old attack or portrait for an unavailable secondary animation.
    if (secondary) return false;
    // Xiao's upright portrait carries a raised spear. Keep the downward-pointing
    // engine fallback during his plunge if its dedicated poses are unavailable.
    if (id === 'xiao' && animation.attack?.plunge) return false;
    const pose = animation.state === 'hitstun' ? 'hurt' : animation.attack ? animation.attack.def.kind === 'special' ? 'special' : 'attack' : !animation.onGround ? 'jump' : 'idle';
    return drawCharacterArt(context, id, x, feetY, height, { ...options, pose, time: animation.time });
  }
  const registration = sheet.registration.frames[secondary ? frame.column : frame.row * 4 + frame.column];
  const source = registration.sourceRect;
  const scale = height / sheet.registration.standingBodyHeightPixels;
  const sx = source.x + 1, sy = source.y + 1;
  const drawnWidth = (source.width - 2) * scale, drawnHeight = (source.height - 2) * scale;
  const dx = (1 - source.width * registration.footAnchor.x) * scale;
  const dy = (1 - source.height * registration.footAnchor.y) * scale;
  context.save();
  context.globalAlpha *= options.alpha ?? 1;
  context.translate(x, feetY); context.scale(options.facing ?? 1, 1);
  context.translate(frame.offsetX, frame.offsetY); context.rotate(frame.rotation); context.scale(frame.scaleX, frame.scaleY);
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  // Inset the source by one texel so filtering cannot borrow a neighbour's weapon.
  context.drawImage(sheet.image, sx, sy, source.width - 2, source.height - 2, dx, dy, drawnWidth, drawnHeight);
  if (options.flash && sheet.flash) {
    context.globalAlpha *= 0.85;
    context.drawImage(sheet.flash, sx, sy, source.width - 2, source.height - 2, dx, dy, drawnWidth, drawnHeight);
  }
  context.restore();
  return true;
}

/** Independent centre-anchored skill artwork; false lets combat draw its geometric fallback. */
export function drawSecondaryEffect(context: CanvasRenderingContext2D, id: string, x: number, y: number, width: number, height: number, options: { alpha?: number; facing?: 1 | -1; rotation?: number; impact?: boolean } = {}): boolean {
  if (!secondaryEffects) return false;
  const frame = secondaryEffects.registration.frames.find(frame => frame.id === (options.impact ? 'impact' : id));
  if (!frame) return false;
  const source = frame.sourceRect;
  context.save(); context.translate(x, y); context.rotate(options.rotation ?? 0); context.scale(options.facing ?? 1, 1);
  context.globalAlpha *= Math.max(0, Math.min(1, options.alpha ?? 1));
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(secondaryEffects.image, source.x + 1, source.y + 1, source.width - 2, source.height - 2, -width / 2, -height / 2, width, height);
  context.restore();
  return true;
}

/** 4 elements × 2 uses: slash/aura above, impact below. Coordinates are centre anchored. */
export function drawElementEffect(context: CanvasRenderingContext2D, id: string, impact: boolean, x: number, y: number, width: number, height: number, alpha = 1, rotation = 0): boolean {
  if (!effects) return false;
  // Xiao's ordinary spear strikes share Anemo, but his plunge uses its own atlas.
  const columns: Record<string, number> = { raiden: 0, jean: 1, eula: 2, diluc: 3, xiao: 1 };
  const column = columns[id];
  if (column === undefined) return false;
  const sw = effects.naturalWidth / 4, sh = effects.naturalHeight / 2;
  context.save(); context.translate(x, y); context.rotate(rotation); context.globalAlpha *= Math.max(0, Math.min(1, alpha));
  context.drawImage(effects, column * sw + 1, (impact ? sh : 0) + 1, sw - 2, sh - 2, -width / 2, -height / 2, width, height);
  context.restore();
  return true;
}
/** Centre-anchored dedicated wind spear and ground shockwave. False retains the engine's geometric fallback. */
export function drawXiaoPlungeEffect(context: CanvasRenderingContext2D, phase: 'descent' | 'impact', x: number, y: number, width: number, height: number, alpha = 1): boolean {
  if (!plungeEffects) return false;
  const { image, registration } = plungeEffects;
  const source = registration.frames[phase === 'descent' ? 0 : 1].sourceRect;
  context.save(); context.translate(x, y); context.globalAlpha *= Math.max(0, Math.min(1, alpha));
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, source.x + 1, source.y + 1, source.width - 2, source.height - 2, -width / 2, -height / 2, width, height);
  context.restore();
  return true;
}
export interface CharacterArtOptions {
  facing?: 1 | -1;
  pose?: 'idle' | 'attack' | 'special' | 'jump' | 'hurt';
  time?: number;
  flash?: boolean;
  alpha?: number;
}
/** A feet anchor lets artwork change without modifying collision geometry. */
export function drawCharacterArt(context: CanvasRenderingContext2D, id: string, x: number, feetY: number, height: number, options: CharacterArtOptions = {}): boolean {
  const art = loaded.get(id);
  if (!art) return false;
  const { bounds, image } = art;
  const width = height * bounds.width / bounds.height;
  const pose = options.pose ?? 'idle', time = options.time ?? 0;
  const attacking = pose === 'attack' || pose === 'special';
  const breathe = pose === 'idle' ? Math.sin(time * 0.07) * 0.008 : 0;
  const lean = pose === 'hurt' ? -0.16 : attacking ? 0.13 : pose === 'jump' ? -0.06 : 0;
  context.save(); context.globalAlpha *= options.alpha ?? 1;
  context.translate(x, feetY); context.scale(options.facing ?? 1, 1);
  context.rotate(lean); context.scale(1 - breathe, 1 + breathe);
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, -width / 2, -height, width, height);
  if (options.flash && art.flash) { context.globalAlpha *= 0.85; context.drawImage(art.flash, -width / 2, -height, width, height); }
  context.restore();
  return true;
}
export function drawArenaBackground(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const art = loaded.get('arena');
  if (!art) return false;
  const scale = Math.max(width / art.image.naturalWidth, height / art.image.naturalHeight);
  const drawnWidth = art.image.naturalWidth * scale, drawnHeight = art.image.naturalHeight * scale;
  context.save(); context.imageSmoothingEnabled = true;
  context.drawImage(art.image, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  context.fillStyle = 'rgba(6, 21, 30, 0.16)'; context.fillRect(0, 0, width, height); context.restore();
  return true;
}
