import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Exercise the actual TypeScript engine with deterministic browser/audio shims.
// No test-only members are added to the runtime Game API.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listeners = { window: new Map(), document: new Map() };
const noop = () => undefined;
const gradient = { addColorStop: noop };
const drawingContext = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    return noop;
  },
  set(target, key, value) { target[key] = value; return true; },
});
const canvas = () => ({ width: 0, height: 0, getContext: () => drawingContext });
const eventTarget = type => ({
  addEventListener: (name, fn) => {
    if (!listeners[type].has(name)) listeners[type].set(name, new Set());
    listeners[type].get(name).add(fn);
  },
  removeEventListener: (name, fn) => listeners[type].get(name)?.delete(fn),
});
class HTMLElement { tagName = 'DIV'; isContentEditable = false; }
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0.5;
const context = vm.createContext({
  console, Math: deterministicMath, performance: { now: () => 0 },
  requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  window: eventTarget('window'),
  document: { ...eventTarget('document'), hidden: false, createElement: canvas },
  HTMLElement,
});
const modules = new Map();
const artDrawCalls = [];
function loadModule(file) {
  if (file.endsWith('/art.ts')) return {
    hasRegisteredMeleeTrail: () => false, loadGameArt: () => Promise.resolve(), drawCharacterArt: () => false,
    drawFighterArt: (...args) => { artDrawCalls.push({ kind: 'fighter', args }); return false; },
    drawElementEffect: () => false, drawSecondaryEffect: () => false,
    drawXiaoPlungeEffect: (...args) => { artDrawCalls.push({ kind: 'plunge', args }); return false; },
    drawArenaBackground: () => false,
  };
  if (modules.has(file)) return modules.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  modules.set(file, mod);
  const require = specifier => loadModule(path.resolve(path.dirname(file), `${specifier}.ts`).replaceAll('\\', '/'));
  vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename: file })(mod.exports, require, mod);
  return mod.exports;
}
const { Game } = loadModule(path.join(root, 'src/game/engine.ts').replaceAll('\\', '/'));
const { CHARACTERS, STAGE } = loadModule(path.join(root, 'src/game/data.ts').replaceAll('\\', '/'));
const { selectActionFrame, attackPhase } = loadModule(path.join(root, 'src/game/animation.ts').replaceAll('\\', '/'));
const defaults = { mode: 'pvp', player: 0, opponent: 3, difficulty: 'normal', stocks: 3, duration: 180, items: false };
const noInput = { left: false, right: false, up: false, down: false, jab: false, smash: false, special: false, downPressed: false, dodge: false };
const games = [];
function makeGame(options = {}) {
  const game = new Game(canvas());
  game.setMuted(true);
  game.start({ ...defaults, ...options });
  games.push(game);
  return game;
}
function step(game, count = 1) {
  for (let i = 0; i < count; i++) {
    if (game.state !== 'paused') game.frame++;
    game.update();
    game.pressed.clear();
  }
}
function fighting(options) {
  const game = makeGame(options);
  step(game, 150);
  assert.equal(game.getSnapshot().phase, 'fight');
  return game;
}
function key(game, code, repeat = false, target = null) {
  game.onKeyDown({ code, repeat, target, preventDefault: noop });
}
const cases = [];
function test(name, run) { cases.push({ name, run }); }

test('public bridge starts both modes, selected characters and a 180 second clock', () => {
  for (const mode of ['cpu', 'pvp']) {
    const game = makeGame({ mode, player: 2, opponent: 1 });
    assert.equal(game.fighters[0].char.id, 'eula');
    assert.equal(game.fighters[1].char.id, 'jean');
    assert.equal(game.fighters[1].isCPU, mode === 'cpu');
    assert.equal(game.getSnapshot().timeLeft, 180);
    assert.equal(game.getSnapshot().phase, 'countdown');
    step(game, 150);
    assert.equal(game.getSnapshot().phase, 'fight');
    assert.equal(game.getSnapshot().timeLeft, 180);
    step(game, 60);
    assert.equal(game.getSnapshot().timeLeft, 179);
  }
});

test('all character attacks release hitstun; fractional legacy timers also recover', () => {
  for (const character of CHARACTERS) {
    for (const move of [character.jab, character.smash, character.special]) {
      const game = fighting();
      const [attacker, victim] = game.fighters;
      game.applyHit(attacker, victim, move);
      assert.ok(Number.isInteger(victim.hitstun));
      for (let i = 0; i < 70; i++) game.updateFighter(victim, noInput);
      assert.equal(victim.state, 'free');
      assert.equal(victim.hitstun, 0);
    }
  }
  const game = fighting();
  const fighter = game.fighters[0];
  fighter.state = 'hitstun'; fighter.hitstun = 10.4;
  for (let i = 0; i < 12; i++) game.updateFighter(fighter, noInput);
  assert.equal(fighter.state, 'free');
});

test('horizontal knockback crosses both screen edges and both blast lines', () => {
  for (const side of [-1, 1]) {
    const game = fighting();
    const fighter = game.fighters[0];
    fighter.x = side < 0 ? 22 : 1258;
    fighter.y = 300; fighter.vx = side * 20;
    fighter.state = 'hitstun'; fighter.hitstun = 40;
    for (let i = 0; i < 12; i++) game.updateFighter(fighter, noInput);
    assert.ok(side < 0 ? fighter.x < STAGE.blast.left : fighter.x > STAGE.blast.right);
    game.checkBlast();
    assert.equal(fighter.stocks, 2);
    assert.equal(fighter.respawnTimer, 70);
  }
});

test('fast fall retains its distinct terminal velocity', () => {
  const game = fighting();
  const fighter = game.fighters[0];
  fighter.x = 200; fighter.y = 0; fighter.onGround = false; fighter.vy = 8;
  for (let i = 0; i < 6; i++) game.updateFighter(fighter, { ...noInput, down: true });
  assert.equal(fighter.vy, 13);
});

