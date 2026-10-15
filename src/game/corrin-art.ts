import { attackPhase } from './animation';
import type { FighterAnimation, AttackPhase } from './animation';

type Pair = [number, number];
type Point = { x: number; y: number };
type Form = 'human' | 'dragon' | 'transform' | 'fx';
export interface CorrinFrame {
  sheet: number; rect: [number, number, number, number]; pivot: Pair; duration: number;
  phase?: string; anchors?: Record<string, Pair>; bounds?: [number, number, number, number];
}
interface EffectBinding {
  id: string; kind: 'slash' | 'horizontal-sweep' | 'thrust' | 'fang';
  layer?: 'behind'; minimumPlaneWidth?: number;
  textureGeometry?: { origin: Pair; bladeTip: Pair; trailTip: Pair }[];
  active: { frame: number; previous: number; fxFrames: number[]; opacity: number }[];
}
export interface CorrinClip {
  id: string; form: Form; gameHeight: number; loop: boolean;
  sheets: { image: string; width: number; height: number; bodyHeight: number }[];
  frames: CorrinFrame[]; weaponEffect?: EffectBinding;
  flightLoopFrames?: number[]; spawnFrame?: number; impactFrame?: number;
}
export interface CorrinManifest { version: 2; character: 'corrin'; revision: string; clips: Record<string, CorrinClip> }
export interface CorrinSheet { image: HTMLImageElement; flash: HTMLCanvasElement | null }
export interface CorrinArtPack { manifest: CorrinManifest; sheets: Map<string, CorrinSheet> }
export interface CorrinSelection { key: string; frame: number; local: number; phase?: AttackPhase }
const finitePair = (value: unknown): value is Pair => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
const unit = (value: number) => Math.max(0, Math.min(.999999, value));
const total = (frames: CorrinFrame[]) => frames.reduce((sum, frame) => sum + frame.duration, 0);
const humanoid = ['idle', 'run', 'jump', 'dodge', 'hurt', 'defeat', 'jab1', 'jab2', 'jab3', 'smash', 'secondary'];
const dragon = ['idle', 'run', 'jump', 'dodge', 'hurt', 'defeat', 'jab', 'smash', 'secondary'];
const transforms = ['dragon-ground', 'human-ground', 'dragon-air', 'human-air'];
const effects = ['water-orb', 'water-beam', 'water-burst', 'dragon-fang', 'v2-yato-diagonal', 'v2-yato-sweep', 'v2-yato-thrust', 'v2-yato-downstroke'];
export const CORRIN_CLIP_KEYS = [...humanoid.map(id => `human:${id}`), ...dragon.map(id => `dragon:${id}`),
  ...transforms.map(id => `transform:transform-to-${id}`), ...effects.map(id => `fx:fx-${id}`)];

/** Corrin has real form-change clips and virtual air roots; do not weaken the old schema. */
export function validCorrinManifest(value: unknown): value is CorrinManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as CorrinManifest;
  if (manifest.version !== 2 || manifest.character !== 'corrin' || !manifest.clips || Object.keys(manifest.clips).length !== 32) return false;
  if (!CORRIN_CLIP_KEYS.every(key => {
    const clip = manifest.clips[key];
    if (!clip || `${clip.form}:${clip.id}` !== key || !Number.isFinite(clip.gameHeight) || clip.gameHeight <= 0 ||
      !Array.isArray(clip.sheets) || !clip.sheets.length || !Array.isArray(clip.frames) || clip.frames.length < 4 || clip.frames.length > 12) return false;
    if (!clip.sheets.every(sheet => /^[a-z][a-z0-9-]*\.webp$/.test(sheet.image) &&
      [sheet.width, sheet.height].every(n => Number.isInteger(n) && n > 8 && n < 8192) && Number.isFinite(sheet.bodyHeight) && sheet.bodyHeight > 0)) return false;
    if (!clip.frames.every(frame => {
      const sheet = clip.sheets[frame.sheet], rect = frame.rect;
      return sheet && Array.isArray(rect) && rect.length === 4 && rect.every(Number.isInteger) && rect[0] >= 0 && rect[1] >= 0 &&
        rect[2] > 4 && rect[3] > 4 && rect[0] + rect[2] <= sheet.width && rect[1] + rect[3] <= sheet.height &&
        finitePair(frame.pivot) && Math.abs(frame.pivot[0]) < sheet.width * 2 && Math.abs(frame.pivot[1]) < sheet.height * 2 &&
        Number.isFinite(frame.duration) && frame.duration > 0 && frame.duration <= 2000 &&
        (!frame.anchors || Object.values(frame.anchors).every(finitePair));
    })) return false;
    const binding = clip.weaponEffect;
    if (binding) {
      const fx = manifest.clips[`fx:${binding.id}`];
      if (!fx || !Array.isArray(binding.active) || !binding.active.length || !binding.active.every(slot =>
        clip.frames[slot.frame] && clip.frames[slot.previous] && slot.fxFrames.every(index => fx.frames[index]))) return false;
    }
    return true;
  })) return false;
  return Object.values(manifest.clips).reduce((sum, clip) => sum + clip.frames.length, 0) === 228;
}

