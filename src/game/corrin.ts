import type { MoveDef } from './data';
import type { TharjaContext, TharjaOwner, TharjaTarget } from './tharja';

export type CorrinForm = 'human' | 'dragon';
export interface CorrinTransform { from: CorrinForm; to: CorrinForm; airborne: boolean; elapsed: number; duration: number; commit: number }
export interface CorrinState { form: CorrinForm; combo: 0 | 1 | 2; comboUntil: number; transform?: CorrinTransform }
export const newCorrinState = (): CorrinState => ({ form: 'human', combo: 0, comboUntil: 0 });
export const CORRIN_MOVES: Record<CorrinForm, Record<MoveDef['kind'], MoveDef>> = {
  human: {
    jab: { name: '夜刀神三连', dmg: 4.4, kb: 2.3, kbs: .052, angle: 30, startup: 15, active: 7, endlag: 15, reach: 77, height: 64, kind: 'jab' },
    smash: { name: '夜刀神 · 断空', dmg: 15, kb: 5.8, kbs: .10, angle: 54, startup: 28, active: 8, endlag: 27, reach: 88, height: 110, kind: 'smash' },
    secondary: { name: '龙穿突刺', dmg: 13, kb: 4.4, kbs: .075, angle: 32, startup: 27, active: 8, endlag: 27, reach: 108, height: 32, kind: 'secondary', effect: 'dragon-fang' },
    special: { name: '龙化', dmg: 0, kb: 0, kbs: 0, angle: 0, startup: 27, active: 1, endlag: 26, reach: 0, height: 0, kind: 'special', effect: 'transform' },
  },
  dragon: {
    jab: { name: '水脉弹', dmg: 6.5, kb: 2.5, kbs: .05, angle: 28, startup: 20, active: 6, endlag: 19, reach: 480, height: 26, kind: 'jab', effect: 'water-orb' },
    smash: { name: '高压水息', dmg: 4.4, kb: 1.8, kbs: .035, angle: 24, startup: 32, active: 24, endlag: 25, reach: 370, height: 34, kind: 'smash', effect: 'water-beam' },
    secondary: { name: '水脉爆破', dmg: 17, kb: 5, kbs: .08, angle: 65, startup: 31, active: 8, endlag: 28, reach: 300, height: 100, kind: 'secondary', effect: 'water-bomb' },
    special: { name: '复归人形', dmg: 0, kb: 0, kbs: 0, angle: 0, startup: 27, active: 1, endlag: 26, reach: 0, height: 0, kind: 'special', effect: 'transform' },
  },
};
export const getCorrinMoves = (form: CorrinForm) => CORRIN_MOVES[form];
export function getCorrinHud(state: CorrinState) {
  const moves = getCorrinMoves(state.form);
  return { form: state.form, formName: state.form === 'human' ? '人形' : '白龙', transforming: !!state.transform,
    jabName: moves.jab.name, smashName: moves.smash.name, specialName: moves.special.name, secondaryName: moves.secondary.name };
}
export function startCorrinTransform(state: CorrinState, airborne: boolean): void {
  const human = state.form === 'human', duration = airborne ? human ? 34 : 32 : 46;
  state.transform = { from: state.form, to: human ? 'dragon' : 'human', airborne, elapsed: 0, duration, commit: airborne ? human ? 17 : 9 : human ? 24 : 15 };
  state.combo = 0; state.comboUntil = 0;
}
export function stepCorrinState(state: CorrinState): boolean {
  const transform = state.transform;
  if (!transform) return false;
  transform.elapsed++;
  if (transform.elapsed >= transform.commit) state.form = transform.to;
  if (transform.elapsed >= transform.duration) { state.transform = undefined; return true; }
  return false;
}
/** A duel interruption settles to the already committed form. It never refunds a cooldown. */
export function cancelCorrinTransform(state: CorrinState): void { state.transform = undefined; state.combo = 0; state.comboUntil = 0; }
export function takeCorrinCombo(state: CorrinState, clock: number): 0 | 1 | 2 {
  const combo = clock <= state.comboUntil ? state.combo : 0;
  state.combo = ((combo + 1) % 3) as 0 | 1 | 2; state.comboUntil = clock + 110;
  return combo;
}
export const isCorrinWater = (effect: MoveDef['effect']): effect is 'water-orb' | 'water-beam' | 'water-bomb' => effect === 'water-orb' || effect === 'water-beam' || effect === 'water-bomb';
export interface CorrinTuning { damageMultiplier?: number; rangeMultiplier?: number; orbCount?: number; pierce?: number; beamTicks?: number; burstRadius?: number }
export interface CorrinEffect {
  id: number; ownerId: number; kind: 'water-orb' | 'water-beam' | 'water-bomb' | 'water-burst';
  x: number; y: number; originX: number; originY: number; vx: number; vy: number; age: number; life: number; maxLife: number;
  radius: number; range: number; facing: 1 | -1; amount: number; hitIds: Set<number>; pierce: number; burstRadius: number; laneY: number; tickFrames: number;
}
export interface CorrinHit { ownerId: number; targetId: number; kind: MoveDef['kind']; amount: number; facing: 1 | -1 }
/** Swept capsule test shared by visible water and the registered human dragon-fang. */
export function corrinSegmentContact(target: TharjaTarget, x: number, y: number, endX: number, endY: number, radius: number): number | null {
  let entry = 0, exit = 1;
  for (const [position, velocity, min, max] of [[x, endX - x, target.x - target.width / 2 - radius, target.x + target.width / 2 + radius], [y, endY - y, target.feetY - target.height - radius, target.feetY + radius]]) {
    if (Math.abs(velocity) < .00001) { if (position < min || position > max) return null; }
    else { const a = (min - position) / velocity, b = (max - position) / velocity; entry = Math.max(entry, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
  }
  return entry <= exit ? entry : null;
}
const clamp = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;
function circleContact(target: TharjaTarget, x: number, y: number, radius: number): boolean {
  const closestX = Math.max(target.x - target.width / 2, Math.min(target.x + target.width / 2, x));
  const closestY = Math.max(target.feetY - target.height, Math.min(target.feetY, y));
  return Math.hypot(x - closestX, y - closestY) <= radius;
}
export class CorrinRuntime {
  effects: CorrinEffect[] = [];
  private nextId = 1;
  clear() { this.effects = []; }
  clearOwner(id: number) { this.effects = this.effects.filter(effect => effect.ownerId !== id); }
  cancelBeam(id: number) { this.effects = this.effects.filter(effect => effect.ownerId !== id || effect.kind !== 'water-beam'); }
  cast(kind: 'water-orb' | 'water-beam' | 'water-bomb', owner: TharjaOwner, origin: { x: number; y: number }, tuning: CorrinTuning = {}) {
    if (!owner.alive) return;
    const range = clamp(tuning.rangeMultiplier, 1, .5, 2), damage = clamp(tuning.damageMultiplier, 1, .1, 100);
    const count = kind === 'water-orb' ? Math.floor(clamp(tuning.orbCount, 1, 1, 3)) : 1;
    const move = CORRIN_MOVES.dragon[kind === 'water-orb' ? 'jab' : kind === 'water-beam' ? 'smash' : 'secondary'];
    if (kind === 'water-beam') this.cancelBeam(owner.id);
    for (let i = 0; i < count; i++) {
      const life = kind === 'water-beam' ? 24 : kind === 'water-bomb' ? 100 : Math.ceil(60 * range);
      const offset = (i - (count - 1) / 2) * .13;
      this.effects.push({ id: this.nextId++, ownerId: owner.id, kind, x: origin.x, y: origin.y, originX: origin.x, originY: origin.y,
        vx: owner.facing * (kind === 'water-bomb' ? 5.6 : 8.7) * Math.cos(offset), vy: kind === 'water-bomb' ? -7.5 : Math.sin(offset) * 8.7,
        age: 0, life, maxLife: life, radius: kind === 'water-beam' ? 21 * range : kind === 'water-bomb' ? 18 : 13,
        range: move.reach * range, facing: owner.facing, amount: move.dmg * damage, hitIds: new Set(),
        pierce: Math.floor(clamp(tuning.pierce, 1, 1, 5)), burstRadius: clamp(tuning.burstRadius, 90, 45, 170) * range,
        laneY: owner.feetY - 35 + offset * 100, tickFrames: 24 / Math.floor(clamp(tuning.beamTicks, 3, 1, 4)) });
    }
    if (this.effects.length > 80) this.effects.splice(0, this.effects.length - 80);
  }
  step(context: TharjaContext): CorrinHit[] {
    const hits: CorrinHit[] = [];
    for (const effect of [...this.effects]) {
      const owner = context.owners.find(candidate => candidate.id === effect.ownerId && candidate.alive);
      if (!owner) { effect.life = 0; continue; }
      const targets = context.targets.filter(target => target.alive && target.ownerId !== effect.ownerId);
      const hit = (target: TharjaTarget, kind: MoveDef['kind']) => hits.push({ ownerId: effect.ownerId, targetId: target.id, kind, amount: effect.amount, facing: effect.facing });
      if (effect.kind === 'water-beam') {
        const origin = context.castOriginAt?.(effect.ownerId);
        if (origin) { effect.x = origin.x; effect.y = origin.y; }
        // Stop the visible beam at solid terrain; targets beyond that endpoint are unreachable.
        let reach = effect.range;
        for (let d = 8; d <= effect.range; d += 8) if (context.projectileBlocked?.(effect.x, effect.y, effect.x + effect.facing * d, effect.y)) { reach = Math.max(0, d - 8); break; }
        effect.originX = effect.x + effect.facing * reach; effect.originY = effect.y;
        if (effect.age % effect.tickFrames === 0) for (const target of targets) if (corrinSegmentContact(target, effect.x, effect.y, effect.originX, effect.y, effect.radius) !== null) hit(target, 'smash');
      } else if (effect.kind !== 'water-burst') {
        const oldX = effect.x, oldY = effect.y;
        let dx = effect.vx, dy = effect.vy;
        if (effect.kind === 'water-bomb') { effect.vy += .32; dy = effect.vy; }
        else if (effect.age < 8) {
          const t = (effect.age + 1) / 8, ease = t * t * (3 - 2 * t);
          dx = effect.facing * 3; dy = effect.originY + (effect.laneY - effect.originY) * ease - effect.y;
        }
        const contacts = targets.filter(target => !effect.hitIds.has(target.id)).map(target => ({ target, t: corrinSegmentContact(target, oldX, oldY, oldX + dx, oldY + dy, effect.radius) })).filter(contact => contact.t !== null).sort((a, b) => a.t! - b.t!);
        const blocked = context.projectileBlocked?.(oldX, oldY, oldX + dx, oldY + dy);
        effect.x += dx; effect.y += dy;
        const floor = effect.kind === 'water-bomb' && dy >= 0 ? context.surfaceAt(effect.x, oldY - effect.radius) : null;
        const landed = floor !== null && effect.y + effect.radius >= floor;
        if (effect.kind === 'water-bomb' && (landed || blocked || contacts.length > 0)) {
          if (landed) effect.y = floor! - 3;
          else if (blocked) { effect.x = oldX; effect.y = oldY; }
          else { effect.x = oldX + dx * contacts[0].t!; effect.y = oldY + dy * contacts[0].t!; }
          effect.kind = 'water-burst'; effect.age = -1; effect.life = 24; effect.maxLife = 24; effect.radius = effect.burstRadius;
          for (const target of targets) if (circleContact(target, effect.x, effect.y, effect.radius) && !context.projectileBlocked?.(effect.x, effect.y, target.x, target.feetY - target.height / 2)) hit(target, 'secondary');
        } else if (blocked) effect.life = 0;
        else if (effect.kind === 'water-orb') for (const contact of contacts) {
          hit(contact.target, 'jab'); effect.hitIds.add(contact.target.id);
          if (effect.hitIds.size >= effect.pierce) { effect.life = 0; break; }
        }
      }
      effect.age++; effect.life--;
    }
    this.effects = this.effects.filter(effect => effect.life > 0);
    return hits;
  }
}