test('coyote jump and a jump buffered just before landing both trigger', () => {
  const game = fighting();
  const fighter = game.fighters[0];
  fighter.x = STAGE.main.x - 28; fighter.y = STAGE.main.y - fighter.h;
  fighter.onGround = false; fighter.coyote = 5;
  game.updateFighter(fighter, { ...noInput, up: true });
  assert.ok(fighter.vy < -10);
  assert.equal(fighter.jumpsLeft, 1);
  fighter.x = STAGE.main.x + 100; fighter.y = STAGE.main.y - fighter.h - 5;
  fighter.onGround = false; fighter.coyote = 0; fighter.jumpsLeft = 0; fighter.vy = 3;
  game.updateFighter(fighter, { ...noInput, up: true });
  game.updateFighter(fighter, noInput);
  game.updateFighter(fighter, noInput);
  assert.ok(fighter.vy < -10, 'buffered jump should execute immediately after landing');
  assert.equal(fighter.jumpsLeft, 1);
});

test('dodge grants brief invulnerability and cannot bypass its cooldown', () => {
  const game = fighting();
  const [a, b] = game.fighters;
  b.x = a.x + 50;
  game.updateFighter(b, { ...noInput, dodge: true });
  assert.ok(b.invuln > 0);
  assert.equal(b.dodgeCooldown, 80);
  game.startAttack(a, a.char.jab);
  a.attack.t = a.char.jab.startup;
  game.resolveHits();
  assert.equal(b.percent, 0);
  game.updateFighter(b, { ...noInput, dodge: true });
  assert.equal(b.dodgeCooldown, 79);
  assert.ok(b.dodgeTimer < 14);
});

test('both simultaneous attacks connect without player index priority', () => {
  const game = fighting({ player: 0, opponent: 0 });
  const [a, b] = game.fighters;
  b.x = a.x + 45;
  for (const fighter of [a, b]) { game.startAttack(fighter, fighter.char.jab); fighter.attack.t = fighter.char.jab.startup; }
  game.resolveHits();
  assert.equal(a.percent, 4);
  assert.equal(b.percent, 4);
});

test('pause/blur/hidden clear input, freeze the clock, and require explicit resume', () => {
  const game = fighting();
  key(game, 'KeyD');
  game.onBlur();
  assert.equal(game.getSnapshot().phase, 'paused');
  assert.equal(game.keys.size, 0);
  assert.equal(game.pressed.size, 0);
  const before = game.remainingFrames;
  step(game, 120);
  assert.equal(game.remainingFrames, before);
  game.pause();
  assert.equal(game.getSnapshot().phase, 'fight');
  context.document.hidden = true; game.onVisibilityChange(); context.document.hidden = false;
  assert.equal(game.getSnapshot().phase, 'paused');
  const button = new HTMLElement(); button.tagName = 'BUTTON';
  key(game, 'Escape', false, button);
  assert.equal(game.getSnapshot().phase, 'fight');
});

test('mute ignores repeated keydown and the initial menu does not capture input', () => {
  const game = new Game(canvas()); games.push(game);
  key(game, 'KeyD');
  assert.equal(game.keys.size, 0);
  assert.equal(game.getSnapshot().phase, 'menu');
  game.start(defaults);
  game.setMuted(false);
  key(game, 'KeyM');
  key(game, 'KeyM', true);
  assert.equal(game.getSnapshot().muted, true);
});

test('simultaneous last-stock KOs draw; one last-stock KO yields a winner', () => {
  const game = fighting();
  for (const fighter of game.fighters) { fighter.stocks = 1; fighter.y = STAGE.blast.bottom + 1; }
  game.checkBlast();
  assert.equal(game.getSnapshot().phase, 'result');
  assert.equal(game.getSnapshot().draw, true);
  assert.equal(game.getSnapshot().winner, null);
  const second = fighting();
  second.fighters[1].stocks = 1; second.fighters[1].y = STAGE.blast.bottom + 1;
  second.checkBlast();
  assert.equal(second.getSnapshot().winner, 0);
  assert.equal(second.getSnapshot().draw, false);
});

test('timeout ranks stocks before percent and correctly handles a tie', () => {
  const scenarios = [
    { stocks: [3, 2], percents: [90, 0], winner: 0 },
    { stocks: [2, 2], percents: [40, 10], winner: 1 },
    { stocks: [2, 2], percents: [10, 10], winner: null },
  ];
  for (const scenario of scenarios) {
    const game = fighting();
    game.fighters.forEach((fighter, i) => { fighter.stocks = scenario.stocks[i]; fighter.percent = scenario.percents[i]; });
    game.remainingFrames = 1;
    step(game);
    assert.equal(game.getSnapshot().phase, 'result');
    assert.equal(game.getSnapshot().timeLeft, 0);
    assert.equal(game.getSnapshot().winner, scenario.winner);
    assert.equal(game.getSnapshot().draw, scenario.winner === null);
  }
});

test('rematch resets time, lives, projectiles and winner while retaining options', () => {
  const game = fighting({ mode: 'cpu', difficulty: 'hard', player: 1, opponent: 2 });
  game.fighters[0].stocks = 1; game.remainingFrames = 20; game.isDraw = true;
  game.projectiles.push({});
  game.rematch();
  assert.equal(game.getSnapshot().phase, 'countdown');
  assert.equal(game.getSnapshot().timeLeft, 180);
  assert.equal(game.getSnapshot().draw, false);
  assert.equal(game.projectiles.length, 0);
  assert.equal(game.fighters[0].stocks, 3);
  assert.equal(game.fighters[0].char.id, 'jean');
  assert.equal(game.options.difficulty, 'hard');
});

test('items obey the match setting and CPU can recover while the opponent respawns', () => {
  const without = fighting({ items: false });
  without.itemTimer = 0; step(without);
  assert.equal(without.items.length, 0);
  const withItems = fighting({ items: true });
  withItems.itemTimer = 0; step(withItems);
  assert.equal(withItems.items.length, 1);
  const cpu = fighting({ mode: 'cpu' });
  const fighter = cpu.fighters[1];
  fighter.x = STAGE.main.x - 90; fighter.y = STAGE.main.y - 80;
  fighter.vy = 3; fighter.onGround = false; fighter.jumpsLeft = 1;
  cpu.fighters[0].respawnTimer = 40;
  const input = cpu.cpuInput(fighter);
  assert.equal(input.right, true);
  assert.equal(input.up, true);
});

