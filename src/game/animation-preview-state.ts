import { CHARACTERS } from './data';
import type { FighterAnimation, PlungeAnimation } from './animation';
import { advanceMotion, newMotionState } from './clip-animation';
import type { ClipCharacterId, ClipName } from './clip-animation';

const STEP = 1000 / 60;
export interface PreviewSettings {
  clip: ClipName; survival: boolean; speed: number; paused: boolean;
  character?: ClipCharacterId;
  facing: 1 | -1; slope: number;
  form?: 'new' | 'original' | 'alternate';
}
export function createPreviewClock() {
  return { tick: 0, accumulator: 0, y: 0, vy: 0, jumping: false, plunge: null as PlungeAnimation | null, motion: newMotionState() };
}
export type PreviewClock = ReturnType<typeof createPreviewClock>;
function timing(settings: PreviewSettings) {
  const { clip, survival } = settings;
  const character = CHARACTERS.find(character => character.id === (settings.character ?? 'eula'))!;
  const kind = clip === 'jab' || clip === 'smash' || clip === 'special' || clip === 'secondary' ? clip : null;
  const base = kind ? character[kind] : null;
  const def = base ? { ...base, endlag: survival ? Math.round(base.endlag * 0.7) : base.endlag } : null;
  const attackLength = def ? def.startup + def.active + def.endlag : 0;
  const plunge = character.id === 'xiao' && clip === 'special';
  return { character, def, plunge, attackLength, cycle: plunge ? 110 : def ? attackLength + 24 : clip === 'jump' ? 84 : clip === 'dodge' ? 40 : 240, dodgeDuration: survival ? 16 : 15 };
}
/** Display options are deliberately not written into the timeline. */
export function advancePreviewClock(clock: PreviewClock, delta: number, settings: PreviewSettings, steps = 0) {
  const { cycle, character, def, plunge } = timing(settings);
  if (!settings.paused) clock.accumulator += Math.max(0, Math.min(80, delta)) * settings.speed;
  clock.accumulator += Math.max(0, steps) * STEP;
  while (clock.accumulator + 1e-8 >= STEP) {
    clock.tick++; clock.accumulator = Math.max(0, clock.accumulator - STEP);
    const t = clock.tick % cycle;
    if (settings.clip === 'jump' || plunge) {
      if (t === 1) { clock.y = 0; clock.vy = -character.jump; clock.jumping = true; clock.plunge = null; }
      // Demonstrate the required W jump before L. No grounded cast is fabricated.
      if (plunge && t === 18 && clock.jumping && def) clock.plunge = { phase: 'windup', elapsed: 0,
        recoveryDuration: settings.survival ? def.endlag : Math.max(1, def.endlag - def.active) };
      const state = clock.plunge;
      if (state && def) {
        state.elapsed++;
        if (state.phase === 'windup') {
          clock.vy = 0;
          if (state.elapsed >= def.startup) { state.phase = 'dive'; state.elapsed = 0; clock.vy = settings.survival ? 30 : 18; }
        } else if (state.phase === 'dive') {
          clock.vy = settings.survival ? 30 : Math.min(28, Math.max(18, clock.vy + 2.4)); clock.y += clock.vy;
          if (clock.y >= 0) { clock.y = 0; clock.vy = 0; clock.jumping = false; state.phase = 'impact'; state.elapsed = 0; }
        } else if (state.phase === 'impact' && state.elapsed >= def.active) { state.phase = 'recover'; state.elapsed = 0; }
        else if (state.phase === 'recover' && state.elapsed >= state.recoveryDuration!) clock.plunge = null;
      } else if (clock.jumping) {
        clock.vy += 0.53 * character.gravMul; clock.y += clock.vy;
        if (clock.y >= 0) { clock.y = 0; clock.vy = 0; clock.jumping = false; }
      }
    }
    advanceMotion(clock.motion, { dx: settings.clip === 'run' ? character.speed : 0, onGround: !clock.jumping, facing: 1, walking: settings.clip === 'run' });
  }
}
export function previewFrame(clock: PreviewClock, settings: PreviewSettings): { animation: FighterAnimation; t: number; cycle: number; y: number } {
  const { character, def, plunge, attackLength, cycle, dodgeDuration } = timing(settings), t = clock.tick % cycle;
  const visualVariant = (settings.clip === 'jab' || settings.clip === 'smash') && (settings.form === 'new' || (settings.form === 'alternate' && Math.floor(clock.tick / cycle) % 2 === 0)) ? 'alternate' : 'base';
  const attack = def && (plunge ? !!clock.plunge : t < attackLength) ? { def, t, visualVariant, ...(clock.plunge ? { plunge: { ...clock.plunge } } : {}) } as const : null;
  return { t, cycle, y: clock.y, animation: {
    state: attack ? 'attack' : 'free', attack,
    onGround: !clock.jumping, vx: settings.clip === 'run' ? character.speed : 0, vy: clock.vy,
    dodgeTimer: settings.clip === 'dodge' && t < dodgeDuration ? dodgeDuration - t : 0, dodgeDuration,
    time: clock.tick, motion: { ...clock.motion, facing: settings.facing, slope: settings.slope },
  } };
}
