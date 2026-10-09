import { attackPhase } from './animation';
import type { AttackPhase, FighterAnimation } from './animation';

export const CHARACTER_CLIP_IDS = ['raiden', 'jean', 'eula', 'diluc', 'xiao'] as const;
export type ClipCharacterId = typeof CHARACTER_CLIP_IDS[number];
export const CHARACTER_CLIPS = ['idle', 'run', 'jump', 'dodge', 'jab', 'smash', 'special', 'secondary'] as const;
export type ClipName = typeof CHARACTER_CLIPS[number];
export const ATTACK_KINDS = ['jab', 'smash', 'special', 'secondary'] as const;
export type AttackKind = typeof ATTACK_KINDS[number];
export const VARIANT_ATTACKS = ['jab', 'smash'] as const;
export type VariantAttackKind = typeof VARIANT_ATTACKS[number];
// Keep the original preview/test import names compatible with the pilot.
export const EULA_CLIPS = CHARACTER_CLIPS;
export const EULA_ATTACKS = ATTACK_KINDS;
export function isClipCharacterId(value: unknown): value is ClipCharacterId {
  return CHARACTER_CLIP_IDS.includes(value as ClipCharacterId);
}
export type AttackVisualVariant = 'base' | 'alternate';
export type AttackVariantState = Record<AttackKind, AttackVisualVariant>;
export function newAttackVariants(): AttackVariantState {
  return { jab: 'alternate', smash: 'alternate', special: 'base', secondary: 'base' };
}
/** Call only when an attack has successfully started, never from rendering. */
export function takeAttackVariant(next: AttackVariantState, kind: AttackKind): AttackVisualVariant {
  if (!VARIANT_ATTACKS.includes(kind as VariantAttackKind)) return 'base';
  const variant = next[kind]; next[kind] = variant === 'alternate' ? 'base' : 'alternate'; return variant;
}
export interface ClipFrame {
  name?: string;
  sourceRect: { x: number; y: number; width: number; height: number };
  footAnchor: { x: number; y: number };
  weaponTip?: { x: number; y: number };
  phase?: AttackPhase;
  duration?: number;
}
export interface AnimationClip {
  image: string; width: number; height: number; standingBodyHeightPixels: number;
  trail?: 'arc' | 'thrust' | 'none';
  frames: ClipFrame[];
}
export interface ClipManifest { version: 1; character: ClipCharacterId; clips: Record<ClipName, AnimationClip>; variants?: Partial<Record<VariantAttackKind, AnimationClip>> }

