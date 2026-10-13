import { CHARACTERS } from './data';
import type { CharDef, MoveDef } from './data';
import type { PlungeAnimation } from './animation';
import { advanceMotion, newMotionState, newAttackVariants, takeAttackVariant } from './clip-animation';
import type { AttackVariantState, AttackVisualVariant, MotionState } from './clip-animation';
import { acquireGameArt, getSwordCastTip, getTharjaCastOrigin, getCharacterCastOrigin } from './art';
import type { GameArtLease } from './art';
import { castVisualFromTip } from './cast-visual';
import type { CastVisual } from './cast-visual';
import {
  SURVIVAL_WORLD, SURVIVAL_DURATION, SURVIVAL_BASE_HP, SURVIVAL_BRANCHES, groundHeightAt,
  TACTICAL_DURATION, getTacticalMap, EXPEDITION_WORLD, EXPEDITION_REGIONS, EXPEDITION_MAPS, getExpeditionRegion,
  makeInitialProgress, xpForLevel, getUpgradeChoices, rerollUpgradeChoices, applyChoice, getUpgradeSummary, getSurvivalStats, getSecondaryProfile, getTharjaSurvivalProfile,
} from './survival-data';
import type { SurvivalProgress, UpgradeChoice, SurvivalOptions, SurvivalVariant, SurvivalWorld, TacticalMapDefinition, TacticalStats, TacticalEnemyRole, TacticalSpawn, TacticalHazardSnapshot, ExpeditionSnapshot, TacticalMapId } from './survival-data';
import { renderSurvival } from './survival-render';
import { BattleAudio } from './audio';
import { BattleInput } from './input';
import type { BattleAction } from './input';
import type { VisualQuality } from './visual-quality';
import { SummonRuntime } from './summons';
import type { SummonContext, SummonTuning } from './summons';
import { TharjaRuntime, THARJA_COMBAT } from './tharja';
import type { TharjaTuning, TharjaContext } from './tharja';

export type SurvivalPhase = 'playing' | 'paused' | 'upgrade' | 'victory' | 'defeat';
export interface SurvivalAttack {
  def: MoveDef; t: number; hit: Set<number>; emitted: boolean;
  visualVariant?: AttackVisualVariant;
  plunge?: PlungeAnimation & { previousFeet: number };
}
export interface Survivor {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  onGround: boolean; jumps: number; drop: number; hp: number; invuln: number;
  dodge: number; dodgeCooldown: number; skillCooldown: number; secondaryCooldown: number; attack: SurvivalAttack | null;
  motion: MotionState;
  nextAttackVariants: AttackVariantState;
}
export interface SurvivalEnemy {
  id: number; kind: 'slime' | 'flyer' | 'ranged'; elite: boolean; boss: boolean;
  x: number; y: number; vx: number; vy: number; radius: number;
  hp: number; maxHp: number; speed: number; damage: number; xp: number;
  age: number; flash: number; slow: number; cooldown: number; tell: number;
  aimX: number; aimY: number; stacks: number; grounded: boolean;
  petrify?: number;
  role?: TacticalEnemyRole;
  state?: 'arriving' | 'ready' | 'windup' | 'active' | 'recover';
  stateTimer?: number;
  facing?: 1 | -1;
  homeX?: number;
  chargeHit?: boolean;
}
export interface SurvivalOrb { x: number; y: number; vy: number; value: number; heal: boolean; age: number }
export interface SurvivalShot {
  x: number; y: number; startX: number; vx: number; vy: number; age: number; life: number;
  radius: number; damage: number; owner: 'player' | 'enemy'; color: string;
  hit: Set<number>; returning: boolean; returned: boolean; kind: 'blade' | 'fire' | 'bolt' | 'frost' | 'phoenix' | 'wind';
  secondary?: boolean; piercing?: boolean;
  castVisual?: CastVisual;
}
export interface SurvivalField {
  x: number; y: number; radius: number; age: number; life: number; damage: number;
  kind: 'vortex' | 'sanctuary' | 'flame' | 'orbit' | 'pillar' | 'thunder' | 'updraft'; tick: number;
  height?: number; hit?: Set<number>;
}
export interface SurvivalEffect { x: number; y: number; age: number; life: number; size: number; kind: 'slash' | 'impact' | 'plunge' | 'ring' | 'chain' | 'secondary'; color: string; x2?: number; y2?: number; facing?: 1 | -1; melee?: { kind: 'jab' | 'smash'; variant?: AttackVisualVariant } }
export interface SurvivalText { x: number; y: number; age: number; text: string; color: string; big: boolean }

const STEP = 1000 / 60;
const HURT_HITSTOP_FRAMES = 4;
const VIEW_W = 1280, VIEW_H = 720;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (x: number, y: number, x2: number, y2: number) => Math.hypot(x - x2, y - y2);

/** Independent manual-combat survival simulation. A tick is always exactly 1/60 second. */
export class SurvivalGame {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  char: CharDef = CHARACTERS[0];
  selectedPlayer = 0;
  variant: SurvivalVariant = 'survival';
  tacticalMap: TacticalMapDefinition = getTacticalMap();
  world: SurvivalWorld = SURVIVAL_WORLD;
  duration = SURVIVAL_DURATION;
  encounterIndex = -1;
  tacticalStats: TacticalStats = { windRides: 0, layerChanges: 0, guardsBroken: 0, chargesEvaded: 0 };
  private windEngaged = false;
  private tacticalLayer = 0;
  private layerChangedAt = 0;
  private pendingSpawns: TacticalSpawn[] = [];
  private hazardHitCycles = new Map<string, number>();
  private expeditionRegionId: TacticalMapId = 'wind-ruins';
  private visitedRegions = new Set<TacticalMapId>();
  private expeditionRegionFrames = new Map<TacticalMapId, number>();
  private expeditionOutposts = new Set<string>();
  private expeditionHazardFrame = 0;
  private expeditionBossStarted = false;
  phase: SurvivalPhase = 'playing';
  muted = false;
  visualQuality: VisualQuality = 'standard';
  elapsed = 0;
  frame = 0;
  hitstop = 0;
  level = 1;
  xp = 0;
  kills = 0;
  eliteKills = 0;
  bossKilled = false;
  damageDealt = 0;
  progress: SurvivalProgress = makeInitialProgress('raiden');
  choices: UpgradeChoice[] = [];
  rerollsRemaining = 2;
  player: Survivor = this.newPlayer();
  enemies: SurvivalEnemy[] = [];
  orbs: SurvivalOrb[] = [];
  shots: SurvivalShot[] = [];
  fields: SurvivalField[] = [];
  effects: SurvivalEffect[] = [];
  texts: SurvivalText[] = [];
  summons = new SummonRuntime();
  tharja = new TharjaRuntime();
  camera = { x: 0, y: 350 };
  private input = new BattleInput();
  private artLease?: GameArtLease;
  notice = '';
  noticeTimer = 0;
  spawnTimer = 45;
  nextId = 1;
  eliteMilestones = new Set<number>();
  skillCooldownMax = 2.7;
  dodgeCooldownMax = 1.3;
  private raf = 0;
  private lastTime = 0;
  private accumulator = 0;
  private destroyed = false;
  private audio = new BattleAudio();
  private pendingAttack: { kind: 'jab' | 'smash' | 'special' | 'secondary'; frames: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VIEW_W; canvas.height = VIEW_H;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is required');
    this.context = context;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame(this.loop);
  }

  groundHeightAt(x: number): number { return groundHeightAt(x, this.world); }

  private newPlayer(): Survivor {
    const x = this.variant === 'expedition' ? 400 : this.variant === 'tactical' ? this.tacticalMap.spawnX : this.world.width / 2;
    return { x, y: this.groundHeightAt(x), vx: 0, vy: 0, facing: 1,
      onGround: true, jumps: 2, drop: 0, hp: SURVIVAL_BASE_HP, invuln: 0,
      dodge: 0, dodgeCooldown: 0, skillCooldown: 0, secondaryCooldown: 0, attack: null, motion: newMotionState(), nextAttackVariants: newAttackVariants() };
  }

  start(options: SurvivalOptions) {
    this.variant = options.variant === 'expedition' ? 'expedition' : options.variant === 'tactical' ? 'tactical' : 'survival';
    this.tacticalMap = getTacticalMap(this.variant === 'tactical' ? options.mapId : undefined);
    this.world = this.variant === 'expedition' ? EXPEDITION_WORLD : this.variant === 'tactical' ? this.tacticalMap.world : SURVIVAL_WORLD;
    this.duration = this.variant === 'tactical' ? TACTICAL_DURATION : SURVIVAL_DURATION;
    this.encounterIndex = -1; this.pendingSpawns = [];
    this.hazardHitCycles.clear();
    this.expeditionRegionId = 'wind-ruins'; this.visitedRegions.clear(); this.expeditionRegionFrames.clear();
    this.expeditionOutposts.clear(); this.expeditionHazardFrame = 0; this.expeditionBossStarted = false;
    this.tacticalStats = { windRides: 0, layerChanges: 0, guardsBroken: 0, chargesEvaded: 0 };
    this.windEngaged = false; this.tacticalLayer = 0; this.layerChangedAt = 0;
    this.selectedPlayer = clamp(Math.floor(options.player), 0, CHARACTERS.length - 1);
    this.char = CHARACTERS[this.selectedPlayer];
    const previousArt = this.artLease;
    this.artLease = acquireGameArt([this.char.id]);
    previousArt?.release();
    void this.artLease.ready;
    this.progress = makeInitialProgress(this.char.id);
    if (this.variant === 'tactical') { this.progress.skillLevel = 3; this.progress.secondaryLevel = 3; }
    this.player = this.newPlayer();
    this.tacticalLayer = this.player.y < 600 ? 2 : this.player.y < 800 ? 1 : 0;
    this.enemies = []; this.orbs = []; this.shots = []; this.fields = []; this.effects = []; this.texts = [];
    this.summons.clear();
    this.tharja.clear();
    this.elapsed = 0; this.frame = 0; this.hitstop = 0; this.level = 1; this.xp = 0;
    this.kills = 0; this.eliteKills = 0; this.bossKilled = false; this.damageDealt = 0;
    this.choices = []; this.rerollsRemaining = 2; this.nextId = 1; this.eliteMilestones.clear(); this.spawnTimer = 30;
    this.notice = '秘境开启 · 手动出招，拾取晶石升级'; this.noticeTimer = 240;
    this.phase = 'playing'; this.clearInput();
    if (this.variant === 'tactical') { this.rerollsRemaining = 0; this.updateTacticalSpawning(); }
    if (this.variant === 'expedition') {
      this.visitedRegions.add('wind-ruins');
      this.notice = '遗迹漫游 · 三片遗迹自由往返，拾取晶石成长，生存十分钟'; this.noticeTimer = 300;
    }
    this.audio.restart(); this.audio.setScene('playing');
    this.camera = { x: clamp(this.player.x - VIEW_W / 2, 0, this.world.width - VIEW_W), y: this.variant !== 'survival' ? 230 : clamp(this.player.y - 565, 0, this.world.height - VIEW_H) };
    this.skillCooldownMax = this.char.specialCooldown ?? (this.char.id === 'xiao' ? 2.3 : 2.7);
    this.accumulator = 0; this.lastTime = 0;
  }