export async function loadCorrinPack(manifestUrl: string, loadSheet: (name: string) => Promise<CorrinSheet>): Promise<CorrinArtPack> {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error('Missing Corrin artwork manifest');
  const manifest: unknown = await response.json();
  if (!validCorrinManifest(manifest)) throw new Error('Invalid Corrin artwork manifest');
  const sheets = new Map<string, CorrinSheet>();
  const unique = new Map(Object.values(manifest.clips).flatMap(clip => clip.sheets).map(sheet => [sheet.image, sheet]));
  await Promise.all([...unique.values()].map(async source => {
    const sheet = await loadSheet(source.image);
    if (sheet.image.naturalWidth !== source.width || sheet.image.naturalHeight !== source.height) throw new Error(`Invalid Corrin atlas dimensions: ${source.image}`);
    sheets.set(source.image, sheet);
  }));
  return { manifest, sheets };
}

function weighted(clip: CorrinClip, candidates: number[], progress: number): { frame: number; local: number } {
  let remaining = unit(progress) * candidates.reduce((sum, i) => sum + clip.frames[i].duration, 0);
  for (const frame of candidates) {
    if (remaining < clip.frames[frame].duration) return { frame, local: remaining / clip.frames[frame].duration };
    remaining -= clip.frames[frame].duration;
  }
  return { frame: candidates.at(-1) ?? 0, local: .999999 };
}
function frameAt(clip: CorrinClip, progress: number, candidates = clip.frames.map((_, i) => i)) {
  return weighted(clip, candidates, progress);
}