/** This is simulation state, never advanced by drawing or wall-clock time. */
export interface MotionState {
  distance: number; age: number; airAge: number; landAge: number; turnAge: number;
  grounded: boolean; facing: 1 | -1; slope: number; moving: boolean;
}
export function newMotionState(facing: 1 | -1 = 1): MotionState {
  return { distance: 0, age: 0, airAge: 0, landAge: -1, turnAge: -1, grounded: true, facing, slope: 0, moving: false };
}
export function advanceMotion(motion: MotionState, input: { dx: number; onGround: boolean; facing: 1 | -1; walking: boolean; slope?: number }) {
  motion.age++;
  const moving = input.walking && input.onGround && Math.abs(input.dx) > 0.01;
  // Use resolved displacement: a wall, hitstop, dash or knockback cannot run the feet.
  if (moving) motion.distance = (motion.distance + Math.abs(input.dx)) % 96;
  motion.moving = moving;
  motion.airAge = input.onGround ? 0 : motion.grounded ? 0 : motion.airAge + 1;
  motion.landAge = input.onGround && !motion.grounded ? 0 : motion.landAge >= 0 && motion.landAge < 8 ? motion.landAge + 1 : -1;
  motion.turnAge = motion.facing !== input.facing ? 0 : motion.turnAge >= 0 && motion.turnAge < 4 ? motion.turnAge + 1 : -1;
  motion.grounded = input.onGround; motion.facing = input.facing;
  motion.slope = input.onGround ? Math.max(-0.4, Math.min(0.4, input.slope ?? 0)) : 0;
}
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
/** Reject the entire optional pack: never silently mix damaged clips into one fighter. */
export function validClipManifest(value: unknown): value is ClipManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as ClipManifest;
  if (manifest.version !== 1 || !isClipCharacterId(manifest.character) || !manifest.clips) return false;
  return CHARACTER_CLIPS.every(name => {
    const clip = manifest.clips[name];
    if (!clip || !/^[a-z][a-z0-9-]*\.png$/.test(clip.image) || !finite(clip.width) || !finite(clip.height) ||
      !Number.isInteger(clip.width) || !Number.isInteger(clip.height) || clip.width < 8 || clip.height < 8 ||
      !finite(clip.standingBodyHeightPixels) || clip.standingBodyHeightPixels <= 0 || !Array.isArray(clip.frames) || clip.frames.length < 2 || clip.frames.length > 32) return false;
    if (clip.trail !== undefined && !['arc', 'thrust', 'none'].includes(clip.trail)) return false;
    if (!clip.frames.every(frame => !!frame && typeof frame === 'object')) return false;
    const attack = ['jab', 'smash', 'special', 'secondary'].includes(name);
    if (attack && !(['windup', 'contact', 'followthrough', 'recover'] as const).every(phase => clip.frames.some(frame => frame.phase === phase))) return false;
    if (name === 'jump' && !['takeoff', 'rise', 'apex', 'fall', 'land'].every(phase => clip.frames.some(frame => frame.name === phase))) return false;
    if (manifest.character === 'xiao' && name === 'special' && !['windup', 'dive', 'impact', 'recover'].every(phase => clip.frames.some(frame => frame.name === phase))) return false;
    let lastPhase = -1;
    const validFrames = clip.frames.every(frame => {
      if (!frame) return false;
      const r = frame.sourceRect, a = frame.footAnchor, tip = frame.weaponTip;
      if (!r || !a || ![r.x, r.y, r.width, r.height, a.x, a.y].every(finite) ||
        ![r.x, r.y, r.width, r.height].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.width <= 4 || r.height <= 4 ||
        r.x + r.width > clip.width || r.y + r.height > clip.height || a.x < 0 || a.x > 1 || a.y < 0 || a.y > 1 ||
        (frame.duration !== undefined && (!finite(frame.duration) || frame.duration <= 0 || frame.duration > 120)) ||
        (tip && (![tip.x, tip.y].every(finite) || tip.x < 0 || tip.y < 0 || tip.x > r.width || tip.y > r.height))) return false;
      if (attack) {
        const order = ['windup', 'contact', 'followthrough', 'recover'].indexOf(frame.phase ?? '');
        if (order < lastPhase || order < 0) return false;
        lastPhase = order;
        if (manifest.character === 'xiao' && name === 'special' && frame.name !== ['windup', 'dive', 'impact', 'recover'][order]) return false;
      }
      return true;
    });
    return validFrames && clip.frames.every((frame, index) => clip.frames.slice(0, index).every(previous => {
      const a = frame.sourceRect, b = previous.sourceRect;
      return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    }));
  });
}
/** A missing/broken optional drawing never invalidates the base 64-frame pack. */
export function validVariantClip(manifest: ClipManifest, kind: VariantAttackKind): boolean {
  const clip = manifest.variants?.[kind];
  return !!clip && validClipManifest({ ...manifest, clips: { ...manifest.clips, [kind]: clip } });
}
export function validVariantClips(manifest: ClipManifest): boolean {
  if (!manifest.variants || typeof manifest.variants !== 'object') return false;
  const keys = Object.keys(manifest.variants);
  return keys.length > 0 && keys.every(kind => VARIANT_ATTACKS.includes(kind as VariantAttackKind) && validVariantClip(manifest, kind as VariantAttackKind));
}
export interface ClipSelection { clip: ClipName; variant?: AttackVisualVariant; frame: number; phase?: AttackPhase; progress: number }
export function selectedClip(manifest: ClipManifest, selection: Pick<ClipSelection, 'clip' | 'variant'>): AnimationClip {
  return selection.variant === 'alternate' && VARIANT_ATTACKS.includes(selection.clip as VariantAttackKind)
    ? manifest.variants?.[selection.clip as VariantAttackKind] ?? manifest.clips[selection.clip] : manifest.clips[selection.clip];
}
function weightedFrame(frames: ClipFrame[], candidates: number[], progress: number): number {
  const total = candidates.reduce((sum, index) => sum + (frames[index].duration ?? 6), 0);
  let target = Math.max(0, Math.min(0.999999, progress)) * total;
  for (const index of candidates) { target -= frames[index].duration ?? 6; if (target < 0) return index; }
  return candidates[candidates.length - 1] ?? 0;
}
export function selectClipFrame(manifest: ClipManifest, input: FighterAnimation): ClipSelection | null {
  // Reuse a recoiled airborne pose from the new pack; changing art generations
  // during PVP damage is more distracting than sharing this physical pose.
  if (input.state === 'hitstun') return { clip: 'jump', frame: manifest.clips.jump.frames.findIndex(frame => frame.name === 'fall'), progress: 0 };
  let clip: ClipName = 'idle', progress = 0;
  const motion = input.motion;
  if (input.dodgeTimer > 0) { clip = 'dodge'; progress = 1 - input.dodgeTimer / (input.dodgeDuration ?? 16); }
  else if (input.attack) {
    if (input.attack.plunge) {
      if (manifest.character !== 'xiao') return null;
      const { phase, elapsed } = input.attack.plunge, frames = manifest.clips.special.frames;
      const candidates = frames.map((_, i) => i).filter(i => frames[i].name === phase);
      const duration = phase === 'windup' ? input.attack.def.startup : phase === 'impact' ? input.attack.def.active
        : phase === 'recover' ? input.attack.plunge.recoveryDuration ?? Math.max(1, input.attack.def.endlag - input.attack.def.active)
        : candidates.reduce((sum, i) => sum + (frames[i].duration ?? 6), 0);
      // Height changes the dive length: never show landing before real collision.
      const progress = phase === 'dive' ? elapsed % Math.max(1, duration) / Math.max(1, duration) : elapsed / Math.max(1, duration);
      return { clip: 'special', variant: 'base', frame: weightedFrame(frames, candidates, progress),
        phase: ({ windup: 'windup', dive: 'contact', impact: 'followthrough', recover: 'recover' } as const)[phase], progress };
    }
    clip = input.attack.def.kind;
    const phase = attackPhase(input.attack);
    const variant = input.attack.visualVariant === 'alternate' && VARIANT_ATTACKS.includes(clip as VariantAttackKind) && manifest.variants?.[clip as VariantAttackKind] ? 'alternate' : 'base';
    const frames = selectedClip(manifest, { clip, variant }).frames;
    return { clip, variant, frame: weightedFrame(frames, frames.map((_, i) => i).filter(i => frames[i].phase === phase.phase), phase.progress), phase: phase.phase, progress: phase.progress };
  } else if (!input.onGround || (motion && motion.landAge >= 0 && motion.landAge < 8 && !motion.moving)) {
    clip = 'jump';
    const pose = input.onGround ? 'land' : (motion?.airAge ?? 10) < 3 && input.vy < 0 ? 'takeoff' : input.vy < -1.4 ? 'rise' : input.vy > 1.4 ? 'fall' : 'apex';
    const frames = manifest.clips.jump.frames;
    const candidates = frames.map((_, i) => i).filter(i => frames[i].name === pose);
    progress = pose === 'land' ? (motion?.landAge ?? 0) / 8 : pose === 'rise' ? Math.min(0.99, (motion?.airAge ?? 0) / 18) : pose === 'fall' ? Math.min(0.99, input.vy / 12) : 0;
    return { clip, frame: weightedFrame(frames, candidates, progress), progress };
  } else if (motion ? motion.moving : Math.abs(input.vx) > 0.65) {
    clip = 'run'; progress = motion ? motion.distance / 96 : input.time % 24 / 24;
  } else {
    const duration = manifest.clips.idle.frames.reduce((sum, frame) => sum + (frame.duration ?? 10), 0);
    progress = (motion?.age ?? input.time) % duration / duration;
  }
  const frames = manifest.clips[clip].frames;
  return { clip, frame: weightedFrame(frames, frames.map((_, i) => i), progress), progress };
}