  getSnapshot() {
    const stats = getSurvivalStats(this.progress);
    return {
      variant: this.variant, duration: this.duration, encounterIndex: Math.max(0, this.encounterIndex),
      mapId: this.variant === 'expedition' ? this.expeditionRegionId : this.tacticalMap.id, mapName: this.variant === 'expedition' ? '遗迹漫游' : this.variant === 'tactical' ? this.tacticalMap.name : '秘境长廊',
      encounterName: this.variant === 'tactical' ? this.tacticalMap.encounters[Math.max(0, this.encounterIndex)].name : this.waveName(),
      tacticalStats: { ...this.tacticalStats },
      tacticalHazards: this.getTacticalHazards(),
      expedition: this.getExpeditionSnapshot(),
      phase: this.phase, muted: this.muted, charId: this.char.id, visualQuality: this.visualQuality,
      elapsed: this.elapsed, remaining: Math.max(0, this.duration - this.elapsed),
      hp: this.player.hp, maxHp: stats.maxHp, level: this.level, xp: this.xp, xpNeeded: xpForLevel(this.level),
      kills: this.kills, eliteKills: this.eliteKills, bossKilled: this.bossKilled,
      skillLevel: this.progress.skillLevel, secondaryLevel: this.progress.secondaryLevel, branch: this.progress.branch,
      branchName: SURVIVAL_BRANCHES[this.char.id]?.find(b => b.id === this.progress.branch)?.name ?? null,
      choices: this.choices, rerollsRemaining: this.rerollsRemaining, upgrades: getUpgradeSummary(this.progress), waveName: this.waveName(), damageDealt: this.damageDealt,
      skillCooldown: this.player.skillCooldown / 60, skillCooldownMax: this.skillCooldownMax * (1 - (this.progress.skillLevel - 1) * .075),
      secondaryCooldown: this.player.secondaryCooldown / 60, secondaryCooldownMax: this.char.secondaryCooldown * getSecondaryProfile(this.char.id, this.progress.secondaryLevel).cooldownMultiplier,
      dodgeCooldown: this.player.dodgeCooldown / 60, dodgeCooldownMax: this.dodgeCooldownMax,
      onGround: this.player.onGround,
      canSpecial: this.phase === 'playing' && this.player.skillCooldown <= 0 && !(this.char.id === 'xiao' && this.player.onGround),
      canSecondary: this.phase === 'playing' && this.player.secondaryCooldown <= 0,
      canDodge: this.phase === 'playing' && this.player.dodgeCooldown <= 0 && !this.player.attack?.plunge,
      shieldHp: this.summons.getShield(0)?.hp ?? 0,
      shieldRemaining: (this.summons.getShield(0)?.life ?? 0) / 60,
      summonCount: this.summons.entities.length,
      summonRemaining: Math.max(0, ...this.summons.entities.map(entity => entity.life)) / 60,
      buffRemaining: (this.summons.getBuff(0)?.life ?? 0) / 60,
      notice: this.notice, playerX: this.player.x, worldWidth: this.world.width,
    };
  }

  /** One simulation clock drives collision, HUD and rendering, including pauses. */
  getTacticalHazards(): TacticalHazardSnapshot[] {
    if (this.variant === 'survival') return [];
    const expedition = this.variant === 'expedition';
    if (expedition && this.expeditionRegionId !== 'mechanism-hall') return [];
    const hazards = expedition ? EXPEDITION_MAPS[2].hazards : this.tacticalMap.hazards;
    return (hazards ?? []).map(hazard => {
      if (expedition && this.expeditionBossStarted) return { ...hazard, state: 'off', phaseRemaining: 0, cycleIndex: -1 };
      const elapsed = (expedition ? this.expeditionHazardFrame : this.frame) - hazard.offsetFrames;
      if (elapsed < 0) return { ...hazard, state: 'off', phaseRemaining: -elapsed / 60, cycleIndex: -1 };
      const cycleIndex = Math.floor(elapsed / hazard.periodFrames), phase = elapsed % hazard.periodFrames;
      if (phase < hazard.warningFrames) return { ...hazard, state: 'warning', phaseRemaining: (hazard.warningFrames - phase) / 60, cycleIndex };
      if (phase < hazard.warningFrames + hazard.activeFrames) return { ...hazard, state: 'active', phaseRemaining: (hazard.warningFrames + hazard.activeFrames - phase) / 60, cycleIndex };
      return { ...hazard, state: 'off', phaseRemaining: (hazard.periodFrames - phase) / 60, cycleIndex };
    });
  }

  getExpeditionSnapshot(): ExpeditionSnapshot | null {
    if (this.variant !== 'expedition') return null;
    const region = getExpeditionRegion(this.player.x);
    const next = EXPEDITION_REGIONS.find(candidate => !this.visitedRegions.has(candidate.id));
    const objective = this.expeditionBossStarted ? '首领已现身 · 地火熄灭、停止增援，存活至十分钟' :
      next ? `${next.startX > this.player.x ? '向东 →' : '← 向西'} 探索${next.name} · ${region.objective}` : '三片遗迹已探索 · 自由往返成长，九分钟迎战首领';
    return { regionId: region.id, regionName: region.name, visitedRegions: [...this.visitedRegions], objective, bossStarted: this.expeditionBossStarted };
  }

  getMapCapabilities(): TacticalMapDefinition[] {
    return this.variant === 'expedition' ? EXPEDITION_MAPS : this.variant === 'tactical' ? [this.tacticalMap] : [];
  }

  pause() {
    if (this.phase === 'paused') this.resume();
    else if (this.phase === 'playing') { this.phase = 'paused'; this.clearInput(); this.accumulator = 0; this.audio.setScene('paused'); }
  }
  resume() {
    if (this.phase === 'paused') { this.phase = 'playing'; this.clearInput(); this.accumulator = 0; this.lastTime = 0; this.audio.setScene('playing'); }
  }
  rematch() { this.start({ player: this.selectedPlayer, variant: this.variant, mapId: this.tacticalMap.id }); }
  setMuted(value: boolean) { this.muted = value; this.audio.setMuted(value); }
  setVisualQuality(quality: VisualQuality) { this.visualQuality = quality === 'low' ? 'low' : 'standard'; }
  setTouchAction(action: BattleAction, source: string, down: boolean) {
    this.input.setTouchAction(action, source, down, !this.destroyed && this.phase === 'playing');
    if (down && !this.destroyed && this.phase === 'playing') this.audio.unlock();
  }
  clearTouchInput() { this.input.clearTouch(); this.pendingAttack = null; }
  chooseUpgrade(id: string): boolean {
    if (this.phase !== 'upgrade') return false;
    const next = applyChoice(this.progress, id, this.choices);
    if (!next) return false;
    const oldStats = getSurvivalStats(this.progress);
    const becameReady = this.progress.skillLevel < 4 && next.skillLevel >= 4 && !next.branch;
    this.progress = next;
    this.summons.refreshOwnerTuning(0, this.summonTuning(), this.summonContext());
    const stats = getSurvivalStats(next);
    this.player.hp = Math.min(stats.maxHp, this.player.hp + Math.max(0, stats.maxHp - oldStats.maxHp) + 6);
    this.choices = []; this.clearInput(); this.phase = 'playing';
    this.accumulator = 0; this.lastTime = 0;
    if (becameReady) {
      this.choices = getUpgradeChoices(this.progress); this.phase = 'upgrade';
    } else this.checkLevelUp();
    this.audio.setScene(this.phase === 'playing' ? 'playing' : 'upgrade');
    if (this.phase === 'playing') this.audio.play('upgrade');
    return true;
  }
  rerollUpgrades(): boolean {
    if (this.phase !== 'upgrade' || this.rerollsRemaining <= 0 || this.choices.some(choice => choice.kind === 'branch')) return false;
    const next = rerollUpgradeChoices(this.progress, this.choices);
    if (!next) return false;
    this.choices = next; this.rerollsRemaining--; this.clearInput(); return true;
  }
  destroy() {
    this.destroyed = true; cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.clearInput();
    this.summons.clear();
    this.tharja.clear();
    this.artLease?.release();
    this.audio.destroy();
  }