/** All clocks and motion come from simulation. Drawing cannot progress an attack. */
export function selectCorrinFrame(manifest: CorrinManifest, animation: FighterAnimation): CorrinSelection {
  const state = animation.corrin, transform = state?.transform;
  if (transform) {
    const key = `transform:transform-to-${transform.to}-${transform.airborne ? 'air' : 'ground'}`;
    return { key, ...frameAt(manifest.clips[key], transform.elapsed / Math.max(1, transform.duration)) };
  }
  const form = animation.attack?.corrinForm ?? state?.form ?? 'human';
  let id = 'idle', progress = 0;
  if (animation.defeated) { id = 'defeat'; progress = (animation.defeatAge ?? 0) * 1000 / 60 / total(manifest.clips[`${form}:defeat`].frames); }
  else if (animation.state === 'hitstun') { id = 'hurt'; progress = (animation.hitstunAge ?? 0) / Math.max(1, animation.hitstunDuration ?? 20); }
  else if (animation.dodgeTimer > 0) { id = 'dodge'; progress = 1 - animation.dodgeTimer / (animation.dodgeDuration ?? 16); }
  else if (animation.attack && animation.attack.def.kind !== 'special') {
    const attack = animation.attack;
    id = attack.def.kind === 'jab' && form === 'human' ? `jab${(attack.corrinCombo ?? state?.combo ?? 0) + 1}` : attack.def.kind;
    const key = `${form}:${id}`, clip = manifest.clips[key], { phase, progress: phaseProgress } = attackPhase(attack);
    const release = form === 'human' ? id.startsWith('jab') ? 3 : id === 'smash' ? 4 : 5 : id === 'jab' ? 3 : 5;
    const contactEnd = form === 'human' && id === 'smash' ? 7 : release + 2;
    const recover = clip.frames.length === 8 ? 6 : 9;
    const candidates = clip.frames.map((_, index) => index).filter(index => phase === 'windup' ? index < release :
      phase === 'contact' ? index >= release && index < contactEnd : phase === 'followthrough' ? index >= contactEnd && index < recover : index >= recover);
    return { key, ...frameAt(clip, phaseProgress, candidates), phase };
  } else if (!animation.onGround || (animation.motion && animation.motion.landAge >= 0 && animation.motion.landAge < 8 && !animation.motion.moving)) {
    const key = `${form}:jump`, clip = manifest.clips[key];
    const air = animation.motion?.airAge ?? 10;
    const candidates = animation.onGround ? [5, 6, 7] : air < 3 && animation.vy < 0 ? [0, 1] : animation.vy < -1.4 ? [2] : animation.vy > 1.4 ? [4] : [3];
    progress = animation.onGround ? (animation.motion?.landAge ?? 0) / 8 : air / 3;
    return { key, ...frameAt(clip, progress, candidates) };
  } else if (animation.motion ? animation.motion.moving : Math.abs(animation.vx) > .65) {
    id = 'run'; progress = animation.motion ? animation.motion.distance / 96 : animation.time % 38 / 38;
  } else progress = ((animation.time * 1000 / 60) % total(manifest.clips[`${form}:idle`].frames)) / total(manifest.clips[`${form}:idle`].frames);
  const key = `${form}:${id}`;
  return { key, ...frameAt(manifest.clips[key], progress) };
}

function scaleFor(clip: CorrinClip, frame: CorrinFrame, height: number) {
  return height / 112 * clip.gameHeight / clip.sheets[frame.sheet].bodyHeight;
}
function anchor(clip: CorrinClip, frameIndex: number, names: string[], height: number): Point | undefined {
  const frame = clip.frames[frameIndex], value = names.map(name => frame.anchors?.[name]).find(finitePair);
  if (!value) return undefined;
  const scale = scaleFor(clip, frame, height);
  return { x: (value[0] - frame.pivot[0]) * scale, y: (value[1] - frame.pivot[1]) * scale };
}
function world(point: Point, x: number, y: number, facing: 1 | -1) { return { x: x + point.x * facing, y: y + point.y }; }
export function corrinCastOrigin(pack: CorrinArtPack, x: number, feetY: number, height: number, animation: FighterAnimation, facing: 1 | -1 = 1) {
  if (animation.state === 'hitstun' || animation.corrin?.transform) return undefined;
  const sample = selectCorrinFrame(pack.manifest, animation), clip = pack.manifest.clips[sample.key];
  const point = anchor(clip, sample.frame, clip.form === 'dragon' ? ['mouth'] : ['castOrigin'], height);
  return point && world(point, x, feetY, facing);
}
export function corrinFangSegment(pack: CorrinArtPack, x: number, feetY: number, height: number, animation: FighterAnimation, facing: 1 | -1 = 1) {
  if (animation.state === 'hitstun' || animation.corrin?.transform) return undefined;
  const sample = selectCorrinFrame(pack.manifest, animation), clip = pack.manifest.clips[sample.key];
  if (sample.key !== 'human:secondary' || sample.phase !== 'contact') return undefined;
  const base = anchor(clip, sample.frame, ['castOrigin'], height), tip = anchor(clip, sample.frame, ['fangTip', 'dragonFangTip'], height);
  return base && tip ? { base: world(base, x, feetY, facing), tip: world(tip, x, feetY, facing) } : undefined;
}