test('idle PVP stays on the platforms and a CPU never loses lives against an idle opponent', () => {
  const pvp = fighting({ player: 1, opponent: 3 });
  step(pvp, 900);
  for (const fighter of pvp.fighters) {
    assert.equal(fighter.stocks, 3);
    assert.equal(fighter.y + fighter.h, STAGE.main.y);
  }
  deterministicMath.random = () => 0.9; // Exercise repeated dash selection, formerly an offstage suicide.
  try {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const cpu = fighting({ mode: 'cpu', player: 1, opponent: 3, difficulty });
      for (let i = 0; i < 3600 && cpu.state === 'fight'; i++) step(cpu);
      assert.equal(cpu.fighters[1].stocks, 3, `${difficulty} CPU must not self-destruct against an idle player`);
      assert.ok(cpu.fighters[1].damageDealt > 0);
    }
  } finally { deterministicMath.random = () => 0.5; }
});

test('CPU resumes play after a hit at every difficulty', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const game = fighting({ mode: 'cpu', difficulty, player: 0, opponent: 1 });
    const [player, cpu] = game.fighters;
    cpu.x = player.x + 60;
    game.applyHit(player, cpu, player.char.jab);
    let recovered = false;
    for (let i = 0; i < 300; i++) {
      step(game);
      if (cpu.state !== 'hitstun') recovered = true;
    }
    assert.ok(recovered, `${difficulty} CPU recovers from hitstun`);
    assert.ok(cpu.damageDealt > 0, `${difficulty} CPU resumes attacking`);
  }
});

test('all CPU characters remain stable through seeded idle-opponent matches', () => {
  try {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (let opponent = 0; opponent < CHARACTERS.length; opponent++) {
        let seed = 4242 + opponent;
        deterministicMath.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
        const game = fighting({ mode: 'cpu', difficulty, player: 1, opponent });
        for (let i = 0; i < 3600 && game.state === 'fight'; i++) step(game);
        assert.equal(game.fighters[1].stocks, 3, `${difficulty} ${CHARACTERS[opponent].id} should not self-destruct`);
      }
    }
  } finally { deterministicMath.random = () => 0.5; }
});

test('fixed-step simulation advances equally under 60 Hz and 144 Hz rendering', () => {
  const results = [];
  for (const hz of [60, 144]) {
    const game = fighting();
    game.last = 0; game.acc = 0;
    for (let i = 1; i <= hz * 2; i++) game.loop(i * 1000 / hz);
    results.push(180 * 60 - game.remainingFrames);
  }
  assert.ok(results.every(frames => Math.abs(frames - 120) <= 1));
  assert.ok(Math.abs(results[0] - results[1]) <= 1);
});

test('all canvas scenes render and destroy removes input listeners and closes audio', () => {
  const game = fighting();
  for (const state of ['menu', 'countdown', 'fight', 'paused', 'result']) { game.state = state; game.render(); }
  let audioClosed = 0;
  game.sfx.context = { state: 'running', close: () => { audioClosed++; return Promise.resolve(); } };
  game.destroy();
  assert.equal(audioClosed, 1);
  for (const set of listeners.window.values()) assert.equal(set.has(game.onKeyDown) || set.has(game.onKeyUp) || set.has(game.onBlur), false);
  assert.equal(listeners.document.get('visibilitychange').has(game.onVisibilityChange), false);
});

test('every character uses distinct move rows and phase changes follow exact hitbox boundaries', () => {
  for (const character of CHARACTERS) {
    for (const [index, def] of [character.jab, character.smash, character.special].entries()) {
      const recovery = Math.ceil(def.endlag * 0.55);
      const samples = [[0, 0], [def.startup - 1, 0], [def.startup, 1], [def.startup + def.active - 1, 1], [def.startup + def.active, 2], [def.startup + def.active + recovery, 3]];
      for (const [t, column] of samples) {
        const frame = selectActionFrame({ state: 'attack', attack: { def, t }, onGround: false, vx: 4, vy: -5, dodgeTimer: 0, time: 99 });
        assert.equal(frame.row, index + 1);
        assert.equal(frame.column, column, `${character.id} ${def.kind} at ${t}`);
        assert.equal(frame.pose, def.kind, 'aerial attacks keep their attack pose');
      }
    }
  }
});

test('locomotion and reaction states select actual alternate atlas cells', () => {
  const base = { state: 'free', attack: null, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 0 };
  assert.equal(selectActionFrame(base).column, 0);
  const runA = selectActionFrame({ ...base, vx: 4, time: 0 });
  const runB = selectActionFrame({ ...base, vx: -4, time: 6 });
  assert.equal(runA.column, 1); assert.equal(runB.column, 2);
  assert.equal(selectActionFrame({ ...base, onGround: false }).column, 3);
  assert.equal(selectActionFrame({ ...base, state: 'hitstun' }).pose, 'hurt');
  assert.equal(selectActionFrame({ ...base, dodgeTimer: 10 }).pose, 'dodge');
});

test('hitstop and pause freeze fighter animation and attack phases together', () => {
  const game = fighting();
  const fighter = game.fighters[0];
  game.startAttack(fighter, fighter.char.smash);
  fighter.attack.t = fighter.char.smash.startup;
  fighter.hitlag = 6;
  const clock = fighter.animationFrame;
  const attackTime = fighter.attack.t;
  const frame = JSON.stringify(selectActionFrame(game.fighterAnimation(fighter)));
  step(game, 5);
  assert.equal(fighter.animationFrame, clock);
  assert.equal(fighter.attack.t, attackTime);
  assert.equal(JSON.stringify(selectActionFrame(game.fighterAnimation(fighter))), frame);
  game.pause(); step(game, 90);
  assert.equal(fighter.animationFrame, clock);
  assert.equal(JSON.stringify(selectActionFrame(game.fighterAnimation(fighter))), frame);
  game.pause(); step(game, 2);
  assert.equal(fighter.animationFrame, clock + 1);
  assert.equal(attackPhase(fighter.attack).phase, 'contact');
});