  private clearInput() { this.input.clear(); this.pendingAttack = null; }
  private onKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement !== this.canvas || this.destroyed) return;
    const controls = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyL', 'KeyI', 'KeyH', 'Escape', 'KeyP', 'KeyM'];
    if (!controls.includes(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    this.audio.unlock();
    if (event.code === 'KeyM') { this.setMuted(!this.muted); return; }
    if (event.code === 'Escape' || event.code === 'KeyP') { this.pause(); return; }
    this.input.setKey(event.code, true, this.phase === 'playing');
  };
  private onKeyUp = (event: KeyboardEvent) => { this.input.setKey(event.code, false); };
  private onBlur = () => { if (this.phase === 'playing') this.pause(); this.clearInput(); };
  private onVisibility = () => { if (document.hidden) this.onBlur(); };
  private loop = (timestamp: number) => {
    if (this.destroyed) return;
    if (!this.lastTime) this.lastTime = timestamp;
    const delta = Math.min(80, timestamp - this.lastTime); this.lastTime = timestamp;
    if (this.phase === 'playing') {
      this.accumulator += delta;
      while (this.accumulator >= STEP && this.phase === 'playing') { this.update(); this.accumulator -= STEP; }
    } else this.accumulator = 0;
    renderSurvival(this);
    this.raf = requestAnimationFrame(this.loop);
  };

  update() {
    if (this.phase !== 'playing') return;
    // Freeze the whole battlefield at a tick boundary, preserving action time
    // and input edges until the short impact pause has finished.
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.frame++; this.elapsed = this.frame / 60;
    if (this.elapsed >= this.duration) { this.elapsed = this.duration; this.phase = 'victory'; this.clearInput(); this.audio.setScene('result'); return; }
    if (this.noticeTimer > 0 && --this.noticeTimer === 0) this.notice = '';
    this.updatePlayer();
    if (this.variant === 'expedition') this.updateExpeditionRegion();
    this.updateTacticalHazards();
    if (this.phase !== 'playing') return;
    this.updateSummons();
    this.updateTharja();
    this.updateSpawning();
    this.updateEnemies();
    if (this.phase !== 'playing') return;
    this.updateShots();
    if (this.phase !== 'playing') return;
    this.updateFields();
    this.updateOrbs();
    this.effects = this.effects.filter(effect => ++effect.age < effect.life);
    this.texts = this.texts.filter(text => ++text.age < 48);
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    this.camera.x += (clamp(this.player.x - VIEW_W / 2, 0, this.world.width - VIEW_W) - this.camera.x) * 0.12;
    const cameraY = this.variant !== 'survival' ? clamp(this.player.y - 200, 0, 230) : clamp(this.player.y - 510, 0, this.world.height - VIEW_H);
    this.camera.y += (cameraY - this.camera.y) * 0.10;
    if (this.player.hp <= 0) { this.player.hp = 0; this.phase = 'defeat'; this.player.attack = null; this.player.nextAttackVariants = newAttackVariants(); this.clearInput(); this.summons.clear(); this.tharja.clear(); this.audio.setScene('result'); }
    else this.checkLevelUp();
    this.input.endTick();
  }

  private updatePlayer() {
    const p = this.player, stats = getSurvivalStats(this.progress);
    const wasGrounded = p.onGround;
    const previousX = p.x;
    const startedOnTerrain = p.onGround && Math.abs(p.y - this.groundHeightAt(p.x)) < 1;
    p.invuln = Math.max(0, p.invuln - 1); p.drop = Math.max(0, p.drop - 1);
    p.secondaryCooldown = Math.max(0, p.secondaryCooldown - 1);
    p.skillCooldown = Math.max(0, p.skillCooldown - 1); p.dodgeCooldown = Math.max(0, p.dodgeCooldown - 1);
    if (this.input.justPressed('dodge') && p.dodgeCooldown <= 0 && !p.attack?.plunge) {
      p.dodge = 16; p.dodgeCooldown = this.dodgeCooldownMax * 60; p.invuln = Math.max(p.invuln, 20); p.attack = null;
      this.tharja.cancelDrain(0);
      this.audio.play('dodge', { charId: this.char.id });
    }
    const direction = this.input.horizontal();
    if (direction && !p.attack?.plunge && p.attack?.def.kind !== 'secondary') p.facing = direction as 1 | -1;
    if (p.dodge > 0) { p.dodge--; p.vx = p.facing * 10.5; }
    else p.vx = direction * this.char.speed * stats.speedMultiplier * (p.attack ? 0.6 : 1);
    if (this.input.justPressed('jump') && p.jumps > 0 && !p.attack?.plunge) {
      p.vy = -this.char.jump * 1.03; p.jumps--; p.onGround = false;
      this.effect('ring', p.x, p.y, 45, '#d0f8ee', 18);
      this.audio.play('jump', { charId: this.char.id });
    }
    if (this.input.justPressed('down') && p.onGround && p.y < this.groundHeightAt(p.x) - 1 && !p.attack?.plunge) {
      p.drop = 16; p.onGround = false; p.y += 5; p.vy = 2;
    }
    const request = this.input.justPressed('secondary') ? 'secondary' : this.input.justPressed('special') ? 'special' : this.input.justPressed('smash') ? 'smash' : this.input.justPressed('jab') ? 'jab' : null;
    if (request) this.pendingAttack = { kind: request, frames: 8 };
    if (this.pendingAttack) {
      if (!p.attack && !p.dodge) { this.beginAttack(this.pendingAttack.kind); this.pendingAttack = null; }
      else if (--this.pendingAttack.frames <= 0) this.pendingAttack = null;
    }
    const previousFeet = p.y;
    const plunge = p.attack?.plunge;
    if (plunge?.phase === 'windup') { p.vy = 0; p.vx = 0; }
    else if (plunge?.phase === 'dive') { p.vy = 30; p.vx = 0; }
    else if (p.attack?.def.effect === 'thrust' && p.attack.t >= p.attack.def.startup && p.attack.t < p.attack.def.startup + p.attack.def.active) { p.vx = p.facing * 12; p.vy = 0; }
    else p.vy = Math.min(this.input.held('down') ? 17 : 12, p.vy + 0.53 * this.char.gravMul);
    this.applyTacticalWind();
    p.x = clamp(p.x + p.vx, 38, this.world.width - 38);
    p.y += p.vy; p.onGround = false;
    // Continue across either slope direction without turning walking into tiny falls.
    const followsTerrain = startedOnTerrain && p.vy >= 0 && !plunge;
    const landing = followsTerrain ? this.followTerrainHeight(p.x, previousX, previousFeet, p.drop > 0) : this.findLanding(p.x, previousFeet, p.y, p.drop > 0 && !plunge, previousX);
    if (p.vy >= 0 && landing !== null) {
      if (!wasGrounded && p.vy > 2 && !plunge) this.audio.play('land', { charId: this.char.id, power: Math.min(12, p.vy) });
      p.y = landing; p.vy = 0; p.onGround = true;
      if (!followsTerrain) p.jumps = 2;
      if (plunge?.phase === 'dive') this.landPlunge();
    }
    // Solid slopes also stop horizontal air thrusts and recovery from penetration.
    if (p.y > this.groundHeightAt(p.x)) { p.y = this.groundHeightAt(p.x); p.onGround = true; p.jumps = 2; p.vy = 0; if (plunge?.phase === 'dive') this.landPlunge(); }
    this.trackTacticalLayer();
    this.updateAttack(previousFeet);
    // Diluc's active L moves after the ordinary movement step.
    if (p.onGround && Math.abs(previousFeet - this.groundHeightAt(previousX)) < 1) p.y = this.followTerrainHeight(p.x, previousX, previousFeet, p.drop > 0);
    else if (p.y > this.groundHeightAt(p.x)) { p.y = this.groundHeightAt(p.x); p.vy = 0; p.onGround = true; p.jumps = 2; }
    advanceMotion(p.motion, { dx: p.x - previousX, onGround: p.onGround, facing: p.facing,
      walking: !p.attack && !p.dodge && direction !== 0,
      slope: Math.abs(p.y - this.groundHeightAt(p.x)) < 1 ? (this.groundHeightAt(p.x + 12) - this.groundHeightAt(p.x - 12)) / 24 : 0 });
  }

  /** Preserve the flush bridge seam while keeping ordinary slopes and deliberate drops intact. */
  private followTerrainHeight(x: number, previousX: number, feetY: number, drop = false): number {
    const ground = this.groundHeightAt(x);
    if (drop || (this.variant !== 'expedition' && (this.variant !== 'tactical' || this.tacticalMap.id !== 'broken-bridge'))) return ground;
    const bridge = this.world.platforms.filter(platform => Math.abs(platform.y - feetY) < 1 &&
      previousX >= platform.x - 16 && previousX <= platform.x + platform.w + 16 &&
      x >= platform.x - 16 && x <= platform.x + platform.w + 16);
    return Math.min(ground, ...bridge.map(platform => platform.y));
  }

  private findLanding(x: number, previous: number, next: number, drop = false, previousX = x): number | null {
    const ground = this.groundHeightAt(x);
    const groundCrossed = previous <= this.groundHeightAt(previousX) + 0.1 && next >= ground;
    const surfaces = !drop ? this.world.platforms : [];
    const crossed = surfaces.filter(platform => x >= platform.x - 16 && x <= platform.x + platform.w + 16 && previous <= platform.y + 0.1 && next >= platform.y);
    const heights = crossed.map(platform => platform.y);
    if (groundCrossed) heights.push(ground);
    return heights.length ? Math.min(...heights) : null;
  }

  private beginAttack(kind: MoveDef['kind']) {
    const p = this.player;
    if (kind === 'secondary' && p.secondaryCooldown > 0) return;
    if (kind === 'special' && p.skillCooldown > 0) return;
    if (kind === 'special' && this.char.id === 'xiao' && p.onGround) {
      this.notice = '魈 · 先按 W 跳跃，再按 L 下坠'; this.noticeTimer = 105; return;
    }
    const base = this.char[kind];
    const speed = 1 + (this.progress.upgrades.speed ?? 0) * 0.035;
    const def: MoveDef = { ...base, startup: Math.max(3, Math.round(base.startup / speed)), endlag: Math.round(base.endlag * 0.7 / speed) };
    p.attack = { def, t: 0, hit: new Set(), emitted: false, visualVariant: takeAttackVariant(p.nextAttackVariants, kind) };
    if (kind === 'secondary') p.secondaryCooldown = this.char.secondaryCooldown * 60 * getSecondaryProfile(this.char.id, this.progress.secondaryLevel).cooldownMultiplier;
    if (kind === 'special') {
      p.skillCooldown = this.skillCooldownMax * 60 * (1 - (this.progress.skillLevel - 1) * 0.075);
      if (this.char.id === 'xiao') p.attack.plunge = { phase: 'windup', elapsed: 0, previousFeet: p.y, recoveryDuration: def.endlag };
    }
    if (kind === 'jab' || kind === 'smash') this.audio.play('attack', { charId: this.char.id, kind });
  }

  private updateAttack(previousFeet: number) {
    const p = this.player, attack = p.attack;
    if (!attack) return;
    attack.t++;
    if (attack.plunge) {
      const plunge = attack.plunge;
      plunge.elapsed++;
      if (plunge.phase === 'windup' && plunge.elapsed >= attack.def.startup) { plunge.phase = 'dive'; plunge.elapsed = 0; this.audio.play('cast', { charId: this.char.id, kind: 'special' }); }
      else if (plunge.phase === 'dive') {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || attack.hit.has(enemy.id)) continue;
          if (Math.abs(enemy.x - p.x) < 40 + enemy.radius && enemy.y >= previousFeet - 22 && enemy.y - enemy.radius <= p.y + 48) {
            attack.hit.add(enemy.id); this.hurtEnemy(enemy, this.attackDamage('special') * 0.4, 1, 'dive');
          }
        }
      } else if (plunge.phase === 'impact' && plunge.elapsed >= attack.def.active) { plunge.phase = 'recover'; plunge.elapsed = 0; }
      else if (plunge.phase === 'recover' && plunge.elapsed >= attack.def.endlag) p.attack = null;
      plunge.previousFeet = p.y;
      return;
    }
    const active = attack.t >= attack.def.startup && attack.t < attack.def.startup + attack.def.active;
    if (active && !attack.emitted) {
      attack.emitted = true;
      if (this.char.id === 'tharja') this.releaseTharja(attack.def.kind);
      else if (attack.def.kind === 'secondary') this.releaseSecondary();
      else if (attack.def.kind === 'special') this.releaseSpecial();
      else {
        const stats = getSurvivalStats(this.progress);
        const reach = (attack.def.reach + 38) * stats.rangeMultiplier;
        this.melee(reach, 108, this.attackDamage(attack.def.kind), attack.hit, false);
        this.effect('slash', p.x + p.facing * reach * 0.57, p.y - 51, reach * 1.7, this.char.color, 19).melee = { kind: attack.def.kind, variant: attack.visualVariant };
      }
      this.triggerAuxiliary();
      if (this.progress.branch === 'eula-orbit' && !this.fields.some(field => field.kind === 'orbit')) this.field('orbit', p.x, p.y - 45, 155 * this.specialRange(), 175, this.attackDamage('jab') * 0.5);
    }
    if (active && attack.def.effect === 'thrust') {
      this.melee(92 * this.secondaryRange(), 105, this.attackDamage('secondary'), attack.hit, false);
      if (attack.t % 3 === 0) this.effect('secondary', p.x - p.facing * 25, p.y - 48, 185, this.char.color, 12);
    }
    if (attack.t >= attack.def.startup + attack.def.active + attack.def.endlag) p.attack = null;
    if (active && this.char.id === 'diluc' && attack.def.kind === 'special') {
      const previousX = p.x;
      const followsTerrain = p.onGround && Math.abs(p.y - this.groundHeightAt(p.x)) < 1;
      p.x = clamp(p.x + p.facing * 7, 38, this.world.width - 38);
      if (followsTerrain) p.y = this.followTerrainHeight(p.x, previousX, p.y, p.drop > 0);
      if (this.progress.branch === 'diluc-trail' && attack.t % 4 === 0) this.field('flame', p.x, Math.min(p.y, this.groundHeightAt(p.x)) - 12, 66, 185, this.attackDamage('special') * 0.22);
      this.melee(90 * this.specialRange(), 110 * this.specialRange(), this.attackDamage('special'), attack.hit, false);
    }
  }

  private attackDamage(kind: MoveDef['kind']) {
    const stats = getSurvivalStats(this.progress);
    const buff = this.summons.damageMultiplier(0);
    if (kind === 'secondary') return this.char.secondary.dmg * 4.8 * stats.damageMultiplier * buff * getSecondaryProfile(this.char.id, this.progress.secondaryLevel).damageMultiplier;
    return this.char[kind].dmg * (kind === 'jab' ? 6.4 : 4.8) * stats.damageMultiplier * buff * (kind === 'special' ? 1 + (this.progress.skillLevel - 1) * 0.24 : 1);
  }
  private secondaryRange() { return getSurvivalStats(this.progress).rangeMultiplier * getSecondaryProfile(this.char.id, this.progress.secondaryLevel).rangeMultiplier; }
  private specialRange() {
    return getSurvivalStats(this.progress).rangeMultiplier * (1 + (this.progress.skillLevel - 1) * 0.08);
  }

  private releaseTharja(kind: MoveDef['kind']) {
    const p = this.player, stats = getSurvivalStats(this.progress), profile = getTharjaSurvivalProfile(this.progress);
    const context = this.tharjaContext();
    const origin = getTharjaCastOrigin(p.x, p.y, 112, kind, p.facing) ?? { x: p.x + p.facing * 32, y: p.y - 52 };
    const tuning: TharjaTuning = { damageMultiplier: stats.damageMultiplier * this.summons.damageMultiplier(0) * (kind === 'jab' ? 6.4 : 4.8), rangeMultiplier: stats.rangeMultiplier };
    if (kind === 'jab') Object.assign(tuning, { damageMultiplier: tuning.damageMultiplier! * profile.fluxDamage, projectileCount: profile.fluxCount, pierce: profile.fluxPierce });
    else if (kind === 'smash') Object.assign(tuning, { damageMultiplier: tuning.damageMultiplier! * profile.ruinDamage, projectileCount: profile.ruinCount, blastRadius: profile.ruinBlast * stats.rangeMultiplier });
    else if (kind === 'special') Object.assign(tuning, { damageMultiplier: tuning.damageMultiplier! * (1 + (this.progress.skillLevel - 1) * .24) * profile.drainDamage,
      rangeMultiplier: this.specialRange() * profile.drainRange, drainTargets: profile.drainTargets, healCap: profile.drainHealCap });
    else Object.assign(tuning, { damageMultiplier: tuning.damageMultiplier! * getSecondaryProfile('tharja', this.progress.secondaryLevel).damageMultiplier,
      fieldRadius: profile.fieldRadius * stats.rangeMultiplier, fieldDuration: profile.fieldDuration, tickFrames: profile.fieldTickFrames });
    const spell = kind === 'jab' ? 'flux' : kind === 'smash' ? 'ruin' : kind === 'special' ? 'nosferatu' : 'mire';
    this.tharja.cast(spell, context.owners[0], origin, context, tuning);
    this.audio.play('cast', { charId: this.char.id, kind });
  }

  private tharjaContext(): TharjaContext {
    const context = this.summonContext();
    // Arriving outposts are visible but not yet valid targets or sources of healing.
    const arriving = new Set(this.enemies.filter(enemy => enemy.state === 'arriving').map(enemy => enemy.id));
    context.targets = context.targets.map(target => ({ ...target, alive: target.alive && !arriving.has(target.id) }));
    return { ...context, castOriginAt: () => {
      const p = this.player;
      return getCharacterCastOrigin(this.char.id, p.x, p.y, 112, { state: p.attack ? 'attack' : 'free', attack: p.attack,
        onGround: p.onGround, vx: p.vx, vy: p.vy, dodgeTimer: p.dodge, time: this.frame, motion: p.motion }, p.facing);
    } };
  }

  private updateTharja() {
    if (!this.tharja.effects.length) return;
    for (const hit of this.tharja.step(this.tharjaContext())) {
      const enemy = this.enemies.find(candidate => candidate.id === hit.targetId && candidate.hp > 0 && candidate.state !== 'arriving');
      if (!enemy) continue;
      const before = enemy.hp;
      this.hurtEnemy(enemy, hit.amount, hit.facing, hit.kind === 'mire' ? 'field' : 'manual', hit.kind === 'ruin');
      const actual = Math.max(0, before - Math.max(0, enemy.hp));
      if (hit.heal > 0 && actual > 0 && this.player.hp > 0) {
        const oldHp = this.player.hp;
        this.player.hp = Math.min(getSurvivalStats(this.progress).maxHp, oldHp + Math.min(hit.heal, actual * THARJA_COMBAT.nosferatu.healRatio));
        if (this.player.hp > oldHp) this.addText(this.player.x, this.player.y - 114, `+${(this.player.hp - oldHp).toFixed(1)}`, '#d7c0ef');
      }
    }
  }

  private melee(reach: number, height: number, damage: number, hit: Set<number>, both: boolean) {
    const p = this.player;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || hit.has(enemy.id)) continue;
      const dx = enemy.x - p.x;
      if ((both || dx * p.facing >= -28) && Math.abs(dx) <= reach + enemy.radius && Math.abs((enemy.y - enemy.radius * 0.65) - (p.y - 43)) <= height * 0.5 + enemy.radius) {
        hit.add(enemy.id); this.hurtEnemy(enemy, damage, Math.sign(dx) || p.facing, 'manual', p.attack?.def.kind === 'smash');
      }
    }
  }

  private releaseSecondary() {
    const p = this.player, profile = getSecondaryProfile(this.char.id, this.progress.secondaryLevel);
    const range = this.secondaryRange(), damage = this.attackDamage('secondary');
    const tip = getSwordCastTip(this.char.id, p.x, p.y, 112, { state: p.attack ? 'attack' : 'free', attack: p.attack,
      onGround: p.onGround, vx: p.vx, vy: p.vy, dodgeTimer: p.dodge, time: this.frame, motion: p.motion }, p.facing);
    if (this.char.id === 'raiden' || this.char.id === 'jean') {
      const thunder = this.char.id === 'raiden';
      for (let i = 0; i < profile.count; i++) {
        if (this.fields.length >= 25) this.fields.shift();
        const x = p.x + p.facing * (80 + i * (thunder ? 90 : 120)) * range;
        const feet = p.onGround && Math.abs(p.y - this.groundHeightAt(p.x)) < 1 ? this.groundHeightAt(x) : Math.min(p.y, this.groundHeightAt(x));
        this.fields.push({ kind: thunder ? 'thunder' : 'updraft', x,
          y: feet - (thunder ? 115 : 85) * range, radius: (thunder ? 42 : 78) * range, height: (thunder ? 265 : 210) * range,
          damage, age: 0, tick: 0, life: thunder ? 28 : 85, hit: new Set() });
      }
    } else if (this.char.id === 'eula') {
      if (!tip) this.effect('secondary', p.x + p.facing * 90, p.y - 40, 225 * range, this.char.color, 20);
      for (let i = 0; i < profile.count; i++) {
        const angle = (i - (profile.count - 1) / 2) * 0.15;
        this.secondaryShot(p.x + p.facing * 32, p.y - 38, p.facing * Math.cos(angle) * 8.8, Math.sin(angle) * 8.8, damage, 'frost', 23 * range, false, tip);
      }
    } else if (this.char.id === 'diluc') {
      for (let i = 0; i < profile.count; i++) this.secondaryShot(p.x + p.facing * 38, p.y - 45 - i * 64, p.facing * (7.8 + i * 0.6), 0, damage, 'phoenix', 45 * range, profile.piercing, tip);
    } else if (this.char.id === 'xiao') {
      for (let i = 0; i < profile.count; i++) this.secondaryShot(p.x + p.facing * 45, p.y - 38 - i * 53, p.facing * (9.5 + i), 0, damage * 0.55, 'wind', 34 * range, true);
      this.effect('secondary', p.x + p.facing * 48, p.y - 45, 200 * range, this.char.color, 18);
    } else if (this.char.id === 'zhongli') {
      const context = this.summonContext();
      this.summons.castMeteor(context.owners[0], context, this.summonTuning());
    } else if (this.char.id === 'furina') {
      const context = this.summonContext();
      this.summons.castRevelry(context.owners[0], context, this.summonTuning());
    }
    this.audio.play('cast', { charId: this.char.id, kind: 'secondary' });
  }

  private secondaryShot(x: number, y: number, vx: number, vy: number, damage: number, kind: SurvivalShot['kind'], radius: number, piercing: boolean, tip?: { x: number; y: number }) {
    if (this.shots.length >= 100) return;
    this.shots.push({ x, y, startX: x, vx, vy, damage, kind, radius, piercing, secondary: true, owner: 'player',
      returning: false, returned: false, age: 0, life: kind === 'frost' ? 60 : 75, color: this.char.color, hit: new Set(), castVisual: castVisualFromTip(tip, x, y, vx) });
  }

  private releaseSpecial() {
    this.audio.play('cast', { charId: this.char.id, kind: 'special' });
    const p = this.player, branch = this.progress.branch, range = this.specialRange();
    if (this.char.id === 'raiden') {
      this.projectile(p.x + p.facing * 34, p.y - 45, p.facing * 10, 0, this.attackDamage('special'), 'blade', branch === 'raiden-return');
      if (this.progress.skillLevel >= 3) this.projectile(p.x + p.facing * 20, p.y - 80, p.facing * 8, -0.5, this.attackDamage('special') * 0.6, 'blade', branch === 'raiden-return');
    } else if (this.char.id === 'jean') {
      this.melee(210 * range, 150, this.attackDamage('special'), p.attack!.hit, false);
      this.effect('slash', p.x + p.facing * 100, p.y - 48, 330 * range, this.char.color, 26);
      if (branch === 'jean-vortex') this.field('vortex', p.x + p.facing * 170, p.y - 44, 185 * range, 205, this.attackDamage('special') * 0.35);
      if (branch === 'jean-sanctuary') this.field('sanctuary', p.x, p.y - 40, 160 * range, 235, this.attackDamage('special') * 0.25);
    } else if (this.char.id === 'eula') {
      this.melee(205 * range, 225 * range, this.attackDamage('special'), p.attack!.hit, true);
      this.effect('ring', p.x, p.y - 50, 400 * range, this.char.color, 28);
      if (branch === 'eula-shatter') {
        for (const enemy of [...this.enemies]) if (enemy.stacks > 0 && Math.abs(enemy.x - p.x) < 300 * range && Math.abs(enemy.y - p.y) < 180) {
          const stacks = enemy.stacks; enemy.stacks = 0;
          this.areaDamage(enemy.x, enemy.y - 25, 105 + stacks * 13, this.attackDamage('special') * (0.4 + stacks * 0.16));
          this.effect('impact', enemy.x, enemy.y - 35, 150 + stacks * 15, this.char.color, 28);
        }
      }
    } else if (this.char.id === 'diluc') {
      this.effect('slash', p.x + p.facing * 80, p.y - 38, 245 * range, this.char.color, 30);
      if (branch === 'diluc-burst') {
        this.projectile(p.x + p.facing * 60, p.y - 42, p.facing * 5.7, 0, this.attackDamage('special') * 0.85, 'fire');
        this.field('flame', p.x + p.facing * 140, p.y - 30, 115 * range, 85, this.attackDamage('special') * 0.5);
      }
    } else if (this.char.id === 'zhongli') {
      const context = this.summonContext();
      this.summons.castGeo(context.owners[0], context, this.summonTuning());
    } else if (this.char.id === 'furina') {
      const context = this.summonContext();
      this.summons.castSalon(context.owners[0], context, this.summonTuning());
    }
  }

  private summonContext(): SummonContext {
    const p = this.player;
    return {
      owners: [{ id: 0, x: p.x, feetY: p.y, facing: p.facing, alive: p.hp > 0 }],
      targets: this.enemies.map(enemy => ({ id: enemy.id, x: enemy.x, feetY: enemy.y, width: enemy.radius * 2, height: enemy.radius * 1.6, alive: enemy.hp > 0 })),
      surfaceAt: (x, nearFeetY) => {
        if (x < 20 || x > this.world.width - 20) return null;
        // The nearest surface below the caster supports columns and crab attacks;
        // airborne pets can choose enemy feet on other terraces independently.
        const platforms = this.world.platforms.filter(platform => x >= platform.x && x <= platform.x + platform.w && platform.y >= nearFeetY - 12);
        return Math.min(this.groundHeightAt(x), ...platforms.map(platform => platform.y));
      },
      projectileBlocked: (oldX, oldY, newX, newY) => {
        // Sample a swept segment so fast piercing streams cannot tunnel into a
        // slope; deliberately omit one-way platforms, like ordinary shots.
        const samples = Math.max(1, Math.ceil(Math.hypot(newX - oldX, newY - oldY) / 8));
        for (let sample = 0; sample <= samples; sample++) {
          const t = sample / samples, x = oldX + (newX - oldX) * t, y = oldY + (newY - oldY) * t;
          if (x < 0 || x > this.world.width || y >= this.groundHeightAt(x)) return true;
        }
        return false;
      },
    };
  }

  private summonTuning(): SummonTuning {
    return { mainLevel: this.progress.skillLevel, secondaryLevel: this.progress.secondaryLevel,
      branch: this.progress.branch as SummonTuning['branch'], damageMultiplier: getSurvivalStats(this.progress).damageMultiplier,
      rangeMultiplier: getSurvivalStats(this.progress).rangeMultiplier };
  }

  private updateSummons() {
    if (!this.summons.entities.length && !this.summons.effects.length && !this.summons.getShield(0) && !this.summons.getBuff(0)) return;
    const previousEffects = new Set(this.summons.effects.map(effect => effect.id));
    for (const hit of this.summons.step(this.summonContext())) {
      const enemy = this.enemies.find(candidate => candidate.id === hit.targetId && candidate.hp > 0);
      if (!enemy) continue;
      this.hurtEnemy(enemy, hit.amount * 4.8, Math.sign(enemy.x - hit.x), 'summon');
      if (hit.controlFrames > 0 && !enemy.boss) enemy.petrify = Math.max(enemy.petrify ?? 0, Math.min(enemy.elite ? 36 : 150, hit.controlFrames * (enemy.elite ? 0.35 : 1)));
    }
    for (const effect of this.summons.effects) if (!previousEffects.has(effect.id)) this.audio.play('summon', { charId: this.char.id, summonKind: effect.kind });
  }

  private landPlunge() {
    const p = this.player, attack = p.attack;
    if (!attack?.plunge) return;
    attack.plunge.phase = 'impact'; attack.plunge.elapsed = 0;
    attack.hit.clear();
    const range = (155 + (this.progress.skillLevel - 1) * 18) * getSurvivalStats(this.progress).rangeMultiplier;
    this.melee(range, 150, this.attackDamage('special'), attack.hit, true);
    this.effect('plunge', p.x, p.y - 33, range * 2.7, this.char.color, 36);
    this.triggerAuxiliary();
    if (this.progress.branch === 'xiao-pillars') {
      for (const offset of [-range * 0.65, 0, range * 0.65]) {
        const x = p.x + offset;
        const feet = Math.abs(p.y - this.groundHeightAt(p.x)) < 1 ? this.groundHeightAt(x) : Math.min(p.y, this.groundHeightAt(x));
        this.field('pillar', x, feet - 65, 83, 185, this.attackDamage('special') * 0.25);
      }
    }
    if (this.progress.branch === 'xiao-aerial' && attack.hit.size > 0) {
      p.jumps = 2; p.skillCooldown = Math.min(p.skillCooldown, 24);
      this.notice = '凌空 · 命中返还跳跃，技能冷却缩短'; this.noticeTimer = 100;
    }
    this.audio.play('explosion', { charId: this.char.id, kind: 'special', power: 18 });
  }

  private triggerAuxiliary() {
    const p = this.player;
    const lightning = this.progress.upgrades['aux-lightning'] ?? 0;
    if (lightning) {
      const enemy = this.enemies.filter(e => e.hp > 0 && distance(p.x, p.y - 40, e.x, e.y - 20) < 350).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (enemy) { this.effect('chain', p.x, p.y - 50, 10, '#d4b4ff', 14, enemy.x, enemy.y - 20); this.hurtEnemy(enemy, 11 * lightning * getSurvivalStats(this.progress).damageMultiplier, Math.sign(enemy.x - p.x), 'aux'); }
    }
    const frost = this.progress.upgrades['aux-frost'] ?? 0;
    if (frost) {
      for (const enemy of this.enemies) if (distance(p.x, p.y - 35, enemy.x, enemy.y - 25) < 100 + frost * 15) { enemy.slow = 90; this.hurtEnemy(enemy, 7 * frost * getSurvivalStats(this.progress).damageMultiplier, Math.sign(enemy.x - p.x), 'aux'); }
      this.effect('ring', p.x, p.y - 35, 160 + frost * 25, '#b5ecff', 18);
    }
    const fire = this.progress.upgrades['aux-flame'] ?? 0;
    if (fire) this.projectile(p.x + p.facing * 28, p.y - 35, p.facing * 7.8, 0, 14 * fire * getSurvivalStats(this.progress).damageMultiplier, 'fire');
  }

  private hurtEnemy(enemy: SurvivalEnemy, damage: number, direction: number, source: string, heavy = false) {
    if (enemy.hp <= 0 || enemy.state === 'arriving') return;
    const raisedShield = enemy.role === 'guard' && (enemy.state === 'ready' || enemy.state === 'windup');
    if (raisedShield && heavy) {
      enemy.state = 'recover'; enemy.stateTimer = 105; enemy.tell = 0;
      this.tacticalStats.guardsBroken++;
      this.addText(enemy.x, enemy.y - 100, '破盾', '#a6f3e4', true);
    } else if (raisedShield && source !== 'field' && direction * (enemy.facing ?? 1) < 0) {
      damage *= 0.35;
      this.addText(enemy.x, enemy.y - 95, '格挡', '#eed093');
    }
    if (enemy.role === 'sniper' && enemy.state === 'windup') {
      enemy.state = 'recover'; enemy.stateTimer = 75; enemy.tell = 0;
      this.addText(enemy.x, enemy.y - 92, '打断', '#a6f3e4');
    }
    this.audio.play('impact', { charId: this.char.id, power: damage });
    const actual = Math.min(enemy.hp, damage); enemy.hp -= damage; this.damageDealt += actual;
    const followsTerrain = enemy.grounded && Math.abs(enemy.y - this.groundHeightAt(enemy.x)) < 1;
    enemy.flash = 7;
    // Fixed outposts retain their authored platform; damage never pushes them off it.
    if (!enemy.role) enemy.x = clamp(enemy.x + direction * (enemy.boss ? 2 : enemy.elite ? 5 : 12), 20, this.world.width - 20);
    if (followsTerrain) enemy.y = this.groundHeightAt(enemy.x);
    else if (enemy.y > this.groundHeightAt(enemy.x)) { enemy.y = this.groundHeightAt(enemy.x); enemy.vy = 0; enemy.grounded = true; }
    if ((source === 'manual' || source === 'secondary') && this.progress.branch === 'eula-shatter') enemy.stacks = Math.min(7, enemy.stacks + 1);
    if (source === 'manual' && this.progress.branch === 'raiden-chain') {
      const chained = this.enemies.filter(other => other.id !== enemy.id && other.hp > 0 && distance(enemy.x, enemy.y, other.x, other.y) < 200).slice(0, 3);
      for (const other of chained) { this.effect('chain', enemy.x, enemy.y - 20, 8, this.char.color, 14, other.x, other.y - 20); this.hurtEnemy(other, damage * 0.55, direction, 'chain'); }
    }
    this.addText(enemy.x, enemy.y - enemy.radius - 8, String(Math.round(damage)), source === 'dive' ? '#a4f9df' : '#fff1bd', damage >= 75);
    if (enemy.hp <= 0) {
      this.kills++;
      if (enemy.elite) this.eliteKills++;
      if (enemy.boss) { this.bossKilled = true; this.notice = '秘境霸主已击败 · 坚持到十分钟！'; this.noticeTimer = 240; }
      if (this.variant !== 'tactical') this.addOrb(enemy.x, enemy.y, enemy.xp, false);
      if (this.variant === 'tactical' ? this.kills % 3 === 0 : enemy.elite || enemy.boss || this.kills % 24 === 0) this.addOrb(enemy.x + 20, enemy.y, enemy.boss ? 45 : 18, true);
      this.effect('impact', enemy.x, enemy.y - 20, enemy.radius * 2.5, enemy.elite ? '#fbd087' : this.char.color, 16);
    }
  }

  private areaDamage(x: number, y: number, radius: number, damage: number) {
    for (const enemy of this.enemies) if (enemy.hp > 0 && distance(x, y, enemy.x, enemy.y - enemy.radius * 0.65) < radius + enemy.radius) this.hurtEnemy(enemy, damage, Math.sign(enemy.x - x), 'field');
  }

  private projectile(x: number, y: number, vx: number, vy: number, damage: number, kind: SurvivalShot['kind'], returning = false, owner: SurvivalShot['owner'] = 'player') {
    if (this.shots.length >= 100) return;
    this.shots.push({ x, y, startX: x, vx, vy, damage, kind, returning, returned: false, owner, age: 0, life: owner === 'enemy' ? 210 : returning ? 110 : 80,
      radius: owner === 'enemy' ? 12 : kind === 'blade' ? 43 * this.specialRange() : 20 * getSurvivalStats(this.progress).rangeMultiplier, color: owner === 'enemy' ? '#ffad82' : kind === 'fire' ? '#ffa162' : this.char.color, hit: new Set() });
  }
  private field(kind: SurvivalField['kind'], x: number, y: number, radius: number, life: number, damage: number) {
    if (this.fields.length >= 25) this.fields.shift();
    this.fields.push({ kind, x, y, radius, life, damage, age: 0, tick: 0 });
  }
  private effect(kind: SurvivalEffect['kind'], x: number, y: number, size: number, color: string, life: number, x2?: number, y2?: number) {
    if (this.effects.length >= 75) this.effects.shift();
    const effect: SurvivalEffect = { kind, x, y, size, color, life, age: 0, x2, y2, facing: this.player.facing };
    this.effects.push(effect); return effect;
  }
  private addText(x: number, y: number, text: string, color: string, big = false) {
    if (this.texts.length >= 45) this.texts.shift();
    this.texts.push({ x, y, text, color, big, age: 0 });
  }

  private updateShots() {
    for (const shot of this.shots) {
      shot.age++; shot.x += shot.vx; shot.y += shot.vy;
      if (shot.castVisual) shot.castVisual.age++;
      // Solid terrain blocks projectiles; one-way platforms still let them pass.
      if (shot.y >= this.groundHeightAt(shot.x)) {
        this.effect('impact', shot.x, this.groundHeightAt(shot.x) - 5, Math.max(30, shot.radius * 2), shot.color, 12);
        shot.life = 0; continue;
      }
      if (shot.returning && !shot.returned && shot.age > 45) { shot.vx *= -1; shot.returned = true; shot.hit.clear(); }
      if (shot.owner === 'enemy') {
        if (distance(shot.x, shot.y, this.player.x, this.player.y - 46) < shot.radius + 31) {
          this.hurtPlayer(shot.damage); shot.life = 0;
          if (this.phase !== 'playing') return;
        }
      } else {
        for (const enemy of this.enemies) if (enemy.hp > 0 && !shot.hit.has(enemy.id) && distance(shot.x, shot.y, enemy.x, enemy.y - enemy.radius * 0.65) < shot.radius + enemy.radius) {
          shot.hit.add(enemy.id); this.hurtEnemy(enemy, shot.damage, Math.sign(shot.vx), shot.kind === 'blade' ? 'manual' : shot.secondary ? 'secondary' : 'aux');
          if (shot.kind === 'frost') enemy.slow = 108;
          if (shot.secondary && !shot.piercing) { this.effect(shot.kind === 'frost' ? 'impact' : 'secondary', shot.x, shot.y, shot.radius * 3, shot.color, 15); shot.life = 0; break; }
          if (shot.kind === 'fire') { this.areaDamage(shot.x, shot.y, 65, shot.damage * 0.4); this.effect('impact', shot.x, shot.y, 100, shot.color, 18); shot.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter(shot => shot.age < shot.life && shot.x > -100 && shot.x < this.world.width + 100);
  }

  private updateFields() {
    const p = this.player;
    for (const field of this.fields) {
      field.age++; field.tick++;
      if (field.kind === 'thunder' || field.kind === 'updraft') {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || field.hit?.has(enemy.id)) continue;
          if (Math.abs(enemy.x - field.x) < field.radius + enemy.radius && Math.abs(enemy.y - enemy.radius * 0.65 - field.y) < (field.height ?? 200) / 2 + enemy.radius) {
            field.hit?.add(enemy.id); this.hurtEnemy(enemy, field.damage, Math.sign(enemy.x - p.x), 'secondary');
            if (field.kind === 'updraft' && !enemy.boss) { enemy.vy = enemy.elite ? -6 : -10; enemy.grounded = false; if (enemy.kind === 'flyer') enemy.y -= 45; }
          }
        }
        continue;
      }
      if (field.kind === 'orbit') { field.x = p.x; field.y = p.y - 43; }
      if (field.kind === 'vortex') for (const enemy of this.enemies) {
        if (distance(field.x, field.y, enemy.x, enemy.y - 25) < field.radius * 1.35) enemy.x += clamp(field.x - enemy.x, -2.4, 2.4);
      }
      if (field.tick >= 26) {
        field.tick = 0;
        this.areaDamage(field.x, field.y, field.radius, field.damage);
        if (field.kind === 'orbit') for (const enemy of this.enemies) {
          if (distance(field.x, field.y, enemy.x, enemy.y - enemy.radius * 0.65) < field.radius + enemy.radius) enemy.slow = 70;
        }
        if (field.kind === 'sanctuary' && distance(field.x, field.y, p.x, p.y - 40) < field.radius) p.hp = Math.min(getSurvivalStats(this.progress).maxHp, p.hp + 3);
      }
      if (field.kind === 'vortex' && field.age === field.life - 1) { this.areaDamage(field.x, field.y, field.radius * 1.25, field.damage * 2); this.effect('impact', field.x, field.y, field.radius * 2, this.char.color, 24); }
    }
    this.fields = this.fields.filter(field => field.age < field.life);
  }

  private hurtPlayer(damage: number): boolean {
    const p = this.player;
    if (p.invuln > 0 || p.dodge > 0 || this.phase !== 'playing') return false;
    const incoming = Math.max(1, damage * getSurvivalStats(this.progress).armorMultiplier);
    const taken = this.summons.absorb(0, incoming);
    p.hp = Math.max(0, p.hp - taken);
    this.addText(p.x, p.y - 110, taken ? `−${Math.ceil(taken)}` : '护盾', taken ? '#ffb0a1' : '#f2d895', true);
    if (taken < incoming) this.audio.play('shield', { charId: this.char.id, power: incoming - taken });
    if (taken > 0) this.audio.play('hurt', { power: taken });
    if (p.hp <= 0) {
      this.phase = 'defeat'; this.hitstop = 0; p.attack = null; p.nextAttackVariants = newAttackVariants(); this.clearInput();
      this.summons.clear();
      this.tharja.clear();
      this.audio.setScene('result');
      return true;
    }
    // Damage never changes the current action, velocity or airborne state.
    p.invuln = 56; this.hitstop = HURT_HITSTOP_FRAMES;
    return true;
  }

  private updateTacticalHazards() {
    const p = this.player;
    for (const hazard of this.getTacticalHazards()) {
      if (hazard.state !== 'active' || this.hazardHitCycles.get(hazard.id) === hazard.cycleIndex) continue;
      // The feet-anchored body must intersect the visible 48 px eruption volume.
      const touching = p.x + 18 > hazard.x && p.x - 18 < hazard.x + hazard.width &&
        p.y > hazard.y - hazard.height && p.y - 104 < hazard.y;
      if (touching && this.hurtPlayer(hazard.damage)) this.hazardHitCycles.set(hazard.id, hazard.cycleIndex);
    }
  }

  private applyTacticalWind() {
    const p = this.player, wind = this.getMapCapabilities().find(map => map.wind)?.wind;
    if (!wind) return;
    const inWind = Math.abs(p.x - wind.x) < wind.width / 2 && p.y > wind.top && p.y <= wind.bottom + 5;
    const lifting = inWind && !this.input.held('down') && p.drop <= 0 && !p.attack?.plunge;
    if (lifting) {
      if (!this.windEngaged) this.tacticalStats.windRides++;
      p.vy = Math.min(p.vy, -7.8); p.onGround = false; p.jumps = 2;
    }
    // A ride ends after leaving horizontally or deliberately suppressing the wind.
    if ((!inWind && Math.abs(p.x - wind.x) >= wind.width / 2) || this.input.held('down')) this.windEngaged = false;
    else if (lifting) this.windEngaged = true;
  }

  private trackTacticalLayer() {
    if (this.variant === 'survival') return;
    const layer = this.player.y < 600 ? 2 : this.player.y < 800 ? 1 : 0;
    if (layer !== this.tacticalLayer && this.frame - this.layerChangedAt >= 30) {
      this.tacticalStats.layerChanges++; this.tacticalLayer = layer; this.layerChangedAt = this.frame;
    }
  }

  private updateTacticalSpawning() {
    const next = this.encounterIndex + 1, encounters = this.tacticalMap.encounters;
    if (next < encounters.length && this.elapsed >= encounters[next].start) {
      this.encounterIndex = next;
      const encounter = encounters[next];
      this.pendingSpawns.push(...encounter.enemies.map(spawn => ({ ...spawn })));
      this.notice = `${encounter.name} · ${encounter.hint}`; this.noticeTimer = 300;
    }
    // Wait at the authored outpost when occupied, rather than relocating onto the player.
    this.pendingSpawns = this.pendingSpawns.filter(spawn => {
      if (distance(spawn.x, spawn.y - 40, this.player.x, this.player.y - 40) < 175 ||
        this.enemies.some(enemy => enemy.hp > 0 && distance(enemy.x, enemy.y, spawn.x, spawn.y) < 90)) return true;
      this.spawnTacticalEnemy(spawn);
      return false;
    });
  }

  private spawnTacticalEnemy(spawn: TacticalSpawn) {
    const role = spawn.role, expedition = this.variant === 'expedition';
    const hp = (role === 'guard' ? 125 : role === 'charger' ? 96 : 72) * (expedition ? .55 + this.elapsed / 900 : 1);
    this.enemies.push({
      id: this.nextId++, role, kind: role === 'sniper' ? 'ranged' : 'slime', elite: false, boss: false,
      x: spawn.x, y: spawn.y, homeX: spawn.x, vx: 0, vy: 0, radius: role === 'guard' ? 32 : role === 'charger' ? 31 : 26,
      hp, maxHp: hp, speed: role === 'charger' ? 1.25 : .8,
      damage: (role === 'charger' ? 15 : role === 'guard' ? 12 : 10) * (expedition ? .8 + this.elapsed / 1800 : 1),
      xp: expedition ? 6 + Math.floor(this.elapsed / 180) * 2 : 0,
      age: 0, flash: 0, slow: 0, cooldown: 75 + this.nextId % 3 * 30, tell: 0,
      aimX: 0, aimY: 0, stacks: 0, grounded: true, facing: this.player.x < spawn.x ? -1 : 1,
      state: 'arriving', stateTimer: 75, chargeHit: false,
    });
  }

  private updateExpeditionRegion() {
    const region = getExpeditionRegion(this.player.x);
    if (region.id !== this.expeditionRegionId) {
      this.expeditionRegionId = region.id;
      this.visitedRegions.add(region.id);
      this.expeditionHazardFrame = 0; this.hazardHitCycles.clear();
      this.notice = `${region.name} · ${region.objective}`; this.noticeTimer = 270;
    }
    this.expeditionRegionFrames.set(region.id, (this.expeditionRegionFrames.get(region.id) ?? 0) + 1);
    if (region.id === 'mechanism-hall') this.expeditionHazardFrame++;
    if (this.elapsed >= 540 && !this.expeditionBossStarted) {
      this.expeditionBossStarted = true;
      this.eliteMilestones.add(540);
      const boss = this.spawnEnemy('ranged', true, true, this.expeditionSpawnX(560));
      boss.state = 'arriving'; boss.stateTimer = 150;
      this.notice = '秘境霸主现身 · 地火永久熄灭、停止增援 · 存活至十分钟'; this.noticeTimer = 360;
    }
  }

  private expeditionSpawnX(gap: number): number {
    const p = this.player;
    const candidates = [-1, 1].map(side => clamp(p.x + side * gap, 60, this.world.width - 60))
      .filter(x => Math.abs(x - p.x) >= 320 && !this.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - x) < 80));
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    return clamp(p.x + (p.x < this.world.width / 2 ? gap : -gap), 60, this.world.width - 60);
  }

  private updateExpeditionSpawning() {
    const p = this.player;
    // Leaving a fight retires distant enemies without kills, crystals or later teleport ambushes.
    this.enemies = this.enemies.filter(enemy => enemy.boss || Math.abs(enemy.x - p.x) <= 1350);
    this.shots = this.shots.filter(shot => shot.owner === 'player' || Math.abs(shot.x - p.x) <= 1500);
    if (this.expeditionBossStarted) return;
    const region = getExpeditionRegion(p.x), map = EXPEDITION_MAPS.find(candidate => candidate.id === region.id)!;
    const localSeconds = (this.expeditionRegionFrames.get(region.id) ?? 0) / 60;
    for (const [waveIndex, encounter] of map.encounters.entries()) {
      if (localSeconds < encounter.start) continue;
      this.encounterIndex = waveIndex;
      for (const [spawnIndex, spawn] of encounter.enemies.entries()) {
        const key = `${region.id}:${waveIndex}:${spawnIndex}`;
        if (this.expeditionOutposts.has(key) || this.enemies.filter(enemy => enemy.hp > 0 && enemy.role).length >= 6) continue;
        if (Math.abs(spawn.x - p.x) > 780 || distance(spawn.x, spawn.y, p.x, p.y) < 175 ||
          this.enemies.some(enemy => enemy.hp > 0 && distance(enemy.x, enemy.y, spawn.x, spawn.y) < 90)) continue;
        this.spawnTacticalEnemy(spawn); this.expeditionOutposts.add(key);
      }
    }
    this.spawnTimer--;
    const cap = Math.min(8, 4 + Math.floor(this.elapsed / 120));
    if (this.spawnTimer <= 0 && this.enemies.filter(enemy => enemy.hp > 0 && !enemy.role).length < cap) {
      const kind = this.elapsed > 30 && Math.random() < .38 ? 'flyer' : 'slime';
      const enemy = this.spawnEnemy(kind, false, false, this.expeditionSpawnX(520 + Math.random() * 120));
      enemy.hp = enemy.maxHp = 22 + this.elapsed * .075;
      enemy.xp = 3 + Math.floor(this.elapsed / 120);
      enemy.damage = 7 + Math.floor(this.elapsed / 180);
      enemy.state = 'arriving'; enemy.stateTimer = 75;
      if (kind !== 'flyer') {
        const platform = this.world.platforms.find(surface => enemy.x >= surface.x && enemy.x <= surface.x + surface.w && Math.abs(surface.y - p.y) < 120);
        if (platform) enemy.y = Math.min(enemy.y, platform.y);
      }
      this.spawnTimer = Math.max(65, 135 - this.elapsed / 9);
    }
  }

  private tacticalLineClear(enemy: SurvivalEnemy): boolean {
    const p = this.player, x0 = enemy.x, y0 = enemy.y - enemy.radius;
    for (let step = 1; step < 15; step++) {
      const t = step / 15, x = x0 + (p.x - x0) * t, y = y0 + (p.y - 46 - y0) * t;
      if (y >= this.groundHeightAt(x) - 3) return false;
    }
    return true;
  }

  private tacticalAttackAvailable(enemy: SurvivalEnemy): boolean {
    const p = this.player;
    const maximum = (this.variant === 'expedition' ? this.expeditionRegionId : this.tacticalMap.id) === 'mechanism-hall' ? 1 : 2;
    return Math.abs(p.x - enemy.x) < 680 && enemy.x > this.camera.x + 35 && enemy.x < this.camera.x + VIEW_W - 35 &&
      enemy.y - enemy.radius > this.camera.y + 35 && enemy.y < this.camera.y + VIEW_H + 10 &&
      this.enemies.filter(other => other.hp > 0 && (this.variant !== 'expedition' || Math.abs(other.x - p.x) < 680) &&
        (other.state === 'windup' || other.state === 'active')).length < maximum;
  }

  private moveTacticalEnemy(enemy: SurvivalEnemy, dx: number) {
    const previousX = enemy.x;
    const terrain = enemy.grounded && Math.abs(enemy.y - this.groundHeightAt(enemy.x)) < 1;
    enemy.x = clamp(enemy.x + dx, 45, this.world.width - 45);
    if (terrain) enemy.y = this.followTerrainHeight(enemy.x, previousX, enemy.y);
  }

  /** Launches and falls continue during every tactical AI state, exactly once per tick. */
  private updateTacticalGravity(enemy: SurvivalEnemy) {
    const previousY = enemy.y;
    enemy.vy = Math.min(12, enemy.vy + .5); enemy.y += enemy.vy;
    const landed = this.findLanding(enemy.x, previousY, enemy.y);
    if (landed !== null && enemy.vy >= 0) { enemy.y = landed; enemy.vy = 0; enemy.grounded = true; }
    else enemy.grounded = false;
    if (enemy.y > this.groundHeightAt(enemy.x)) { enemy.y = this.groundHeightAt(enemy.x); enemy.vy = 0; enemy.grounded = true; }
  }

  private updateTacticalEnemy(enemy: SurvivalEnemy) {
    const p = this.player, role = enemy.role;
    if (enemy.state === 'arriving') {
      if (--enemy.stateTimer! <= 0) { enemy.state = 'ready'; enemy.stateTimer = 0; }
      return;
    }
    const dx = p.x - enemy.x, sameLayer = Math.abs(p.y - enemy.y) < 105;
    if (enemy.state === 'recover') {
      if (--enemy.stateTimer! <= 0) { enemy.state = 'ready'; enemy.cooldown = role === 'guard' ? 60 : 105; }
      return;
    }
    if (enemy.state === 'windup') {
      enemy.tell = Math.max(0, --enemy.stateTimer!);
      if (enemy.stateTimer! > 0) return;
      enemy.tell = 0;
      if (role === 'sniper') {
        const angle = Math.atan2(enemy.aimY - (enemy.y - enemy.radius), enemy.aimX - enemy.x);
        this.projectile(enemy.x, enemy.y - enemy.radius, Math.cos(angle) * 5.6, Math.sin(angle) * 5.6, enemy.damage, 'bolt', false, 'enemy');
        enemy.state = 'recover'; enemy.stateTimer = 75;
      } else { enemy.state = 'active'; enemy.stateTimer = role === 'charger' ? 38 : 16; enemy.chargeHit = false; }
      return;
    }
    if (enemy.state === 'active') {
      const previousX = enemy.x;
      if (role === 'charger') this.moveTacticalEnemy(enemy, (enemy.facing ?? 1) * 9.8 * (enemy.slow ? .65 : 1));
      const nearAttack = role === 'guard' ? Math.abs(p.x - (enemy.x + (enemy.facing ?? 1) * 43)) < 75 :
        p.x >= Math.min(previousX, enemy.x) - 49 && p.x <= Math.max(previousX, enemy.x) + 49;
      if (!enemy.chargeHit && nearAttack && Math.abs(p.y - enemy.y) < 82) {
        const vulnerable = p.invuln <= 0 && p.dodge <= 0;
        this.hurtPlayer(enemy.damage); if (vulnerable) enemy.chargeHit = true;
      }
      if (--enemy.stateTimer! <= 0 || enemy.x <= 45 || enemy.x >= this.world.width - 45) {
        if (role === 'charger' && !enemy.chargeHit) this.tacticalStats.chargesEvaded++;
        enemy.state = 'recover'; enemy.stateTimer = role === 'charger' ? 95 : 80;
      }
      return;
    }
    // Outposts face nearby targets but cannot chase or teleport between floors.
    enemy.facing = dx < 0 ? -1 : 1;
    enemy.cooldown = Math.max(0, enemy.cooldown - 1);
    if (role !== 'sniper' && sameLayer && Math.abs(dx) > (role === 'guard' ? 92 : 210)) {
      const nextX = enemy.x + Math.sign(dx) * enemy.speed * (enemy.slow ? .45 : 1);
      const leash = role === 'guard' ? 145 : 500;
      if (Math.abs(nextX - (enemy.homeX ?? enemy.x)) < leash) this.moveTacticalEnemy(enemy, nextX - enemy.x);
    }
    const inRange = role === 'sniper' ? this.tacticalLineClear(enemy) : sameLayer && Math.abs(dx) < (role === 'guard' ? 130 : 660);
    if (enemy.cooldown <= 0 && inRange && this.tacticalAttackAvailable(enemy)) {
      enemy.state = 'windup'; enemy.stateTimer = role === 'sniper' ? 72 : role === 'charger' ? 60 : 46;
      enemy.tell = enemy.stateTimer; enemy.aimX = p.x; enemy.aimY = p.y - 46;
      if (role === 'charger') { enemy.aimX = clamp(enemy.x + (enemy.facing ?? 1) * 375, 45, this.world.width - 45); enemy.aimY = enemy.y - 22; }
    }
  }

  private updateSpawning() {
    if (this.variant === 'tactical') { this.updateTacticalSpawning(); return; }
    if (this.variant === 'expedition') { this.updateExpeditionSpawning(); return; }
    this.spawnTimer--;
    const cap = Math.min(100, 18 + Math.floor(this.elapsed / 7));
    if (this.spawnTimer <= 0 && this.enemies.length < cap) {
      const roll = Math.random();
      const kind = this.elapsed > 100 && roll > 0.79 ? 'ranged' : this.elapsed > 50 && roll > 0.57 ? 'flyer' : 'slime';
      this.spawnEnemy(kind);
      this.spawnTimer = Math.max(7, 70 - this.elapsed * 0.10);
    }
    for (const milestone of [180, 360, 540]) if (this.elapsed >= milestone && !this.eliteMilestones.has(milestone)) {
      this.eliteMilestones.add(milestone); this.spawnEnemy(milestone === 540 ? 'ranged' : 'slime', true, milestone === 540);
      this.notice = milestone === 540 ? '最终围攻 · 秘境霸主降临' : '精英入侵 · 击败可获得大量经验与回复'; this.noticeTimer = 210;
    }
  }

  private spawnEnemy(kind: SurvivalEnemy['kind'], elite = false, boss = false, spawnX?: number): SurvivalEnemy {
    const p = this.player;
    const leftSpace = this.camera.x > 150, rightSpace = this.camera.x + VIEW_W < this.world.width - 150;
    let side = Math.random() < 0.5 ? -1 : 1;
    if (!leftSpace) side = 1; else if (!rightSpace) side = -1;
    const x = spawnX ?? clamp(side < 0 ? this.camera.x - 70 - Math.random() * 120 : this.camera.x + VIEW_W + 70 + Math.random() * 120, 45, this.world.width - 45);
    const radius = boss ? 62 : elite ? 43 : kind === 'flyer' ? 22 : kind === 'ranged' ? 25 : 27;
    const hp = (22 + this.elapsed * 0.13) * (boss ? 35 : elite ? 9 : kind === 'ranged' ? 1.4 : 1);
    const enemy: SurvivalEnemy = { id: this.nextId++, kind, elite, boss, x, y: kind === 'flyer' ? clamp(p.y - 45 + Math.random() * 100, 160, this.groundHeightAt(x) - 70) : this.groundHeightAt(x),
      vx: 0, vy: 0, radius, hp, maxHp: hp, speed: (1.1 + this.elapsed / 600) * (kind === 'flyer' ? 1.2 : elite ? 0.85 : 1),
      damage: boss ? 22 : elite ? 16 : kind === 'flyer' ? 8 : 10, xp: boss ? 150 : elite ? 45 : 2 + Math.floor(this.elapsed / 150),
      age: 0, flash: 0, slow: 0, cooldown: 100 + Math.random() * 100, tell: 0, aimX: 0, aimY: 0, stacks: 0, grounded: true };
    this.enemies.push(enemy);
    return enemy;
  }

  private updateEnemies() {
    const p = this.player;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.age++; enemy.flash = Math.max(0, enemy.flash - 1); enemy.slow = Math.max(0, enemy.slow - 1);
      if ((enemy.petrify ?? 0) > 0) { enemy.petrify = Math.max(0, (enemy.petrify ?? 0) - 1); continue; }
      if (enemy.role) {
        this.updateTacticalEnemy(enemy);
        this.updateTacticalGravity(enemy);
        if (this.phase !== 'playing') return;
        continue;
      }
      if (enemy.state === 'arriving') {
        if (--enemy.stateTimer! <= 0) enemy.state = 'ready';
        continue;
      }
      let dx = p.x - enemy.x;
      if (Math.abs(dx) > 1750) {
        const side = p.x < this.world.width / 2 ? 1 : -1;
        enemy.x = clamp(p.x + side * 850, 40, this.world.width - 40); enemy.y = this.groundHeightAt(enemy.x) - (enemy.kind === 'flyer' ? 90 : 0); enemy.vy = 0; enemy.grounded = enemy.kind !== 'flyer'; dx = p.x - enemy.x;
        if (this.variant === 'expedition') { enemy.state = 'arriving'; enemy.stateTimer = 120; enemy.tell = 0; continue; }
      }
      const speed = enemy.speed * (enemy.slow ? 0.45 : 1);
      if (enemy.kind === 'flyer') {
        enemy.x += Math.sign(dx) * speed;
        enemy.y += clamp((p.y - 25) - enemy.y, -1.5, 1.5);
        enemy.y = Math.min(enemy.y, this.groundHeightAt(enemy.x) - enemy.radius);
      } else {
        const previousX = enemy.x;
        const followsTerrain = enemy.grounded && Math.abs(enemy.y - this.groundHeightAt(enemy.x)) < 1;
        const desired = enemy.kind === 'ranged' ? Math.abs(dx) > 330 ? Math.sign(dx) : Math.abs(dx) < 180 ? -Math.sign(dx) : 0 : Math.sign(dx);
        enemy.x = clamp(enemy.x + desired * speed, 24, this.world.width - 24);
        const previous = enemy.y;
        enemy.vy = Math.min(12, enemy.vy + 0.5);
        if (enemy.grounded && p.y < enemy.y - 90 && Math.abs(dx) < 500 && enemy.age % 110 === 0) { enemy.vy = -14.5; enemy.grounded = false; }
        enemy.y += enemy.vy; enemy.grounded = false;
        const landing = followsTerrain && enemy.vy >= 0 ? this.groundHeightAt(enemy.x) : this.findLanding(enemy.x, previous, enemy.y, p.y > enemy.y + 100, previousX);
        if (enemy.vy >= 0 && landing !== null) { enemy.y = landing; enemy.vy = 0; enemy.grounded = true; }
        if (enemy.y > this.groundHeightAt(enemy.x)) { enemy.y = this.groundHeightAt(enemy.x); enemy.vy = 0; enemy.grounded = true; }
      }
      if (enemy.kind === 'ranged' || enemy.boss) {
        if (enemy.tell > 0) {
          enemy.tell--;
          if (enemy.tell === 0) {
            const angle = Math.atan2(enemy.aimY - (enemy.y - enemy.radius), enemy.aimX - enemy.x);
            const count = enemy.boss ? 3 : 1;
            for (let i = 0; i < count; i++) {
              const spread = angle + (i - (count - 1) / 2) * 0.23;
              this.projectile(enemy.x, enemy.y - enemy.radius, Math.cos(spread) * 3.9, Math.sin(spread) * 3.9, enemy.damage, 'bolt', false, 'enemy');
            }
            enemy.cooldown = enemy.boss ? 95 : 155;
          }
        } else if (--enemy.cooldown <= 0 && Math.abs(dx) < 740) {
          enemy.tell = 55; enemy.aimX = p.x; enemy.aimY = p.y - 45;
        }
      }
      if (Math.abs(enemy.x - p.x) < enemy.radius + 18 && Math.abs((enemy.y - enemy.radius * 0.65) - (p.y - 42)) < enemy.radius + 37) {
        this.hurtPlayer(enemy.damage);
        if (this.phase !== 'playing') return;
      }
    }
  }

  private addOrb(x: number, y: number, value: number, heal: boolean) {
    const nearby = this.orbs.find(orb => orb.heal === heal && distance(x, y, orb.x, orb.y) < 85);
    if (nearby) { nearby.value += value; return; }
    if (this.orbs.length >= 150) {
      const candidates = this.orbs.filter(orb => orb.heal === heal);
      if (candidates.length) {
        const closest = candidates.reduce((best, orb) => Math.abs(orb.x - x) < Math.abs(best.x - x) ? orb : best);
        closest.value += value; return;
      }
      // At most one extra pickup type needs room; bank the oldest crystal
      // directly so both rewards are conserved without exceeding the cap.
      const oldest = this.orbs.shift();
      if (oldest) {
        if (oldest.heal) this.player.hp = Math.min(getSurvivalStats(this.progress).maxHp, this.player.hp + oldest.value);
        else this.xp += oldest.value;
      }
    }
    this.orbs.push({ x, y: y - 10, vy: -2, value, heal, age: 0 });
  }

  private updateOrbs() {
    const p = this.player, stats = getSurvivalStats(this.progress);
    for (const orb of this.orbs) {
      orb.age++;
      const d = distance(orb.x, orb.y, p.x, p.y - 35);
      if (d < stats.magnetRadius + 45 || orb.age > 1800) {
        const speed = orb.age > 1800 ? 6 : 9;
        orb.x += (p.x - orb.x) / Math.max(d, 1) * Math.min(speed, d);
        orb.y += (p.y - 35 - orb.y) / Math.max(d, 1) * Math.min(speed, d);
      } else {
        const previous = orb.y; orb.vy = Math.min(6, orb.vy + 0.2); orb.y += orb.vy;
        const landing = this.findLanding(orb.x, previous + 7, orb.y + 7);
        if (landing !== null) { orb.y = landing - 7; orb.vy = 0; }
      }
      if (orb.y > this.groundHeightAt(orb.x) - 7) { orb.y = this.groundHeightAt(orb.x) - 7; orb.vy = 0; }
      if (d < 31) {
        this.audio.play('pickup');
        if (orb.heal) { p.hp = Math.min(stats.maxHp, p.hp + orb.value); this.addText(p.x, p.y - 100, `+${orb.value}`, '#8bf0c4'); }
        else this.xp += orb.value;
        orb.value = 0;
      }
    }
    this.orbs = this.orbs.filter(orb => orb.value > 0);
  }

  private checkLevelUp() {
    if (this.variant === 'tactical' || this.phase !== 'playing' || this.xp < xpForLevel(this.level)) return;
    this.xp -= xpForLevel(this.level); this.level++;
    this.choices = getUpgradeChoices(this.progress);
    if (!this.choices.length) { this.player.hp = Math.min(getSurvivalStats(this.progress).maxHp, this.player.hp + 12); return; }
    this.phase = 'upgrade'; this.clearInput(); this.player.attack = null;
    this.audio.setScene('upgrade');
    this.notice = `等级 ${this.level} · 选择本局强化`; this.noticeTimer = 150;
  }

  private waveName() {
    if (this.variant === 'tactical') return this.tacticalMap.encounters[Math.max(0, this.encounterIndex)].name;
    if (this.variant === 'expedition') return this.expeditionBossStarted ? '终局 · 秘境霸主' : `${getExpeditionRegion(this.player.x).name} · 自由探索`;
    if (this.elapsed < 120) return '初入秘境';
    if (this.elapsed < 240) return '风起云涌';
    if (this.elapsed < 360) return '元素潮汐';
    if (this.elapsed < 480) return '群魔环伺';
    return '最终围攻';
  }

}