/** Affine matrices apply only to independently generated light textures, never the actor. */
export function corrinWeaponEffect(pack: CorrinArtPack, selection: CorrinSelection, height: number) {
  const clip = pack.manifest.clips[selection.key], binding = clip.weaponEffect;
  const slot = binding?.active.find(item => item.frame === selection.frame);
  if (!binding || !slot || selection.phase !== 'contact') return undefined;
  const baseNames = binding.kind === 'fang' ? ['castOrigin'] : ['weaponBase', 'bladeBase'];
  const tipNames = binding.kind === 'fang' ? ['fangTip', 'dragonFangTip'] : ['swordTip', 'weaponTip'];
  const base = anchor(clip, selection.frame, baseNames, height), tip = anchor(clip, selection.frame, tipNames, height), previous = anchor(clip, slot.previous, tipNames, height);
  if (!base || !tip || !previous) return undefined;
  const fx = pack.manifest.clips[`fx:${binding.id}`], index = slot.fxFrames[Math.min(slot.fxFrames.length - 1, Math.floor(selection.local * slot.fxFrames.length))];
  const frame = fx.frames[index], geometry = binding.textureGeometry?.[index] ?? frame.anchors;
  if (!geometry || !['origin', 'bladeTip', 'trailTip'].every(name => finitePair(geometry[name as keyof typeof geometry]))) return undefined;
  const source = [geometry.origin, geometry.bladeTip, geometry.trailTip];
  let destination = [base, tip, previous];
  const dx = tip.x - base.x, dy = tip.y - base.y, length = Math.hypot(dx, dy);
  if (length < 1) return undefined;
  if (binding.kind === 'fang') {
    const extension = Math.min(22, Math.max(14, length * .32)) * height / 112;
    const scale = extension / (source[1][0] - source[0][0]), breadth = (source[2][1] - source[0][1]) * scale;
    destination = [tip, { x: tip.x + dx / length * extension, y: tip.y + dy / length * extension }, { x: tip.x - dy / length * breadth, y: tip.y + dx / length * breadth }];
  } else if (binding.kind === 'thrust') destination = [tip, base, { x: tip.x - dy * .10, y: tip.y + dx * .10 }];
  else if (Math.hypot(tip.x - previous.x, tip.y - previous.y) < 1) return undefined;
  else if (binding.kind === 'horizontal-sweep') {
    const ux = dx / length, uy = dy / length, along = Math.min(-length * .15, Math.max(-length * 3, (previous.x - tip.x) * ux + (previous.y - tip.y) * uy));
    const from = { x: tip.x + along * ux, y: tip.y + along * uy }, depth = length * (binding.minimumPlaneWidth ?? .06);
    const sx = source[1][0] - source[0][0], sy = source[1][1] - source[0][1];
    const fraction = ((source[2][0] - source[0][0]) * sx + (source[2][1] - source[0][1]) * sy) / (sx * sx + sy * sy);
    destination = [from, tip, { x: from.x - along * ux * fraction + uy * depth, y: from.y - along * uy * fraction - ux * depth }];
  }
  const [o, a, b] = source, [p, q, r] = destination, ax = a[0] - o[0], ay = a[1] - o[1], bx = b[0] - o[0], by = b[1] - o[1], determinant = ax * by - ay * bx;
  if (Math.abs(determinant) < 1) return undefined;
  const qx = q.x - p.x, qy = q.y - p.y, rx = r.x - p.x, ry = r.y - p.y;
  const matrix: [number, number, number, number, number, number] = [(qx * by - rx * ay) / determinant, (qy * by - ry * ay) / determinant,
    (rx * ax - qx * bx) / determinant, (ry * ax - qy * bx) / determinant, p.x, p.y];
  return { clip: fx, frame, origin: o, matrix, opacity: slot.opacity, behind: binding.layer === 'behind', base, tip, previous };
}

