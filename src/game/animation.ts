import type { MoveDef } from './data';
import type { AttackVisualVariant, MotionState } from './clip-animation';

export interface PlungeAnimation {
  phase: 'windup' | 'dive' | 'impact' | 'recover';
  elapsed: number;
  /** The two existing modes have different landing recovery lengths. */
  recoveryDuration?: number;
}
export type AttackTimeline = { def: Pick<MoveDef, 'kind' | 'startup' | 'active' | 'endlag'>; t: number; plunge?: PlungeAnimation; visualVariant?: AttackVisualVariant };
export type AttackPhase = 'windup' | 'contact' | 'followthrough' | 'recover';
export interface FighterAnimation {
  state: 'free' | 'attack' | 'hitstun';
  attack: AttackTimeline | null;
  onGround: boolean;
  vx: number;
  vy: number;
  dodgeTimer: number;
  dodgeDuration?: number;
  /** Simulation clock owned by this fighter; neither hitstop nor pause advances it. */
  time: number;
  /** Simulation-owned locomotion for the character animation packs. */
  motion?: MotionState;
}
export interface ActionFrame {
  row: number;
  column: number;
  pose: 'idle' | 'run' | 'jump' | 'hurt' | 'dodge' | 'jab' | 'smash' | 'special' | 'secondary';
  phase?: AttackPhase;
  progress: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

const unit = (value: number) => Math.max(0, Math.min(1, value));

export function attackPhase(attack: AttackTimeline): { phase: AttackPhase; column: number; progress: number } {
  const { def, t } = attack;
  if (attack.plunge) {
    const { phase, elapsed } = attack.plunge;
    if (phase === 'windup') return { phase: 'windup', column: 0, progress: unit(elapsed / Math.max(1, def.startup)) };
    if (phase === 'dive') return { phase: 'contact', column: 1, progress: unit(elapsed / 12) };
    if (phase === 'impact') return { phase: 'followthrough', column: 2, progress: unit(elapsed / Math.max(1, def.active)) };
    return { phase: 'recover', column: 3, progress: unit(elapsed / Math.max(1, attack.plunge.recoveryDuration ?? def.endlag - def.active)) };
  }
  if (t < def.startup) return { phase: 'windup', column: 0, progress: unit(t / Math.max(1, def.startup)) };
  if (t < def.startup + def.active) return { phase: 'contact', column: 1, progress: unit((t - def.startup) / Math.max(1, def.active)) };
  const recovery = Math.max(1, Math.ceil(def.endlag * 0.55));
  const elapsed = t - def.startup - def.active;
  if (elapsed < recovery) return { phase: 'followthrough', column: 2, progress: unit(elapsed / recovery) };
  return { phase: 'recover', column: 3, progress: unit((elapsed - recovery) / Math.max(1, def.endlag - recovery)) };
}

/** Atlas rows are move types, not character indices. Every character has its own sheet. */
export function selectActionFrame(input: FighterAnimation): ActionFrame {
  const base: ActionFrame = { row: 0, column: 0, pose: 'idle', progress: 0, rotation: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };
  if (input.state === 'hitstun') return { ...base, column: 3, pose: 'hurt', rotation: -0.22, scaleX: 0.94, scaleY: 1.03 };
  if (input.dodgeTimer > 0) return { ...base, column: 1, pose: 'dodge', rotation: 0.12, scaleX: 1.08, scaleY: 0.84, offsetY: 2 };
  if (input.attack) {
    const { phase, column, progress } = attackPhase(input.attack);
    const pose = input.attack.def.kind;
    const strength = pose === 'smash' ? 1 : pose === 'special' || pose === 'secondary' ? 0.85 : 0.5;
    const offsetX = input.attack.plunge ? 0 : phase === 'windup' ? -3 * progress * strength : phase === 'contact' ? 5 * strength : phase === 'followthrough' ? 5 * (1 - progress) * strength : 0;
    // Secondary poses live in their own four-frame sheet; column stays a logical
    // phase index (0–3), independent of that sheet's physical two-column layout.
    return { ...base, row: pose === 'secondary' ? 0 : pose === 'jab' ? 1 : pose === 'smash' ? 2 : 3, column, pose, phase, progress, offsetX };
  }
  if (!input.onGround) return { ...base, column: 3, pose: 'jump', rotation: Math.max(-0.055, Math.min(0.07, input.vy * 0.006)) };
  if (Math.abs(input.vx) > 0.65) {
    const stride = input.time * Math.max(0.7, Math.min(1.35, Math.abs(input.vx) / 4));
    return { ...base, column: 1 + Math.floor(stride / 6) % 2, pose: 'run', offsetY: -Math.abs(Math.sin(stride * Math.PI / 6)) * 2 };
  }
  const breath = Math.sin(input.time * 0.07) * 0.006;
  return { ...base, scaleX: 1 - breath, scaleY: 1 + breath };
}
