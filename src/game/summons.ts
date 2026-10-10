// Shared 60 Hz summon simulation. All positions use feet / ground coordinates.
export type SummonKind = 'geo-pillar' | 'usher' | 'chevalmarin' | 'crabaletta';
export type SummonBranch = 'geo-twin' | 'geo-shield' | 'hydro-ranged' | 'hydro-crab';
export interface SummonOwner { id: number; x: number; feetY: number; facing: 1 | -1; alive: boolean }
export interface SummonTarget { id: number; ownerId?: number; x: number; feetY: number; width: number; height: number; alive: boolean }
export interface SummonTuning { mainLevel?: number; secondaryLevel?: number; branch?: SummonBranch; damageMultiplier?: number; rangeMultiplier?: number }
export interface SummonContext {
  owners: readonly SummonOwner[];
  targets: readonly SummonTarget[];
  surfaceAt: (x: number, nearFeetY: number) => number | null;
  /** Solid terrain only; one-way platforms should not reject a projectile. */
  projectileBlocked?: (oldX: number, oldY: number, newX: number, newY: number) => boolean;
}
export interface SummonEntity {
  id: number; ownerId: number; kind: SummonKind; x: number; feetY: number; facing: 1 | -1;
  age: number; life: number; height: number; phase: 'idle' | 'windup' | 'attack';
  phaseFrame: number; attackProgress?: number; targetId: number | null; cooldown: number;
  tuning: SummonTuning;
}
export interface SummonEffect {
  id: number; ownerId: number; kind: 'geo-meteor' | 'geo-pulse' | 'hydro-wave' | 'bubble' | 'water-pierce' | 'crab-splash';
  x: number; feetY: number; originX: number; originFeetY: number; vx: number; vy: number;
  age: number; life: number; maxLife: number; radius: number; height: number; facing: 1 | -1;
  amount: number; controlFrames: number; hitIds: Set<number>; tuning: SummonTuning; impacted: boolean;
}
export interface SummonHit { ownerId: number; targetId: number; amount: number; controlFrames: number; kind: SummonEffect['kind']; x: number; feetY: number }
export interface SummonShield { hp: number; maxHp: number; life: number }

export class SummonRuntime {
  entities: SummonEntity[] = [];
  effects: SummonEffect[] = [];
  private nextId = 1;
  private shields = new Map<number, SummonShield>();
  private shieldTuning = new Map<number, SummonTuning>();
  private buffs = new Map<number, { life: number; multiplier: number }>();

  // Cast methods are called only at the owner's actual animation release frame.
  castGeo(owner: SummonOwner, context: SummonContext, tuning: SummonTuning = {}): void { this.releaseGeo(owner, context, tuning); }
  castMeteor(owner: SummonOwner, context: SummonContext, tuning: SummonTuning = {}): void { this.releaseMeteor(owner, context, tuning); }
  castSalon(owner: SummonOwner, context: SummonContext, tuning: SummonTuning = {}): void { this.releaseSalon(owner, context, tuning); }
  castRevelry(owner: SummonOwner, context: SummonContext, tuning: SummonTuning = {}): void { this.releaseRevelry(owner, context, tuning); }
  getShield(ownerId: number): Readonly<SummonShield> | undefined { return this.shields.get(ownerId); }
  getBuff(ownerId: number): Readonly<{ life: number; multiplier: number }> | undefined { return this.buffs.get(ownerId); }
  /** Upgrade a living formation without renewing its timers or existing projectiles. */
  refreshOwnerTuning(ownerId: number, tuning: SummonTuning, context: SummonContext): void {
    const owned = this.entities.filter(entity => entity.ownerId === ownerId);
    for (const entity of owned) entity.tuning = { ...tuning };
    const owner = context.owners.find(candidate => candidate.id === ownerId && candidate.alive);
    const primary = owned.find(entity => entity.kind === 'geo-pillar');
    if (owner && primary && tuning.branch === 'geo-twin' && owned.filter(entity => entity.kind === 'geo-pillar').length === 1) {
      const x = primary.x - primary.facing * 138, feet = context.surfaceAt(x, primary.feetY);
      if (feet !== null) this.entities.push({ ...primary, id: this.nextId++, x, feetY: feet, phase: 'idle', phaseFrame: 0, attackProgress: undefined, targetId: null, tuning: { ...tuning } });
    }
    const shield = this.shields.get(ownerId);
    if (shield) {
      const maximum = (tuning.branch === 'geo-shield' ? 28 : 19) + this.level(tuning) * 3;
      shield.hp = Math.min(maximum, shield.hp + Math.max(0, maximum - shield.maxHp));
      shield.maxHp = maximum;
      this.shieldTuning.set(ownerId, { ...tuning });
    }
    const buff = this.buffs.get(ownerId);
    if (buff) buff.multiplier = 1.2 + this.level(tuning, true) * .035;
  }
  damageMultiplier(ownerId: number): number { return this.buffs.get(ownerId)?.multiplier ?? 1; }
  absorb(ownerId: number, amount: number): number {
    const shield = this.shields.get(ownerId);
    if (!shield) return amount;
    const absorbed = Math.min(shield.hp, amount);
    shield.hp -= absorbed;
    if (shield.hp <= 0) { this.shields.delete(ownerId); this.shieldTuning.delete(ownerId); }
    return amount - absorbed;
  }
  clearOwner(ownerId: number): void {
    this.entities = this.entities.filter(entity => entity.ownerId !== ownerId);
    this.effects = this.effects.filter(effect => effect.ownerId !== ownerId);
    this.shields.delete(ownerId); this.shieldTuning.delete(ownerId); this.buffs.delete(ownerId);
  }
  clear(): void { this.entities = []; this.effects = []; this.shields.clear(); this.shieldTuning.clear(); this.buffs.clear(); }
  step(context: SummonContext): SummonHit[] { return this.advance(context); }

