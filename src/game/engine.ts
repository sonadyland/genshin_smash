// ============================================================
// 提瓦特大乱斗 — 游戏引擎
// 还原任天堂大乱斗手感：百分比伤害 / 击飞成长 / 受击硬直 /
// 打击停顿(hitlag) / 屏幕震动 / 二段跳 / 快速下落 / 场外击杀
// ============================================================

import { CHARACTERS, ITEMS, STAGE, WORLD } from './data';
import { SPRITES, SPRITE_W, SPRITE_H, ITEM_SPRITES, ITEM_SPRITE_SIZE } from './sprites';
import type { SpriteFrame } from './sprites';
import type { CharDef, ItemDef, MoveDef } from './data';
import { acquireGameArt, drawArenaBackground, drawCharacterArt, drawFighterArt, drawElementEffect, drawXiaoPlungeEffect, drawSecondaryEffect, hasRegisteredMeleeTrail } from './art';
import type { GameArtLease } from './art';
import { attackPhase } from './animation';
import type { FighterAnimation, PlungeAnimation } from './animation';
import { advanceMotion, newMotionState, newAttackVariants, takeAttackVariant } from './clip-animation';
import type { AttackVariantState, AttackVisualVariant, MotionState } from './clip-animation';
import { BattleAudio } from './audio';
import { BattleInput } from './input';
import type { BattleAction } from './input';
import { effectGlow } from './visual-quality';
import type { VisualQuality } from './visual-quality';
import { SummonRuntime } from './summons';
import type { SummonContext, SummonOwner } from './summons';
import { drawSummonArt } from './summoner-art';

const GRAV = 0.52;
const MAX_FALL = 9.5;
const FAST_FALL = 13;
const PLUNGE_SPEED = 28;
const STEP = 1000 / 60;

export type MatchOptions = {
  mode: 'cpu' | 'pvp';
  player: number;
  opponent: number;
  difficulty: 'easy' | 'normal' | 'hard';
  stocks: 3;
  duration: 180;
  items: boolean;
};

type GameState = 'menu' | 'countdown' | 'fight' | 'paused' | 'result';
const DODGE_COOLDOWN = 80;
const DODGE_FRAMES = 15;
const JUMP_BUFFER = 8;
const COYOTE_FRAMES = 7;

interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jab: boolean; smash: boolean; special: boolean; secondary: boolean;
  downPressed: boolean; dodge: boolean;
}

interface ActiveAttack {
  def: MoveDef;
  t: number;
  hasHit: Set<number>;
  visualVariant?: AttackVisualVariant;
  plunge?: PlungeAnimation & { previousFeet: number };
}

interface Buffs {
  atkUntil: number;
  spdUntil: number;
  slowUntil: number;
}

interface Fighter {
  idx: number;
  char: CharDef;
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  facing: 1 | -1;
  onGround: boolean;
  jumpsLeft: number;
  percent: number;
  stocks: number;
  state: 'free' | 'attack' | 'hitstun';
  attack: ActiveAttack | null;
  hitstun: number;
  hitlag: number;
  petrified: number;
  invuln: number;
  dropTimer: number;    // 穿过软平台计时
  respawnTimer: number;
  held: ItemEnt | null;
  buffs: Buffs;
  isCPU: boolean;
  aiThink: number;
  aiJumpCd: number;
  koFlash: number;
  jumpBuffer: number;
  coyote: number;
  dodgeTimer: number;
  dodgeCooldown: number;
  airDodgeUsed: boolean;
  specialCooldown: number;
  secondaryCooldown: number;
  combo: number;
  comboTimer: number;
  damageDealt: number;
  lastHitBy: number | null;
  fastFalling: boolean;
  animationFrame: number;
  motion: MotionState;
  nextAttackVariants: AttackVariantState;
}

interface ItemEnt {
  def: ItemDef;
  x: number; y: number;
  vy: number;
  onGround: boolean;
  bob: number;
}

interface Projectile {
  kind: 'slash' | 'bomb' | 'slime' | 'thunder' | 'updraft' | 'frost' | 'phoenix';
  def?: MoveDef; hit?: Set<number>; radius?: number; height?: number; charId?: string;
  owner: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  grav: number;
  star?: boolean;
}

interface FloatText {
  x: number; y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

interface ImpactFx {
  x: number; y: number;
  charId: string; color: string;
  life: number; maxLife: number; size: number;
  plunge?: boolean;
}

interface Afterimage {
  x: number; feetY: number; facing: 1 | -1; charId: string;
  animation: FighterAnimation;
  life: number;
}

// ---------------- 主游戏类 ----------------
export class Game {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private destroyed = false;

  frame = 0;
  private visualQuality: VisualQuality = 'standard';
  private state: GameState = 'menu';
  private input = new BattleInput();
  private artLease?: GameArtLease;
  private sfx = new BattleAudio();
  private summons = new SummonRuntime();

  private mode: 'cpu' | 'pvp' = 'cpu';
  private selCursor = [0, 1];
  private countdown = 0;
  private pausedFrom: 'countdown' | 'fight' = 'fight';
  private options: MatchOptions = { mode: 'cpu', player: 0, opponent: 1, difficulty: 'normal', stocks: 3, duration: 180, items: true };
  private remainingFrames = 180 * 60;
  private isDraw = false;
  private mobileHud = false;

  private fighters: Fighter[] = [];
  private items: ItemEnt[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private impacts: ImpactFx[] = [];
  private afterimages: Afterimage[] = [];
  private itemTimer = 200;
  private shake = 0;
  private shakeOffset = { x: 0, y: 0 };
  private flash = 0;
  private winner: Fighter | null = null;
  private clouds: { x: number; y: number; s: number; v: number }[] = [];
  private spriteCache = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    canvas.width = WORLD.w;
    canvas.height = WORLD.h;
    this.prerenderSprites();
    for (let i = 0; i < 8; i++) {
      this.clouds.push({ x: Math.random() * WORLD.w, y: 40 + Math.random() * 200, s: 40 + Math.random() * 70, v: 0.1 + Math.random() * 0.25 });
    }
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearInput();
    this.summons.clear();
    this.artLease?.release();
    this.sfx.destroy();
  }

  start(options: MatchOptions): void {
    if (this.destroyed) return;
    this.options = { ...options };
    this.mode = options.mode;
    this.selCursor = [options.player, options.opponent].map(i => Math.max(0, Math.min(CHARACTERS.length - 1, Math.floor(i))));
    this.startMatch();
  }

  pause(): void {
    if (this.state === 'paused') this.state = this.pausedFrom;
    else if (this.state === 'fight' || this.state === 'countdown') {
      this.pausedFrom = this.state;
      this.state = 'paused';
    } else return;
    this.clearInput();
    this.last = performance.now();
    this.acc = 0;
    this.sfx.setScene(this.state === 'paused' ? 'paused' : 'playing');
  }

  rematch(): void { if (!this.destroyed) this.start(this.options); }
  setMuted(value: boolean): void { this.sfx.setMuted(value); }
  setMobileHud(enabled: boolean): void { this.mobileHud = enabled; }
  setVisualQuality(quality: VisualQuality): void { this.visualQuality = quality === 'low' ? 'low' : 'standard'; }
  resume(): void { if (this.state === 'paused') this.pause(); }

  setTouchAction(action: BattleAction, source: string, down: boolean): void {
    this.input.setTouchAction(action, source, down, !this.destroyed && this.state === 'fight');
    if (down && !this.destroyed && this.state === 'fight') this.sfx.unlock();
  }

  clearTouchInput(): void {
    this.input.clearTouch();
    if (this.fighters[0]) this.fighters[0].jumpBuffer = 0;
  }

  getSnapshot() {
    const player = this.fighters[0];
    const ready = this.state === 'fight' && !!player && !player.respawnTimer;
    return {
      phase: this.state, timeLeft: Math.ceil(this.remainingFrames / 60), winner: this.winner?.idx ?? null, draw: this.isDraw, muted: this.sfx.muted, visualQuality: this.visualQuality,
      onGround: player?.onGround ?? true,
      canSpecial: ready && player.specialCooldown <= 0 && !(player.char.id === 'xiao' && player.onGround),
      canSecondary: ready && player.secondaryCooldown <= 0,
      canDodge: ready && player.dodgeCooldown <= 0 && (player.onGround || !player.airDodgeUsed),
      skillCooldown: (player?.specialCooldown ?? 0) / 60, skillCooldownMax: player?.char.specialCooldown ?? (player?.char.special.effect === 'plunge' ? 105 / 60 : 90 / 60),
      secondaryCooldown: (player?.secondaryCooldown ?? 0) / 60, secondaryCooldownMax: player?.char.secondaryCooldown ?? 0,
      dodgeCooldown: (player?.dodgeCooldown ?? 0) / 60, dodgeCooldownMax: DODGE_COOLDOWN / 60,
    };
  }

  private clearInput() {
    this.input.clear();
    for (const fighter of this.fighters) fighter.jumpBuffer = 0;
  }

  private onBlur = () => {
    this.clearInput();
    if (this.state === 'fight' || this.state === 'countdown') this.pause();
  };
  private onVisibilityChange = () => { if (document.hidden) this.onBlur(); };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.state === 'menu') return;
    if (e.target instanceof HTMLElement && e.target.closest?.('[data-audio-settings]')) return;
    if (e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON' && ['Enter', 'Space'].includes(e.code)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.sfx.unlock();
      if (e.code === 'KeyM') { this.setMuted(!this.sfx.muted); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { this.pause(); return; }
      if (this.state === 'paused' && e.code === 'Enter') { this.pause(); return; }
      if (this.state === 'result' && e.code === 'Enter') { this.rematch(); return; }
      this.input.setKey(e.code, true, this.state === 'fight');
    }
  };
  private onKeyUp = (e: KeyboardEvent) => { this.input.setKey(e.code, false); };