test('each elemental attack and its impact/afterimage render without changing combat timers', () => {
  for (let id = 0; id < CHARACTERS.length; id++) {
    const game = fighting({ player: id });
    const [fighter, victim] = game.fighters;
    for (const def of [fighter.char.jab, fighter.char.smash, fighter.char.special]) {
      if (def.effect === 'plunge') fighter.onGround = false;
      game.startAttack(fighter, def);
      for (const t of [1, def.startup, def.startup + def.active, def.startup + def.active + def.endlag - 1]) {
        fighter.attack.t = t;
        game.render(); game.render();
        assert.equal(fighter.attack.t, t, 'render must not advance attack');
      }
      game.applyHit(fighter, victim, def);
      assert.ok(game.impacts.length > 0);
      game.render();
    }
    game.rematch();
    assert.equal(game.impacts.length, 0);
    assert.equal(game.afterimages.length, 0);
  }
});

test('camera shake is fixed across repeated renders and while paused without consuming gameplay randomness', () => {
  const game = fighting(); game.shake = 10; step(game);
  const originalTranslate = drawingContext.translate;
  const originalRandom = deterministicMath.random;
  const translations = [];
  drawingContext.translate = (...args) => translations.push(args);
  let randomCalls = 0;
  deterministicMath.random = () => { randomCalls++; return randomCalls % 2 ? 0.2 : 0.8; };
  try {
    game.render(); const first = translations[0]; translations.length = 0;
    game.render(); assert.deepEqual(translations[0], first); translations.length = 0;
    game.pause(); step(game, 8); game.render();
    assert.deepEqual(translations[0], first); translations.length = 0;
    step(game, 8); game.render(); assert.deepEqual(translations[0], first);
    assert.equal(randomCalls, 0, 'rendering cannot advance the combat RNG sequence');
    game.pause(); step(game); translations.length = 0; game.render();
    assert.notDeepEqual(translations[0], first, 'camera shake advances only with simulation');
  } finally { drawingContext.translate = originalTranslate; deterministicMath.random = originalRandom; }
});

const xiaoIndex = CHARACTERS.findIndex(character => character.id === 'xiao');
function airborne(fighter, x = 640, feet = 190) {
  fighter.x = x; fighter.y = feet - fighter.h;
  fighter.vx = 0; fighter.vy = 0; fighter.onGround = false;
  fighter.coyote = 0; fighter.jumpsLeft = 1;
}
function beginDive(game, fighter, x = 640, feet = 190) {
  airborne(fighter, x, feet);
  game.startAttack(fighter, fighter.char.special);
  for (let i = 0; i < fighter.char.special.startup; i++) game.updateFighter(fighter, noInput);
  assert.equal(fighter.attack.plunge.phase, 'dive');
}

test('Xiao is a fifth selectable polearm fighter in either player slot and CPU mode', () => {
  assert.ok(xiaoIndex >= 4);
  for (const mode of ['cpu', 'pvp']) {
    const game = makeGame({ mode, player: xiaoIndex, opponent: xiaoIndex });
    for (const fighter of game.fighters) {
      assert.equal(fighter.char.id, 'xiao');
      assert.equal(fighter.char.weapon, 'polearm');
    }
    assert.equal(game.fighters[1].isCPU, mode === 'cpu');
  }
});

test('Xiao rejects grounded skill without cooldown, then accepts it after jumping', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  game.updateFighter(fighter, { ...noInput, special: true });
  assert.equal(fighter.attack, null);
  assert.equal(fighter.specialCooldown, 0);
  assert.ok(game.texts.some(text => text.text === '需在空中释放'));
  game.updateFighter(fighter, { ...noInput, up: true });
  assert.equal(fighter.onGround, false);
  const feet = fighter.y + fighter.h;
  game.updateFighter(fighter, { ...noInput, special: true });
  assert.equal(fighter.attack.plunge.phase, 'windup');
  assert.ok(fighter.specialCooldown > 0);
  assert.equal(fighter.y + fighter.h, feet, 'charge suspends the already airborne fighter');
});

test('Xiao descent draws its trail behind the fighter and its missing-art spear points down in either facing', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  beginDive(game, fighter);
  for (const facing of [-1, 1]) {
    fighter.facing = facing;
    const canvasCalls = [];
    const render = new Proxy({ globalAlpha: 1 }, {
      get(target, name) { return name in target ? target[name] : (...args) => canvasCalls.push({ name, args }); },
      set(target, name, value) { target[name] = value; return true; },
    });
    artDrawCalls.length = 0;
    game.drawFighter(render, fighter);
    assert.deepEqual(artDrawCalls.map(call => call.kind), ['plunge', 'fighter'], 'one trail precedes the actual actor');
    assert.equal(artDrawCalls[0].args[1], 'descent');
    assert.ok(artDrawCalls[0].args.at(-1) <= 0.65, 'the trail keeps enough transparency to read the physical spear');
    assert.deepEqual(canvasCalls.find(call => call.name === 'scale').args, [facing, 1]);
    const tip = canvasCalls.findIndex(call => call.name === 'moveTo' && call.args[0] === 23 && call.args[1] === fighter.h + 26);
    assert.ok(tip >= 0, 'fallback jade blade has a tip below the feet');
    assert.deepEqual(canvasCalls[tip + 1].args, [16, fighter.h + 10]);
    assert.deepEqual(canvasCalls[tip + 2].args, [30, fighter.h + 10]);
  }
});