function drawWeapon(context: CanvasRenderingContext2D, pack: CorrinArtPack, effect: ReturnType<typeof corrinWeaponEffect>) {
  if (!effect) return;
  const sheet = pack.sheets.get(effect.clip.sheets[effect.frame.sheet].image);
  if (!sheet) return;
  const [sx, sy, width, height] = effect.frame.rect;
  context.save(); context.globalAlpha *= effect.opacity; context.transform(...effect.matrix);
  context.drawImage(sheet.image, sx, sy, width, height, -effect.origin[0], -effect.origin[1], width, height);
  context.restore();
}
export function drawCorrinFighter(context: CanvasRenderingContext2D, pack: CorrinArtPack, x: number, feetY: number, height: number,
  animation: FighterAnimation, options: { facing?: 1 | -1; flash?: boolean; alpha?: number } = {}): boolean {
  const selection = selectCorrinFrame(pack.manifest, animation), clip = pack.manifest.clips[selection.key], frame = clip.frames[selection.frame];
  const sheet = pack.sheets.get(clip.sheets[frame.sheet].image);
  if (!sheet) return false;
  const scale = scaleFor(clip, frame, height), [sx, sy, width, sourceHeight] = frame.rect;
  const dx = -frame.pivot[0] * scale, dy = -frame.pivot[1] * scale;
  const effect = corrinWeaponEffect(pack, selection, height);
  context.save(); context.translate(x, feetY); context.scale(options.facing ?? 1, 1); context.globalAlpha *= options.alpha ?? 1;
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  if (effect?.behind) drawWeapon(context, pack, effect);
  context.drawImage(sheet.image, sx, sy, width, sourceHeight, dx, dy, width * scale, sourceHeight * scale);
  if (options.flash) {
    if (!sheet.flash) {
      const flash = document.createElement('canvas'); flash.width = sheet.image.naturalWidth; flash.height = sheet.image.naturalHeight;
      const g = flash.getContext('2d');
      if (g) { g.drawImage(sheet.image, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff9ed'; g.fillRect(0, 0, flash.width, flash.height); sheet.flash = flash; }
    }
    if (sheet.flash) { context.save(); context.globalAlpha *= .85; context.drawImage(sheet.flash, sx, sy, width, sourceHeight, dx, dy, width * scale, sourceHeight * scale); context.restore(); }
  }
  if (!effect?.behind) drawWeapon(context, pack, effect);
  context.restore(); return true;
}

export type CorrinWaterKind = 'water-orb' | 'water-beam' | 'water-bomb' | 'water-burst';
/** Positions are simulation-owned mouth/projectile/impact anchors, not showcase paths. */
export function drawCorrinWater(context: CanvasRenderingContext2D, pack: CorrinArtPack, kind: CorrinWaterKind, x: number, y: number,
  width: number, height: number, age: number, facing: 1 | -1 = 1): boolean {
  const clip = pack.manifest.clips[`fx:fx-${kind === 'water-bomb' ? 'water-orb' : kind}`];
  if (!clip) return false;
  const elapsed = age * 1000 / 60;
  const index = kind === 'water-orb' || kind === 'water-bomb' ? elapsed < clip.frames[0].duration ? 0 : (clip.flightLoopFrames ?? [1, 2])[Math.floor(elapsed / 100) % 2]
    : kind === 'water-beam' ? elapsed < clip.frames[0].duration ? 0 : 1 + Math.floor(elapsed / 100) % 2
    : frameAt(clip, elapsed / total(clip.frames)).frame;
  const frame = clip.frames[index], sheet = pack.sheets.get(clip.sheets[frame.sheet].image);
  if (!sheet || width <= 0 || height <= 0) return false;
  const [sx, sy, sw, sh] = frame.rect, bounds = frame.bounds ?? [0, 0, sw, sh];
  const [px, py] = frame.pivot;
  const scale = Math.min(width / bounds[2], height / bounds[3]);
  // A beam deliberately grows along its travel axis; water balls and bursts stay uniform.
  const scaleX = kind === 'water-beam' ? width / Math.max(1, bounds[0] + bounds[2] - px) : scale;
  const scaleY = kind === 'water-beam' ? height / bounds[3] : scale;
  context.save(); context.translate(x, y); context.scale(facing, 1); context.imageSmoothingEnabled = true;
  context.drawImage(sheet.image, sx, sy, sw, sh, -px * scaleX, -py * scaleY, sw * scaleX, sh * scaleY);
  context.restore(); return true;
}