  private loop = (now: number) => {
    if (this.destroyed) return;
    this.acc += Math.min(100, now - this.last);
    this.last = now;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (this.state !== 'paused') this.frame++;
      this.update();
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  // ============================================================
  // 更新
  // ============================================================
  private update() {
    switch (this.state) {
      case 'countdown':
        this.countdown--;
        this.updateParticles();
        if (this.countdown <= 0) this.state = 'fight';
        break;
      case 'fight': this.updateFight(); break;
      case 'result':
        this.shake *= 0.88;
        this.flash *= 0.9;
        this.updateParticles();
        break;
      case 'menu':
      case 'paused': break;
    }
    // Render frequency must not change camera jitter, pause state, or gameplay randomness.
    if (this.state !== 'paused') {
      this.shakeOffset.x = Math.sin(this.frame * 2.399963) * this.shake * 0.5;
      this.shakeOffset.y = Math.sin(this.frame * 3.883222 + 1.1) * this.shake * 0.5;
    }
    this.input.endTick();
  }

  private startMatch() {
    this.summons.clear();
    this.items = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.impacts = [];
    this.afterimages = [];
    this.itemTimer = 240;
    this.winner = null;
    this.isDraw = false;
    this.remainingFrames = this.options.duration * 60;
    this.shake = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.flash = 0;
    this.clearInput();
    this.fighters = [0, 1].map(i => this.makeFighter(i, CHARACTERS[this.selCursor[i]], i === 1 && this.mode === 'cpu'));
    const previousArt = this.artLease;
    this.artLease = acquireGameArt(this.fighters.map(fighter => fighter.char.id));
    previousArt?.release();
    void this.artLease.ready;
    this.countdown = 150;
    this.state = 'countdown';
    this.sfx.restart(); this.sfx.setScene('playing');
    this.last = performance.now();
    this.acc = 0;
  }

  private makeFighter(idx: number, char: CharDef, isCPU: boolean): Fighter {
    return {
      idx, char,
      x: idx === 0 ? STAGE.main.x + 120 : STAGE.main.x + STAGE.main.w - 120,
      y: STAGE.main.y - 76,
      vx: 0, vy: 0, w: 38, h: 76,
      facing: idx === 0 ? 1 : -1,
      onGround: true, jumpsLeft: 2,
      percent: 0, stocks: this.options.stocks,
      state: 'free', attack: null,
      hitstun: 0, hitlag: 0, petrified: 0, invuln: 0, dropTimer: 0,
      respawnTimer: 0, held: null,
      buffs: { atkUntil: 0, spdUntil: 0, slowUntil: 0 },
      isCPU, aiThink: 0, aiJumpCd: 0, koFlash: 0,
      jumpBuffer: 0, coyote: COYOTE_FRAMES, dodgeTimer: 0, dodgeCooldown: 0,
      airDodgeUsed: false, specialCooldown: 0, secondaryCooldown: 0, combo: 0, comboTimer: 0,
      damageDealt: 0, lastHitBy: null, fastFalling: false, animationFrame: 0,
      motion: newMotionState(idx === 0 ? 1 : -1),
      nextAttackVariants: newAttackVariants(),
    };
  }

  // ---------------- 像素精灵预渲染 ----------------
  // 为每个角色生成 idle/attack/special/jump/hurt × 正常/白闪 贴图
  // 行数据自动规范化到 SPRITE_W × SPRITE_H，容错 ±1 偏差
  private prerenderSprites() {
    for (const c of CHARACTERS) {
      const set = SPRITES[c.id];
      if (!set) continue;
      for (const frame of ['idle', 'attack', 'special', 'jump', 'hurt'] as const) {
        for (const white of [false, true]) {
          const cv = document.createElement('canvas');
          cv.width = SPRITE_W;
          cv.height = SPRITE_H;
          const cg = cv.getContext('2d');
          if (!cg) continue;
          const raw = set[frame];
          for (let r = 0; r < SPRITE_H; r++) {
            const row = (raw[r] ?? '').padEnd(SPRITE_W, '.');
            for (let col = 0; col < SPRITE_W; col++) {
              const ch = row[col];
              if (!ch || ch === '.') continue;
              cg.fillStyle = white ? '#ffffff' : set.palette[ch] ?? '#ff00ff';
              cg.fillRect(col, r, 1, 1);
            }
          }
          this.spriteCache.set(`${c.id}_${frame}${white ? '_w' : ''}`, cv);
        }
      }
    }
    // 道具图标预渲染
    for (const [id, set] of Object.entries(ITEM_SPRITES)) {
      const cv = document.createElement('canvas');
      cv.width = ITEM_SPRITE_SIZE;
      cv.height = ITEM_SPRITE_SIZE;
      const cg = cv.getContext('2d');
      if (!cg) continue;
      for (let r = 0; r < ITEM_SPRITE_SIZE; r++) {
        const row = (set.rows[r] ?? '').padEnd(ITEM_SPRITE_SIZE, '.');
        for (let col = 0; col < ITEM_SPRITE_SIZE; col++) {
          const ch = row[col];
          if (!ch || ch === '.') continue;
          cg.fillStyle = set.palette[ch] ?? '#ff00ff';
          cg.fillRect(col, r, 1, 1);
        }
      }
      this.spriteCache.set(`item_${id}`, cv);
    }
  }

  private sprite(charId: string, frame: SpriteFrame, white: boolean): HTMLCanvasElement | undefined {
    return this.spriteCache.get(`${charId}_${frame}${white ? '_w' : ''}`);
  }

  // ============================================================
  // 战斗更新
  // ============================================================
  private updateFight() {
    this.remainingFrames = Math.max(0, this.remainingFrames - 1);
    this.shake *= 0.88;
    this.flash *= 0.9;
    this.itemTimer--;
    if (this.options.items && this.itemTimer <= 0 && this.items.length < 2) {
      this.spawnItem();
      this.itemTimer = 300 + Math.floor(Math.random() * 180);
    }

    for (const f of this.fighters) {
      if (f.respawnTimer > 0) {
        f.respawnTimer--;
        if (f.respawnTimer === 0) this.respawn(f);
        continue;
      }
      const ctrl = f.isCPU ? this.cpuInput(f) : this.playerInput(f.idx);
      if (ctrl.up) f.jumpBuffer = JUMP_BUFFER;
      if (f.hitlag > 0) { f.hitlag = Math.max(0, f.hitlag - 1); continue; }
      this.updateFighter(f, ctrl);
    }

    this.resolveHits();
    this.updateProjectiles();
    this.updateSummons();
    this.updateItems();
    this.updateParticles();
    this.checkBlast();
    if (this.state === 'fight' && this.remainingFrames === 0) this.finishByTime();
  }

  private playerInput(player: number): Input {
    const direction = this.input.horizontal(player);
    return {
      left: direction < 0,
      right: direction > 0,
      up: this.input.justPressed('jump', player),
      down: this.input.held('down', player),
      jab: this.input.justPressed('jab', player),
      smash: this.input.justPressed('smash', player),
      special: this.input.justPressed('special', player),
      secondary: this.input.justPressed('secondary', player),
      downPressed: this.input.justPressed('down', player),
      dodge: this.input.justPressed('dodge', player),
    };
  }

  // ---------------- 简易 CPU ----------------
  private cpuInput(f: Fighter): Input {
    const out: Input = { left: false, right: false, up: false, down: false, jab: false, smash: false, special: false, secondary: false, downPressed: false, dodge: false };
    const foe = this.fighters[1 - f.idx];
    if (!foe) return out;
    f.aiThink = Math.max(0, f.aiThink - 1);
    f.aiJumpCd = Math.max(0, f.aiJumpCd - 1);
    const m = STAGE.main;
    const difficulty = this.options.difficulty;
    const reaction = difficulty === 'easy' ? 42 : difficulty === 'hard' ? 12 : 25;
    const offStage = f.x < m.x + 16 || f.x > m.x + m.w - 16 || f.y + f.h > m.y + 20;

    if (offStage && !f.onGround) {
      // Aim safely inside the closest ledge; conserve the air jump until it can reach the top.
      const cx = Math.max(m.x + 65, Math.min(m.x + m.w - 65, f.x));
      if (f.x < cx - 10) out.right = true; else if (f.x > cx + 10) out.left = true;
      const nearLedge = f.x > m.x - 125 && f.x < m.x + m.w + 125;
      if (f.jumpsLeft > 0 && f.aiJumpCd === 0 && f.vy > -2 && (nearLedge || f.y + f.h > m.y - 35)) {
        out.up = true;
        f.aiJumpCd = 18;
      }
      if (f.jumpsLeft === 0 && f.vy > 1 && f.y + f.h > m.y - 100 && !f.airDodgeUsed) out.dodge = true;
      return out;
    }

    if (foe.respawnTimer > 0) {
      out.left = f.x > m.x + m.w / 2 + 70;
      out.right = f.x < m.x + m.w / 2 - 70;
      return out;
    }

    const dx = foe.x - f.x;
    const dy = foe.y - f.y;
    const plunge = f.char.special.effect === 'plunge';
    const summoner = f.char.id === 'zhongli' || f.char.id === 'furina';
    if (summoner && f.state === 'free' && f.onGround && f.aiThink === 0 && f.specialCooldown === 0 && Math.abs(dx) < 420 && Math.abs(dy) < 190) {
      f.facing = dx >= 0 ? 1 : -1; out.special = true; f.aiThink = reaction * 2; return out;
    }
    // 捡道具
    let target: number | null = null;
    for (const it of this.items) {
      if (!f.held && (it.def.id !== 'heal' || f.percent > 20) && Math.abs(it.x - f.x) < 210 && Math.abs(it.y - f.y) < 100) { target = it.x; break; }
    }
    const goal = target ?? foe.x;
    if (Math.abs(goal - f.x) > (target ? 8 : 46)) {
      if (goal < f.x) out.left = true; else out.right = true;
    }
    // Edge protection is deliberately conservative on the main platform only.
    if (f.onGround) {
      if (out.left && f.x < m.x + 30) { out.left = false; }
      if (out.right && f.x > m.x + m.w - 30) { out.right = false; }
    }
    if (dy < -70 && f.onGround && f.aiJumpCd === 0) { out.up = true; f.aiJumpCd = 32; }
    if (dy > 90 && f.onGround && this.onSoftPlatform(f) && f.aiJumpCd === 0) {
      out.downPressed = true;
      f.aiJumpCd = 26;
    }
    if (f.state === 'free' && difficulty !== 'easy' && foe.attack && Math.abs(dx) < 120 && Math.abs(dy) < 85 && f.dodgeCooldown === 0 && f.aiThink === 0) {
      const warning = foe.attack.def.startup - foe.attack.t;
      if (warning > 0 && warning < (difficulty === 'hard' ? 11 : 7)) {
        out.dodge = true;
        out.left = dx > 0;
        out.right = dx < 0;
        f.aiThink = reaction;
        return out;
      }
    }
    // A plunge is committed vertically: align over the target and check a landing
    // surface first. The offstage recovery branch above always takes priority.
    if (plunge && !f.held && f.state === 'free' && f.specialCooldown === 0) {
      const surface = this.platformBelow(f);
      if (!f.onGround && surface && Math.abs(dx) < 72 && dy > 36 && surface.y - (f.y + f.h) > 18) {
        out.special = true;
        out.left = false; out.right = false;
        f.aiThink = reaction;
        return out;
      }
      if (f.onGround && Math.abs(dx) < 130 && Math.abs(dy) < 70 && f.aiJumpCd === 0 && f.aiThink === 0) {
        out.up = true;
        f.aiJumpCd = 45;
        f.aiThink = reaction;
        return out;
      }
    }
    // Do not lock an airborne recovery into an attack while momentum would carry
    // the CPU outside the landing lane during startup and recovery.
    const projectedX = f.x + f.vx * 50;
    if (!f.onGround && (projectedX < m.x + 55 || projectedX > m.x + m.w - 55)) return out;
    const thrustSafe = f.char.id !== 'xiao' || (f.x + Math.sign(dx) * 150 > m.x + 50 && f.x + Math.sign(dx) * 150 < m.x + m.w - 50);
    if (f.state === 'free' && f.onGround && f.x > m.x + 55 && f.x < m.x + m.w - 55 && f.secondaryCooldown === 0 && f.aiThink === 0 && thrustSafe && Math.abs(dx) > 70 && Math.abs(dx) < (f.char.id === 'xiao' ? 180 : 250) && Math.abs(dy) < 75) {
      f.facing = dx >= 0 ? 1 : -1; out.left = false; out.right = false; out.secondary = true; f.aiThink = reaction * 2; return out;
    }
    // 攻击
    const inRange = Math.abs(dx) < f.char.jab.reach + 18 && Math.abs(dy) < 65;
    if (f.state === 'free' && inRange && f.aiThink <= 0) {
      const r = Math.random();
      f.facing = dx >= 0 ? 1 : -1;
      out.left = false; out.right = false;
      if (foe.percent > 80 && r < 0.6) out.smash = true;
      else if (r < 0.65 || f.specialCooldown > 0 || plunge) out.jab = true;
      else out.special = true;
      if (out.special && f.char.special.effect === 'dash') {
        const landingX = f.x + f.facing * 13 * f.char.special.active;
        if (landingX < m.x + 45 || landingX > m.x + m.w - 45) { out.special = false; out.jab = true; }
      }
      f.aiThink = reaction + Math.floor(Math.random() * reaction);
    }
    // 中距离开技能
    const ranged = f.char.special.effect === 'projectile' || f.char.special.effect === 'gust';
    if (f.state === 'free' && !inRange && (ranged || f.held) && Math.abs(dx) < (ranged ? 270 : 180) && Math.abs(dy) < 55 && f.aiThink === 0 && f.specialCooldown === 0) {
      f.facing = dx >= 0 ? 1 : -1;
      out.left = false; out.right = false;
      out.special = true;
      f.aiThink = reaction * 2;
    }
    return out;
  }

  // ---------------- 单个角色物理 + 行为 ----------------
  private updateFighter(f: Fighter, ctrl: Input) {
    const c = f.char;
    const previousX = f.x;
    f.animationFrame++;
    if (f.invuln > 0) f.invuln--;
    if (f.dropTimer > 0) f.dropTimer--;
    if (f.koFlash > 0) f.koFlash--;
    if (f.dodgeCooldown > 0) f.dodgeCooldown--;
    if (f.specialCooldown > 0) f.specialCooldown--;
    if (f.secondaryCooldown > 0) f.secondaryCooldown--;
    if (f.petrified > 0) f.petrified--;
    if (f.comboTimer > 0) f.comboTimer--;
    else f.combo = 0;
    if (f.onGround) f.coyote = COYOTE_FRAMES;
    else f.coyote = Math.max(0, f.coyote - 1);
    if (!f.onGround && f.coyote === 0 && f.jumpsLeft === 2) f.jumpsLeft = 1;
    if (ctrl.up) f.jumpBuffer = JUMP_BUFFER;
    const slowed = f.buffs.slowUntil > this.frame;
    const sped = f.buffs.spdUntil > this.frame;
    const spdMul = (slowed ? 0.5 : 1) * (sped ? 1.35 : 1);
    const jmpMul = (slowed ? 0.72 : 1) * (sped ? 1.15 : 1);

    if (f.hitstun > 0) {
      f.hitstun = Math.max(0, f.hitstun - 1);
      if (f.hitstun <= 0) f.state = 'free';
    }

    if (ctrl.dodge && f.state === 'free' && f.dodgeCooldown === 0 && (f.onGround || !f.airDodgeUsed)) {
      f.dodgeTimer = DODGE_FRAMES;
      f.dodgeCooldown = DODGE_COOLDOWN;
      f.invuln = DODGE_FRAMES;
      const direction = ctrl.left ? -1 : ctrl.right ? 1 : f.facing;
      f.vx = direction * 8;
      if (!f.onGround) {
        f.airDodgeUsed = true;
        f.vy = Math.min(f.vy, -3.8);
      }
      this.sfx.play('dodge', { charId: c.id });
      this.burst(f.x, f.y + f.h / 2, 10, '#9ce8e3', 2);
    }
    const dodging = f.dodgeTimer > 0;
    if (dodging) {
      f.dodgeTimer--;
      f.vx *= 0.965;
      if (this.frame % 3 === 0) this.burst(f.x, f.y + f.h / 2, 2, c.color, 3);
    }
    const busy = f.state === 'attack' || f.state === 'hitstun' || dodging;

    // 水平移动
    if (!busy) {
      const sp = c.speed * spdMul;
      if (ctrl.left) { f.vx = Math.max(f.vx - (f.onGround ? 0.7 : c.airDrift), -sp); f.facing = -1; }
      if (ctrl.right) { f.vx = Math.min(f.vx + (f.onGround ? 0.7 : c.airDrift), sp); f.facing = 1; }
      if (!ctrl.left && !ctrl.right && f.onGround) f.vx *= 0.75;
    } else if (f.state === 'hitstun' && f.petrified <= 0) {
      // 受击时略微可控（DI）
      if (ctrl.left) f.vx -= 0.06;
      if (ctrl.right) f.vx += 0.06;
    }
    if (!f.onGround && f.state === 'free' && !dodging && !ctrl.left && !ctrl.right) f.vx *= 0.992;

    // 跳跃（二段跳）
    if (f.jumpBuffer > 0 && !busy && f.jumpsLeft > 0) {
      const groundJump = f.onGround || f.coyote > 0;
      f.vy = -c.jump * jmpMul * (groundJump ? 1 : 0.94);
      f.jumpsLeft = groundJump ? 1 : f.jumpsLeft - 1;
      f.jumpBuffer = 0;
      f.coyote = 0;
      f.onGround = false;
      f.fastFalling = false;
      this.sfx.play('jump', { charId: c.id });
      this.burst(f.x, f.y + f.h, 6, '#ffffff', 2);
    }
    if (f.jumpBuffer > 0) f.jumpBuffer--;

    // 穿过软平台
    if (!busy && ctrl.downPressed && f.onGround && this.onSoftPlatform(f)) {
      f.dropTimer = 12;
      f.onGround = false;
      f.y += 4;
    }

    // 快速下落
    if (ctrl.down && !f.onGround && f.vy > -2 && !dodging && f.state !== 'hitstun' && !f.attack?.plunge) f.fastFalling = true;
    if (f.fastFalling) f.vy = Math.min(f.vy + 0.9, FAST_FALL);

    // 攻击输入
    if (!busy) {
      if (ctrl.jab) {
        if (f.held) this.throwHeld(f);
        else this.startAttack(f, c.jab);
      } else if (ctrl.smash) {
        if (f.held) this.throwHeld(f);
        else this.startAttack(f, c.smash);
      } else if (ctrl.secondary && f.secondaryCooldown === 0) {
        this.startAttack(f, c.secondary);
      } else if (ctrl.special && f.specialCooldown === 0) {
        if (f.held) this.throwHeld(f);
        else this.startAttack(f, c.special);
      }
    }

    // 攻击推进
    if (f.attack) {
      const a = f.attack;
      const def = a.def;
      if (a.plunge) {
        const plunge = a.plunge;
        plunge.elapsed++;
        f.vx = 0;
        f.fastFalling = false;
        if (plunge.phase === 'windup') {
          a.t = plunge.elapsed;
          f.vy = 0;
          if (plunge.elapsed >= def.startup) {
            plunge.phase = 'dive'; plunge.elapsed = 0;
            f.vy = 18;
            this.sfx.play('cast', { charId: c.id, kind: 'special' });
          }
        } else if (plunge.phase === 'dive') {
          // Contact remains live until collision, even from the top blast line.
          a.t = def.startup;
          f.vy = Math.min(PLUNGE_SPEED, Math.max(18, f.vy + 2.4));
        } else {
          f.vy = 0;
          a.t++;
          if (plunge.phase === 'impact' && plunge.elapsed >= def.active) {
            plunge.phase = 'recover'; plunge.elapsed = 0;
          } else if (plunge.phase === 'recover' && plunge.elapsed >= def.endlag - def.active) {
            f.attack = null;
            f.state = 'free';
          }
        }
      } else a.t++;
      if (a.t === def.startup && (def.kind === 'special' || def.kind === 'secondary') && !a.plunge) this.sfx.play('cast', { charId: c.id, kind: def.kind });
      if (a.t === def.startup && (def.effect === 'geo-pillar' || def.effect === 'salon')) {
        const owner = this.summonOwner(f), context = this.summonContext();
        if (def.effect === 'geo-pillar') this.summons.castGeo(owner, context);
        else this.summons.castSalon(owner, context);
      }
      if (def.kind === 'secondary' && a.t === def.startup) this.releaseSecondary(f, def);
      if (def.effect === 'thrust' && a.t >= def.startup && a.t < def.startup + def.active) { f.vx = f.facing * 11; f.vy = 0; }
      if (def.effect === 'thrust' && a.t >= def.startup + def.active) f.vx *= 0.55;
      // 特殊技位移
      if (def.effect === 'dash' && a.t > def.startup && a.t <= def.startup + def.active) {
        f.vx = f.facing * 13;
        f.vy = Math.min(f.vy, 0);
        this.burst(f.x - f.facing * 20, f.y + 30, 2, '#ff8040', 3);
      }
      if (def.effect === 'dash' && a.t > def.startup + def.active) f.vx *= 0.7;
      if (def.effect === 'projectile' && a.t === def.startup) {
        this.projectiles.push({
          kind: 'slash', owner: f.idx,
          x: f.x + f.facing * 30, y: f.y + 24,
          vx: f.facing * 10, vy: 0, life: 55, color: c.color, def: { ...def }, hit: new Set(),
        });
      }
      if (!a.plunge && a.t >= def.startup + def.active + def.endlag) {
        f.attack = null;
        f.state = 'free';
      }
    }

    // 重力
    const plunge = f.attack?.plunge;
    const thrusting = f.attack?.def.effect === 'thrust' && f.attack.t >= f.attack.def.startup && f.attack.t < f.attack.def.startup + f.attack.def.active;
    if ((!plunge || plunge.phase === 'impact' || plunge.phase === 'recover') && !thrusting) {
      f.vy = Math.min(f.vy + GRAV * c.gravMul * (dodging ? 0.35 : 1), f.fastFalling ? FAST_FALL : MAX_FALL);
    }

    // 位移与碰撞
    const wasGrounded = f.onGround;
    const landingVelocity = f.vy;
    if (plunge?.phase === 'dive') plunge.previousFeet = f.y + f.h;
    f.x += f.vx;
    f.y += f.vy;
    if (plunge?.phase !== 'windup') this.collidePlatforms(f);
    if (plunge?.phase === 'dive' && f.onGround && f.attack) this.landPlunge(f, f.attack);
    if (!wasGrounded && f.onGround && landingVelocity > 3) {
      this.burst(f.x, f.y + f.h - 2, 5, '#bed9cb', 1.6);
    }
    if (f.animationFrame % 3 === 0 && (dodging || (f.attack && attackPhase(f.attack).phase === 'contact' && (f.attack.def.effect === 'dash' || f.attack.def.effect === 'plunge' || f.attack.def.kind === 'smash')))) {
      this.afterimages.push({ x: f.x, feetY: f.y + f.h, facing: f.facing, charId: c.id, animation: this.fighterAnimation(f), life: 10 });
    }

    // 跑步扬尘
    if (f.onGround && Math.abs(f.vx) > 3 && this.frame % 8 === 0) {
      this.burst(f.x - f.facing * 12, f.y + f.h, 1, 'rgba(255,255,255,0.5)', 1.5);
    }
    advanceMotion(f.motion, { dx: f.x - previousX, onGround: f.onGround, facing: f.facing,
      walking: f.state === 'free' && !f.attack && !dodging && ((ctrl.left !== ctrl.right) || (f.motion.moving && Math.abs(f.vx) > 0.08)) });
  }

  private onSoftPlatform(f: Fighter): boolean {
    const feet = f.y + f.h;
    for (const p of STAGE.soft) {
      if (Math.abs(feet - p.y) < 4 && f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w) return true;
    }
    return false;
  }

  private collidePlatforms(f: Fighter) {
    const prevFeet = f.y + f.h - f.vy;
    const feet = f.y + f.h;
    const landingSpeed = f.vy, wasGrounded = f.onGround;
    f.onGround = false;
    if (f.vy < 0) return;
    // Sort by height before resolving: a fast descent must stop at the first
    // crossed surface, rather than whichever platform was listed last.
    const platforms = f.dropTimer > 0 ? [STAGE.main] : [STAGE.main, ...STAGE.soft];
    const landing = platforms.filter(p => prevFeet <= p.y + 1 && feet >= p.y &&
      f.x + f.w / 2 > p.x && f.x - f.w / 2 < p.x + p.w).sort((a, b) => a.y - b.y)[0];
    if (!landing) return;
    if (!wasGrounded && landingSpeed > 2 && !f.attack?.plunge) this.sfx.play('land', { charId: f.char.id, power: Math.min(12, landingSpeed) });
    f.y = landing.y - f.h;
    f.vy = 0;
    f.onGround = true;
    f.jumpsLeft = 2;
    f.airDodgeUsed = false;
    f.fastFalling = false;
  }

  private platformBelow(f: Fighter) {
    const feet = f.y + f.h;
    return [STAGE.main, ...STAGE.soft].filter(p => p.y >= feet - 1 && f.x > p.x + 24 && f.x < p.x + p.w - 24)
      .sort((a, b) => a.y - b.y)[0];
  }

  private landPlunge(f: Fighter, attack: ActiveAttack) {
    if (!attack.plunge || attack.plunge.phase !== 'dive') return;
    attack.plunge.phase = 'impact';
    attack.plunge.elapsed = 0;
    attack.t = attack.def.startup + attack.def.active;
    attack.hasHit.clear(); // One light descent hit, then one landing hit per target.
    f.vx = 0; f.vy = 0;
    this.shake = Math.max(this.shake, 9);
    this.sfx.play('explosion', { charId: f.char.id, kind: 'special', power: 16 });
    this.impacts.push({ x: f.x, y: f.y + f.h, charId: f.char.id, color: f.char.color, life: 24, maxLife: 24, size: attack.def.reach, plunge: true });
    this.burst(f.x, f.y + f.h - 4, 24, f.char.color, 3.2);
    this.burst(f.x, f.y + f.h, 14, '#bdc9b7', 2.4);
  }

  private startAttack(f: Fighter, def: MoveDef) {
    if (def.effect === 'plunge' && f.onGround) {
      if (!this.texts.some(text => text.text === '需在空中释放' && Math.abs(text.x - f.x) < 50)) {
        this.texts.push({ x: f.x, y: f.y - 32, text: '需在空中释放', color: '#a6f5df', life: 42, size: 16 });
      }
      return;
    }
    f.attack = { def, t: 0, hasHit: new Set(), visualVariant: takeAttackVariant(f.nextAttackVariants, def.kind) };
    f.state = 'attack';
    if (def.kind === 'jab' || def.kind === 'smash') this.sfx.play('attack', { charId: f.char.id, kind: def.kind });
    if (def.effect === 'plunge') {
      f.attack.plunge = { phase: 'windup', elapsed: 0, previousFeet: f.y + f.h };
      f.vx = 0; f.vy = 0;
      f.fastFalling = false; f.dropTimer = 0; f.jumpBuffer = 0; f.coyote = 0;
    }
    if (def.kind === 'secondary') f.secondaryCooldown = f.char.secondaryCooldown * 60;
    if (def.kind === 'special') f.specialCooldown = f.char.specialCooldown !== undefined ? f.char.specialCooldown * 60 : def.effect === 'plunge' ? 105 : 90;
    if (f.onGround && def.effect !== 'dash') f.vx *= 0.3;
  }

  private releaseSecondary(f: Fighter, def: MoveDef) {
    if (def.effect === 'geo-meteor' || def.effect === 'revelry') {
      const owner = this.summonOwner(f), context = this.summonContext();
      if (def.effect === 'geo-meteor') this.summons.castMeteor(owner, context);
      else this.summons.castRevelry(owner, context);
      return;
    }
    if (def.effect === 'thrust') return;
    const add = (kind: Projectile['kind'], x: number, y: number, vx: number, vy: number, radius: number, height: number, life: number) => {
      if (this.projectiles.length >= 80) return;
      this.projectiles.push({ kind, owner: f.idx, charId: f.char.id, x, y, vx, vy, radius, height, life, color: f.char.color, def: { ...def }, hit: new Set() });
    };
    const feet = f.y + f.h;
    if (def.effect === 'thunder') add('thunder', f.x + f.facing * 95, feet - 100, 0, 0, 38, 230, 25);
    if (def.effect === 'updraft') add('updraft', f.x + f.facing * 75, feet - 55, 0, -1.5, 62, 170, 55);
    if (def.effect === 'frost') for (const angle of [-0.30, 0, 0.30]) add('frost', f.x + f.facing * 35, feet - 40, f.facing * Math.cos(angle) * 8, Math.sin(angle) * 8, 22, 42, 52);
    if (def.effect === 'phoenix') add('phoenix', f.x + f.facing * 36, feet - 44, f.facing * 7.5, 0, 49, 85, 65);
  }

  // ---------------- 攻击判定 ----------------
  private attackHitbox(f: Fighter): { x: number; y: number; w: number; h: number } | null {
    if (!f.attack) return null;
    const { def, t } = f.attack;
    if (f.attack.plunge) {
      const plunge = f.attack.plunge;
      if (plunge.phase === 'dive') {
        const feet = f.y + f.h;
        const top = Math.min(plunge.previousFeet, feet) - 4;
        return { x: f.x - 20, y: top, w: 40, h: feet + 42 - top };
      }
      if (plunge.phase === 'impact') return { x: f.x - def.reach, y: f.y + f.h - def.height, w: def.reach * 2, h: def.height + 8 };
      return null;
    }
    if (t < def.startup || t >= def.startup + def.active) return null;
    if (def.effect === 'projectile' || def.effect === 'geo-pillar' || def.effect === 'salon' || (def.kind === 'secondary' && def.effect !== 'thrust')) return null;
    const reach = def.reach;
    if (def.effect === 'spin') {
      return { x: f.x - reach, y: f.y + f.h / 2 - def.height / 2, w: reach * 2, h: def.height };
    }
    if (def.effect === 'dash') {
      return { x: f.x - 30, y: f.y + f.h / 2 - def.height / 2, w: 60, h: def.height };
    }
    const hx = f.facing === 1 ? f.x + 10 : f.x - 10 - reach;
    return { x: hx, y: f.y + f.h / 2 - def.height / 2, w: reach, h: def.height };
  }

  private resolveHits() {
    const hits: { atk: Fighter; vic: Fighter; def: MoveDef }[] = [];
    for (const atk of this.fighters) {
      if (atk.respawnTimer > 0) continue;
      const hb = this.attackHitbox(atk);
      if (!hb || !atk.attack) continue;
      for (const vic of this.fighters) {
        if (vic === atk || vic.respawnTimer > 0 || vic.invuln > 0) continue;
        if (atk.attack.hasHit.has(vic.idx)) continue;
        if (this.overlap(hb, { x: vic.x - vic.w / 2, y: vic.y, w: vic.w, h: vic.h })) {
          atk.attack.hasHit.add(vic.idx);
          const def = atk.attack.plunge?.phase === 'dive'
            ? { ...atk.attack.def, dmg: 7, kb: 2.4, kbs: 0.035, angle: 270 }
            : atk.attack.def;
          hits.push({ atk, vic, def });
        }
      }
    }
    // Resolve the same simulation frame together so neither player gets priority.
    for (const { atk, vic, def } of hits) this.applyHit(atk, vic, def);
  }

  private applyHit(atk: Fighter, vic: Fighter, def: MoveDef, summon = false, controlFrames = 0) {
    const atkUp = atk.buffs.atkUntil > this.frame ? 1.3 : 1;
    const rawDamage = def.dmg * (summon ? 1 : atkUp * this.summons.damageMultiplier(atk.idx));
    const dmg = this.summons.absorb(vic.idx, rawDamage);
    if (dmg < rawDamage) {
      this.sfx.play('shield', { charId: vic.char.id, power: rawDamage });
      this.burst(vic.x, vic.y + vic.h / 2, 5, '#eac879', 2);
    }
    if (dmg <= 0) { vic.hitlag = Math.max(vic.hitlag, 2); return; }
    const before = vic.percent;
    vic.percent += dmg;
    // 大乱斗经典公式：基础击飞 + 百分比成长，再按体重修正
    const mag = (def.kb + before * def.kbs) * (220 / (vic.char.weight + 120));
    const dirx = Math.sign(vic.x - atk.x) || atk.facing;
    const rad = (def.angle * Math.PI) / 180;
    vic.vx = Math.cos(rad) * mag * dirx;
    vic.vy = -Math.sin(rad) * mag;
    vic.onGround = false;
    vic.state = 'hitstun';
    vic.hitstun = Math.ceil(Math.max(8, Math.min(48, mag * 2.3)));
    if (controlFrames > 0) { vic.petrified = Math.min(70, controlFrames); vic.hitstun = Math.max(vic.hitstun, vic.petrified); vic.vx = 0; vic.vy = 0; }
    else if (vic.petrified > 0) vic.hitstun = Math.max(vic.hitstun, vic.petrified);
    vic.attack = null;
    vic.dropTimer = 0;
    vic.dodgeTimer = 0;
    vic.fastFalling = false;
    vic.lastHitBy = atk.idx;
    vic.koFlash = 8;
    atk.damageDealt += dmg;
    atk.combo = atk.comboTimer > 0 ? atk.combo + 1 : 1;
    atk.comboTimer = 100;
    // 打击停顿（双方冻结帧）
    const lag = Math.ceil(Math.max(3, Math.min(11, dmg * 0.5)));
    vic.hitlag = lag;
    if (!summon) atk.hitlag = lag;
    this.shake = Math.min(14, this.shake + dmg * 0.7);
    this.sfx.play('impact', { charId: atk.char.id, kind: def.kind, power: dmg });
    // 火花粒子 + 伤害数字
    const hx = vic.x, hy = vic.y + vic.h / 2;
    this.impacts.push({ x: hx, y: hy, charId: atk.char.id, color: atk.char.color, life: 15, maxLife: 15, size: 42 + dmg * 2.2 });
    this.burst(hx, hy, 10 + Math.floor(dmg), atk.char.color, 3);
    this.texts.push({ x: hx, y: hy - 30, text: `+${Math.round(dmg)}%`, color: '#fff3d5', life: 34, size: 19 + Math.min(8, dmg / 2) });
    if (mag > 14) this.texts.push({ x: hx, y: hy - 64, text: '强力击飞', color: '#f4d592', life: 42, size: 20 });
  }

  private overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private summonOwner(f: Fighter): SummonOwner {
    return { id: f.idx, x: f.x, feetY: f.y + f.h, facing: f.facing, alive: f.stocks > 0 && f.respawnTimer === 0 };
  }

  private summonSurface(x: number, nearFeetY: number): number | null {
    const surfaces = [STAGE.main, ...STAGE.soft].filter(surface => x >= surface.x && x <= surface.x + surface.w && surface.y >= nearFeetY - 12);
    return surfaces.length ? Math.min(...surfaces.map(surface => surface.y)) : null;
  }

  private summonContext(): SummonContext {
    return {
      owners: this.fighters.map(f => this.summonOwner(f)),
      targets: this.fighters.map(f => ({ id: f.idx, ownerId: f.idx, x: f.x, feetY: f.y + f.h, width: f.w, height: f.h, alive: f.stocks > 0 && f.respawnTimer === 0 && f.invuln <= 0 })),
      surfaceAt: (x, feet) => this.summonSurface(x, feet),
    };
  }

  private updateSummons(): void {
    const effectsBefore = new Set(this.summons.effects.map(effect => effect.id));
    const hits = this.summons.step(this.summonContext());
    for (const effect of this.summons.effects) if (!effectsBefore.has(effect.id)) {
      this.sfx.play('summon', { charId: this.fighters[effect.ownerId]?.char.id, summonKind: effect.kind });
    }
    for (const hit of hits) {
      const owner = this.fighters.find(f => f.idx === hit.ownerId), target = this.fighters.find(f => f.idx === hit.targetId);
      if (!owner || !target || target.invuln > 0 || target.stocks <= 0 || target.respawnTimer > 0) continue;
      const meteor = hit.kind === 'geo-meteor';
      this.applyHit(owner, target, { name: hit.kind, dmg: hit.amount, kb: meteor ? 4 : 1.7, kbs: meteor ? 0.055 : 0.025,
        angle: 55, startup: 0, active: 1, endlag: 0, reach: 0, height: 0, kind: meteor || hit.kind === 'hydro-wave' ? 'secondary' : 'special' }, true, hit.controlFrames);
    }
  }

  // ---------------- 道具 ----------------
  private spawnItem() {
    const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    const spots = [
      { x: STAGE.main.x + 80 + Math.random() * (STAGE.main.w - 160), y: STAGE.main.y - 100 },
      ...STAGE.soft.map(p => ({ x: p.x + p.w / 2, y: p.y - 80 })),
    ];
    const s = spots[Math.floor(Math.random() * spots.length)];
    this.items.push({ def, x: s.x, y: s.y, vy: 0, onGround: false, bob: 0 });
  }

  private updateItems() {
    for (const it of this.items) {
      it.bob++;
      if (!it.onGround) {
        it.vy = Math.min(it.vy + 0.35, 6);
        it.y += it.vy;
        const all = [{ x: STAGE.main.x, y: STAGE.main.y, w: STAGE.main.w }, ...STAGE.soft];
        for (const p of all) {
          if (it.vy >= 0 && it.y + 12 >= p.y && it.y + 12 - it.vy <= p.y + 1 && it.x > p.x && it.x < p.x + p.w) {
            it.y = p.y - 12;
            it.vy = 0;
            it.onGround = true;
          }
        }
      }
    }
    // 拾取
    for (const f of this.fighters) {
      if (f.respawnTimer > 0 || f.state === 'hitstun') continue;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (Math.abs(it.x - f.x) < 34 && Math.abs(it.y - (f.y + f.h / 2)) < 44) {
          if (it.def.kind === 'instant') {
            this.useInstant(f, it.def);
            this.items.splice(i, 1);
          } else if (!f.held) {
            f.held = it;
            this.items.splice(i, 1);
            this.sfx.play('pickup');
            this.texts.push({ x: f.x, y: f.y - 20, text: it.def.name, color: it.def.color, life: 50, size: 16 });
          }
        }
      }
    }
  }

