/** Shared, manually triggered dark magic simulation. Time is in 60 Hz simulation frames. */
export type TharjaSpell = 'flux' | 'ruin' | 'nosferatu' | 'mire';
export const isTharjaSpell = (value: unknown): value is TharjaSpell => ['flux', 'ruin', 'nosferatu', 'mire'].includes(value as string);
export const THARJA_COMBAT = {
  flux: { speed: 8.5, life: 68, radius: 12, damage: 6.5 },
  ruin: { speed: 6.5, life: 75, radius: 20, blastRadius: 78, damage: 17 },
  nosferatu: { reach: 340, height: 210, maxTargets: 1, healRatio: .45, healCap: 7, damage: 13, returnDelay: 16 },
  mire: { offset: 190, radius: 116, height: 74, life: 240, tickFrames: 40, damage: 3.2 },
} as const;
export interface TharjaOwner { id: number; x: number; feetY: number; facing: 1 | -1; alive: boolean }
export interface TharjaTarget { id: number; ownerId?: number; x: number; feetY: number; width: number; height: number; alive: boolean }
export interface TharjaContext {
  owners: readonly TharjaOwner[]; targets: readonly TharjaTarget[];
  surfaceAt: (x: number, nearFeetY: number) => number | null;
  projectileBlocked?: (oldX: number, oldY: number, newX: number, newY: number) => boolean;
  castOriginAt?: (ownerId: number) => { x: number; y: number } | undefined;
}
export interface TharjaTuning {
  damageMultiplier?: number; rangeMultiplier?: number; projectileCount?: number; pierce?: number;
  healCap?: number; fieldDuration?: number; fieldRadius?: number; drainTargets?: number; blastRadius?: number; tickFrames?: number;
}
export interface TharjaEffect {
  id: number; ownerId: number; kind: TharjaSpell | 'ruin-burst'; x: number; y: number;
  originX: number; originY: number; vx: number; vy: number; age: number; life: number; maxLife: number;
  radius: number; facing: 1 | -1; amount: number; hitIds: Set<number>; targetIds: number[];
  pierce: number; healCap: number; blastRadius: number; tickFrames: number;
  ground: { x: number; y: number }[]; range: number; resolved: boolean;
  targets: { id: number; x: number; y: number }[];
  laneY: number;
}
export interface TharjaHit { ownerId: number; targetId: number; kind: TharjaSpell; amount: number; heal: number; x: number; y: number; facing: 1 | -1 }
const bounded = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;
function intersects(target: TharjaTarget, x: number, y: number, radius: number): boolean {
  const nearX = Math.max(target.x - target.width / 2, Math.min(target.x + target.width / 2, x));
  const nearY = Math.max(target.feetY - target.height, Math.min(target.feetY, y));
  return Math.hypot(x - nearX, y - nearY) <= radius;
}
/** Point moving through an expanded target rectangle, ordered by impact time. */
function sweep(target: TharjaTarget, x: number, y: number, vx: number, vy: number, radius: number): number | null {
  let entry = 0, exit = 1;
  for (const [position, velocity, min, max] of [[x, vx, target.x - target.width / 2 - radius, target.x + target.width / 2 + radius], [y, vy, target.feetY - target.height - radius, target.feetY + radius]]) {
    if (Math.abs(velocity) < .0001) { if (position < min || position > max) return null; }
    else { const a = (min - position) / velocity, b = (max - position) / velocity; entry = Math.max(entry, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
  }
  return entry <= exit ? entry : null;
}
export class TharjaRuntime {
  effects: TharjaEffect[] = [];
  private nextId = 1;
  clear(): void { this.effects = []; }
  clearOwner(ownerId: number): void { this.effects = this.effects.filter(effect => effect.ownerId !== ownerId); }
  cancelDrain(ownerId: number): void { this.effects = this.effects.filter(effect => effect.ownerId !== ownerId || effect.kind !== 'nosferatu' || effect.resolved); }
  private add(kind: TharjaEffect['kind'], owner: TharjaOwner, x: number, y: number, life: number, radius: number, amount: number): TharjaEffect {
    const effect: TharjaEffect = { id: this.nextId++, ownerId: owner.id, kind, x, y, originX: x, originY: y, vx: 0, vy: 0,
      age: 0, life, maxLife: life, radius, amount, facing: owner.facing, hitIds: new Set(), targetIds: [], pierce: 1,
      healCap: 0, blastRadius: 0, tickFrames: 40, ground: [], range: 340, resolved: false, targets: [], laneY: y };
    this.effects.push(effect);
    if (this.effects.length > 96) this.effects.shift();
    return effect;
  }
  cast(kind: TharjaSpell, owner: TharjaOwner, origin: { x: number; y: number }, context: TharjaContext, tuning: TharjaTuning = {}): void {
    if (!owner.alive) return;
    const damage = bounded(tuning.damageMultiplier, 1, .1, 100), range = bounded(tuning.rangeMultiplier, 1, .5, 2.5);
    if (kind === 'flux' || kind === 'ruin') {
      const config = THARJA_COMBAT[kind], count = Math.floor(bounded(tuning.projectileCount, 1, 1, 3));
      for (let i = 0; i < count; i++) {
        const angle = (i - (count - 1) / 2) * .14;
        const effect = this.add(kind, owner, origin.x, origin.y, Math.ceil(config.life * range), config.radius, config.damage * damage);
        effect.vx = owner.facing * Math.cos(angle) * config.speed; effect.vy = Math.sin(angle) * config.speed;
        effect.laneY = owner.feetY - 42 + (i - (count - 1) / 2) * 16;
        effect.pierce = kind === 'flux' ? Math.floor(bounded(tuning.pierce, 1, 1, 8)) : 1;
        effect.blastRadius = bounded(tuning.blastRadius, THARJA_COMBAT.ruin.blastRadius, 40, 170);
      }
    } else if (kind === 'nosferatu') {
      this.cancelDrain(owner.id);
      const config = THARJA_COMBAT.nosferatu, maxTargets = Math.floor(bounded(tuning.drainTargets, config.maxTargets, 1, 8));
      const targets = context.targets.filter(target => this.validTarget(target, owner.id) &&
        (target.x - owner.x) * owner.facing >= -target.width / 2 && Math.abs(target.x - origin.x) <= config.reach * range &&
        Math.abs(target.feetY - target.height / 2 - origin.y) <= config.height &&
        !context.projectileBlocked?.(origin.x, origin.y, target.x, target.feetY - target.height / 2))
        .sort((a, b) => Math.hypot(a.x - origin.x, a.feetY - a.height / 2 - origin.y) - Math.hypot(b.x - origin.x, b.feetY - b.height / 2 - origin.y)).slice(0, maxTargets);
      const effect = this.add(kind, owner, origin.x, origin.y, 36, 18, config.damage * damage);
      effect.targetIds = targets.map(target => target.id); effect.range = config.reach * range;
      effect.targets = targets.map(target => ({ id: target.id, x: target.x, y: target.feetY - target.height / 2 }));
      effect.healCap = bounded(tuning.healCap, config.healCap, 0, 40);
    } else {
      const config = THARJA_COMBAT.mire, x = owner.x + owner.facing * config.offset, y = context.surfaceAt(x, owner.feetY);
      if (y === null) return;
      this.effects = this.effects.filter(effect => effect.ownerId !== owner.id || effect.kind !== 'mire');
      const radius = bounded(tuning.fieldRadius, config.radius * range, 40, 240);
      const effect = this.add(kind, owner, x, y, Math.floor(bounded(tuning.fieldDuration, config.life, 60, 600)), radius, config.damage * damage);
      effect.tickFrames = Math.floor(bounded(tuning.tickFrames, config.tickFrames, 18, 90));
      // Follow a connected surface. A cliff or platform edge terminates that side.
      const points = [{ x, y }];
      for (const direction of [-1, 1]) {
        let previous = y;
        for (let distance = 12; distance <= radius; distance += 12) {
          const sampleX = x + direction * distance, sampleY = context.surfaceAt(sampleX, previous - 20);
          if (sampleY === null || Math.abs(sampleY - previous) > 28) break;
          points.push({ x: sampleX, y: sampleY }); previous = sampleY;
        }
      }
      effect.ground = points.sort((a, b) => a.x - b.x);
    }
  }
  private validTarget(target: TharjaTarget, ownerId: number): boolean { return target.alive && target.ownerId !== ownerId; }
  private hit(effect: TharjaEffect, target: TharjaTarget, kind: TharjaSpell, heal = 0): TharjaHit {
    return { ownerId: effect.ownerId, targetId: target.id, kind, amount: effect.amount, heal, x: target.x, y: target.feetY - target.height / 2, facing: effect.facing };
  }
  step(context: TharjaContext): TharjaHit[] {
    const hits: TharjaHit[] = [], owners = new Map(context.owners.filter(owner => owner.alive).map(owner => [owner.id, owner]));
    for (const effect of [...this.effects]) {
      const owner = owners.get(effect.ownerId);
      if (!owner) { effect.life = 0; continue; }
      const targets = context.targets.filter(target => this.validTarget(target, effect.ownerId));
      if (effect.kind === 'flux' || effect.kind === 'ruin') {
        const x = effect.x, y = effect.y;
        // The raised hand is above short enemies. A fixed eight-frame arc brings
        // the visible AND colliding orb into its forward lane; it never homes.
        const launch = effect.age < 8, progress = Math.min(1, (effect.age + 1) / 8), ease = progress * progress * (3 - 2 * progress);
        const vx = launch ? effect.facing * 3 : effect.vx;
        const vy = launch ? effect.originY + (effect.laneY - effect.originY) * ease - y : effect.vy;
        if (context.projectileBlocked?.(x, y, x + vx, y + vy)) { effect.life = 0; continue; }
        const contacts = targets.filter(target => !effect.hitIds.has(target.id)).map(target => ({ target, t: sweep(target, x, y, vx, vy, effect.radius) })).filter(hit => hit.t !== null).sort((a, b) => a.t! - b.t!);
        effect.x += vx; effect.y += vy;
        for (const { target, t } of contacts) {
          if (effect.kind === 'flux') { hits.push(this.hit(effect, target, 'flux')); effect.hitIds.add(target.id); if (effect.hitIds.size >= effect.pierce) { effect.life = 0; break; } }
          else {
            const impactX = x + vx * t!, impactY = y + vy * t!;
            this.add('ruin-burst', owner, impactX, impactY, 22, effect.blastRadius, 0);
            for (const victim of targets) if (intersects(victim, impactX, impactY, effect.blastRadius) && !context.projectileBlocked?.(impactX, impactY, victim.x, victim.feetY - victim.height / 2)) hits.push(this.hit(effect, victim, 'ruin'));
            effect.life = 0; break;
          }
        }
      } else if (effect.kind === 'nosferatu') {
        const palm = context.castOriginAt?.(owner.id);
        effect.originX = palm?.x ?? owner.x + owner.facing * 17; effect.originY = palm?.y ?? owner.feetY - 75;
        effect.targets = targets.filter(target => effect.targetIds.includes(target.id)).map(target => ({ id: target.id, x: target.x, y: target.feetY - target.height / 2 }));
        if (effect.age === THARJA_COMBAT.nosferatu.returnDelay && !effect.resolved) {
          effect.resolved = true;
          for (const id of effect.targetIds) {
            const target = targets.find(candidate => candidate.id === id);
            if (!target || Math.abs(target.x - owner.x) > effect.range + 60 || Math.abs(target.feetY - target.height / 2 - effect.originY) > THARJA_COMBAT.nosferatu.height || context.projectileBlocked?.(effect.originX, effect.originY, target.x, target.feetY - target.height / 2)) continue;
            effect.hitIds.add(id); hits.push(this.hit(effect, target, 'nosferatu', effect.healCap / Math.max(1, effect.targetIds.length)));
          }
        }
        const target = context.targets.find(candidate => candidate.id === effect.targetIds[0]);
        if (target) { effect.x = target.x; effect.y = target.feetY - target.height / 2; }
      } else if (effect.kind === 'mire' && effect.age % effect.tickFrames === 0) {
        const left = effect.ground[0]?.x ?? effect.x, right = effect.ground.at(-1)?.x ?? effect.x;
        for (const target of targets) {
          if (target.x + target.width / 2 < left || target.x - target.width / 2 > right) continue;
          const sample = effect.ground.reduce((a, b) => Math.abs(a.x - target.x) < Math.abs(b.x - target.x) ? a : b);
          if (target.feetY >= sample.y - THARJA_COMBAT.mire.height && target.feetY <= sample.y + 10 && target.feetY - target.height < sample.y && !context.projectileBlocked?.(target.x, sample.y - 3, target.x, target.feetY - target.height / 2)) hits.push(this.hit(effect, target, 'mire'));
        }
      }
      effect.age++; effect.life--;
    }
    this.effects = this.effects.filter(effect => effect.life > 0);
    return hits;
  }
}

/** Independent world-space FX: no generic sword trails or baked-in projectile damage. */
export function drawTharjaEffects(g: CanvasRenderingContext2D, effects: readonly TharjaEffect[]): void {
  for (const effect of effects) {
    g.save();
    const progress = effect.age / effect.maxLife;
    g.globalAlpha = Math.min(1, effect.life / 10); g.strokeStyle = '#d9b2f8'; g.fillStyle = '#341344'; g.lineWidth = 2;
    if (effect.kind === 'flux' || effect.kind === 'ruin' || effect.kind === 'ruin-burst') {
      const burst = effect.kind === 'ruin-burst', radius = burst ? effect.radius * (.35 + progress * .65) : effect.radius;
      g.translate(effect.x, effect.y); g.rotate(effect.age * .1 * effect.facing);
      const glow = g.createRadialGradient(0, 0, 1, 0, 0, radius * 1.8); glow.addColorStop(0, '#edcbff'); glow.addColorStop(.25, '#632b88'); glow.addColorStop(.6, '#8d48b990'); glow.addColorStop(1, '#49196800');
      g.fillStyle = glow; g.beginPath(); g.arc(0, 0, radius * 1.8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(0, 0, radius, radius * .7, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(0, 0, radius * .68, radius * 1.18, .4, 0, Math.PI * 2); g.stroke();
      if (effect.kind === 'ruin') { g.strokeStyle = '#e5c98c'; g.strokeRect(-radius * .64, -radius * .64, radius * 1.28, radius * 1.28); }
    } else if (effect.kind === 'nosferatu' && effect.targetIds.length) {
      for (const target of effect.targets) {
      g.strokeStyle = effect.resolved ? '#eed4fa' : '#9259bd'; g.lineWidth = effect.resolved ? 3 : 1.5;
      const bend = Math.sin(effect.age * .23) * 20;
      g.beginPath(); g.moveTo(effect.originX, effect.originY); g.quadraticCurveTo((effect.originX + target.x) / 2, Math.min(target.y, effect.originY) - 48 + bend, target.x, target.y); g.stroke();
      g.beginPath(); g.ellipse(target.x, target.y, 22 + Math.sin(effect.age * .2) * 3, 29, 0, 0, Math.PI * 2); g.stroke();
      if (effect.resolved && effect.hitIds.has(target.id)) for (let i = 0; i < 3; i++) {
        const t = Math.min(1, (effect.age - THARJA_COMBAT.nosferatu.returnDelay + i * 3) / 20);
        g.fillStyle = '#e4b8f3'; g.beginPath(); g.arc(target.x + (effect.originX - target.x) * t, target.y + (effect.originY - target.y) * t - Math.sin(t * Math.PI) * 32, 3.5, 0, Math.PI * 2); g.fill();
      }
      }
    } else if (effect.kind === 'mire') {
      const pulse = 1 - (effect.age % effect.tickFrames) / effect.tickFrames;
      g.strokeStyle = '#b882db'; g.lineWidth = 2.5; g.beginPath();
      effect.ground.forEach((point, index) => { if (!index) g.moveTo(point.x, point.y - 2); else g.lineTo(point.x, point.y - 2); }); g.stroke();
      for (let i = 0; i < effect.ground.length; i += 2) {
        const point = effect.ground[i], height = 14 + pulse * 38 + Math.sin(effect.age * .09 + i) * 6;
        const glow = g.createLinearGradient(0, point.y - height, 0, point.y); glow.addColorStop(0, '#693b9100'); glow.addColorStop(1, '#a36ace8c'); g.fillStyle = glow;
        g.beginPath(); g.moveTo(point.x - 12, point.y); g.lineTo(point.x - 4, point.y - height); g.lineTo(point.x + 8, point.y); g.fill();
        g.fillStyle = '#ebc98b'; g.fillRect(point.x - 2, point.y - 4, 4, 4);
      }
    }
    g.restore();
  }
}