  private level(tuning: SummonTuning, secondary = false): number { return Math.max(0, Math.min(5, (secondary ? tuning.secondaryLevel : tuning.mainLevel) ?? 0)); }
  private add(owner: SummonOwner, kind: SummonKind, x: number, feetY: number, tuning: SummonTuning, cooldown: number): void {
    this.entities.push({ id: this.nextId++, ownerId: owner.id, kind, x, feetY, facing: owner.facing, age: 0, life: 720,
      height: kind === 'geo-pillar' ? 154 : kind === 'crabaletta' ? 53 : 48,
      phase: 'idle', phaseFrame: 0, targetId: null, cooldown, tuning: { ...tuning } });
  }
  private effect(owner: SummonOwner, kind: SummonEffect['kind'], x: number, feetY: number, radius: number, height: number, amount: number, life: number, tuning: SummonTuning, vx = 0, vy = 0, controlFrames = 0): void {
    radius *= tuning.rangeMultiplier ?? 1; height *= tuning.rangeMultiplier ?? 1;
    this.effects.push({ id: this.nextId++, ownerId: owner.id, kind, x, feetY, originX: x, originFeetY: feetY, vx, vy, age: 0, life, maxLife: life,
      radius, height, amount: amount * (tuning.damageMultiplier ?? 1), controlFrames, facing: owner.facing, hitIds: new Set(), tuning: { ...tuning }, impacted: false });
    // A hard visual/projectile budget also protects pathological multi-owner callers.
    if (this.effects.length > 96) this.effects.splice(0, this.effects.length - 96);
  }
  private releaseGeo(owner: SummonOwner, context: SummonContext, tuning: SummonTuning): void {
    if (!owner.alive) return;
    this.entities = this.entities.filter(entity => entity.ownerId !== owner.id || entity.kind !== 'geo-pillar');
    const level = this.level(tuning), shieldHp = (tuning.branch === 'geo-shield' ? 28 : 19) + level * 3;
    this.shields.set(owner.id, { hp: shieldHp, maxHp: shieldHp, life: tuning.branch === 'geo-shield' ? 480 : 360 });
    this.shieldTuning.set(owner.id, { ...tuning });
    const offsets = tuning.branch === 'geo-twin' ? [72, -66] : [72];
    for (const offset of offsets) {
      let x = owner.x + owner.facing * offset;
      let feet = context.surfaceAt(x, owner.feetY);
      if (feet === null) { x = owner.x; feet = context.surfaceAt(x, owner.feetY); }
      if (feet === null) continue;
      this.add(owner, 'geo-pillar', x, feet, tuning, 64);
      this.effect(owner, 'geo-pulse', x, feet, 85 + level * 5, 145, 7 + level * 1.4, 24, tuning);
    }
  }
  private releaseMeteor(owner: SummonOwner, context: SummonContext, tuning: SummonTuning): void {
    if (!owner.alive) return;
    const level = this.level(tuning, true), x = owner.x + owner.facing * 145;
    const feet = context.surfaceAt(x, owner.feetY) ?? owner.feetY;
    // The caller releases on the registered landing frame; no second fall delay.
    this.effect(owner, 'geo-meteor', x, feet, 145 + level * 12, 205 + level * 8, 19 + level * 3, 38, tuning, 0, 0, 45 + level * 4);
  }
  private releaseSalon(owner: SummonOwner, context: SummonContext, tuning: SummonTuning): void {
    if (!owner.alive) return;
    this.entities = this.entities.filter(entity => entity.ownerId !== owner.id || entity.kind === 'geo-pillar');
    const kinds: SummonKind[] = ['usher', 'chevalmarin', 'crabaletta'];
    kinds.forEach((kind, index) => {
      const x = owner.x + owner.facing * (35 + index * 34);
      this.add(owner, kind, x, context.surfaceAt(x, owner.feetY) ?? owner.feetY, tuning, 12 + index * 15);
    });
    this.effect(owner, 'hydro-wave', owner.x, owner.feetY, 100, 105, 5 + this.level(tuning), 26, tuning);
  }
  private releaseRevelry(owner: SummonOwner, context: SummonContext, tuning: SummonTuning): void {
    if (!owner.alive) return;
    const level = this.level(tuning, true);
    this.buffs.set(owner.id, { life: 360 + level * 24, multiplier: 1.2 + level * 0.035 });
    const x = owner.x + owner.facing * 80;
    this.effect(owner, 'hydro-wave', x, context.surfaceAt(x, owner.feetY) ?? owner.feetY, 155 + level * 10, 175, 13 + level * 2.5, 34, tuning);
    for (const entity of this.entities) if (entity.ownerId === owner.id && entity.kind !== 'geo-pillar') entity.cooldown = Math.min(entity.cooldown, 6);
  }
  private target(entity: SummonEntity, context: SummonContext): SummonTarget | undefined {
    const range = Math.min(700, (entity.kind === 'geo-pillar' ? 170 + this.level(entity.tuning) * 7 : entity.tuning.branch === 'hydro-ranged' ? 580 : 440) * (entity.tuning.rangeMultiplier ?? 1));
    let best: SummonTarget | undefined, distance = range * range;
    for (const candidate of context.targets) {
      if (!candidate.alive || candidate.ownerId === entity.ownerId) continue;
      const dy = candidate.feetY - candidate.height / 2 - (entity.feetY - entity.height / 2);
      const dx = candidate.x - entity.x, squared = dx * dx + dy * dy;
      if (squared <= distance && Math.abs(dy) < (entity.kind === 'geo-pillar' ? 145 : 230)) { best = candidate; distance = squared; }
    }
    return best;
  }
  private fire(entity: SummonEntity, owner: SummonOwner, target: SummonTarget, context: SummonContext): void {
    const tuning = entity.tuning, level = this.level(tuning), boosted = this.damageMultiplier(owner.id);
    const petOwner = { ...owner, x: entity.x, feetY: entity.feetY, facing: entity.facing };
    if (entity.kind === 'geo-pillar') {
      this.effect(petOwner, 'geo-pulse', entity.x, entity.feetY, 112 + level * 8, 155, (4 + level * 1.1) * boosted, 25, tuning);
    } else if (entity.kind === 'crabaletta') {
      const radius = tuning.branch === 'hydro-crab' ? 105 + level * 6 : 70 + level * 4;
      this.effect(petOwner, 'crab-splash', entity.x, context.surfaceAt(entity.x, entity.feetY) ?? entity.feetY, radius, 120, (8 + level * 1.8) * boosted, 25, tuning);
    } else {
      const kind = entity.kind === 'usher' ? 'bubble' : 'water-pierce';
      const y = entity.feetY - 28, targetY = target.feetY - target.height * 0.48;
      const dx = target.x - entity.x, dy = targetY - y, length = Math.max(1, Math.hypot(dx, dy));
      const speed = kind === 'bubble' ? 6 : 10.5;
      this.effect(petOwner, kind, entity.x, y, kind === 'bubble' ? 17 : 12, kind === 'bubble' ? 34 : 22,
        ((kind === 'bubble' ? 4 : 6) + level * 1.2) * boosted, tuning.branch === 'hydro-ranged' ? 76 : 55, tuning, dx / length * speed, dy / length * speed);
    }
  }
  private advance(context: SummonContext): SummonHit[] {
    const hits: SummonHit[] = [], owners = new Map(context.owners.filter(owner => owner.alive).map(owner => [owner.id, owner]));
    for (const [ownerId, shield] of this.shields) {
      const owner = owners.get(ownerId), tuning = this.shieldTuning.get(ownerId);
      if (!owner || --shield.life <= 0) { this.shields.delete(ownerId); this.shieldTuning.delete(ownerId); }
      else if (tuning?.branch === 'geo-shield' && shield.life % 90 === 0) this.effect(owner, 'geo-pulse', owner.x, owner.feetY, 100, 130, 3 + this.level(tuning), 24, tuning);
    }
    for (const [ownerId, buff] of this.buffs) if (!owners.has(ownerId) || --buff.life <= 0) this.buffs.delete(ownerId);
    for (const entity of this.entities) {
      const owner = owners.get(entity.ownerId);
      if (!owner) { entity.life = 0; continue; }
      entity.age++; entity.life--;
      if (entity.life <= 0) continue;
      if (entity.kind !== 'geo-pillar' && (Math.abs(entity.x - owner.x) > 650 || Math.abs(entity.feetY - owner.feetY) > 400)) {
        entity.x = owner.x - owner.facing * 40;
        entity.feetY = context.surfaceAt(entity.x, owner.feetY) ?? owner.feetY;
        entity.phase = 'idle'; entity.phaseFrame = 0; entity.targetId = null; entity.attackProgress = undefined; entity.cooldown = 18;
      }
      const target = entity.targetId === null ? this.target(entity, context) : context.targets.find(candidate => candidate.id === entity.targetId && candidate.alive && candidate.ownerId !== owner.id);
      if (entity.phase === 'idle') {
        entity.cooldown = Math.max(0, entity.cooldown - (this.damageMultiplier(owner.id) > 1 ? 1.25 : 1));
        if (entity.kind !== 'geo-pillar') {
          const targetX = target && entity.kind === 'crabaletta' ? target.x - Math.sign(target.x - entity.x || owner.facing) * 36 : owner.x + owner.facing * (entity.kind === 'usher' ? -42 : 62);
          const delta = targetX - entity.x;
          if (Math.abs(delta) > 6) entity.x += Math.sign(delta) * Math.min(Math.abs(delta), entity.kind === 'crabaletta' ? 2.5 : 2.1);
          const feet = context.surfaceAt(entity.x, target && entity.kind === 'crabaletta' ? target.feetY : owner.feetY);
          entity.feetY += ((feet ?? owner.feetY) - entity.feetY) * 0.16;
        }
        const crabReady = entity.kind !== 'crabaletta' || (target && Math.abs(target.x - entity.x) < (entity.tuning.branch === 'hydro-crab' ? 115 : 82));
        if (target && entity.cooldown <= 0 && crabReady) {
          entity.targetId = target.id; entity.facing = target.x >= entity.x ? 1 : -1; entity.phase = 'windup'; entity.phaseFrame = 0; entity.attackProgress = 0;
        }
      } else {
        entity.phaseFrame++;
        entity.attackProgress = Math.min(1, entity.phaseFrame / 32);
        if (entity.phaseFrame === 16 && target && Math.abs(target.x - entity.x) < 680 && Math.abs(target.feetY - entity.feetY) < 270) this.fire(entity, owner, target, context);
        entity.phase = entity.phaseFrame < 16 ? 'windup' : 'attack';
        if (entity.phaseFrame >= 32) {
          entity.phase = 'idle'; entity.phaseFrame = 0; entity.attackProgress = undefined; entity.targetId = null;
          entity.cooldown = entity.kind === 'geo-pillar' ? 65 : entity.kind === 'crabaletta' ? 100 : entity.kind === 'usher' ? 70 : 84;
          if (entity.tuning.branch === 'hydro-ranged' && entity.kind !== 'crabaletta') entity.cooldown *= 0.72;
          if (entity.tuning.branch === 'hydro-crab' && entity.kind === 'crabaletta') entity.cooldown *= 0.76;
        }
      }
    }
    this.entities = this.entities.filter(entity => entity.life > 0);
    for (const effect of this.effects) {
      if (!owners.has(effect.ownerId)) { effect.life = 0; continue; }
      const projectile = effect.kind === 'bubble' || effect.kind === 'water-pierce';
      const oldX = effect.x, oldY = effect.feetY;
      if (projectile && context.projectileBlocked?.(oldX, oldY, oldX + effect.vx, oldY + effect.vy)) {
        effect.life = 0; continue;
      }
      effect.x += effect.vx; effect.feetY += effect.vy;
      if (projectile || effect.age === 0) for (const target of context.targets) {
        if (!target.alive || target.ownerId === effect.ownerId || effect.hitIds.has(target.id)) continue;
        const minX = Math.min(oldX, effect.x) - effect.radius, maxX = Math.max(oldX, effect.x) + effect.radius;
        const minY = Math.min(oldY, effect.feetY) - effect.height, maxY = Math.max(oldY, effect.feetY) + (projectile ? effect.height * 0.5 : 12);
        if (target.x + target.width / 2 < minX || target.x - target.width / 2 > maxX || target.feetY < minY || target.feetY - target.height > maxY) continue;
        effect.hitIds.add(target.id); effect.impacted = true;
        hits.push({ ownerId: effect.ownerId, targetId: target.id, amount: effect.amount, controlFrames: effect.controlFrames, kind: effect.kind, x: effect.x, feetY: effect.feetY });
        if (effect.kind === 'bubble') { effect.life = 0; break; }
        if (effect.kind === 'water-pierce' && effect.hitIds.size >= (effect.tuning.branch === 'hydro-ranged' ? 4 : 2)) { effect.life = 0; break; }
      }
      effect.age++; effect.life--;
    }
    this.effects = this.effects.filter(effect => effect.life > 0);
    return hits;
  }
}