  private useInstant(f: Fighter, def: ItemDef) {
    this.sfx.play('pickup');
    if (def.id === 'heal') {
      f.percent = Math.max(0, f.percent - 30);
      this.burst(f.x, f.y + 20, 12, '#7fe87f', 3);
      this.texts.push({ x: f.x, y: f.y - 20, text: '-30%', color: '#7fe87f', life: 50, size: 22 });
    } else if (def.id === 'gust') {
      f.buffs.spdUntil = this.frame + 360;
      this.burst(f.x, f.y + 20, 12, '#58d8b0', 3);
      this.texts.push({ x: f.x, y: f.y - 20, text: '速度提升!', color: '#58d8b0', life: 50, size: 20 });
    } else if (def.id === 'power') {
      f.buffs.atkUntil = this.frame + 360;
      this.burst(f.x, f.y + 20, 12, '#e87898', 3);
      this.texts.push({ x: f.x, y: f.y - 20, text: '攻击提升!', color: '#e87898', life: 50, size: 20 });
    }
  }

  private throwHeld(f: Fighter) {
    if (!f.held) return;
    const it = f.held;
    f.held = null;
    this.sfx.play('throw', { charId: f.char.id });
    this.projectiles.push({
      kind: it.def.id === 'bomb' ? 'bomb' : 'slime',
      owner: f.idx,
      x: f.x + f.facing * 24, y: f.y + 10,
      vx: f.facing * 8.5, vy: -4, life: 200, color: it.def.color,
    });
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life--;
      if (p.kind === 'bomb' || p.kind === 'slime') p.vy += 0.32;
      p.x += p.vx;
      p.y += p.vy;
      let dead = p.life <= 0 || p.y > WORLD.h + 60 || p.x < -60 || p.x > WORLD.w + 60;

      if (dead) { this.projectiles.splice(i, 1); continue; }
      if (p.def) {
        this.burst(p.x, p.y, 1, p.color, 2);
        for (const f of this.fighters) {
          if (f.idx === p.owner || f.respawnTimer > 0 || f.invuln > 0 || p.hit?.has(f.idx)) continue;
          if (Math.abs(p.x - f.x) < (p.kind === 'slash' ? 30 : (p.radius ?? 30) + f.w / 2) && Math.abs(p.y - (f.y + f.h / 2)) < (p.kind === 'slash' ? 40 : (p.height ?? 42) / 2 + f.h / 2)) {
            const owner = this.fighters[p.owner];
            p.hit?.add(f.idx); this.applyHit(owner, f, p.def);
            if (p.kind === 'frost') f.buffs.slowUntil = this.frame + 108;
            dead = p.kind !== 'thunder' && p.kind !== 'updraft';
            break;
          }
        }
      } else {
        // 炸弹 / 史莱姆：碰人判定
        for (const f of this.fighters) {
          if (f.idx === p.owner || f.respawnTimer > 0 || f.invuln > 0) continue;
          if (Math.abs(p.x - f.x) < 28 && Math.abs(p.y - (f.y + f.h / 2)) < 38) {
            if (p.kind === 'bomb') { this.explode(p.x, p.y, p.owner); }
            else {
              f.buffs.slowUntil = this.frame + 180;
              this.burst(f.x, f.y + 20, 10, '#68c048', 3);
              this.texts.push({ x: f.x, y: f.y - 20, text: '减速!', color: '#68c048', life: 45, size: 20 });
              this.sfx.play('impact', { power: 6 });
            }
            dead = true;
            break;
          }
        }
        // 落地
        if (!dead) {
          const all = [{ x: STAGE.main.x, y: STAGE.main.y, w: STAGE.main.w }, ...STAGE.soft];
          for (const pl of all) {
            if (p.vy > 0 && p.y + 8 >= pl.y && p.y + 8 - p.vy <= pl.y + 1 && p.x > pl.x && p.x < pl.x + pl.w) {
              if (p.kind === 'bomb') this.explode(p.x, pl.y - 4, p.owner);
              else this.burst(p.x, pl.y - 4, 6, '#68c048', 2);
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  }

  private explode(x: number, y: number, owner: number) {
    this.sfx.play('explosion');
    this.shake = Math.min(18, this.shake + 10);
    this.flash = 0.5;
    this.burst(x, y, 26, '#ff8040', 5);
    this.burst(x, y, 14, '#ffd040', 4);
    const R = 95;
    for (const f of this.fighters) {
      if (f.respawnTimer > 0) continue;
      const d = Math.hypot(f.x - x, f.y + f.h / 2 - y);
      if (d < R && f.invuln <= 0) {
        const own = this.fighters[owner];
        const fakeDef: MoveDef = { name: '爆炸', dmg: 16, kb: 6.5, kbs: 0.085, angle: 55, startup: 0, active: 0, endlag: 0, reach: 0, height: 0, kind: 'smash' };
        this.applyHit(own, f, fakeDef);
      }
    }
  }

  // ---------------- 击杀与重生 ----------------
  private checkBlast() {
    const b = STAGE.blast;
    const knockedOut = this.fighters.filter(f => f.stocks > 0 && f.respawnTimer === 0 &&
      (f.x < b.left || f.x > b.right || f.y < b.top || f.y > b.bottom));
    for (const f of knockedOut) this.ko(f);
    if (knockedOut.length) {
      const survivors = this.fighters.filter(f => f.stocks > 0);
      if (survivors.length < 2) {
        this.winner = survivors[0] ?? null;
        this.isDraw = survivors.length === 0;
        this.state = 'result';
        this.sfx.setScene('result');
        this.clearInput();
      }
    }
  }

  private finishByTime() {
    const [a, b] = this.fighters;
    if (a.stocks !== b.stocks) this.winner = a.stocks > b.stocks ? a : b;
    else if (Math.abs(a.percent - b.percent) > 0.01) this.winner = a.percent < b.percent ? a : b;
    else this.winner = null;
    this.isDraw = this.winner === null;
    this.state = 'result';
    this.sfx.setScene('result');
    this.clearInput();
  }

  private ko(f: Fighter) {
    this.summons.clearOwner(f.idx);
    this.sfx.play('ko', { charId: f.char.id });
    this.shake = 16;
    this.flash = 0.7;
    f.stocks--;
    // 星星爆炸粒子
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const sp = 3 + Math.random() * 5;
      this.particles.push({
        x: Math.max(20, Math.min(WORLD.w - 20, f.x)), y: Math.max(10, Math.min(WORLD.h - 10, f.y + 20)),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 50, maxLife: 50, color: f.char.color, size: 5, grav: 0, star: true,
      });
    }
    this.texts.push({
      x: Math.max(120, Math.min(WORLD.w - 120, f.x)), y: Math.max(80, Math.min(WORLD.h - 160, f.y)),
      text: 'K.O.!', color: '#ff4040', life: 70, size: 64,
    });
    if (f.held) f.held = null;
    f.percent = 0;
    f.respawnTimer = f.stocks > 0 ? 70 : 0;
    f.vx = 0; f.vy = 0;
    f.attack = null; f.state = 'free';
    f.nextAttackVariants = newAttackVariants();
    f.secondaryCooldown = 0;
    this.projectiles = this.projectiles.filter(projectile => projectile.owner !== f.idx);
    f.hitstun = 0; f.hitlag = 0; f.petrified = 0; f.dodgeTimer = 0;
    f.fastFalling = false; f.jumpBuffer = 0;
    f.x = -9999; f.y = -9999;
  }

  private respawn(f: Fighter) {
    this.summons.clearOwner(f.idx);
    f.x = WORLD.w / 2 + (f.idx === 0 ? -80 : 80);
    f.y = 60;
    f.vx = 0; f.vy = 0;
    f.percent = 0;
    f.jumpsLeft = 2;
    f.invuln = 130;
    f.state = 'free';
    f.hitstun = 0;
    f.hitlag = 0;
    f.petrified = 0;
    f.attack = null;
    f.jumpBuffer = 0;
    f.coyote = 0;
    f.dodgeTimer = 0;
    f.dodgeCooldown = 0;
    f.airDodgeUsed = false;
    f.specialCooldown = 0;
    f.secondaryCooldown = 0;
    f.fastFalling = false;
    f.animationFrame = 0;
    f.motion = newMotionState(f.facing);
    f.nextAttackVariants = newAttackVariants();
    f.onGround = false;
    f.lastHitBy = null;
    f.combo = 0;
    f.comboTimer = 0;
    f.buffs = { atkUntil: 0, spdUntil: 0, slowUntil: 0 };
    this.burst(f.x, f.y + 20, 14, f.char.color, 3);
  }

  private burst(x: number, y: number, n: number, color: string, size: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 20 + Math.random() * 20, maxLife: 40, color,
        size: size * (0.6 + Math.random() * 0.8), grav: 0.12,
      });
    }
  }