test('plunge hovers briefly, commits vertically and keeps contact live during a long fall', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  airborne(fighter, 370, -160);
  fighter.vx = 4; fighter.vy = -5;
  game.startAttack(fighter, fighter.char.special);
  const originY = fighter.y;
  for (let i = 0; i < fighter.char.special.startup - 1; i++) game.updateFighter(fighter, { ...noInput, right: true, down: true });
  assert.equal(fighter.y, originY);
  assert.equal(fighter.x, 370);
  for (let i = 0; i < 15; i++) game.updateFighter(fighter, { ...noInput, right: true });
  assert.equal(fighter.attack.plunge.phase, 'dive');
  assert.equal(fighter.x, 370);
  assert.ok(fighter.vy > 20, 'plunge must exceed ordinary 9.5 and fast-fall 13 speed caps');
  assert.ok(game.attackHitbox(fighter));
  assert.equal(selectActionFrame(game.fighterAnimation(fighter)).column, 1);
});

test('descending spear hits below once and cannot hit above or far to the side', () => {
  for (const target of ['below', 'above', 'side']) {
    const game = fighting({ player: xiaoIndex });
    const [fighter, victim] = game.fighters;
    beginDive(game, fighter, 640, 140);
    victim.x = fighter.x + (target === 'side' ? 100 : 0);
    victim.y = target === 'above' ? fighter.y - victim.h - 10 : fighter.y + fighter.h + 10;
    victim.invuln = 0;
    game.resolveHits(); game.resolveHits(); game.resolveHits();
    assert.equal(victim.percent, target === 'below' ? 7 : 0, target);
    if (target === 'below') assert.ok(victim.vy > 0, 'the downward spear sends its victim down');
  }
});

test('plunge hits each target at most once per descent and once per landing', () => {
  const game = fighting({ player: xiaoIndex });
  const [fighter, victim] = game.fighters;
  beginDive(game, fighter, 640, 160);
  victim.x = fighter.x; victim.y = fighter.y + fighter.h + 5; victim.invuln = 0;
  game.resolveHits(); game.resolveHits();
  assert.equal(victim.percent, 7);
  fighter.y = STAGE.main.y - fighter.h; fighter.onGround = true;
  game.landPlunge(fighter, fighter.attack);
  victim.x = fighter.x + 55; victim.y = STAGE.main.y - victim.h;
  for (let i = 0; i < 8; i++) game.resolveHits();
  assert.equal(victim.percent, 22);
  assert.equal(fighter.damageDealt, 22);
});

test('complete simulation frames deliver exactly 7 + 15 plunge damage across hitstop and landing', () => {
  const game = fighting({ player: xiaoIndex });
  const [fighter, victim] = game.fighters;
  airborne(fighter, 640, 350);
  victim.x = 640; victim.y = STAGE.main.y - victim.h; victim.invuln = 0;
  key(game, 'KeyL');
  step(game);
  assert.equal(fighter.attack.plunge.phase, 'windup');
  let sawDescentHit = false, sawImpact = false;
  const damageSteps = [];
  let previousDamage = 0;
  for (let i = 0; i < 100 && (fighter.attack || !sawImpact); i++) {
    step(game);
    if (victim.percent !== previousDamage) {
      damageSteps.push(victim.percent);
      previousDamage = victim.percent;
    }
    if (victim.percent === 7 && !sawDescentHit) {
      sawDescentHit = true;
      assert.equal(fighter.attack.plunge.phase, 'dive');
      assert.ok(fighter.hitlag > 1);
      const feet = fighter.y + fighter.h;
      step(game, fighter.hitlag);
      assert.equal(fighter.y + fighter.h, feet, 'actual hitstop pauses the falling body');
    }
    if (fighter.attack?.plunge?.phase === 'impact') {
      sawImpact = true;
      assert.equal(fighter.y + fighter.h, STAGE.main.y);
      assert.equal(victim.percent, 22);
    }
  }
  assert.deepEqual(damageSteps, [7, 22]);
  assert.ok(sawDescentHit && sawImpact);
  assert.equal(fighter.damageDealt, 22);
  assert.equal(fighter.attack, null);
  assert.equal(fighter.state, 'free');
});

test('landing impact reaches both sides and knocks outward and upward regardless of facing', () => {
  for (const side of [-1, 1]) {
    const game = fighting({ player: xiaoIndex });
    const [fighter, victim] = game.fighters;
    beginDive(game, fighter, 640, 360);
    fighter.facing = -side;
    fighter.y = STAGE.main.y - fighter.h; fighter.onGround = true;
    game.landPlunge(fighter, fighter.attack);
    victim.x = fighter.x + side * 90; victim.y = STAGE.main.y - victim.h; victim.invuln = 0;
    game.resolveHits();
    assert.equal(victim.percent, 15);
    assert.equal(Math.sign(victim.vx), side);
    assert.ok(victim.vy < 0);
    victim.percent = 0; victim.x = fighter.x + side * 140;
    fighter.attack.hasHit.clear();
    game.resolveHits();
    assert.equal(victim.percent, 0, 'targets outside the landing radius stay untouched');
  }
});

test('the first crossed soft platform catches a plunge and impact fires only once', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  beginDive(game, fighter, 640, 245);
  for (let i = 0; i < 10 && !fighter.onGround; i++) game.updateFighter(fighter, noInput);
  assert.equal(fighter.y + fighter.h, 285);
  assert.equal(fighter.attack.plunge.phase, 'impact');
  assert.equal(game.impacts.filter(effect => effect.plunge).length, 1);
  for (let i = 0; i < 40; i++) game.updateFighter(fighter, { ...noInput, down: true });
  assert.equal(fighter.attack, null);
  assert.equal(fighter.state, 'free');
  assert.equal(fighter.y + fighter.h, 285);
  assert.equal(game.impacts.filter(effect => effect.plunge).length, 1);
  // Deliberately cross multiple surfaces in one collision to test ordering.
  airborne(fighter, 640, 600); fighter.vy = 400;
  game.collidePlatforms(fighter);
  assert.equal(fighter.y + fighter.h, 285);
});

test('a near-ground airborne plunge lands safely and recovers after a fixed endlag', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  airborne(fighter, 640, 539);
  game.startAttack(fighter, fighter.char.special);
  for (let i = 0; i < fighter.char.special.startup; i++) game.updateFighter(fighter, noInput);
  assert.equal(fighter.attack.plunge.phase, 'impact');
  assert.equal(fighter.y + fighter.h, 540);
  assert.equal(selectActionFrame(game.fighterAnimation(fighter)).column, 2);
  for (let i = 0; i < fighter.char.special.active; i++) game.updateFighter(fighter, noInput);
  assert.equal(selectActionFrame(game.fighterAnimation(fighter)).column, 3);
  assert.equal(game.attackHitbox(fighter), null);
  for (let i = 0; i < fighter.char.special.endlag - fighter.char.special.active; i++) game.updateFighter(fighter, noInput);
  assert.equal(fighter.attack, null);
});

test('hitstop and pause freeze the actual plunge motion and its animation phase', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  beginDive(game, fighter, 640, 150);
  fighter.hitlag = 6;
  const before = JSON.stringify({ x: fighter.x, y: fighter.y, animation: game.fighterAnimation(fighter) });
  step(game, 5);
  assert.equal(JSON.stringify({ x: fighter.x, y: fighter.y, animation: game.fighterAnimation(fighter) }), before);
  game.pause(); step(game, 50);
  assert.equal(JSON.stringify({ x: fighter.x, y: fighter.y, animation: game.fighterAnimation(fighter) }), before);
  game.pause(); step(game, 2);
  assert.ok(fighter.y > JSON.parse(before).y);
});

test('a hit interrupts plunge immediately; respawn and rematch cannot retain its state', () => {
  const game = fighting({ player: xiaoIndex });
  const [fighter, victim] = game.fighters;
  beginDive(game, fighter, 640, 150);
  game.applyHit(victim, fighter, victim.char.jab);
  assert.equal(fighter.attack, null);
  assert.equal(fighter.state, 'hitstun');
  assert.equal(game.impacts.filter(effect => effect.plunge).length, 0);
  fighter.hitstun = 0; fighter.hitlag = 0; fighter.state = 'free';
  beginDive(game, fighter, 640, 150);
  game.ko(fighter);
  assert.equal(fighter.attack, null);
  game.respawn(fighter);
  assert.equal(fighter.attack, null);
  assert.equal(fighter.specialCooldown, 0);
  beginDive(game, fighter, 640, 150);
  game.rematch();
  assert.equal(game.fighters[0].attack, null);
  assert.equal(game.impacts.length, 0);
  assert.equal(game.afterimages.length, 0);
});

test('offstage plunge keeps falling to a KO without an invented landing explosion', () => {
  const game = fighting({ player: xiaoIndex });
  const fighter = game.fighters[0];
  beginDive(game, fighter, 150, 200);
  for (let i = 0; i < 60 && fighter.stocks === 3; i++) step(game);
  assert.equal(fighter.stocks, 2);
  assert.equal(fighter.attack, null);
  assert.equal(game.impacts.filter(effect => effect.plunge).length, 0);
});

test('Xiao CPU jumps into real plunges at every difficulty and prioritizes safe recovery', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const game = fighting({ mode: 'cpu', player: 1, opponent: xiaoIndex, difficulty });
    const [player, cpu] = game.fighters;
    cpu.x = 625; player.x = 655;
    let sawJump = false, sawDive = false, sawImpact = false;
    for (let i = 0; i < 1800 && game.state === 'fight'; i++) {
      step(game);
      sawJump ||= !cpu.onGround && cpu.vy < 0;
      sawDive ||= cpu.attack?.plunge?.phase === 'dive';
      sawImpact ||= cpu.attack?.plunge?.phase === 'impact';
    }
    assert.ok(sawJump && sawDive && sawImpact, `${difficulty}: jump, descent and impact must all happen`);
    assert.equal(cpu.stocks, 3, `${difficulty}: no self-destructs`);
    airborne(cpu, 240, 560); cpu.vy = 3; cpu.state = 'free'; cpu.attack = null;
    cpu.specialCooldown = 0; cpu.aiJumpCd = 0;
    const recovery = game.cpuInput(cpu);
    assert.equal(recovery.special, false);
    assert.equal(recovery.right, true);
  }
});


test('I manually releases a distinct secondary skill with real damage for all five fighters', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = fighting({ player: index }), [f, target] = game.fighters;
    f.x = 540; target.x = 625;
    key(game, 'KeyI'); step(game, 100);
    assert.ok(target.percent > 0, f.char.id);
    assert.ok(f.secondaryCooldown > 0, f.char.id);
    assert.equal(f.specialCooldown, 0);
    assert.equal(f.attack, null);
  }
});

test('both P2 secondary bindings are edge-triggered and never spend the primary cooldown', () => {
  for (const code of ['Numpad5', 'Quote']) {
    const game = fighting(), f = game.fighters[1];
    key(game, code, true); step(game); assert.equal(f.attack, null);
    key(game, code); step(game); assert.equal(f.attack.def.kind, 'secondary');
    assert.equal(f.specialCooldown, 0);
    step(game, 400); assert.equal(f.attack, null); assert.equal(f.secondaryCooldown, 0);
    key(game, code, true); step(game); assert.equal(f.attack, null);
  }
});

test('primary and secondary cooldowns remain independent while either skill is unavailable', () => {
  const game = fighting(), f = game.fighters[0];
  game.fighters[1].x = 1000;
  key(game, 'KeyI'); step(game, 70); assert.ok(f.secondaryCooldown > 0);
  key(game, 'KeyL'); step(game); assert.equal(f.attack.def.kind, 'special');
  step(game, 50); f.secondaryCooldown = 0;
  assert.ok(f.specialCooldown > 0);
  key(game, 'KeyI'); step(game); assert.equal(f.attack.def.kind, 'secondary');
});