  private updateParticles() {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      if (--this.impacts[i].life <= 0) this.impacts.splice(i, 1);
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      if (--this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life--;
      t.y -= 0.8;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (const c of this.clouds) {
      c.x += c.v;
      if (c.x - c.s > WORLD.w) c.x = -c.s;
    }
  }

  // ============================================================
  // 渲染
  // ============================================================
  private render() {
    const g = this.ctx;
    g.save();
    if (this.shake > 0.5) {
      g.translate(this.shakeOffset.x, this.shakeOffset.y);
    }
    this.drawBackground(g);

    if (this.state !== 'menu') {
      this.drawStage(g);
      this.drawItems(g);
      this.drawProjectiles(g);
      this.drawSummons(g);
      for (const trail of this.afterimages) {
        drawFighterArt(g, trail.charId, trail.x, trail.feetY, 112, trail.animation, { facing: trail.facing, alpha: trail.life / 10 * 0.22 });
      }
      for (const f of this.fighters) this.drawFighter(g, f);
      this.drawImpacts(g);
      this.drawParticles(g);
      this.drawHUD(g);
      if (this.state === 'countdown') this.drawCountdown(g);
    }

    if (this.flash > 0.05) {
      g.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
      g.fillRect(0, 0, WORLD.w, WORLD.h);
    }
    g.restore();
  }

  private drawBackground(g: CanvasRenderingContext2D) {
    if (drawArenaBackground(g, WORLD.w, WORLD.h)) {
      const shade = g.createLinearGradient(0, 0, 0, WORLD.h);
      shade.addColorStop(0, 'rgba(8, 25, 31, 0.26)');
      shade.addColorStop(0.55, 'rgba(8, 25, 31, 0.12)');
      shade.addColorStop(1, 'rgba(8, 25, 31, 0.76)');
      g.fillStyle = shade;
      g.fillRect(0, 0, WORLD.w, WORLD.h);
      return;
    }
    const grad = g.createLinearGradient(0, 0, 0, WORLD.h);
    grad.addColorStop(0, '#0c252d');
    grad.addColorStop(0.45, '#37626a');
    grad.addColorStop(0.75, '#899d8c');
    grad.addColorStop(1, '#132a30');
    g.fillStyle = grad;
    g.fillRect(0, 0, WORLD.w, WORLD.h);
    // 太阳 / 月亮
    g.fillStyle = 'rgba(255,230,170,0.9)';
    g.beginPath(); g.arc(1020, 130, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,230,170,0.25)';
    g.beginPath(); g.arc(1020, 130, 74, 0, Math.PI * 2); g.fill();
    // 云
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (const c of this.clouds) {
      g.beginPath();
      g.ellipse(c.x, c.y, c.s, c.s * 0.35, 0, 0, Math.PI * 2);
      g.ellipse(c.x + c.s * 0.5, c.y - c.s * 0.2, c.s * 0.6, c.s * 0.3, 0, 0, Math.PI * 2);
      g.fill();
    }
    // 远山剪影
    g.fillStyle = 'rgba(8,35,40,0.55)';
    g.beginPath();
    g.moveTo(0, 560);
    g.lineTo(160, 380); g.lineTo(320, 540); g.lineTo(480, 420);
    g.lineTo(660, 560); g.lineTo(860, 400); g.lineTo(1060, 560);
    g.lineTo(1280, 440); g.lineTo(1280, 720); g.lineTo(0, 720);
    g.closePath(); g.fill();
  }

  private drawStage(g: CanvasRenderingContext2D) {
    const m = STAGE.main;
    // 主浮空岛
    g.shadowColor = 'rgba(92,220,198,.3)';
    g.shadowBlur = effectGlow(this.visualQuality, 18);
    g.fillStyle = '#476c65';
    this.roundRect(g, m.x - 14, m.y, m.w + 28, 26, 8);
    g.fill();
    const bodyGrad = g.createLinearGradient(0, m.y, 0, m.y + m.h + 90);
    bodyGrad.addColorStop(0, '#203d40');
    bodyGrad.addColorStop(0.7, '#13272c');
    bodyGrad.addColorStop(1, 'rgba(7,24,31,0)');
    g.fillStyle = bodyGrad;
    g.beginPath();
    g.moveTo(m.x, m.y + 14);
    g.lineTo(m.x + m.w, m.y + 14);
    g.lineTo(m.x + m.w / 2 + 60, m.y + m.h + 100);
    g.lineTo(m.x + m.w / 2 - 60, m.y + m.h + 100);
    g.closePath(); g.fill();
    g.shadowBlur = 0;
    // 金色镶边
    g.strokeStyle = '#d2b373';
    g.lineWidth = 3;
    this.roundRect(g, m.x - 14, m.y, m.w + 28, 26, 8);
    g.stroke();
    // 软平台（玉制浮板）
    for (const p of STAGE.soft) {
      // Visual platform tops and collision surfaces share the same fixed y.
      g.fillStyle = '#294c4b';
      this.roundRect(g, p.x, p.y, p.w, 14, 4);
      g.fill();
      g.strokeStyle = '#c8b981';
      g.lineWidth = 2;
      this.roundRect(g, p.x, p.y, p.w, 14, 4);
      g.stroke();
      g.fillStyle = '#8fe5ca';
      g.fillRect(p.x + 6, p.y, p.w - 12, 2);
      g.globalAlpha = 0.3;
      g.fillRect(p.x + 18, p.y + 18, p.w - 36, 1);
      g.globalAlpha = 1;
    }
    // 主平台金钉纹饰
    g.fillStyle = '#d7c489';
    for (let sx = m.x + 20; sx < m.x + m.w - 10; sx += 48) {
      g.fillRect(sx, m.y + 7, 3, 3);
    }
    g.strokeStyle = 'rgba(207, 188, 123, 0.24)';
    g.lineWidth = 1;
    for (let sx = m.x + 40; sx < m.x + m.w - 20; sx += 80) {
      g.beginPath(); g.moveTo(sx, m.y + 24); g.lineTo(sx + 25, m.y + 60); g.lineTo(sx + 50, m.y + 24); g.stroke();
    }
    // 浮空灯笼（璃月风格，暖光摇曳）
    for (const lx of [m.x - 90, m.x + m.w + 90]) {
      const bob = Math.sin(this.frame * 0.04 + lx) * 6;
      const ly = m.y - 150 + bob;
      // 光晕
      const glow = g.createRadialGradient(lx, ly, 4, lx, ly, 42);
      glow.addColorStop(0, 'rgba(255,190,90,0.5)');
      glow.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(lx, ly, 42, 0, Math.PI * 2); g.fill();
      // 灯笼本体
      g.fillStyle = '#e04838';
      this.roundRect(g, lx - 11, ly - 13, 22, 26, 9); g.fill();
      g.fillStyle = '#ffd76a';
      this.roundRect(g, lx - 7, ly - 9, 14, 18, 6); g.fill();
      g.fillStyle = '#a02820';
      g.fillRect(lx - 5, ly - 18, 10, 5);
      g.fillRect(lx - 5, ly + 13, 10, 5);
      // 垂穗
      g.strokeStyle = '#ffd76a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(lx, ly + 18);
      g.lineTo(lx + Math.sin(this.frame * 0.1 + lx) * 3, ly + 30);
      g.stroke();
    }
  }

  private roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  private drawItems(g: CanvasRenderingContext2D) {
    for (const it of this.items) this.drawItemIcon(g, it.def, it.x, it.y + Math.sin(it.bob * 0.08) * 3, 1);
    for (const f of this.fighters) {
      if (f.held && f.respawnTimer <= 0) this.drawItemIcon(g, f.held.def, f.x, f.y - 18, 0.8);
    }
  }

  private drawItemIcon(g: CanvasRenderingContext2D, def: ItemDef, x: number, y: number, s: number) {
    const img = this.spriteCache.get(`item_${def.id}`);
    g.save();
    g.translate(x, y);
    // 光晕底座
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.arc(0, 0, 17 * s, 0, Math.PI * 2); g.fill();
    if (img) {
      const size = ITEM_SPRITE_SIZE * s * 1.2;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, -size / 2, -size / 2, size, size);
      g.imageSmoothingEnabled = true;
    }
    g.restore();
  }