test('secondary projectiles own their damage definitions and cannot hit one target every tick', () => {
  for (const index of [0, 1]) {
    const game = fighting({ player: index }), [f, target] = game.fighters;
    f.x = 540; target.x = 625;
    game.startAttack(f, f.char.secondary);
    for (let tick = 0; tick < f.char.secondary.startup; tick++) game.updateFighter(f, noInput);
    const shot = game.projectiles[0];
    assert.equal(shot.def.kind, 'secondary');
    f.char = { ...f.char, special: { ...f.char.special, dmg: 9999 } };
    for (let tick = 0; tick < 12; tick++) game.updateProjectiles();
    assert.equal(target.percent, shot.def.dmg);
    assert.ok(shot.hit.has(target.idx));
  }
});

test('CPU can choose each secondary skill and refuses a dangerous outward Xiao thrust', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = fighting({ mode: 'cpu', opponent: index });
    const [target, cpu] = game.fighters;
    cpu.x = 580; target.x = 750;
    const input = game.cpuInput(cpu);
    assert.equal(input.secondary, true, cpu.char.id);
    game.updateFighter(cpu, input); assert.equal(cpu.attack.def.kind, 'secondary');
  }
  const game = fighting({ mode: 'cpu', opponent: xiaoIndex });
  const [target, cpu] = game.fighters; cpu.x = 850; target.x = 1005;
  assert.equal(game.cpuInput(cpu).secondary, false);
});

test('Xiao secondary thrust stays horizontal in either facing and never creates a plunge', () => {
  for (const facing of [-1, 1]) {
    const game = fighting({ player: xiaoIndex }), f = game.fighters[0];
    airborne(f, 620, 180); f.facing = facing;
    game.startAttack(f, f.char.secondary);
    for (let tick = 0; tick < f.char.secondary.startup; tick++) game.updateFighter(f, noInput);
    const y = f.y, x = f.x;
    for (let tick = 0; tick < 5; tick++) game.updateFighter(f, noInput);
    assert.equal(f.y, y); assert.ok((f.x - x) * facing > 40);
    assert.equal(f.attack.plunge, undefined);
  }
});

test('secondary cooldown, hit history and emitted effects clear on KO, respawn and rematch', () => {
  const game = fighting(), f = game.fighters[0];
  game.startAttack(f, f.char.secondary);
  for (let i = 0; i < f.char.secondary.startup; i++) game.updateFighter(f, noInput);
  assert.ok(game.projectiles.length > 0);
  game.ko(f); assert.equal(f.secondaryCooldown, 0); assert.equal(game.projectiles.length, 0);
  game.respawn(f); assert.equal(f.attack, null); assert.equal(f.secondaryCooldown, 0);
  game.rematch(); assert.ok(game.fighters.every(actor => actor.secondaryCooldown === 0));
});


test('Xiao missing-art secondary spear points horizontally toward either facing', () => {
  const game = fighting({ player: xiaoIndex }), fighter = game.fighters[0];
  game.startAttack(fighter, fighter.char.secondary);
  fighter.attack.t = fighter.char.secondary.startup;
  for (const facing of [-1, 1]) {
    fighter.facing = facing;
    const canvasCalls = [];
    const render = new Proxy({ globalAlpha: 1 }, {
      get(target, name) { return name in target ? target[name] : (...args) => canvasCalls.push({ name, args }); },
      set(target, name, value) { target[name] = value; return true; },
    });
    game.drawFighter(render, fighter);
    assert.deepEqual(canvasCalls.find(call => call.name === 'scale').args, [facing, 1]);
    const tip = canvasCalls.findIndex(call => call.name === 'moveTo' && call.args[0] === 92 && call.args[1] === fighter.h - 48);
    assert.ok(tip >= 0);
    assert.deepEqual(canvasCalls[tip + 1].args, [76, fighter.h - 56]);
    assert.deepEqual(canvasCalls[tip + 2].args, [76, fighter.h - 40]);
    assert.ok(!canvasCalls.some(call => call.name === 'moveTo' && call.args[0] === 23 && call.args[1] === fighter.h + 26), 'I never uses the downward L spear fallback');
  }
});

test('Eula widened circular skill reaches the new edge on both sides but not beyond it', () => {
  const eula = CHARACTERS.findIndex(character => character.id === 'eula');
  for (const direction of [-1, 1]) {
    for (const dx of [135, 150]) {
      const game = fighting({ player: eula }), [f, target] = game.fighters;
      f.x = 640; f.facing = direction; target.x = f.x + direction * dx; target.y = f.y;
      game.startAttack(f, f.char.special); f.attack.t = f.char.special.startup;
      game.resolveHits();
      assert.equal(target.percent, dx === 135 ? f.char.special.dmg : 0, `direction=${direction}, distance=${dx}`);
      assert.equal(f.specialCooldown, 90, 'Range increase does not change cooldown');
    }
  }
});

test('Eula wider frost shards hit their enlarged boundary and survive beyond the old travel range', () => {
  const eula = CHARACTERS.findIndex(character => character.id === 'eula');
  for (const offset of [40, 42]) {
    const game = fighting({ player: eula }), [f, target] = game.fighters;
    f.x = 440; f.facing = 1; game.releaseSecondary(f, f.char.secondary);
    const shard = game.projectiles.find(shot => shot.vy === 0); game.projectiles = [shard];
    target.x = shard.x + shard.vx + offset; target.y = shard.y - target.h / 2;
    game.updateProjectiles();
    assert.equal(target.percent, offset === 40 ? f.char.secondary.dmg : 0);
    if (offset === 40) assert.equal(target.buffs.slowUntil, game.frame + 108);
  }
  const game = fighting({ player: eula }), [f, target] = game.fighters;
  f.x = 440; target.y = 100; game.releaseSecondary(f, f.char.secondary);
  const shard = game.projectiles.find(shot => shot.vy === 0); game.projectiles = [shard];
  for (let i = 0; i < 45; i++) game.updateProjectiles();
  assert.ok(game.projectiles.includes(shard)); assert.equal(shard.life, 7);
  for (let i = 0; i < 7; i++) game.updateProjectiles();
  assert.equal(game.projectiles.length, 0);
});