  private drawProjectiles(g: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      g.save();
      g.translate(p.x, p.y);
      if (p.kind === 'frost') {
        g.scale(p.vx < 0 ? -1 : 1, 1); g.rotate(Math.atan2(p.vy, Math.abs(p.vx)));
        g.fillStyle = '#bbf5ff'; g.strokeStyle = '#f1fdff'; g.lineWidth = 1.5; g.shadowColor = '#8adbf1'; g.shadowBlur = effectGlow(this.visualQuality, 13);
        g.beginPath(); g.moveTo(31, 0); g.lineTo(-12, -10); g.lineTo(-23, 0); g.lineTo(-12, 10); g.closePath(); g.fill(); g.stroke();
      } else if (p.def?.kind === 'secondary') {
        const tall = p.kind === 'thunder' || p.kind === 'updraft';
        const rotation = tall ? 0 : Math.atan2(p.vy, Math.abs(p.vx));
        if (!drawSecondaryEffect(g, p.charId!, 0, 0, (p.radius ?? 30) * 2.6, (p.height ?? 50) * 1.15, { facing: p.vx < 0 ? -1 : 1, rotation, alpha: Math.min(1, p.life / 10) })) {
          g.strokeStyle = p.color; g.lineWidth = 5; g.shadowBlur = effectGlow(this.visualQuality, 16); g.shadowColor = p.color; g.beginPath(); g.ellipse(0, 0, p.radius ?? 30, (p.height ?? 50) / 2, 0, 0, Math.PI * 2); g.stroke();
        }
      } else if (p.kind === 'slash') {
        g.rotate(Math.atan2(p.vy, p.vx));
        const trail = g.createLinearGradient(-48, 0, 20, 0);
        trail.addColorStop(0, 'rgba(160, 96, 255, 0)'); trail.addColorStop(0.75, '#b895f3'); trail.addColorStop(1, '#faf4ff');
        g.strokeStyle = trail; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-48, 1); g.lineTo(-22, -5); g.lineTo(-12, 3); g.lineTo(18, 0); g.stroke();
        if (!drawElementEffect(g, 'raiden', false, 1, 0, 82, 54, 0.95, -Math.PI / 2)) {
          g.strokeStyle = '#e5d2ff'; g.lineWidth = 4; g.shadowColor = p.color; g.shadowBlur = effectGlow(this.visualQuality, 16);
          g.beginPath(); g.ellipse(1, 0, 17, 26, 0, -1.15, 1.15); g.stroke();
        }
      } else if (p.kind === 'bomb') {
        g.fillStyle = '#e04838';
        g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd040';
        g.beginPath(); g.arc(4, -8, 2.5, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = '#68c048';
        g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  }

  private drawSummons(g: CanvasRenderingContext2D): void {
    for (const f of this.fighters) {
      const attack = f.attack;
      if (!attack || attack.def.effect !== 'geo-meteor' || attack.t >= attack.def.startup || attack.t < attack.def.startup * .45) continue;
      const progress = (attack.t / attack.def.startup - .45) / .55;
      const x = f.x + f.facing * 145, feet = this.summonSurface(x, f.y + f.h) ?? f.y + f.h;
      g.save(); g.globalAlpha = .2 + progress * .8; g.strokeStyle = '#ffe3a3'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(x, feet, 145, 20, 0, 0, Math.PI * 2); g.stroke();
      const meteorX = x - f.facing * (1 - progress) * 85, meteorY = feet - (1 - progress) * 330;
      if (!drawSummonArt(g, 'geo-meteor', meteorX, meteorY, 130, { age: attack.t, facing: f.facing })) {
        g.fillStyle = '#d6a23f'; g.beginPath(); g.arc(meteorX, meteorY - 48, 48, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    for (const entity of this.summons.entities) {
      g.save();
      const alpha = Math.min(1, entity.age / 12, entity.life / 30);
      if (!drawSummonArt(g, entity.kind, entity.x, entity.feetY, entity.height, { age: entity.age, attackProgress: entity.attackProgress, facing: entity.facing, alpha })) {
        g.globalAlpha = alpha; g.fillStyle = entity.kind === 'geo-pillar' ? '#c59645' : '#8ad8f0';
        if (entity.kind === 'geo-pillar') { g.fillRect(entity.x - 18, entity.feetY - entity.height, 36, entity.height); g.fillStyle = '#ffe4a0'; g.fillRect(entity.x - 3, entity.feetY - entity.height + 12, 6, entity.height - 24); }
        else { g.beginPath(); g.ellipse(entity.x, entity.feetY - entity.height / 2, entity.height / 2, entity.height / 2, 0, 0, Math.PI * 2); g.fill(); }
      }
      g.font = '10px sans-serif'; g.textAlign = 'center'; g.fillStyle = entity.kind === 'geo-pillar' ? '#ffdda0' : '#b1edff';
      g.fillText(`P${entity.ownerId + 1}`, entity.x, entity.feetY + 16);
      g.restore();
    }
    for (const effect of this.summons.effects) {
      const progress = effect.age / effect.maxLife, geo = effect.kind.startsWith('geo');
      g.save(); g.globalAlpha = Math.min(1, effect.life / 12); g.strokeStyle = geo ? '#ffdc8b' : '#a2e9ff'; g.fillStyle = geo ? 'rgba(241,190,69,.18)' : 'rgba(64,172,241,.2)'; g.lineWidth = 3;
      if (effect.kind === 'geo-meteor') {
        // Release is already the impact tick. Retain the landed approved meteor
        // briefly while it dissolves into fragments, rather than drawing spikes.
        g.shadowColor = '#e3b45f'; g.shadowBlur = effectGlow(this.visualQuality, 12);
        if (progress < .28) drawSummonArt(g, 'geo-meteor', effect.x, effect.feetY, 130 * (1 - progress), { age: effect.age, facing: effect.facing, alpha: 1 - progress * 3 });
        g.beginPath(); g.ellipse(effect.x, effect.feetY - 5, effect.radius * (.45 + progress * .55), 18 + progress * 24, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        const fragments = this.visualQuality === 'low' ? 4 : 7;
        for (let i = 0; i < fragments; i++) {
          const angle = i * Math.PI * 2 / fragments, x = effect.x + Math.cos(angle) * effect.radius * (.2 + progress * .55);
          g.fillRect(x - 4, effect.feetY - Math.sin(progress * Math.PI) * (32 + i % 3 * 18), 9, 12);
        }
      } else if (effect.kind === 'bubble') {
        g.beginPath(); g.arc(effect.x, effect.feetY - effect.height / 2, effect.radius, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#e4fcff'; g.beginPath(); g.arc(effect.x - 5, effect.feetY - effect.height / 2 - 5, 4, 0, Math.PI * 2); g.fill();
      } else if (effect.kind === 'water-pierce') {
        g.beginPath(); g.moveTo(effect.x - effect.vx * 4, effect.feetY - effect.vy * 4); g.lineTo(effect.x + effect.vx, effect.feetY + effect.vy); g.stroke();
      } else {
        const radius = effect.radius * (.5 + progress * .5);
        g.beginPath(); g.ellipse(effect.x, effect.feetY - 5, radius, 16 + progress * 13, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        for (let i = 0; i < 6; i++) {
          const x = effect.x + (i / 5 - .5) * radius * 1.7, h = effect.height * Math.sin(Math.PI * Math.min(1, progress * 1.7)) * (.55 + .35 * Math.sin(i * 2));
          g.beginPath(); g.moveTo(x - 9, effect.feetY); g.lineTo(x, effect.feetY - h); g.lineTo(x + 9, effect.feetY); g.stroke();
        }
      }
      g.restore();
    }
  }

  // ---------------- 角色绘制 ----------------
  private fighterAnimation(f: Fighter): FighterAnimation {
    return {
      state: f.state, attack: f.attack ? { def: f.attack.def, t: f.attack.t, visualVariant: f.attack.visualVariant, plunge: f.attack.plunge ? { phase: f.attack.plunge.phase, elapsed: f.attack.plunge.elapsed, recoveryDuration: Math.max(1, f.attack.def.endlag - f.attack.def.active) } : undefined } : null,
      onGround: f.onGround, vx: f.vx, vy: f.vy, dodgeTimer: f.dodgeTimer, time: f.animationFrame,
      dodgeDuration: DODGE_FRAMES,
      motion: { ...f.motion },
    };
  }

  private drawFighter(g: CanvasRenderingContext2D, f: Fighter) {
    if (f.respawnTimer > 0 || f.stocks <= 0) return;
    if (f.x < 30 || f.x > WORLD.w - 30 || f.y < -70 || f.y > WORLD.h - 40) {
      const ix = Math.max(26, Math.min(WORLD.w - 26, f.x));
      const iy = Math.max(88, Math.min(WORLD.h - 145, f.y + f.h / 2));
      g.save();
      g.strokeStyle = f.char.color;
      g.fillStyle = 'rgba(8, 25, 31, .9)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(ix, iy, 19, 0, Math.PI * 2); g.fill(); g.stroke();
      g.font = 'bold 13px sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#f6edcc';
      g.fillText(`P${f.idx + 1}`, ix, iy + 5);
      g.restore();
    }
    g.save();
    const blink = f.invuln > 0 && Math.floor(this.frame / 4) % 2 === 0;
    if (blink) g.globalAlpha = 0.45;

    // 地面阴影
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(f.x, f.y + f.h + 4, 18, 5, 0, 0, Math.PI * 2); g.fill();

    g.translate(f.x, f.y);
    g.scale(f.facing, 1);
    const c = f.char;

    // 增益光环
    if (f.buffs.atkUntil > this.frame) { g.strokeStyle = 'rgba(232,120,152,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 28, 30 + Math.sin(this.frame * 0.15) * 4, 0, Math.PI * 2); g.stroke(); }
    if (f.buffs.spdUntil > this.frame) { g.strokeStyle = 'rgba(88,216,176,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 28, 24 + Math.sin(this.frame * 0.2) * 3, 0, Math.PI * 2); g.stroke(); }
    const shield = this.summons.getShield(f.idx), revelry = this.summons.getBuff(f.idx);
    if (shield) {
      g.strokeStyle = '#ffe3a3'; g.fillStyle = 'rgba(229,174,61,.1)'; g.lineWidth = 2.5;
      g.globalAlpha *= Math.min(1, shield.life / 30);
      g.beginPath(); g.ellipse(0, f.h - 44, 40, 62, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#efcc78'; g.fillRect(-27, f.h + 9, 54 * shield.hp / shield.maxHp, 3);
    }
    if (revelry) { g.strokeStyle = '#97e3ff'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, f.h, 34 + Math.sin(this.frame * .08) * 3, 9, 0, 0, Math.PI * 2); g.stroke(); }
    if (f.petrified > 0) { g.fillStyle = 'rgba(220,180,104,.35)'; g.fillRect(-23, f.h - 94, 46, 94); }

    // Put the descending wind behind Xiao so his hands and downward blade stay readable.
    if (f.attack?.plunge?.phase === 'dive') this.drawPlungeAttackFx(g, f);

    // Battle atlas uses the actual attack clock; the original sprites are an offline fallback.
    const hitWhite = f.koFlash > 0 && Math.floor(this.frame / 2) % 2 === 0;
    let frame: SpriteFrame = 'idle';
    if (f.state === 'hitstun') frame = 'hurt';
    else if (f.attack) frame = f.attack.def.kind === 'special' ? 'special' : 'attack';
    else if (!f.onGround) frame = 'jump';
    const illustrated = drawFighterArt(g, c.id, 0, f.h, 112, this.fighterAnimation(f), { flash: hitWhite, alpha: f.dodgeTimer > 0 ? 0.58 : 1 });
    const img = illustrated ? null : this.sprite(c.id, frame, hitWhite);
    if (img) {
      const scale = 92 / SPRITE_H;
      g.imageSmoothingEnabled = false;
      // 待机时上下浮动 1px 模拟呼吸
      const bob = frame === 'idle' && f.onGround ? Math.sin(this.frame * 0.08 + f.idx * 2) * 1.5 : 0;
      g.drawImage(img, -SPRITE_W * scale / 2, f.h - 92 + bob, SPRITE_W * scale, 92);
      g.imageSmoothingEnabled = true;
    } else if (!illustrated) {
      // Keep every added fighter visible while an atlas is loading or unavailable.
      g.strokeStyle = hitWhite ? '#fff8e8' : c.color; g.fillStyle = hitWhite ? '#fff8e8' : '#e2dfd3';
      g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(0, f.h - 75, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = c.hair; g.beginPath(); g.moveTo(-11, f.h - 78); g.lineTo(0, f.h - 92); g.lineTo(12, f.h - 75); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, f.h - 62); g.lineTo(0, f.h - 32); g.moveTo(-14, f.h - 49); g.lineTo(15, f.h - 49);
      g.moveTo(0, f.h - 32); g.lineTo(-12, f.h); g.moveTo(0, f.h - 32); g.lineTo(12, f.h); g.stroke();
      g.lineWidth = 2.5; g.strokeStyle = '#c6fce6';
      if (f.attack?.def.kind === 'secondary' && f.attack.def.effect === 'thrust') {
        // Local +X is the fighter's facing direction after the outer mirror.
        g.beginPath(); g.moveTo(-27, f.h - 48); g.lineTo(80, f.h - 48); g.stroke();
        g.fillStyle = '#63e9c7'; g.beginPath(); g.moveTo(92, f.h - 48); g.lineTo(76, f.h - 56); g.lineTo(76, f.h - 40); g.closePath(); g.fill();
      } else {
        g.beginPath(); g.moveTo(23, f.h - 99); g.lineTo(23, f.h + 16); g.stroke();
        g.fillStyle = '#63e9c7'; g.beginPath(); g.moveTo(23, f.h + 26); g.lineTo(16, f.h + 10); g.lineTo(30, f.h + 10); g.closePath(); g.fill();
      }
    }

    // 攻击弧光特效
    this.drawAttackFx(g, f);

    // 受击硬直抖动线
    if (f.state === 'hitstun') {
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-16, -6); g.lineTo(-22, -12); g.moveTo(16, -4); g.lineTo(22, -10); g.stroke();
    }
    g.restore();
    g.save();
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = f.idx === 0 ? '#c5f6ee' : '#ffe0c5';
    g.shadowColor = '#061d23';
    g.shadowBlur = effectGlow(this.visualQuality, 6);
    g.fillText(f.isCPU ? 'CPU' : `P${f.idx + 1}`, f.x, f.y - 42);
    g.restore();
  }

  // Elemental layers use attack time, so impact frames remain locked during hitstop.
  private drawAttackFx(g: CanvasRenderingContext2D, f: Fighter) {
    const c = f.char;
    if (!f.attack) return;
    const { def, t } = f.attack;
    if (def.effect === 'geo-pillar' || def.effect === 'geo-meteor' || def.effect === 'salon' || def.effect === 'revelry') return;
    const { phase, progress } = attackPhase(f.attack);
    if (f.attack.plunge) {
      if (f.attack.plunge.phase !== 'dive') this.drawPlungeAttackFx(g, f);
      return;
    }
    g.save();
    if (def.kind === 'secondary') {
      if (phase === 'contact' || (phase === 'followthrough' && progress < 0.45)) {
        const alpha = phase === 'contact' ? 0.7 : 0.7 * (1 - progress / 0.45);
        drawSecondaryEffect(g, c.id, def.effect === 'thrust' ? 40 : 25, 24, def.effect === 'thrust' ? 185 : def.effect === 'frost' ? 215 : 85, def.effect === 'thrust' ? 72 : def.effect === 'frost' ? 125 : 110, { alpha });
      }
      g.restore(); return;
    }
    if (phase === 'windup' && def.kind !== 'jab') {
      const radius = 7 + progress * 14;
      const charge = g.createRadialGradient(6, 24, 0, 6, 24, radius);
      charge.addColorStop(0, '#fff6de'); charge.addColorStop(0.2, c.color); charge.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = progress * 0.5; g.fillStyle = charge;
      g.beginPath(); g.arc(6, 24, radius, 0, Math.PI * 2); g.fill();
      g.restore(); return;
    }
    // The new ordinary attack already paints its registered sword/spear path.
    // Keep charge, impact and actual skill effects, but avoid a second generic
    // crescent whose direction does not match a thrust or alternate swing.
    if (hasRegisteredMeleeTrail(c.id, def.kind, f.attack.visualVariant)) { g.restore(); return; }
    if (phase !== 'contact' && !(phase === 'followthrough' && progress < 0.45)) { g.restore(); return; }
    const fade = phase === 'contact' ? 1 : 1 - progress / 0.45;
    const heavy = def.kind !== 'jab';
    const radius = def.kind === 'smash' ? 76 : def.effect === 'gust' ? 118 : def.effect === 'spin' ? 116 : 55;
    g.globalAlpha = fade * 0.8;
    g.shadowColor = c.color; g.shadowBlur = effectGlow(this.visualQuality, 9);
    const angle = -0.9 + progress * 1.45;
    if (def.effect === 'gust') {
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = i === 0 ? '#defdf0' : '#87e8cc'; g.lineWidth = 3 - i * 0.65;
        const shift = (t * 4 + i * 33) % 105;
        g.beginPath(); g.ellipse(25 + shift, 27, 10 + i * 5, 18 + shift * 0.12, -0.12, -1.7, 1.7); g.stroke();
      }
      drawElementEffect(g, c.id, false, 70, 25, 142, 88, 0.72);
    } else if (def.effect === 'spin') {
      g.strokeStyle = '#bdedff'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 31, radius, 32, -0.12, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 7; i++) {
        const a = progress * Math.PI * 2 + i * Math.PI * 2 / 7;
        const x = Math.cos(a) * radius, y = 31 + Math.sin(a) * 32;
        g.fillStyle = i % 2 ? '#ebfbff' : '#76cfea';
        g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 4, y); g.lineTo(x, y + 5); g.lineTo(x - 3, y); g.closePath(); g.fill();
      }
      drawElementEffect(g, c.id, false, 0, 31, 183, 86, 0.7, -0.1);
    } else if (def.effect === 'dash') {
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = i % 2 ? '#ffc75d' : '#ec7352'; g.lineWidth = 3 + i;
        g.globalAlpha = fade * (0.65 - i * 0.1);
        g.beginPath(); g.moveTo(30, 18 + i * 10); g.quadraticCurveTo(-28, 3 + i * 12, -76 - i * 13, 24 + i * 10); g.stroke();
      }
      g.globalAlpha = fade * 0.8;
      drawElementEffect(g, c.id, false, -17, 25, 164, 99, 0.7);
    } else {
      // The bright leading edge follows the swing; a wider translucent arc trails it.
      for (let layer = 0; layer < 3; layer++) {
        g.strokeStyle = layer === 2 ? '#fff7f0' : c.color;
        g.lineWidth = layer === 0 ? (heavy ? 11 : 7) : layer === 1 ? 4 : 1.6;
        g.globalAlpha = fade * (layer === 0 ? 0.24 : 0.85);
        g.beginPath(); g.ellipse(6, 27, radius, radius * 0.65, -0.2, angle - 1.25, angle + 0.65); g.stroke();
      }
      if (c.id === 'raiden') {
        g.lineWidth = 1.6; g.strokeStyle = '#efe1ff'; g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = angle - 1 + i * 0.35, r = radius + (i % 2 ? 4 : -5);
          const x = 6 + Math.cos(a) * r, y = 27 + Math.sin(a) * r * 0.65;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = fade * (heavy ? 0.68 : 0.4);
      drawElementEffect(g, c.id, false, radius * 0.45, 23, radius * 1.75, radius * 1.55, 0.72, angle * 0.3);
    }
    g.restore();
  }

  private drawPlungeAttackFx(g: CanvasRenderingContext2D, f: Fighter) {
    const plunge = f.attack?.plunge;
    if (!plunge || plunge.phase === 'impact' || plunge.phase === 'recover') return;
    g.save();
    g.shadowColor = '#47e8c4'; g.shadowBlur = effectGlow(this.visualQuality, 14);
    if (plunge.phase === 'windup') {
      const progress = plunge.elapsed / Math.max(1, f.char.special.startup);
      g.globalAlpha = 0.4 + progress * 0.5;
      g.strokeStyle = '#77f7d1'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, f.h - 45, 25 + progress * 12, 43, 0, 0, Math.PI * 2); g.stroke();
      // The yaksha mask flashes above the chest during the airborne charge.
      g.fillStyle = '#123e43'; g.beginPath(); g.moveTo(-12, f.h - 82); g.lineTo(-15, f.h - 99); g.lineTo(-4, f.h - 90);
      g.lineTo(4, f.h - 90); g.lineTo(15, f.h - 99); g.lineTo(12, f.h - 82); g.lineTo(0, f.h - 73); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#e6ffae'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-9, f.h - 85); g.lineTo(-3, f.h - 82); g.moveTo(9, f.h - 85); g.lineTo(3, f.h - 82); g.stroke();
    } else {
      drawXiaoPlungeEffect(g, 'descent', 0, f.h - 29, 112, 202, 0.62);
      for (let i = 0; i < 3; i++) {
        const width = 12 + i * 10;
        g.strokeStyle = i === 0 ? '#effff3' : '#4ce0bd'; g.lineWidth = i === 0 ? 3 : 1.5;
        g.globalAlpha = 0.9 - i * 0.2;
        g.beginPath(); g.moveTo(-width, f.h - 111 + i * 13); g.quadraticCurveTo(-width * 1.5, f.h - 40, 0, f.h + 32);
        g.quadraticCurveTo(width * 1.5, f.h - 40, width, f.h - 111 + i * 13); g.stroke();
      }
      g.globalAlpha = 0.9; g.strokeStyle = '#e6fff2'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, f.h - 25); g.lineTo(0, f.h + 39); g.stroke();
    }
    g.restore();
  }

  private drawImpacts(g: CanvasRenderingContext2D) {
    for (const effect of this.impacts) {
      const progress = 1 - effect.life / effect.maxLife;
      const radius = effect.size * (0.45 + progress * 0.7);
      g.save(); g.translate(effect.x, effect.y);
      if (effect.plunge) {
        g.globalAlpha = 1 - progress;
        g.shadowColor = effect.color; g.shadowBlur = effectGlow(this.visualQuality, 13);
        const width = effect.size * 2.4, height = 145 * (1 - progress * 0.35);
        drawXiaoPlungeEffect(g, 'impact', 0, -height / 2 + 10, width, height, 1 - progress);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const x = side * (27 + i * 30), tall = (83 - i * 17) * (1 - progress);
            g.fillStyle = i % 2 ? '#9efcde' : '#45dcb7';
            g.beginPath(); g.moveTo(x - 7, 0); g.lineTo(x + side * 6, -tall); g.lineTo(x + 7, 0); g.closePath(); g.fill();
          }
        }
        g.strokeStyle = '#acffe4'; g.lineWidth = 3 * (1 - progress) + 0.5;
        g.beginPath(); g.ellipse(0, 0, effect.size * (0.3 + progress), 10 + progress * 15, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
        continue;
      }
      g.globalAlpha = (1 - progress) * 0.8;
      g.strokeStyle = effect.color; g.lineWidth = 2 * (1 - progress) + 0.5;
      g.beginPath(); g.ellipse(0, 0, radius * 0.72, radius * 0.4, -0.35, 0, Math.PI * 2); g.stroke();
      drawElementEffect(g, effect.charId, true, 0, 0, radius * 1.6, radius * 1.6, 0.85);
      g.strokeStyle = '#fff6e4'; g.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7 + 0.3;
        g.beginPath(); g.moveTo(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3);
        g.lineTo(Math.cos(angle) * radius * (i % 2 ? 0.85 : 0.62), Math.sin(angle) * radius * (i % 2 ? 0.85 : 0.62)); g.stroke();
      }
      g.restore();
    }
  }

  private drawParticles(g: CanvasRenderingContext2D) {
    // Keep every simulated particle; the light preset only samples its decorative drawing.
    const stride = this.visualQuality === 'low' ? 3 : 1;
    for (let index = 0; index < this.particles.length; index += stride) {
      const p = this.particles[index];
      const a = p.life / p.maxLife;
      g.save();
      g.globalAlpha = a;
      g.fillStyle = p.color;
      if (p.star) {
        g.translate(p.x, p.y);
        g.rotate(this.frame * 0.2);
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const px = Math.cos(ang) * p.size * 2, py = Math.sin(ang) * p.size * 2;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath(); g.fill();
      } else {
        g.beginPath(); g.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    for (const t of this.texts) {
      g.save();
      g.globalAlpha = Math.min(1, t.life / 20);
      g.font = `bold ${t.size}px "Microsoft YaHei", sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      g.strokeText(t.text, t.x, t.y);
      g.fillStyle = t.color;
      g.fillText(t.text, t.x, t.y);
      g.restore();
    }
  }

  // ---------------- HUD ----------------
  private drawHUD(g: CanvasRenderingContext2D) {
    g.save();
    g.textBaseline = 'alphabetic';
    for (const f of this.fighters) {
      const x = f.idx === 0 ? 34 : WORLD.w - 382;
      const y = this.mobileHud ? 20 : WORLD.h - 106;
      g.fillStyle = 'rgba(8, 24, 30, .92)';
      this.roundRect(g, x, y, 348, 90, 10); g.fill();
      g.strokeStyle = 'rgba(197, 184, 134, .46)';
      g.lineWidth = 1;
      this.roundRect(g, x, y, 348, 90, 10); g.stroke();
      g.fillStyle = f.char.color;
      g.fillRect(x, y + 13, 3, 64);
      drawCharacterArt(g, f.char.id, x + 44, y + 85, 96, { time: this.frame });
      g.textAlign = 'left';
      g.font = '600 15px "Microsoft YaHei", sans-serif';
      g.fillStyle = '#ece7d6';
      g.fillText(`${f.char.name}  ·  ${f.isCPU ? 'CPU' : `P${f.idx + 1}`}`, x + 86, y + 23);
      const heat = Math.min(1, f.percent / 150);
      g.font = '800 39px "Microsoft YaHei", sans-serif';
      g.fillStyle = f.stocks === 0 ? '#708082' : heat > .68 ? '#ff9b7d' : heat > .35 ? '#f3d194' : '#f5f1df';
      g.fillText(`${Math.floor(f.percent)}%`, x + 83, y + 62);
      g.font = '11px "Microsoft YaHei", sans-serif';
      for (let i = 0; i < this.options.stocks; i++) {
        const sx = x + 286 + i * 17;
        g.fillStyle = i < f.stocks ? '#e4cea0' : '#36494c';
        g.beginPath(); g.moveTo(sx, y + 41); g.lineTo(sx + 5, y + 47); g.lineTo(sx, y + 53); g.lineTo(sx - 5, y + 47); g.closePath(); g.fill();
      }
      const barX = x + 87;
      const ready = f.dodgeCooldown === 0;
      g.fillStyle = '#34474b';
      g.fillRect(barX, y + 74, 96, 3);
      g.fillStyle = ready ? '#9ce3ce' : '#728e88';
      g.fillRect(barX, y + 74, 96 * (1 - f.dodgeCooldown / DODGE_COOLDOWN), 3);
      g.fillStyle = ready ? '#a7dccb' : '#83999a';
      g.fillText(ready ? '闪避就绪' : '闪避冷却', barX + 103, y + 78);
      g.fillStyle = f.specialCooldown === 0 ? '#dcca9c' : '#83999a';
      const specialLabel = f.specialCooldown > 0 ? `技能 ${(f.specialCooldown / 60).toFixed(1)}s`
        : f.char.special.effect === 'plunge' ? f.onGround ? '技能 · 需在空中' : '坠星就绪' : '技能就绪';
      g.fillText(specialLabel, x + 245, y + 78);
      g.fillStyle = f.secondaryCooldown > 0 ? '#83999a' : '#a9e9d7';
      const secondaryKey = f.idx === 0 ? 'I' : "5 / '";
      g.fillText(f.secondaryCooldown > 0 ? `${secondaryKey} ${(f.secondaryCooldown / 60).toFixed(1)}s` : `${secondaryKey} 新技就绪`, x + 238, y + 24);
      const owned = this.summons.entities.filter(entity => entity.ownerId === f.idx), shield = this.summons.getShield(f.idx), revelry = this.summons.getBuff(f.idx);
      if (owned.length || shield || revelry) {
        g.font = '11px "Microsoft YaHei", sans-serif'; g.fillStyle = f.char.color;
        const status = [owned.length ? `${f.char.id === 'zhongli' ? '岩柱' : '沙龙'} ${owned.length} · ${Math.ceil(Math.max(...owned.map(entity => entity.life)) / 60)}s` : '',
          shield ? `盾 ${Math.ceil(shield.hp)}` : '', revelry ? `狂欢 ${Math.ceil(revelry.life / 60)}s` : ''].filter(Boolean).join('  ');
        g.fillText(status, x + 8, this.mobileHud ? y + 105 : y - 10);
      }
      if (f.held) {
        g.fillStyle = f.held.def.color;
        g.fillText(`持有 · ${f.held.def.name}`, x + 88, this.mobileHud ? y + 108 : y - 8);
      } else if (f.combo >= 2 && f.comboTimer > 0) {
        g.fillStyle = '#ead29a';
        g.font = 'bold 17px sans-serif';
        g.fillText(`${f.combo} HITS`, x + 88, this.mobileHud ? y + 108 : y - 8);
      }
    }
    const seconds = Math.ceil(this.remainingFrames / 60);
    const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    g.fillStyle = 'rgba(7, 23, 30, .84)';
    this.roundRect(g, WORLD.w / 2 - 68, 20, 136, 56, 8); g.fill();
    g.strokeStyle = 'rgba(204, 182, 124, .45)';
    this.roundRect(g, WORLD.w / 2 - 68, 20, 136, 56, 8); g.stroke();
    g.textAlign = 'center';
    g.font = '600 29px "Microsoft YaHei", sans-serif';
    g.fillStyle = seconds <= 30 ? '#ffb799' : '#f1e2ba';
    g.fillText(time, WORLD.w / 2, 58);
    // Touch controls occupy the lower corners; mobile status lives above play.
    // The desktop legend and stage copy would overlap the upper mobile cards.
    if (this.mobileHud) { g.restore(); return; }
    g.font = '12px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#c0d0cb';
    g.fillText('H 闪避 · J 轻击 · K 重击 · L 技能 · I 新技', WORLD.w / 2, WORLD.h - 62);
    g.fillStyle = '#91a8a5';
    g.fillText('Esc 暂停  ·  M 静音', WORLD.w / 2, WORLD.h - 38);
    g.textAlign = 'left';
    g.font = '600 16px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#f0e2bb';
    g.fillText(STAGE.name, 34, 42);
    g.font = '11px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#c2d4cf';
    g.fillText('击飞对手，成为最后的胜者', 34, 63);
    g.textAlign = 'right';
    const difficulty = { easy: '休闲', normal: '标准', hard: '挑战' }[this.options.difficulty];
    g.fillText(`${this.mode === 'cpu' ? `人机 · ${difficulty}` : '本地双人'}  /  ${this.options.items ? '道具开启' : '纯粹对决'}`, WORLD.w - 34, 42);
    g.restore();
  }

  private drawCountdown(g: CanvasRenderingContext2D) {
    g.textAlign = 'center';
    const t = this.countdown;
    let txt = '';
    if (t > 105) txt = '3';
    else if (t > 60) txt = '2';
    else if (t > 15) txt = '1';
    else txt = 'GO!';
    g.save();
    g.shadowColor = '#ffd76a';
    g.shadowBlur = effectGlow(this.visualQuality, 40);
    g.font = 'bold 110px "Microsoft YaHei", sans-serif';
    g.fillStyle = txt === 'GO!' ? '#7fe87f' : '#ffd76a';
    g.fillText(txt, WORLD.w / 2, 300);
    g.restore();
    g.font = 'bold 22px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#fff';
    g.fillText(`${STAGE.name}`, WORLD.w / 2, 380);
  }

}