test('each character emits one elemental cast sound at actual secondary release, separate from attack audio', () => {
  for (let player = 0; player < CHARACTERS.length; player++) {
    const game = fighting({ player }), [f, target] = game.fighters, events = [];
    f.x = 440; target.x = 1100; game.sfx.play = (event, options) => events.push({ event, options });
    game.startAttack(f, f.char.secondary);
    assert.equal(events.filter(event => event.event === 'cast').length, 0);
    step(game, f.char.secondary.startup + 2);
    const casts = events.filter(event => event.event === 'cast');
    assert.equal(casts.length, 1, f.char.id); assert.equal(casts[0].options.charId, f.char.id); assert.equal(casts[0].options.kind, 'secondary');
  }
});

test('Eula gait is resolved movement, excludes attack/dodge/knockback, and freezes with fighter hitlag', () => {
  const game = fighting({ player: 2 }), f = game.fighters[0];
  f.x = 640;
  const beforeX = f.x;
  game.updateFighter(f, { ...noInput, right: true });
  assert.equal(f.motion.distance, f.x - beforeX); assert.equal(f.motion.moving, true);
  for (let i = 0; i < 4; i++) game.updateFighter(f, { ...noInput, right: true });
  for (let i = 0; i < 5; i++) {
    const distance = f.motion.distance, x = f.x;
    game.updateFighter(f, noInput);
    assert.equal(f.motion.distance, distance + f.x - x, 'releasing direction keeps gait through natural friction');
    assert.equal(f.motion.moving, true);
  }
  const distance = f.motion.distance;
  game.startAttack(f, f.char.jab); game.updateFighter(f, { ...noInput, right: true });
  assert.equal(f.motion.distance, distance);
  f.attack = null; f.state = 'hitstun'; f.hitstun = 30; f.vx = 8;
  game.updateFighter(f, noInput); assert.equal(f.motion.distance, distance);
  f.hitstun = 1; game.updateFighter(f, noInput); assert.equal(f.motion.distance, distance, 'residual knockback must not become a walk when hitstun expires');
  const frozen = JSON.stringify(f.motion); f.hitlag = 4;
  step(game, 4); assert.equal(JSON.stringify(f.motion), frozen);
  game.respawn(f); assert.equal(f.motion.distance, 0); assert.equal(f.motion.airAge, 0);
});

test('Eula attack forms alternate independently per successful move and fighter, and lock through rendering and hitlag', () => {
  const game = fighting({ player: 2, opponent: 2 }), [f, other] = game.fighters;
  for (const kind of ['jab', 'smash']) {
    for (const expected of ['alternate', 'base', 'alternate']) {
      game.startAttack(f, f.char[kind]); const attack = f.attack;
      assert.equal(attack.visualVariant, expected); assert.equal(game.fighterAnimation(f).attack.visualVariant, expected);
      const next = JSON.stringify(f.nextAttackVariants), t = attack.t; f.hitlag = 3;
      for (let i = 0; i < 3; i++) { step(game); game.fighterAnimation(f); }
      assert.equal(f.attack, attack); assert.equal(f.attack.t, t); assert.equal(f.attack.visualVariant, expected); assert.equal(JSON.stringify(f.nextAttackVariants), next);
      f.attack = null; f.state = 'free';
    }
    assert.equal(other.nextAttackVariants[kind], 'alternate');
  }
  game.ko(f); assert.deepEqual(JSON.parse(JSON.stringify(f.nextAttackVariants)), { jab: 'alternate', smash: 'alternate', special: 'base', secondary: 'base' });
  game.respawn(f); game.startAttack(f, f.char.jab); assert.equal(f.attack.visualVariant, 'alternate');
  game.start({ ...defaults, player: 2 }); step(game, 150); game.startAttack(game.fighters[0], game.fighters[0].char.jab);
  assert.equal(game.fighters[0].attack.visualVariant, 'alternate');
  game.startAttack(game.fighters[1], game.fighters[1].char.jab); assert.equal(game.fighters[1].attack.visualVariant, 'alternate');
});

test('Eula PVP busy and cooldown-rejected input does not consume an attack form', () => {
  const game = fighting({ player: 2 }), f = game.fighters[0];
  f.specialCooldown = 50; f.secondaryCooldown = 50;
  const before = JSON.stringify(f.nextAttackVariants);
  game.updateFighter(f, { ...noInput, special: true }); game.updateFighter(f, { ...noInput, secondary: true });
  assert.equal(f.attack, null); assert.equal(JSON.stringify(f.nextAttackVariants), before);
  game.startAttack(f, f.char.smash); const attack = f.attack, after = JSON.stringify(f.nextAttackVariants);
  game.updateFighter(f, { ...noInput, jab: true }); assert.equal(f.attack, attack); assert.equal(JSON.stringify(f.nextAttackVariants), after);
  f.attack = null; f.state = 'free'; f.specialCooldown = 0;
  game.updateFighter(f, { ...noInput, special: true }); assert.equal(f.attack.visualVariant, 'base');
});

test('every fighter alternates J/K only while skills retain mechanic-matched poses', () => {
  for (let player = 0; player < CHARACTERS.length; player++) {
    const game = fighting({ player }), f = game.fighters[0];
    for (const kind of ['jab', 'smash', 'special', 'secondary']) {
      for (let repeat = 0; repeat < 3; repeat++) {
        f.attack = null; f.state = 'free'; f.onGround = kind !== 'special' || f.char.id !== 'xiao';
        game.startAttack(f, f.char[kind]);
        const expected = ['jab', 'smash'].includes(kind) && repeat % 2 === 0 ? 'alternate' : 'base';
        assert.equal(f.attack.visualVariant, expected, `${f.char.id}/${kind}/${repeat}`);
      }
    }
  }
});

let failures = 0;
for (const { name, run } of cases) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
for (const game of games) game.destroy();
console.log(`\n${cases.length - failures}/${cases.length} gameplay regression checks passed.`);
process.exitCode = failures ? 1 : 0;
