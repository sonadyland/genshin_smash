import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Run the actual TypeScript modules. No test-only runtime API is shipped.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const noop = () => undefined;
const listeners = { window: new Map(), document: new Map() };
const gradient = { addColorStop: noop };
const drawingContext = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return text => ({ width: String(text).length * 8 });
    return noop;
  },
  set(target, key, value) { target[key] = value; return true; },
});
const canvas = () => ({ width: 1280, height: 720, getContext: () => drawingContext });
const eventTarget = type => ({
  addEventListener(name, fn) {
    if (!listeners[type].has(name)) listeners[type].set(name, new Set());
    listeners[type].get(name).add(fn);
  },
  removeEventListener(name, fn) { listeners[type].get(name)?.delete(fn); },
});
class HTMLElement { tagName = 'DIV'; isContentEditable = false; }
let randomSeed = 428;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => {
  randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
  return randomSeed / 4294967296;
};
const context = vm.createContext({
  console, Math: deterministicMath, performance: { now: () => 0 },
  requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  window: eventTarget('window'),
  document: { ...eventTarget('document'), hidden: false, createElement: canvas },
  HTMLElement,
});
const modules = new Map();
const artLeases = [];
let swordTipFixture = false;
function loadModule(file) {
  if (file.endsWith('/survival-render.ts')) return { renderSurvival: noop };
  if (file.endsWith('/art.ts')) return {
    getSwordCastTip: (id, x, feetY, _height, _animation, facing) => swordTipFixture && ['eula', 'diluc'].includes(id) ? { x: x + facing * 97, y: feetY - 120 } : undefined,
    acquireGameArt: ids => {
      const lease = { ids: [...ids], released: false };
      artLeases.push(lease);
      return { ready: Promise.resolve(), release: () => { lease.released = true; } };
    },
    drawCharacterArt: () => false,
    drawFighterArt: () => false, drawElementEffect: () => false,
    drawSecondaryEffect: () => false, drawXiaoPlungeEffect: () => false, drawArenaBackground: () => false,
  };
  if (modules.has(file)) return modules.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  modules.set(file, mod);
  const require = specifier => loadModule(path.resolve(path.dirname(file), `${specifier}.ts`).replaceAll('\\', '/'));
  vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename: file })(mod.exports, require, mod);
  return mod.exports;
}
const data = loadModule(path.join(root, 'src/game/survival-data.ts').replaceAll('\\', '/'));
const { CHARACTERS } = loadModule(path.join(root, 'src/game/data.ts').replaceAll('\\', '/'));
const { makeInitialProgress, xpForLevel, getUpgradeChoices, rerollUpgradeChoices, applyChoice, getSurvivalStats, SURVIVAL_BRANCHES } = data;
const cases = [];
function test(name, run) { cases.push({ name, run }); }
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('all seven characters have distinct, valid evolution pairs and reproducible starting progress', () => {
  assert.equal(CHARACTERS.length, 7);
  const ids = new Set();
  for (const character of CHARACTERS) {
    const progress = makeInitialProgress(character.id);
    assert.deepEqual(plain(progress), { charId: character.id, skillLevel: 1, secondaryLevel: 1, branch: null, upgrades: {} });
    assert.equal(SURVIVAL_BRANCHES[character.id].length, 2);
    for (const choice of SURVIVAL_BRANCHES[character.id]) {
      assert.equal(choice.kind, 'branch');
      assert.ok(!ids.has(choice.id)); ids.add(choice.id);
    }
  }
});

test('three-choice upgrades guarantee early core growth and never repeat a card', () => {
  let progress = makeInitialProgress('raiden');
  for (let level = 2; level <= 4; level++) {
    const choices = getUpgradeChoices(progress, () => 0.5);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map(choice => choice.id)).size, 3);
    const before = plain(progress);
    progress = applyChoice(progress, 'core', choices);
    assert.equal(progress.skillLevel, level);
    assert.equal(before.skillLevel, level - 1);
  }
  const choices = getUpgradeChoices(progress);
  assert.equal(choices.length, 2);
  assert.ok(choices.every(choice => choice.kind === 'branch'));
});

test('evolutions are mandatory, mutually exclusive and bound to the current character', () => {
  for (const character of CHARACTERS) {
    const progress = { ...makeInitialProgress(character.id), skillLevel: 4 };
    const choices = getUpgradeChoices(progress);
    const chosen = applyChoice(progress, choices[0].id, choices);
    assert.equal(chosen.branch, choices[0].id);
    assert.equal(applyChoice(chosen, choices[1].id, choices), null);
    assert.equal(applyChoice(progress, 'core', [{ id: 'core', level: 5 }]), null);
    const alien = Object.values(SURVIVAL_BRANCHES).flat().find(choice => !choice.id.startsWith(character.id));
    assert.equal(applyChoice(progress, alien.id, [alien]), null);
  }
});

test('unoffered, stale, duplicate and maximum-level upgrade transactions fail', () => {
  const initial = makeInitialProgress('jean');
  const offers = getUpgradeChoices(initial, () => 0);
  assert.equal(applyChoice(initial, 'not-a-card', offers), null);
  const next = applyChoice(initial, 'core', offers);
  assert.ok(next);
  assert.equal(applyChoice(next, 'core', offers), null);
  const capped = { ...next, skillLevel: 5, branch: 'jean-vortex', upgrades: { damage: 5 } };
  assert.equal(applyChoice(capped, 'damage', [{ id: 'damage', level: 6 }]), null);
  for (let i = 0; i < 30; i++) assert.ok(getUpgradeChoices(capped).every(choice => choice.id !== 'core' && choice.id !== 'damage'));
});

test('auxiliary capacity is two types while existing auxiliaries remain upgradeable', () => {
  const progress = { ...makeInitialProgress('eula'), skillLevel: 5, branch: 'eula-orbit', upgrades: { 'aux-lightning': 1, 'aux-frost': 2 } };
  const observed = new Set();
  for (let i = 0; i < 100; i++) {
    const choices = getUpgradeChoices(progress);
    assert.ok(choices.every(choice => choice.id !== 'aux-flame'));
    choices.forEach(choice => observed.add(choice.id));
  }
  assert.ok(observed.has('aux-lightning') && observed.has('aux-frost'));
  assert.equal(applyChoice(progress, 'aux-flame', [{ id: 'aux-flame', level: 1 }]), null);
});

test('all finite upgrades can be exhausted without invalid cards or an infinite offer loop', () => {
  let progress = makeInitialProgress('xiao');
  let picks = 0;
  while (true) {
    const choices = getUpgradeChoices(progress, () => 0);
    if (!choices.length) break;
    const next = applyChoice(progress, choices[0].id, choices);
    assert.ok(next); progress = next;
    assert.ok(++picks < 60);
  }
  assert.equal(progress.skillLevel, 5);
  assert.ok(progress.branch);
  assert.equal(Object.keys(progress.upgrades).filter(id => id.startsWith('aux-')).length, 2);
});

test('experience thresholds increase and passive upgrades have bounded meaningful effects', () => {
  let previous = 0;
  for (let level = 1; level < 60; level++) {
    const threshold = xpForLevel(level);
    assert.ok(Number.isInteger(threshold) && threshold > previous); previous = threshold;
  }
  const stats = getSurvivalStats({ ...makeInitialProgress('diluc'), upgrades: { damage: 5, speed: 3, range: 3, vitality: 4, armor: 3, magnet: 3 } });
  assert.equal(stats.maxHp, 200);
  assert.ok(stats.damageMultiplier > 1 && stats.speedMultiplier > 1 && stats.rangeMultiplier > 1);
  assert.ok(stats.armorMultiplier > 0 && stats.armorMultiplier < 1);
  assert.ok(stats.magnetRadius > getSurvivalStats(makeInitialProgress('diluc')).magnetRadius);
});

test('rerolls guarantee a different valid combination and preserve the core card', () => {
  const progress = makeInitialProgress('raiden');
  const offers = getUpgradeChoices(progress, () => 0);
  const rerolled = rerollUpgradeChoices(progress, offers, () => 0);
  assert.equal(rerolled.length, 3); assert.ok(rerolled.some(choice => choice.id === 'core'));
  assert.ok(rerolled.some(choice => !offers.some(previous => previous.id === choice.id)));
  assert.equal(new Set(rerolled.map(choice => choice.id)).size, 3);
  const evolving = { ...progress, skillLevel: 4 };
  assert.equal(rerollUpgradeChoices(evolving, getUpgradeChoices(evolving)), null);
  const almostCapped = { ...progress, skillLevel: 5, branch: 'raiden-chain', upgrades: { damage: 5, speed: 3, range: 3, vitality: 4, armor: 3, magnet: 3, 'aux-lightning': 3, 'aux-frost': 2 } };
  assert.equal(rerollUpgradeChoices(almostCapped, getUpgradeChoices(almostCapped)), null);
});

const { SurvivalGame } = loadModule(path.join(root, 'src/game/survival-engine.ts').replaceAll('\\', '/'));
const firstPlatformY = data.SURVIVAL_WORLD.platforms[0].y;
const games = [];
function makeGame(player = 0, variant = 'survival', mapId) {
  const game = new SurvivalGame(canvas());
  game.setMuted(true); game.start({ player, variant, mapId });
  game.player.invuln = 100000;
  game.spawnTimer = 100000;
  games.push(game);
  return game;
}
function step(game, frames = 1) { for (let i = 0; i < frames; i++) game.update(); }
function key(game, code, repeat = false) {
  context.document.activeElement = game.canvas;
  game.onKeyDown({ code, repeat, preventDefault: noop });
}
function release(game, code) { game.onKeyUp({ code }); }
function tap(game, code) { key(game, code); step(game); release(game, code); }
function enemy(game, dx = 70, changes = {}) {
  game.spawnEnemy('slime');
  const foe = game.enemies.at(-1);
  Object.assign(foe, { x: game.player.x + dx, y: game.player.y, hp: 10000, maxHp: 10000, speed: 0, damage: 0, cooldown: 100000 }, changes);
  return foe;
}
function airborne(game, x = 500, y = 590) {
  Object.assign(game.player, { x, y, vy: 0, onGround: false, jumps: 1, attack: null, skillCooldown: 0 });
}
function setBranch(game, id) { game.progress = { ...game.progress, skillLevel: 4, branch: id }; }

test('five public selections start with ten minutes, health and a larger continuous world', () => {
  for (let i = 0; i < CHARACTERS.length; i++) {
    const game = makeGame(i), snapshot = game.getSnapshot();
    assert.equal(snapshot.charId, CHARACTERS[i].id);
    assert.equal(snapshot.remaining, 600);
    assert.equal(snapshot.phase, 'playing');
    assert.equal(snapshot.hp, snapshot.maxHp);
    assert.ok(snapshot.worldWidth > game.canvas.width * 3);
    assert.equal(snapshot.skillLevel, 1);
  }
});

test('idle characters never attack, turn toward enemies or activate auxiliary damage', () => {
  for (let i = 0; i < CHARACTERS.length; i++) {
    const game = makeGame(i);
    game.progress.upgrades = { 'aux-lightning': 3, 'aux-flame': 3 };
    const target = enemy(game, -85), x = game.player.x, facing = game.player.facing;
    step(game, 180);
    assert.equal(game.damageDealt, 0);
    assert.equal(target.hp, 10000);
    assert.equal(game.player.x, x);
    assert.equal(game.player.facing, facing);
    assert.equal(game.player.attack, null);
    assert.equal(game.shots.length, 0);
    assert.equal(game.fields.length, 0);
  }
});

test('J, K and L are separate manual attacks that damage enemies for every character', () => {
  for (let i = 0; i < CHARACTERS.length; i++) {
    for (const code of ['KeyJ', 'KeyK', 'KeyL']) {
      const game = makeGame(i);
      if (CHARACTERS[i].id === 'xiao' && code === 'KeyL') airborne(game);
      enemy(game, 65, { y: CHARACTERS[i].id === 'xiao' && code === 'KeyL' ? firstPlatformY : game.player.y });
      tap(game, code); step(game, 100);
      assert.ok(game.damageDealt > 0, `${CHARACTERS[i].id} ${code}`);
      assert.equal(game.player.attack, null);
    }
  }
});

test('keyboard focus, key-repeat filtering and manual facing prevent unintended input', () => {
  const game = makeGame();
  context.document.activeElement = {};
  game.onKeyDown({ code: 'KeyJ', repeat: false, preventDefault: noop });
  step(game); assert.equal(game.player.attack, null);
  key(game, 'KeyJ', true); step(game); assert.equal(game.player.attack, null);
  key(game, 'KeyA'); step(game, 8); release(game, 'KeyA');
  assert.equal(game.player.facing, -1);
  const x = game.player.x; step(game, 20); assert.equal(game.player.x, x);
  const muted = game.muted; key(game, 'KeyM', true); assert.equal(game.muted, muted);
});

test('a fresh press near recovery buffers one follow-up while held and repeated keys never auto-attack', () => {
  const game = makeGame(); enemy(game);
  key(game, 'KeyJ'); step(game, 50);
  assert.equal(game.player.attack, null); assert.equal(game.input.keys.has('KeyJ'), true);
  const firstDamage = game.damageDealt;
  for (let i = 0; i < 10; i++) { key(game, 'KeyJ', true); step(game, 8); }
  assert.equal(game.damageDealt, firstDamage); assert.equal(game.player.attack, null);
  release(game, 'KeyJ'); tap(game, 'KeyJ');
  const attack = game.player.attack;
  const duration = attack.def.startup + attack.def.active + attack.def.endlag;
  step(game, duration - attack.t - 4);
  tap(game, 'KeyK'); assert.equal(game.pendingAttack.kind, 'smash');
  step(game, 5); assert.equal(game.player.attack.def.kind, 'smash');
  assert.equal(game.pendingAttack, null); step(game, 90); assert.equal(game.player.attack, null);
});

test('pause, blur and upgrading discard buffered attacks before play resumes', () => {
  for (const cause of ['pause', 'blur', 'upgrade']) {
    const game = makeGame(); tap(game, 'KeyK'); tap(game, 'KeyJ');
    assert.ok(game.pendingAttack);
    if (cause === 'pause') game.pause();
    if (cause === 'blur') game.onBlur();
    if (cause === 'upgrade') { game.xp = xpForLevel(game.level); game.checkLevelUp(); }
    assert.equal(game.pendingAttack, null);
    if (game.phase === 'upgrade') game.chooseUpgrade(game.choices[0].id);
    else game.resume();
    step(game, 100); assert.equal(game.player.attack, null);
    assert.equal(game.pendingAttack, null); assert.equal(game.input.keys.size, 0);
  }
});

test('pause, blur, hidden documents and upgrade selection freeze the simulation', () => {
  const game = makeGame(); enemy(game);
  tap(game, 'KeyJ');
  const signature = () => JSON.stringify({ frame: game.frame, player: game.player, enemies: game.enemies, shots: game.shots, fields: game.fields, elapsed: game.elapsed });
  for (const cause of ['pause', 'blur', 'hidden', 'upgrade']) {
    game.resume();
    if (cause === 'pause') game.pause();
    if (cause === 'blur') { game.input.keys.add('KeyD'); game.onBlur(); }
    if (cause === 'hidden') { context.document.hidden = true; game.onVisibility(); context.document.hidden = false; }
    if (cause === 'upgrade') { game.xp = xpForLevel(game.level); game.checkLevelUp(); }
    const before = signature(); step(game, 100);
    assert.equal(signature(), before, cause);
    assert.equal(game.input.keys.size, 0);
  }
});

test('Xiao refuses grounded L without cooldown and lands on the first crossed platform', () => {
  const game = makeGame(4);
  tap(game, 'KeyL');
  assert.equal(game.player.attack, null); assert.equal(game.player.skillCooldown, 0);
  assert.match(game.notice, /跳跃/);
  airborne(game, 2400, 470);
  game.input.keys.add('KeyS'); game.player.drop = 20;
  tap(game, 'KeyL');
  let fastDive = false;
  for (let i = 0; i < 80 && !game.player.onGround; i++) {
    step(game); fastDive ||= game.player.vy >= 25;
  }
  assert.ok(fastDive);
  assert.equal(game.player.y, 570);
  assert.equal(game.player.attack.plunge.phase, 'impact');
  assert.equal(game.player.vy, 0);
  release(game, 'KeyS');
});

test('Xiao descending hit is narrow and landing hits both sides without per-frame repeats', () => {
  const game = makeGame(4); airborne(game, 500, 520);
  const below = enemy(game, 0, { y: firstPlatformY - 70, kind: 'flyer' });
  const left = enemy(game, -110, { y: firstPlatformY });
  const right = enemy(game, 110, { y: firstPlatformY });
  const far = enemy(game, 360, { y: firstPlatformY });
  const above = enemy(game, 0, { y: 310, kind: 'flyer' });
  tap(game, 'KeyL');
  for (let i = 0; i < 80 && !game.player.onGround; i++) step(game);
  assert.ok(below.hp < 10000);
  assert.ok(left.hp < 10000 && right.hp < 10000);
  assert.equal(far.hp, 10000); assert.equal(above.hp, 10000);
  assert.ok(left.x < game.player.x - 110 && right.x > game.player.x + 110);
  const dealt = game.damageDealt; step(game, 12); assert.equal(game.damageDealt, dealt);
});

test('Xiao aerial evolution refunds cooldown without automatic bouncing or horizontal movement', () => {
  const game = makeGame(4); setBranch(game, 'xiao-aerial'); airborne(game, 500, 590);
  enemy(game, 80, { y: firstPlatformY });
  tap(game, 'KeyL');
  for (let i = 0; i < 80 && !game.player.onGround; i++) step(game);
  assert.equal(game.player.y, firstPlatformY); assert.equal(game.player.vy, 0);
  assert.equal(game.player.jumps, 2); assert.ok(game.player.skillCooldown <= 24);
  const x = game.player.x; step(game, 45);
  assert.equal(game.player.y, firstPlatformY); assert.equal(game.player.x, x);
  tap(game, 'KeyW'); assert.ok(game.player.vy < 0);
});

test('nonfatal damage preserves every manual attack and Xiao windup, dive and landing recovery', () => {
  const actionState = player => {
    const { hp, invuln, ...action } = player;
    return plain(action);
  };
  for (let player = 0; player < CHARACTERS.length; player++) {
    for (const code of ['KeyJ', 'KeyK', 'KeyL']) {
      const game = makeGame(player);
      if (player === 4 && code === 'KeyL') airborne(game, 500, 520);
      enemy(game, 65, player === 4 && code === 'KeyL' ? { y: firstPlatformY } : {});
      tap(game, code);
      const attack = game.player.attack, before = actionState(game.player), hp = game.player.hp;
      game.player.invuln = 0; game.hurtPlayer(5);
      assert.equal(game.player.hp, hp - 5);
      assert.equal(game.player.attack, attack, `${CHARACTERS[player].id} ${code}`);
      assert.deepEqual(actionState(game.player), before);
      step(game, 4);
      assert.deepEqual(actionState(game.player), before);
      step(game);
      assert.equal(game.player.attack, attack);
      assert.equal(attack.t, before.attack.t + 1);
      step(game, 100); assert.ok(game.damageDealt > 0, `${CHARACTERS[player].id} ${code} still connects`);
    }
  }
  for (const phase of ['dive', 'impact', 'recover']) {
    const game = makeGame(4); airborne(game, 500, 520); tap(game, 'KeyL');
    for (let i = 0; i < 100 && game.player.attack?.plunge.phase !== phase; i++) step(game);
    assert.equal(game.player.attack?.plunge.phase, phase);
    const attack = game.player.attack, before = actionState(game.player);
    game.player.invuln = 0; game.hurtPlayer(5); step(game, 4);
    assert.equal(game.player.attack, attack); assert.deepEqual(actionState(game.player), before);
    step(game); assert.equal(attack.t, before.attack.t + 1);
    step(game, 100); assert.equal(game.player.attack, null);
    assert.equal(game.player.y, firstPlatformY); assert.equal(game.player.vy, 0);
  }
});

test('damage preserves a moving jump and consumes no extra jump or forced facing change', () => {
  const game = makeGame(); key(game, 'KeyA'); tap(game, 'KeyW'); step(game, 3);
  const before = { x: game.player.x, y: game.player.y, vx: game.player.vx, vy: game.player.vy,
    jumps: game.player.jumps, onGround: game.player.onGround, facing: game.player.facing };
  game.player.invuln = 0; game.hurtPlayer(5);
  step(game, 4);
  for (const [name, value] of Object.entries(before)) assert.equal(game.player[name], value, name);
  assert.equal(game.input.keys.has('KeyA'), true);
  step(game);
  assert.ok(game.player.x < before.x && game.player.y < before.y);
  assert.equal(game.player.jumps, before.jumps); assert.equal(game.player.facing, -1);
});

test('four hitstop ticks freeze the complete battle clock and scene, including pending input lifetime', () => {
  const game = makeGame(); tap(game, 'KeyK');
  const attack = game.player.attack, duration = attack.def.startup + attack.def.active + attack.def.endlag;
  step(game, duration - attack.t - 3); tap(game, 'KeyJ');
  assert.ok(game.pendingAttack);
  enemy(game, 600, { speed: 2 });
  game.projectile(game.player.x + 400, game.player.y - 150, 4, 0, 3, 'blade');
  game.field('flame', game.player.x + 500, game.player.y, 50, 100, 3);
  game.addOrb(game.player.x + 700, game.player.y - 120, 3, false);
  game.player.dodgeCooldown = 50; game.player.skillCooldown = 80;
  game.player.invuln = 0; game.hurtPlayer(5);
  const signature = () => JSON.stringify({ frame: game.frame, elapsed: game.elapsed, player: game.player,
    enemies: game.enemies, shots: game.shots, fields: game.fields, orbs: game.orbs,
    effects: game.effects, texts: game.texts, camera: game.camera, spawnTimer: game.spawnTimer,
    noticeTimer: game.noticeTimer, pending: game.pendingAttack, keys: [...game.input.keys], pressed: [...game.input.pressed] });
  const before = signature(), frame = game.frame;
  assert.equal(game.hitstop, 4);
  for (let remaining = 3; remaining >= 0; remaining--) {
    step(game); assert.equal(game.hitstop, remaining); assert.equal(signature(), before);
  }
  step(game);
  assert.equal(game.frame, frame + 1); assert.notEqual(signature(), before);
  assert.equal(game.player.skillCooldown, 79); assert.equal(game.player.dodgeCooldown, 49);
  assert.equal(game.shots[0].age, 1); assert.equal(game.fields[0].age, 1); assert.equal(game.orbs[0].age, 1);
  step(game, 2); assert.equal(game.player.attack.def.kind, 'jab'); assert.equal(game.pendingAttack, null);
});

test('fresh movement, jump and attack taps during hitstop execute once after thaw and ignore held repeats', () => {
  const game = makeGame(); game.player.invuln = 0; game.hurtPlayer(5);
  const x = game.player.x, y = game.player.y;
  key(game, 'KeyD'); key(game, 'KeyW'); release(game, 'KeyW'); key(game, 'KeyJ');
  step(game, 4);
  assert.equal(game.player.x, x); assert.equal(game.player.y, y); assert.equal(game.player.attack, null);
  assert.equal(game.input.pressed.has('KeyW'), true); assert.equal(game.input.pressed.has('KeyJ'), true);
  step(game);
  assert.ok(game.player.x > x && game.player.y < y);
  assert.equal(game.player.jumps, 1); assert.equal(game.player.attack.def.kind, 'jab');
  assert.equal(game.input.pressed.size, 0);
  release(game, 'KeyD'); step(game, 70);
  for (let i = 0; i < 8; i++) { key(game, 'KeyJ', true); step(game, 8); }
  assert.equal(game.player.attack, null); assert.equal(game.pendingAttack, null);
  release(game, 'KeyJ'); tap(game, 'KeyJ'); assert.equal(game.player.attack.def.kind, 'jab');
});

test('invulnerable hits do not refresh hitstop or damage and menus preserve the remaining freeze', () => {
  const game = makeGame(); game.player.invuln = 0; game.hurtPlayer(5); step(game);
  const hp = game.player.hp, invuln = game.player.invuln;
  game.hurtPlayer(5);
  assert.equal(game.hitstop, 3); assert.equal(game.player.hp, hp); assert.equal(game.player.invuln, invuln);
  for (const cause of ['pause', 'upgrade']) {
    if (cause === 'pause') game.pause();
    else { game.xp = xpForLevel(game.level); game.checkLevelUp(); }
    const frame = game.frame;
    step(game, 40); assert.equal(game.hitstop, 3); assert.equal(game.frame, frame);
    if (cause === 'pause') game.resume();
    else assert.ok(game.chooseUpgrade(game.choices[0].id));
  }
  const frame = game.frame; step(game, 3); assert.equal(game.frame, frame);
  step(game); assert.equal(game.frame, frame + 1);
  game.hurtPlayer(5); assert.equal(game.hitstop, 0);
});

test('fatal contact and projectiles defeat immediately without same-tick healing or stale actions', () => {
  for (const source of ['contact', 'projectile']) {
    const game = makeGame(); tap(game, 'KeyK'); tap(game, 'KeyJ'); key(game, 'KeyD');
    game.player.hp = 1; game.player.invuln = 0;
    game.field('sanctuary', game.player.x, game.player.y - 40, 150, 100, 0);
    game.fields[0].tick = 25;
    game.addOrb(game.player.x, game.player.y - 25, 100, true);
    if (source === 'contact') enemy(game, 0, { damage: 9 });
    else game.projectile(game.player.x, game.player.y - 46, 0, 0, 9, 'bolt', false, 'enemy');
    step(game);
    assert.equal(game.phase, 'defeat', source); assert.equal(game.player.hp, 0);
    assert.equal(game.player.attack, null); assert.equal(game.hitstop, 0);
    assert.equal(game.input.keys.size, 0); assert.equal(game.input.pressed.size, 0); assert.equal(game.pendingAttack, null);
    assert.equal(game.fields[0].tick, 25); assert.ok(game.orbs.length > 0);
    const frame = game.frame; step(game, 30); assert.equal(game.frame, frame);
  }
});

test('kills produce experience pickups and queued levels resolve without losing experience', () => {
  const game = makeGame(); const foe = enemy(game, 45, { hp: 1, xp: xpForLevel(1) + xpForLevel(2) + xpForLevel(3) + 3 });
  tap(game, 'KeyJ'); step(game, 35);
  assert.equal(game.kills, 1); assert.ok(foe.hp <= 0);
  assert.equal(game.phase, 'upgrade');
  let picks = 0;
  while (game.phase === 'upgrade') {
    assert.ok(game.chooseUpgrade(game.choices[0].id));
    assert.ok(++picks < 10);
  }
  assert.equal(game.level, 4); assert.equal(game.xp, 3);
  assert.equal(game.chooseUpgrade('core'), false);
});

test('health upgrades and healing pickups clamp to the new maximum health', () => {
  const game = makeGame(); game.player.hp = 95;
  game.choices = [{ id: 'vitality', level: 1 }]; game.phase = 'upgrade';
  assert.equal(game.chooseUpgrade('vitality'), true);
  assert.ok(game.player.hp <= 125 && game.player.hp >= 120);
  game.addOrb(game.player.x, game.player.y - 25, 1000, true); step(game, 5);
  assert.equal(game.player.hp, 125);
});

test('core level four immediately opens free evolution without consuming another XP threshold', () => {
  const game = makeGame(4); game.progress.skillLevel = 3;
  game.xp = xpForLevel(1) + 5; step(game);
  const level = game.level, experience = game.xp;
  assert.ok(game.chooseUpgrade('core'));
  assert.equal(game.progress.skillLevel, 4); assert.equal(game.phase, 'upgrade');
  assert.equal(game.choices.length, 2); assert.ok(game.choices.every(choice => choice.kind === 'branch'));
  assert.equal(game.level, level); assert.equal(game.xp, experience);
  assert.ok(game.chooseUpgrade('xiao-pillars'));
  assert.equal(game.phase, 'playing'); assert.equal(game.level, level); assert.equal(game.xp, experience);
});

test('each run grants two ordinary rerolls; invalid states and branch cards never spend one', () => {
  const game = makeGame();
  assert.equal(game.getSnapshot().rerollsRemaining, 2);
  assert.equal(game.rerollUpgrades(), false);
  game.xp = xpForLevel(1); step(game);
  for (let remaining = 1; remaining >= 0; remaining--) {
    const ids = game.choices.map(choice => choice.id);
    assert.equal(game.rerollUpgrades(), true);
    assert.equal(game.getSnapshot().rerollsRemaining, remaining);
    assert.ok(game.choices.some(choice => !ids.includes(choice.id)));
  }
  assert.equal(game.rerollUpgrades(), false);
  game.rematch(); assert.equal(game.rerollsRemaining, 2);
  game.progress.skillLevel = 4; game.phase = 'upgrade'; game.choices = getUpgradeChoices(game.progress);
  assert.equal(game.rerollUpgrades(), false); assert.equal(game.rerollsRemaining, 2);
});

test('all ten evolution branches create their advertised distinct combat behavior', () => {
  const raiden = makeGame(0); setBranch(raiden, 'raiden-chain');
  const primary = enemy(raiden, 85), chained = enemy(raiden, 235);
  tap(raiden, 'KeyJ'); step(raiden, 20);
  assert.ok(primary.hp < 10000 && chained.hp < 10000);
  const returning = makeGame(0); setBranch(returning, 'raiden-return'); tap(returning, 'KeyL'); step(returning, 70);
  assert.ok(returning.shots.some(shot => shot.returning && shot.returned && shot.vx < 0));
  const vortex = makeGame(1); setBranch(vortex, 'jean-vortex'); const pulled = enemy(vortex, 380); const initialX = pulled.x;
  tap(vortex, 'KeyL'); step(vortex, 20);
  assert.ok(vortex.fields.some(field => field.kind === 'vortex')); assert.ok(pulled.x < initialX);
  const sanctuary = makeGame(1); setBranch(sanctuary, 'jean-sanctuary'); sanctuary.player.hp = 40;
  tap(sanctuary, 'KeyL'); step(sanctuary, 50);
  assert.ok(sanctuary.fields.some(field => field.kind === 'sanctuary')); assert.ok(sanctuary.player.hp > 40);
  const orbit = makeGame(2); setBranch(orbit, 'eula-orbit'); const chilled = enemy(orbit, 70);
  tap(orbit, 'KeyL'); step(orbit, 50);
  assert.ok(orbit.fields.some(field => field.kind === 'orbit')); assert.ok(chilled.slow > 0);
  const shatter = makeGame(2); setBranch(shatter, 'eula-shatter'); const marked = enemy(shatter, 65);
  tap(shatter, 'KeyJ'); step(shatter, 30); assert.ok(marked.stacks > 0);
  const beforeShatter = marked.hp; tap(shatter, 'KeyL'); step(shatter, 30);
  assert.equal(marked.stacks, 0); assert.ok(beforeShatter - marked.hp > shatter.attackDamage('special'));
  const trail = makeGame(3); setBranch(trail, 'diluc-trail'); tap(trail, 'KeyL'); step(trail, 22);
  assert.ok(trail.fields.filter(field => field.kind === 'flame').length >= 2);
  const burst = makeGame(3); setBranch(burst, 'diluc-burst'); tap(burst, 'KeyL'); step(burst, 22);
  assert.ok(burst.shots.some(shot => shot.kind === 'fire'));
  const pillars = makeGame(4); setBranch(pillars, 'xiao-pillars'); airborne(pillars); tap(pillars, 'KeyL'); step(pillars, 40);
  assert.equal(pillars.fields.filter(field => field.kind === 'pillar').length, 3);
  // The xiao-aerial branch is verified separately against physical player movement.
});

test('core and range upgrades expand real special hitboxes for all five characters', () => {
  const normalRaiden = makeGame(0); tap(normalRaiden, 'KeyL'); step(normalRaiden, 15);
  const wideRaiden = makeGame(0); wideRaiden.progress.skillLevel = 5; wideRaiden.progress.upgrades.range = 3;
  tap(wideRaiden, 'KeyL'); step(wideRaiden, 15);
  assert.ok(wideRaiden.shots[0].radius > normalRaiden.shots[0].radius * 1.5);
  for (const [player, dx] of [[1, 300], [2, 240], [3, 220], [4, 260]]) {
    const outcomes = [];
    for (const upgraded of [false, true]) {
      const game = makeGame(player);
      if (upgraded) { game.progress.skillLevel = 5; game.progress.upgrades.range = 3; }
      if (player === 4) airborne(game);
      const target = enemy(game, dx, player === 4 ? { y: firstPlatformY, kind: 'flyer' } : {});
      tap(game, 'KeyL'); step(game, 55);
      outcomes.push(target.hp < 10000);
    }
    assert.deepEqual(outcomes, [false, true], CHARACTERS[player].id);
  }
});

test('three-minute and six-minute elites and nine-minute boss spawn exactly once', () => {
  const game = makeGame();
  for (const milestone of [180, 360, 540]) {
    game.frame = milestone * 60 - 1; step(game);
    assert.equal(game.enemies.filter(foe => foe.elite).length, milestone / 180);
    step(game, 5); assert.equal(game.enemies.filter(foe => foe.elite).length, milestone / 180);
  }
  assert.equal(game.enemies.filter(foe => foe.boss).length, 1);
  const boss = game.enemies.find(foe => foe.boss); game.hurtEnemy(boss, boss.hp + 1, 1, 'manual');
  assert.equal(game.bossKilled, true); assert.equal(game.phase, 'playing');
});

test('ten-minute victory happens on the exact battle tick and does not require boss death', () => {
  const game = makeGame(); game.frame = 35998;
  step(game); assert.equal(game.phase, 'playing'); assert.ok(game.getSnapshot().remaining > 0);
  game.pause(); step(game, 300); assert.equal(game.frame, 35999);
  game.resume(); step(game); assert.equal(game.phase, 'victory'); assert.equal(game.elapsed, 600);
  assert.equal(game.bossKilled, false); assert.equal(game.getSnapshot().remaining, 0);
  step(game, 100); assert.equal(game.frame, 36000);
});

test('entity caps remain strict even when a new pickup type appears after the orb cap', () => {
  const game = makeGame();
  for (let i = 0; i < 150; i++) game.addOrb(100 + (i % 30) * 145, 70 + Math.floor(i / 30) * 170, 1, true);
  assert.equal(game.orbs.length, 150);
  game.addOrb(4530, 1000, 5, false);
  assert.ok(game.orbs.length <= data.SURVIVAL_LIMITS.gems);
  assert.ok(game.orbs.some(orb => !orb.heal && orb.value >= 5));
  for (let i = 0; i < 120; i++) game.projectile(300, 300, 1, 0, 1, 'fire');
  assert.ok(game.shots.length <= data.SURVIVAL_LIMITS.projectiles);
  for (let i = 0; i < 200; i++) game.effect('impact', 300, 300, 20, '#fff', 100);
  assert.ok(game.effects.length <= data.SURVIVAL_LIMITS.effects);
});

test('all five characters finish full ten-minute high-population simulations with finite bounded state', () => {
  for (let player = 0; player < CHARACTERS.length; player++) {
    const game = makeGame(player); game.spawnTimer = 1;
    for (let second = 0; second < 600; second++) {
      step(game, 60);
      assert.ok(game.enemies.length <= data.SURVIVAL_LIMITS.enemies);
      assert.ok(game.shots.length <= data.SURVIVAL_LIMITS.projectiles);
      assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y) && Number.isFinite(game.player.hp));
      for (const foe of game.enemies) assert.ok(Number.isFinite(foe.x) && Number.isFinite(foe.y) && Number.isFinite(foe.hp));
    }
    assert.equal(game.phase, 'victory', CHARACTERS[player].id);
    assert.equal(game.elapsed, 600); assert.equal(game.damageDealt, 0);
    assert.equal(game.eliteMilestones.size, 3);
  }
});

test('rematch clears every run-owned collection and destroy removes its event subscriptions', () => {
  const game = makeGame(4);
  const before = Object.fromEntries([...listeners.window].map(([name, handlers]) => [name, handlers.size]));
  game.progress.branch = 'xiao-pillars'; game.level = 10; game.xp = 100; game.kills = 8;
  game.bossKilled = true; game.frame = 2000; game.elapsed = 33; game.player.hp = 12; game.input.keys.add('KeyD'); enemy(game);
  game.player.invuln = 0; game.hurtPlayer(5); assert.equal(game.hitstop, 4);
  game.addOrb(400, 700, 5, false); game.rematch();
  const snapshot = game.getSnapshot();
  assert.equal(snapshot.charId, 'xiao'); assert.equal(snapshot.elapsed, 0); assert.equal(snapshot.level, 1);
  assert.equal(snapshot.hp, 100); assert.equal(snapshot.branch, null); assert.equal(snapshot.kills, 0);
  assert.equal(game.enemies.length + game.orbs.length + game.shots.length + game.fields.length, 0);
  assert.equal(game.input.keys.size, 0); assert.equal(game.hitstop, 0);
  game.player.invuln = 0; game.hurtPlayer(5); assert.equal(game.hitstop, 4);
  game.destroy();
  for (const [name, count] of Object.entries(before)) assert.equal(listeners.window.get(name).size, count - 1);
  key(game, 'KeyJ'); assert.equal(game.input.pressed.size, 0);
});


test('both skill cards are guaranteed, secondary levels transact independently and exhausted offers terminate', () => {
  let progress = makeInitialProgress('raiden');
  for (let level = 2; level <= 5; level++) {
    const offers = getUpgradeChoices(progress, () => 0);
    assert.deepEqual(plain(offers.slice(0, 2).map(choice => choice.id)), ['core', 'secondary']);
    const changed = rerollUpgradeChoices(progress, offers, () => 0);
    assert.deepEqual(plain(changed.slice(0, 2).map(choice => choice.id)), ['core', 'secondary']);
    assert.notEqual(changed[2].id, offers[2].id);
    progress = applyChoice(progress, 'secondary', changed);
    assert.equal(progress.secondaryLevel, level); assert.equal(progress.skillLevel, 1);
    assert.equal(applyChoice(progress, 'secondary', changed), null);
  }
  assert.ok(getUpgradeChoices(progress).every(choice => choice.id !== 'secondary'));
  const exhausted = { ...progress, skillLevel: 5, branch: 'raiden-chain', upgrades: { damage: 5, speed: 3, range: 3, vitality: 4, armor: 3, magnet: 3, 'aux-lightning': 3, 'aux-frost': 3 } };
  assert.equal(getUpgradeChoices(exhausted).length, 0);
});

test('manual I hits enemies for all five characters without primary cooldown or automatic repeats', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = makeGame(index); enemy(game, 80);
    key(game, 'KeyI', true); step(game); assert.equal(game.player.attack, null);
    key(game, 'KeyI'); step(game, 110);
    assert.ok(game.damageDealt > 0, game.char.id);
    assert.equal(game.player.skillCooldown, 0);
    assert.ok(game.getSnapshot().secondaryCooldown > 0);
    const damage = game.damageDealt;
    step(game, 400);
    key(game, 'KeyI', true); step(game, 80);
    assert.equal(game.damageDealt, damage); assert.equal(game.player.attack, null);
  }
});

test('secondary levels three and five produce their advertised distinct numbers and real piercing', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    for (const level of [1, 3, 5]) {
      const game = makeGame(index); game.progress.secondaryLevel = level;
      const profile = data.getSecondaryProfile(game.char.id, level);
      tap(game, 'KeyI'); step(game, game.char.secondary.startup - 1);
      if (index < 2) {
        assert.equal(game.fields.length, profile.count);
        assert.ok(game.fields.every(field => field.kind === (index === 0 ? 'thunder' : 'updraft')));
      } else if (index < 5) {
        assert.equal(game.shots.length, profile.count);
        if (index === 3) assert.ok(game.shots.every(shot => shot.piercing === (level >= 3)));
      } else {
        assert.equal(game.shots.length, 0, 'summoner casts must never fall into Xiao wind blades');
        assert.ok(game.summons.effects.some(effect => effect.kind === (game.char.id === 'zhongli' ? 'geo-meteor' : 'hydro-wave')));
      }
      assert.equal(game.getSnapshot().secondaryLevel, level);
      assert.equal(game.getSnapshot().secondaryCooldownMax, game.char.secondaryCooldown * profile.cooldownMultiplier);
    }
  }
  const low = makeGame(1), high = makeGame(1); high.progress.secondaryLevel = 5;
  tap(low, 'KeyI'); tap(high, 'KeyI'); step(low, 12); step(high, 12);
  assert.ok(high.fields[0].radius > low.fields[0].radius * 1.5);
});

test('secondary upgrade scaling increases actual damage for every fighter', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const amounts = [];
    for (const level of [1, 5]) {
      const game = makeGame(index); game.progress.secondaryLevel = level; enemy(game, 80);
      tap(game, 'KeyI'); step(game, 100); amounts.push(game.damageDealt);
    }
    assert.ok(amounts[1] > amounts[0], `${CHARACTERS[index].id}: ${amounts}`);
  }
});

test('updraft launches, ice crystals slow and evolved firebirds pierce distinct enemies once', () => {
  const jean = makeGame(1), lifted = enemy(jean, 80);
  tap(jean, 'KeyI'); step(jean, 14); assert.ok(lifted.vy < 0 && lifted.y < jean.player.y);
  const eula = makeGame(2), frozen = enemy(eula, 80);
  tap(eula, 'KeyI'); step(eula, 20); assert.ok(frozen.slow > 0);
  const diluc = makeGame(3); diluc.progress.secondaryLevel = 3;
  const near = enemy(diluc, 100), far = enemy(diluc, 250);
  tap(diluc, 'KeyI'); step(diluc, 65);
  assert.ok(near.hp < 10000 && far.hp < 10000);
  const damage = diluc.damageDealt; step(diluc, 100); assert.equal(diluc.damageDealt, damage);
});

test('nonfatal secondary hitstop preserves actions and queues one new I press', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = makeGame(index); tap(game, 'KeyI'); step(game, 3);
    const attack = game.player.attack, t = attack.t;
    game.player.invuln = 0; game.hurtPlayer(8);
    step(game, 4); assert.equal(game.player.attack, attack); assert.equal(attack.t, t);
    step(game); assert.equal(attack.t, t + 1);
  }
  const game = makeGame(); game.player.invuln = 0; game.hurtPlayer(8);
  key(game, 'KeyI'); step(game, 4); assert.equal(game.player.attack, null);
  step(game); assert.equal(game.player.attack.def.kind, 'secondary');
  step(game, 500); assert.equal(game.player.attack, null);
});

test('Xiao secondary works on ground or in air, follows facing and never auto-jumps or turns', () => {
  for (const air of [false, true]) for (const facing of [-1, 1]) {
    const game = makeGame(4);
    if (air) airborne(game, 2200, 450);
    game.player.facing = facing; const jumps = game.player.jumps;
    tap(game, 'KeyI'); step(game, 7);
    const x = game.player.x, y = game.player.y;
    step(game, 5);
    assert.ok((game.player.x - x) * facing >= 50); assert.equal(game.player.y, y);
    assert.equal(game.player.facing, facing); assert.equal(game.player.jumps, jumps);
    assert.equal(game.player.attack.plunge, undefined);
  }
});

test('secondary effects obey pause, finite lifetime and entity caps; rematch resets their cooldown and level', () => {
  const game = makeGame(3); game.progress.secondaryLevel = 5;
  tap(game, 'KeyI'); step(game, 20);
  const before = plain({ shots: game.shots, player: game.player, frame: game.frame });
  game.pause(); step(game, 120);
  assert.deepEqual(plain({ shots: game.shots, player: game.player, frame: game.frame }), before);
  game.resume(); step(game, 120); assert.equal(game.shots.length, 0);
  for (let i = 0; i < 100; i++) game.releaseSecondary();
  assert.ok(game.shots.length <= data.SURVIVAL_LIMITS.projectiles);
  game.rematch(); assert.equal(game.player.secondaryCooldown, 0); assert.equal(game.progress.secondaryLevel, 1);
  assert.equal(game.shots.length, 0); assert.equal(game.fields.length, 0);
});


test('Eula I crystals each add one shatter mark and L detonates them without giving Raiden I chain lightning', () => {
  const game = makeGame(2); setBranch(game, 'eula-shatter');
  const marked = enemy(game, 180);
  tap(game, 'KeyI'); step(game, game.char.secondary.startup - 1);
  const crystal = game.shots.find(shot => shot.kind === 'frost' && shot.vy === 0);
  assert.ok(crystal, 'test follows one crystal emitted by the actual manual I skill');
  game.shots = [crystal];
  step(game, 80);
  assert.equal(marked.stacks, 1);
  assert.ok(crystal.hit.has(marked.id));
  const hp = marked.hp; step(game, 30);
  assert.equal(marked.stacks, 1); assert.equal(marked.hp, hp);
  tap(game, 'KeyL'); step(game, 30);
  assert.equal(marked.stacks, 0);
  assert.ok(hp - marked.hp > game.attackDamage('special'), 'L adds its hit and detonates the stored I mark');
  const raiden = makeGame(0); setBranch(raiden, 'raiden-chain');
  const primary = enemy(raiden, 80), nearby = enemy(raiden, 235);
  tap(raiden, 'KeyI'); step(raiden, 50);
  assert.ok(primary.hp < 10000); assert.equal(nearby.hp, 10000);
});

test('terrain is continuous, has two terraces and four walkable slopes with clear overhead platforms', () => {
  const { terrain, platforms, width } = data.SURVIVAL_WORLD;
  assert.equal(terrain[0].x, 0); assert.equal(terrain.at(-1).x, width);
  const slopes = terrain.slice(1).map((p, i) => ({ a: terrain[i], b: p })).filter(({ a, b }) => a.y !== b.y);
  assert.equal(slopes.length, 4);
  assert.ok(new Set(terrain.map(p => p.y)).size >= 3);
  for (const { a, b } of slopes) {
    assert.ok(Math.abs((b.y - a.y) / (b.x - a.x)) <= 0.4);
    assert.equal(data.groundHeightAt((a.x + b.x) / 2), (a.y + b.y) / 2);
  }
  for (const point of terrain.slice(1, -1)) assert.ok(Math.abs(data.groundHeightAt(point.x - 0.001) - data.groundHeightAt(point.x + 0.001)) < 0.001);
  for (const platform of platforms) for (let x = platform.x; x <= platform.x + platform.w; x += 5) assert.ok(data.groundHeightAt(x) - platform.y >= 150, `headroom at ${x}`);
  assert.equal(data.groundHeightAt(-500), terrain[0].y); assert.equal(data.groundHeightAt(width + 500), terrain.at(-1).y);
});

test('all fighters walk both directions over all four slopes without falling, bouncing or resetting jumps', () => {
  const points = data.SURVIVAL_WORLD.terrain;
  const slopes = points.slice(1).map((b, i) => ({ a: points[i], b })).filter(({ a, b }) => a.y !== b.y);
  for (let player = 0; player < CHARACTERS.length; player++) for (const { a, b } of slopes) for (const direction of [-1, 1]) {
    const game = makeGame(player), start = direction > 0 ? a.x - 8 : b.x + 8, end = direction > 0 ? b.x + 8 : a.x - 8;
    Object.assign(game.player, { x: start, y: data.groundHeightAt(start), jumps: 1 });
    const code = direction > 0 ? 'KeyD' : 'KeyA'; key(game, code);
    for (let tick = 0; (end - game.player.x) * direction > 0; tick++) {
      assert.ok(tick < 500); step(game);
      assert.ok(Math.abs(game.player.y - data.groundHeightAt(game.player.x)) < 0.001, `${game.char.id} on slope`);
      assert.equal(game.player.onGround, true); assert.equal(game.player.vy, 0); assert.equal(game.player.jumps, 1);
    }
    release(game, code); const y = game.player.y; step(game, 8); assert.equal(game.player.y, y);
  }
});

test('slope jumps consume exactly two manual jumps and S only drops through soft platforms', () => {
  const game = makeGame();
  Object.assign(game.player, { x: 2810, y: data.groundHeightAt(2810), onGround: true, jumps: 2 });
  const ground = game.player.y; tap(game, 'KeyS'); assert.equal(game.player.y, ground); assert.equal(game.player.drop, 0);
  tap(game, 'KeyW'); assert.equal(game.player.jumps, 1); assert.equal(game.player.onGround, false); assert.ok(game.player.y < ground);
  step(game, 5); tap(game, 'KeyW'); assert.equal(game.player.jumps, 0); assert.equal(game.player.onGround, false);
  step(game, 150); assert.equal(game.player.y, ground); assert.equal(game.player.jumps, 2);
  const platform = data.SURVIVAL_WORLD.platforms.find(p => p.x === 2330);
  Object.assign(game.player, { x: 2400, y: platform.y, vy: 0, onGround: true });
  tap(game, 'KeyS'); assert.ok(game.player.y > platform.y); assert.equal(game.player.onGround, false);
  step(game, 120); assert.equal(game.player.y, 750);
});

test('Xiao plunges onto a slope exactly once and horizontal air thrusts cannot enter solid terrain', () => {
  const game = makeGame(4), x = 2810, ground = data.groundHeightAt(x);
  airborne(game, x, ground - 85);
  const left = enemy(game, -95, { y: data.groundHeightAt(x - 95) }), right = enemy(game, 95, { y: data.groundHeightAt(x + 95) });
  tap(game, 'KeyL');
  let impacts = 0;
  for (let i = 0; i < 80 && !game.player.onGround; i++) { step(game); impacts = Math.max(impacts, game.effects.filter(e => e.kind === 'plunge').length); }
  assert.equal(game.player.y, ground); assert.equal(game.player.attack.plunge.phase, 'impact'); assert.equal(impacts, 1);
  assert.ok(left.hp < 10000 && right.hp < 10000);
  const damage = game.damageDealt; step(game, 12); assert.equal(game.damageDealt, damage);
  const dash = makeGame(4); tap(dash, 'KeyI');
  Object.assign(dash.player, { x: 2700, y: data.groundHeightAt(2700) - 1, onGround: false, vy: 0 });
  dash.player.attack.t = dash.char.secondary.startup;
  step(dash, 3); assert.ok(dash.player.x > 2700); assert.ok(dash.player.y <= data.groundHeightAt(dash.player.x));
  assert.equal(dash.player.attack.def.kind, 'secondary');
});

test('walking enemies, knockback, offscreen spawns and experience use the same physical slopes', () => {
  const game = makeGame(); Object.assign(game.player, { x: 3100, y: data.groundHeightAt(3100) });
  for (const kind of ['slime', 'ranged']) {
    const target = enemy(game, 0, { kind, x: 2680, y: data.groundHeightAt(2680), speed: 4, grounded: true, age: 1 });
    for (let i = 0; i < 35; i++) { step(game); assert.equal(target.y, data.groundHeightAt(target.x)); assert.equal(target.grounded, true); }
    game.hurtEnemy(target, 1, 1, 'field'); assert.equal(target.y, data.groundHeightAt(target.x));
    game.hurtEnemy(target, 1, -1, 'field'); assert.equal(target.y, data.groundHeightAt(target.x));
  }
  for (const cameraX of [0, 2200, 3320]) {
    game.camera.x = cameraX;
    for (const kind of ['slime', 'ranged', 'flyer']) {
      game.spawnEnemy(kind); const foe = game.enemies.at(-1);
      if (kind === 'flyer') assert.ok(foe.y < data.groundHeightAt(foe.x));
      else assert.equal(foe.y, data.groundHeightAt(foe.x));
    }
  }
  Object.assign(game.player, { x: 2300, y: data.groundHeightAt(2300) });
  game.enemies = []; game.addOrb(2810, data.groundHeightAt(2810) - 80, 2, false);
  step(game, 180); assert.equal(game.orbs.length, 1); assert.equal(game.orbs[0].y + 7, data.groundHeightAt(game.orbs[0].x));
});

test('grounded flame trails and elemental columns follow slopes while projectiles stop at solid ground', () => {
  const diluc = makeGame(3); setBranch(diluc, 'diluc-trail');
  Object.assign(diluc.player, { x: 2790, y: data.groundHeightAt(2790) }); tap(diluc, 'KeyL'); step(diluc, 22);
  const flames = diluc.fields.filter(field => field.kind === 'flame'); assert.ok(flames.length >= 2);
  for (const field of flames) assert.equal(field.y + 12, data.groundHeightAt(field.x));
  for (const index of [0, 1]) {
    const game = makeGame(index); game.progress.secondaryLevel = 5;
    Object.assign(game.player, { x: 2720, y: data.groundHeightAt(2720) }); tap(game, 'KeyI'); step(game, 15);
    const range = game.secondaryRange();
    for (const field of game.fields) assert.equal(field.y + (index === 0 ? 115 : 85) * range, data.groundHeightAt(field.x));
  }
  const shots = makeGame();
  shots.projectile(2630, 870, 10, 0, 1, 'fire'); shots.projectile(2630, 870, 10, 0, 1, 'bolt', false, 'enemy');
  step(shots, 25); assert.equal(shots.shots.length, 0); assert.ok(shots.effects.some(effect => effect.kind === 'impact'));
});

test('Eula wider L reaches both sides and taller targets, while enlarged I crystals reach beyond the old lifetime', () => {
  const game = makeGame(2);
  const left = enemy(game, -210), right = enemy(game, 210), high = enemy(game, 60, { kind: 'flyer', y: game.player.y - 180 });
  tap(game, 'KeyL'); step(game, 25); assert.ok(left.hp < 10000 && right.hp < 10000 && high.hp < 10000);
  const ice = makeGame(2); ice.player.facing = -1; const far = enemy(ice, -520);
  tap(ice, 'KeyI'); step(ice, 15);
  assert.ok(ice.shots.every(shot => shot.radius === 23 && shot.life === 60));
  step(ice, 65); assert.ok(far.hp < 10000); assert.ok(far.slow > 0);
});

test('Eula locomotion follows actual slope travel, stops at world walls, and freezes through noninterrupting damage', () => {
  const game = makeGame(2), p = game.player;
  Object.assign(p, { x: 2780, y: data.groundHeightAt(2780) });
  game.input.keys.add('KeyD'); const x = p.x; step(game);
  assert.equal(p.motion.distance, p.x - x); assert.equal(p.motion.moving, true); assert.notEqual(p.motion.slope, 0);
  Object.assign(p, { x: data.SURVIVAL_WORLD.width - 38, y: data.groundHeightAt(data.SURVIVAL_WORLD.width - 38) });
  const distance = p.motion.distance; step(game, 5);
  assert.equal(p.motion.distance, distance); assert.equal(p.motion.moving, false);
  game.input.keys.clear(); tap(game, 'KeyI');
  const attack = p.attack; assert.ok(attack);
  const frozen = JSON.stringify(p.motion); p.invuln = 0; game.hurtPlayer(5); step(game, 4);
  assert.equal(JSON.stringify(p.motion), frozen); assert.equal(p.attack, attack);
  game.pause(); step(game, 20); assert.equal(JSON.stringify(p.motion), frozen);
  game.resume(); step(game); assert.equal(p.attack, attack); assert.equal(p.motion.distance, distance);
});

test('Eula survival forms alternate by successful attack kind while rejected cooldown and buffered input preserve the next form', () => {
  const game = makeGame(2), p = game.player;
  for (const kind of ['jab', 'smash']) {
    for (const expected of ['alternate', 'base', 'alternate']) {
      p.skillCooldown = 0; p.secondaryCooldown = 0; game.beginAttack(kind);
      assert.equal(p.attack.visualVariant, expected); p.attack = null;
    }
  }
  game.start({ player: 2 }); const fresh = game.player;
  fresh.skillCooldown = 40; fresh.secondaryCooldown = 40;
  const before = JSON.stringify(fresh.nextAttackVariants);
  tap(game, 'KeyL'); tap(game, 'KeyI');
  assert.equal(fresh.attack, null); assert.equal(JSON.stringify(fresh.nextAttackVariants), before);
  tap(game, 'KeyK'); const attack = fresh.attack, after = JSON.stringify(fresh.nextAttackVariants);
  tap(game, 'KeyJ'); step(game, 8);
  assert.equal(fresh.attack, attack); assert.equal(JSON.stringify(fresh.nextAttackVariants), after, 'expired busy buffer must not consume a form');
  fresh.attack.t = fresh.attack.def.startup + fresh.attack.def.active + fresh.attack.def.endlag - 3;
  tap(game, 'KeyJ'); assert.equal(fresh.attack, attack); step(game, 4);
  assert.equal(fresh.attack.def.kind, 'jab'); assert.equal(fresh.attack.visualVariant, 'alternate'); assert.equal(fresh.nextAttackVariants.jab, 'base');
  assert.equal(fresh.nextAttackVariants.special, 'base');
});

test('Eula survival instances preserve visual form through attack-speed upgrades, noninterrupting damage, pause and death resets', () => {
  const game = makeGame(2), p = game.player; game.progress.upgrades.speed = 3;
  tap(game, 'KeyI'); const attack = p.attack, next = JSON.stringify(p.nextAttackVariants);
  assert.equal(attack.visualVariant, 'base'); assert.equal(attack.def.startup, Math.max(3, Math.round(game.char.secondary.startup / 1.105)));
  const t = attack.t; p.invuln = 0; game.hurtPlayer(5); step(game, 4);
  assert.equal(p.attack, attack); assert.equal(attack.t, t); assert.equal(attack.visualVariant, 'base'); assert.equal(JSON.stringify(p.nextAttackVariants), next);
  game.pause(); step(game, 15); assert.equal(attack.t, t); assert.equal(JSON.stringify(p.nextAttackVariants), next);
  game.resume(); step(game); assert.equal(p.attack, attack);
  p.invuln = 0; game.hurtPlayer(10000); assert.equal(game.phase, 'defeat'); assert.equal(p.attack, null); assert.deepEqual(JSON.parse(JSON.stringify(p.nextAttackVariants)), { jab: 'alternate', smash: 'alternate', special: 'base', secondary: 'base' });
  game.start({ player: 2 }); game.beginAttack('secondary'); assert.equal(game.player.attack.visualVariant, 'base');
  const other = makeGame(3); other.beginAttack('jab'); assert.equal(other.player.attack.visualVariant, 'alternate');
});

test('every survivor alternates J/K while fixed skill poses survive speed upgrades and noninterrupting hitstop', () => {
  for (let player = 0; player < CHARACTERS.length; player++) {
    const game = makeGame(player), p = game.player; game.progress.upgrades.speed = 3;
    for (const kind of ['jab', 'smash', 'special', 'secondary']) {
      for (let repeat = 0; repeat < 3; repeat++) {
        p.attack = null; p.skillCooldown = 0; p.secondaryCooldown = 0;
        if (game.char.id === 'xiao' && kind === 'special') airborne(game, p.x, p.y - 120);
        game.beginAttack(kind);
        const expected = ['jab', 'smash'].includes(kind) && repeat % 2 === 0 ? 'alternate' : 'base';
        assert.equal(p.attack.visualVariant, expected, `${game.char.id}/${kind}/${repeat}`);
      }
    }
  }
});

test('ordinary slash visuals retain their successful attack form while skill and impact effects stay untagged', () => {
  for (let player = 0; player < CHARACTERS.length; player++) for (const kind of ['jab', 'smash']) {
    const game = makeGame(player);
    for (const variant of ['alternate', 'base']) {
      game.player.attack = null; game.effects = []; game.beginAttack(kind); const attack = game.player.attack;
      step(game, attack.def.startup + 1);
      const slash = game.effects.find(effect => effect.kind === 'slash');
      assert.deepEqual(plain(slash.melee), { kind, variant });
    }
  }
  for (const player of [1, 3]) {
    const game = makeGame(player); game.beginAttack('special'); step(game, game.player.attack.def.startup + 1);
    assert.ok(game.effects.some(effect => effect.kind === 'slash'));
    assert.ok(game.effects.every(effect => !effect.melee));
  }
});

test('blur drops keyboard repeats but fresh keydown works when background keyup was never delivered', () => {
  const game = makeGame();
  key(game, 'KeyJ'); game.onBlur(); game.resume();
  key(game, 'KeyJ', true); step(game); assert.equal(game.player.attack, null);
  key(game, 'KeyJ'); step(game); assert.equal(game.player.attack.def.kind, 'jab');
});

test('survival art ownership loads only the selected fighter and releases on replacement and destroy', () => {
  const before = artLeases.length;
  const { SurvivalGame } = loadModule(path.join(root, 'src/game/survival-engine.ts').replaceAll('\\', '/'));
  const game = new SurvivalGame(canvas());
  assert.equal(artLeases.length, before, 'construction must not preload all characters');
  game.start({ player: 1 }); const first = artLeases.at(-1); assert.deepEqual(first.ids, ['jean']);
  game.start({ player: 4 }); assert.equal(first.released, true);
  const second = artLeases.at(-1); assert.deepEqual(second.ids, ['xiao']);
  game.destroy(); assert.equal(second.released, true);
});

test('touch movement, jump and attack combine and a held skill never fires again after cooldown', () => {
  const game = makeGame(); const startX = game.player.x;
  game.setTouchAction('right', 'move', true); game.setTouchAction('jump', 'jump', true); game.setTouchAction('secondary', 'skill', true); step(game);
  assert.ok(game.player.x > startX); assert.equal(game.player.jumps, 1); assert.equal(game.player.attack.def.kind, 'secondary');
  game.setTouchAction('right', 'move', false); step(game, 400);
  assert.equal(game.player.attack, null); assert.equal(game.player.secondaryCooldown, 0);
  game.setTouchAction('secondary', 'skill', true); step(game); assert.equal(game.player.attack, null);
  game.setTouchAction('secondary', 'skill', false); game.setTouchAction('secondary', 'skill', true); step(game);
  assert.equal(game.player.attack.def.kind, 'secondary');
});

test('touch jump sources coalesce per tick and Xiao can jump then plunge on the same tick', () => {
  const game = makeGame(4);
  assert.equal(game.getSnapshot().canSpecial, false);
  game.setTouchAction('jump', 'up', true); game.setTouchAction('jump', 'jump', true); step(game);
  assert.equal(game.player.jumps, 1); assert.equal(game.getSnapshot().canSpecial, true);
  game.setTouchAction('jump', 'jump', false); game.setTouchAction('jump', 'jump', true); step(game);
  assert.equal(game.player.jumps, 0);
  const simultaneous = makeGame(4);
  simultaneous.setTouchAction('jump', 'jump', true); simultaneous.setTouchAction('special', 'skill', true); step(simultaneous);
  assert.equal(simultaneous.player.attack.plunge.phase, 'windup'); assert.ok(simultaneous.player.skillCooldown > 0);
});

test('touch hitstop preserves one new action edge, while upgrade and blur discard it', () => {
  const game = makeGame(); game.hitstop = 4;
  game.setTouchAction('jab', 'attack', true); game.setTouchAction('jab', 'attack', false);
  step(game, 4); assert.equal(game.player.attack, null); step(game); assert.equal(game.player.attack.def.kind, 'jab');
  for (const transition of ['upgrade', 'blur']) {
    const run = makeGame();
    run.setTouchAction('right', 'move', true); run.setTouchAction('jab', 'attack', true);
    if (transition === 'blur') { run.onBlur(); run.resume(); }
    else { run.xp = xpForLevel(run.level); run.checkLevelUp(); assert.equal(run.phase, 'upgrade'); run.chooseUpgrade(run.choices[0].id); }
    run.setTouchAction('right', 'move', true); run.setTouchAction('jab', 'attack', true); step(run);
    assert.equal(run.player.vx, 0); assert.equal(run.player.attack, null);
    run.setTouchAction('jab', 'attack', false); run.setTouchAction('jab', 'attack', true); step(run);
    assert.equal(run.player.attack.def.kind, 'jab');
  }
});

test('summoner release frames create grounded summons exactly once and keep eight-second independent cooldowns', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = makeGame(CHARACTERS.findIndex(char => char.id === id));
    Object.assign(game.player, { x: 500, y: data.groundHeightAt(500) });
    assert.equal(game.getSnapshot().skillCooldownMax, 8);
    tap(game, 'KeyL'); step(game, game.player.attack.def.startup - 2);
    assert.equal(game.summons.entities.length, 0, 'nothing appears during anticipation');
    step(game); assert.equal(game.summons.entities.length, id === 'zhongli' ? 1 : 3);
    assert.equal(game.player.secondaryCooldown, 0);
    for (const entity of game.summons.entities) assert.ok(Math.abs(entity.feetY - data.groundHeightAt(entity.x)) < (entity.kind === 'geo-pillar' ? .001 : 2), 'column is exact and pets interpolate along the slope');
    const initialIds = game.summons.entities.map(entity => entity.id).join(',');
    step(game, 50); assert.equal(game.summons.entities.map(entity => entity.id).join(','), initialIds);
    game.player.attack = null; game.player.skillCooldown = 0;
    const platform = data.SURVIVAL_WORLD.platforms[4];
    Object.assign(game.player, { x: platform.x + 150, y: platform.y, onGround: true });
    tap(game, 'KeyL'); step(game, game.player.attack.def.startup);
    for (const entity of game.summons.entities) assert.equal(entity.feetY, platform.y, 'summons use the occupied soft platform');
  }
});

test('summoner entities stop for pause upgrades hitstop and clear on defeat restart and expiry', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = makeGame(CHARACTERS.findIndex(char => char.id === id));
    tap(game, 'KeyL'); step(game, game.player.attack.def.startup);
    const frozen = JSON.stringify(game.summons.entities);
    game.pause(); step(game, 90); assert.equal(JSON.stringify(game.summons.entities), frozen); game.resume();
    game.phase = 'upgrade'; step(game, 90); assert.equal(JSON.stringify(game.summons.entities), frozen); game.phase = 'playing';
    game.hitstop = 4; step(game, 4); assert.equal(JSON.stringify(game.summons.entities), frozen);
    game.player.invuln = 0; game.hurtPlayer(100000); assert.equal(game.phase, 'defeat'); assert.equal(game.summons.entities.length, 0);
    game.rematch(); assert.equal(game.summons.entities.length, 0); assert.equal(game.getSnapshot().shieldHp, 0); assert.equal(game.getSnapshot().buffRemaining, 0);
    game.spawnTimer = 100000; game.player.invuln = 100000;
    tap(game, 'KeyL'); step(game, 900); assert.equal(game.summons.entities.length, 0, 'held or expired cooldown cannot recast');
  }
});

test('summoner four evolution routes alter actual columns shielding range or crab splash and support level five', () => {
  for (const id of ['zhongli', 'furina']) {
    const index = CHARACTERS.findIndex(char => char.id === id);
    const choices = getUpgradeChoices({ ...makeInitialProgress(id), skillLevel: 4 });
    assert.equal(choices.length, 2); assert.ok(choices.every(choice => !choice.id.startsWith('xiao')));
    for (const choice of choices) {
      const game = makeGame(index); setBranch(game, choice.id);
      enemy(game, 80); tap(game, 'KeyL'); step(game, game.player.attack.def.startup);
      assert.ok(game.summons.entities.every(entity => entity.tuning.branch === choice.id));
      if (choice.id === 'geo-twin') assert.equal(game.summons.entities.length, 2);
      if (choice.id === 'geo-shield') {
        assert.ok(game.getSnapshot().shieldHp > 35);
        let selfPulse = false;
        for (let tick = 0; tick < 90; tick++) { step(game); selfPulse ||= game.summons.effects.some(effect => effect.kind === 'geo-pulse' && effect.x === game.player.x); }
        assert.ok(selfPulse);
      }
      if (choice.id === 'hydro-ranged') {
        game.enemies[0].x = game.player.x + 370;
        let longProjectile = false;
        for (let tick = 0; tick < 140; tick++) { step(game); longProjectile ||= game.summons.effects.some(effect => ['bubble', 'water-pierce'].includes(effect.kind) && effect.maxLife === 76); }
        assert.ok(longProjectile, 'ranged route really extends projectile travel');
      }
      if (choice.id === 'hydro-crab') {
        let wide = false;
        for (let tick = 0; tick < 180; tick++) { step(game); wide ||= game.summons.effects.some(effect => effect.kind === 'crab-splash' && effect.radius >= 129); }
        assert.ok(wide, 'crab branch really expands splash');
      }
      let progress = { ...game.progress };
      progress = applyChoice(progress, 'core', getUpgradeChoices(progress)); assert.equal(progress.skillLevel, 5);
      for (let level = 2; level <= 5; level++) { progress = applyChoice(progress, 'secondary', getUpgradeChoices(progress)); assert.equal(progress.secondaryLevel, level); }
      assert.ok(getUpgradeChoices(progress).every(card => card.id !== 'core' && card.id !== 'secondary'));
    }
  }
});

test('summoner upgrades update existing formations and shields immediately without extending their lifetime', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = makeGame(CHARACTERS.findIndex(char => char.id === id));
    tap(game, 'KeyL'); step(game, 120);
    const entity = game.summons.entities[0], age = entity.age, life = entity.life, cooldown = entity.cooldown;
    const shieldLife = game.summons.getShield(0)?.life;
    game.phase = 'upgrade'; game.choices = getUpgradeChoices(game.progress); assert.ok(game.chooseUpgrade('core'));
    assert.equal(entity.tuning.mainLevel, 2); assert.equal(entity.age, age); assert.equal(entity.life, life); assert.equal(entity.cooldown, cooldown);
    if (id === 'zhongli') { assert.equal(game.getSnapshot().shieldHp, 25); assert.equal(game.summons.getShield(0).life, shieldLife); }
    game.progress.skillLevel = 4; game.phase = 'upgrade'; game.choices = getUpgradeChoices(game.progress);
    assert.ok(game.chooseUpgrade(id === 'zhongli' ? 'geo-twin' : 'hydro-crab'));
    assert.ok(game.summons.entities.every(summon => summon.tuning.branch === (id === 'zhongli' ? 'geo-twin' : 'hydro-crab')));
    assert.ok(game.summons.entities.every(summon => summon.life === life));
    if (id === 'zhongli') assert.equal(game.summons.entities.length, 2);
  }
});

test('summoner persistent hits award kills damage and experience through the real survival pipeline', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = makeGame(CHARACTERS.findIndex(char => char.id === id));
    tap(game, 'KeyL'); step(game, 100); // initial manual shock has already finished
    const target = enemy(game, 120, { hp: 1, xp: 13 });
    const before = game.damageDealt;
    step(game, 250);
    assert.ok(target.hp <= 0); assert.equal(game.kills, 1); assert.ok(game.damageDealt > before);
    assert.ok(game.orbs.some(orb => !orb.heal && orb.value === 13) || game.xp >= 13 || game.level > 1, 'summon kill creates collectible XP');
  }
});

test('summoner I works without L and meteor control is bounded for elites and absent on bosses', () => {
  const furina = makeGame(CHARACTERS.findIndex(char => char.id === 'furina'));
  enemy(furina, 80); const initial = furina.attackDamage('jab');
  tap(furina, 'KeyI'); step(furina, furina.player.attack.def.startup);
  assert.equal(furina.summons.entities.length, 0); assert.ok(furina.damageDealt > 0);
  assert.ok(furina.attackDamage('jab') > initial); assert.ok(furina.getSnapshot().buffRemaining > 6);
  const geo = makeGame(CHARACTERS.findIndex(char => char.id === 'zhongli'));
  const normal = enemy(geo, 130), elite = enemy(geo, 150, { elite: true }), boss = enemy(geo, 170, { boss: true });
  tap(geo, 'KeyI'); step(geo, geo.player.attack.def.startup);
  assert.ok(normal.petrify > elite.petrify); assert.ok(elite.petrify > 0 && elite.petrify <= 36); assert.ok(!boss.petrify);
  step(geo, 160); assert.equal(normal.petrify, 0); assert.equal(elite.petrify, 0);
});

test('summoner projectiles stop on swept solid slopes but can hit over terrain and cross one-way platforms', () => {
  for (const kind of ['bubble', 'water-pierce']) {
    const game = makeGame(CHARACTERS.findIndex(char => char.id === 'furina'));
    const context = game.summonContext();
    assert.equal(context.projectileBlocked(2700, 840, 3200, 840), true, 'line crosses the raised solid terrace');
    assert.equal(context.projectileBlocked(2700, 650, 3200, 650), false, 'the same line passes above the terrace');
    const platform = data.SURVIVAL_WORLD.platforms[4];
    assert.equal(context.projectileBlocked(platform.x + 30, platform.y - 40, platform.x + 30, platform.y + 40), false, 'soft platforms are one-way for fighters, not walls for water');
    const target = enemy(game, 850, { x: 3150, y: 860 });
    game.summons.effect(context.owners[0], kind, 2700, 840, 17, 34, 20, 55, {}, 500, 0);
    game.updateSummons(); assert.equal(target.hp, 10000); assert.equal(game.summons.effects.length, 0, 'blocked projectile cannot deal through-ground damage');
    target.y = 680;
    game.summons.effect(context.owners[0], kind, 2700, 650, 17, 34, 20, 55, {}, 500, 0);
    game.updateSummons(); assert.ok(target.hp < 10000, 'swept target is hittable in open air');
  }
});

test('summoner shield absorbs damage while preserving manual attack and jump with only hitstop', () => {
  const game = makeGame(CHARACTERS.findIndex(char => char.id === 'zhongli'));
  tap(game, 'KeyL'); step(game, 100); tap(game, 'KeyW'); tap(game, 'KeyJ');
  const { attack, y, vy, facing, jumps, hp } = game.player, shield = game.getSnapshot().shieldHp;
  game.player.invuln = 0; game.hurtPlayer(7);
  assert.equal(game.player.hp, hp); assert.equal(game.getSnapshot().shieldHp, shield - 7);
  assert.equal(game.player.attack, attack); assert.equal(game.player.y, y); assert.equal(game.player.vy, vy);
  assert.equal(game.player.facing, facing); assert.equal(game.player.jumps, jumps); assert.equal(game.hitstop, 4);
});

test('sword release keeps survival upgrade counts, damage and hitboxes while deriving render origins from the blade', () => {
  const { projectileVisualPosition } = loadModule(path.join(root, 'src/game/cast-visual.ts').replaceAll('\\', '/'));
  const physical = shots => plain(shots.map(({ castVisual, ...shot }) => shot));
  for (const id of ['eula', 'diluc', 'xiao']) for (const level of [1, 5]) for (const facing of [-1, 1]) {
    const game = makeGame(CHARACTERS.findIndex(c => c.id === id)); game.progress.secondaryLevel = level;
    game.player.facing = facing; game.player.y -= 200; game.enemies = [];
    swordTipFixture = false; game.releaseSecondary(); const original = physical(game.shots);
    if (id === 'eula') assert.ok(game.effects.some(e => e.kind === 'secondary'), 'fallback retains the old frost release');
    for (let i = 0; i < 20; i++) game.updateShots(); const advanced = physical(game.shots); game.shots = []; game.effects = [];
    swordTipFixture = true; game.releaseSecondary(); assert.deepEqual(physical(game.shots), original);
    if (id === 'eula') assert.equal(game.effects.length, 0, 'registered cast replaces the old fixed-position cloud');
    for (const shot of game.shots) {
      if (id === 'xiao') assert.equal(shot.castVisual, undefined);
      else assert.deepEqual(plain(projectileVisualPosition(shot)), { x: game.player.x + facing * 97, y: game.player.y - 120 });
    }
    for (let i = 0; i < 20; i++) game.updateShots(); assert.deepEqual(physical(game.shots), advanced);
    for (const shot of game.shots) assert.deepEqual(plain(projectileVisualPosition(shot)), { x: shot.x, y: shot.y });
  }
  swordTipFixture = false;
});

// Tactical cases share the actual input, physics and combat pipeline above.
function tacticalGame(player = 0, clearEnemies = false, mapId) {
  const game = makeGame(player, 'tactical', mapId);
  if (clearEnemies) game.enemies = [];
  return game;
}
function tacticalTarget(role) {
  const game = tacticalGame();
  const target = game.enemies.find(foe => foe.role === role);
  assert.ok(target, `the opening formation contains ${role}`);
  game.enemies = [target];
  target.hp = target.maxHp = 10000;
  return { game, target };
}

test('tactical starts seven fixed builds without modifying the ten-minute survival world', () => {
  const originalWorld = plain(data.SURVIVAL_WORLD);
  for (let index = 0; index < CHARACTERS.length; index++) {
    const tactical = tacticalGame(index), snapshot = tactical.getSnapshot();
    assert.equal(snapshot.variant, 'tactical'); assert.equal(snapshot.duration, 90); assert.equal(snapshot.remaining, 90);
    assert.equal(snapshot.skillLevel, 3); assert.equal(snapshot.secondaryLevel, 3);
    assert.equal(snapshot.branch, null); assert.equal(snapshot.rerollsRemaining, 0);
    assert.deepEqual(plain(tactical.progress.upgrades), {});
    assert.ok(snapshot.worldWidth < data.SURVIVAL_WORLD.width);
    tactical.xp = 100000; tactical.checkLevelUp();
    assert.equal(tactical.phase, 'playing'); assert.equal(tactical.choices.length, 0); assert.equal(tactical.level, 1);
    const ordinary = makeGame(index);
    assert.equal(ordinary.duration, 600); assert.equal(ordinary.world, data.SURVIVAL_WORLD);
    assert.equal(ordinary.progress.skillLevel, 1); assert.equal(ordinary.progress.secondaryLevel, 1);
    assert.equal(ordinary.groundHeightAt(790), data.groundHeightAt(790));
    assert.notEqual(ordinary.groundHeightAt(790), tactical.groundHeightAt(790));
  }
  assert.deepEqual(plain(data.SURVIVAL_WORLD), originalWorld);
});

test('tactical survives exactly ninety active seconds and rematch preserves mode while clearing results', () => {
  const game = tacticalGame(4);
  step(game, 5399);
  assert.equal(game.phase, 'playing'); assert.ok(game.getSnapshot().remaining > 0);
  step(game); assert.equal(game.phase, 'victory'); assert.equal(game.elapsed, 90);
  assert.equal(game.getSnapshot().remaining, 0);
  game.tacticalStats.windRides = 3; game.tacticalStats.guardsBroken = 2; game.damageDealt = 150;
  game.rematch();
  assert.equal(game.variant, 'tactical'); assert.equal(game.selectedPlayer, 4);
  assert.equal(game.getSnapshot().remaining, 90); assert.equal(game.phase, 'playing');
  assert.equal(game.damageDealt, 0); assert.equal(game.kills, 0);
  assert.ok(Object.values(game.tacticalStats).every(count => count === 0));
  game.player.invuln = 0; game.hurtPlayer(100000);
  assert.equal(game.phase, 'defeat'); const elapsed = game.elapsed; step(game, 60); assert.equal(game.elapsed, elapsed);
  game.rematch(); assert.equal(game.variant, 'tactical'); assert.equal(game.player.hp, 100);
  game.start({ player: 0 }); assert.equal(game.variant, 'survival'); assert.equal(game.duration, 600);
});

test('tactical formations arrive at zero thirty and sixty seconds only once', () => {
  const game = tacticalGame();
  Object.assign(game.player, { x: 38, y: game.groundHeightAt(38) });
  const observed = new Map(game.enemies.map(foe => [foe.id, foe.role]));
  const groupCounts = [];
  for (let frame = 1; frame < 5400; frame++) {
    // Clear completed enemies between waves, so occupied outposts can accept the next formation.
    if (frame === 1799 || frame === 3599) game.enemies = [];
    step(game);
    for (const foe of game.enemies) observed.set(foe.id, foe.role);
    if (frame === 1798 || frame === 3598 || frame === 5399) groupCounts.push(observed.size);
  }
  assert.deepEqual(groupCounts, [3, 7, 12]);
  assert.equal(game.encounterIndex, 2); assert.equal(game.nextId, 13);
  assert.equal(game.enemies.some(foe => !foe.role || foe.elite || foe.boss), false);
});

test('tactical occupied spawn positions wait at their authored location instead of moving onto players', () => {
  const game = tacticalGame(), nextSpawn = data.TACTICAL_ENCOUNTERS[1].enemies[0];
  game.enemies = [];
  Object.assign(game.player, { x: nextSpawn.x, y: nextSpawn.y, onGround: true });
  game.frame = 1799; step(game);
  assert.equal(game.encounterIndex, 1);
  assert.equal(game.enemies.some(foe => foe.homeX === nextSpawn.x && foe.y === nextSpawn.y), false);
  key(game, 'KeyD'); step(game, 45); release(game, 'KeyD');
  const spawned = game.enemies.find(foe => foe.homeX === nextSpawn.x);
  assert.ok(spawned); assert.equal(spawned.x, nextSpawn.x); assert.equal(spawned.y, nextSpawn.y);
  assert.equal(spawned.state, 'arriving');
});

test('tactical pause freezes encounter time enemies and movement statistics', () => {
  const game = tacticalGame(); step(game, 90); game.pause();
  const before = JSON.stringify({ snapshot: game.getSnapshot(), enemies: game.enemies, player: game.player });
  step(game, 3600);
  assert.equal(JSON.stringify({ snapshot: game.getSnapshot(), enemies: game.enemies, player: game.player }), before);
  game.resume(); step(game); assert.equal(game.frame, 91);
});

test('tactical wind carries all seven characters above the upper platform with a single counted ride', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = tacticalGame(index, true);
    Object.assign(game.player, { x: data.TACTICAL_WIND.x, y: data.TACTICAL_WIND.bottom });
    step(game, 70);
    assert.ok(game.player.y < 500, `${game.char.id} reaches the upper fighting lane`);
    assert.equal(game.tacticalStats.windRides, 1); assert.ok(game.tacticalStats.layerChanges >= 1);
    key(game, 'KeyD'); step(game, 25); release(game, 'KeyD'); step(game, 60);
    assert.equal(game.player.y, 500); assert.equal(game.player.onGround, true);
    assert.equal(game.tacticalStats.windRides, 1);
  }
});

test('tactical east slope is walkable to the high lane by every character without jumping', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = tacticalGame(index, true);
    Object.assign(game.player, { x: 1150, y: game.groundHeightAt(1150), onGround: true });
    key(game, 'KeyD'); step(game, 330); release(game, 'KeyD');
    assert.ok(game.player.x >= 2000, game.char.id); assert.equal(game.player.y, 500);
    assert.equal(game.player.onGround, true); assert.equal(game.player.jumps, 2);
    assert.equal(game.tacticalStats.windRides, 0);
  }
});

test('tactical down input crosses both soft platforms and suppresses the wind until released', () => {
  const game = tacticalGame(0, true);
  Object.assign(game.player, { x: data.TACTICAL_WIND.x, y: 500, onGround: true });
  key(game, 'KeyS'); step(game, 35);
  assert.equal(game.player.y, 700); assert.equal(game.player.onGround, true);
  release(game, 'KeyS'); key(game, 'KeyS'); step(game, 35);
  assert.equal(game.player.y, 900); assert.equal(game.player.onGround, true);
  assert.equal(game.tacticalStats.windRides, 0);
  release(game, 'KeyS'); step(game); assert.ok(game.player.vy < 0); assert.equal(game.tacticalStats.windRides, 1);
});

test('tactical Xiao plunge crosses the wind without interruption and lands on the first platform', () => {
  const game = tacticalGame(4, true);
  airborne(game, data.TACTICAL_WIND.x, 410); key(game, 'KeyS'); tap(game, 'KeyL');
  let observedDive = false;
  for (let frame = 0; frame < 90 && !game.player.onGround; frame++) {
    step(game); observedDive ||= game.player.attack?.plunge?.phase === 'dive' && game.player.vy >= 25;
  }
  assert.ok(observedDive); assert.equal(game.player.y, 500);
  assert.equal(game.player.attack.plunge.phase, 'impact'); assert.equal(game.tacticalStats.windRides, 0);
  release(game, 'KeyS'); step(game, 5); assert.equal(game.player.y, 500);
});

test('tactical guards reduce frontal jabs allow back and recovery hits and break to actual heavy attacks', () => {
  const losses = {};
  for (const scenario of ['front', 'back', 'recovery', 'heavy']) {
    const { game, target } = tacticalTarget('guard');
    Object.assign(target, { state: scenario === 'recovery' ? 'recover' : 'windup', stateTimer: 200, facing: -1 });
    Object.assign(game.player, { x: target.x + (scenario === 'back' ? 65 : -65), y: target.y, facing: scenario === 'back' ? -1 : 1, onGround: true });
    tap(game, scenario === 'heavy' ? 'KeyK' : 'KeyJ'); step(game, 35);
    losses[scenario] = 10000 - target.hp;
    assert.ok(losses[scenario] > 0, scenario);
    if (scenario === 'heavy') { assert.equal(target.state, 'recover'); assert.equal(game.tacticalStats.guardsBroken, 1); }
  }
  assert.ok(losses.front < losses.back); assert.equal(losses.back, losses.recovery);
  assert.ok(Math.abs(losses.front / losses.back - .35) < .0001);
});

test('tactical charger locks its tell direction then recovers after the player jumps over its path', () => {
  const { game, target } = tacticalTarget('charger');
  Object.assign(game.player, { x: target.x - 240, y: target.y, onGround: true, invuln: 0 });
  Object.assign(target, { state: 'ready', cooldown: 0 }); step(game);
  assert.equal(target.state, 'windup'); const facing = target.facing, x = target.x;
  step(game, 55); assert.equal(target.x, x); assert.equal(target.facing, facing);
  tap(game, 'KeyW'); step(game, 4); assert.equal(target.state, 'active');
  const hp = game.player.hp;
  step(game, 38);
  assert.equal(game.player.hp, hp); assert.equal(target.state, 'recover');
  assert.equal(game.tacticalStats.chargesEvaded, 1); assert.ok(target.x < x - 250);
  const recoveryX = target.x; step(game, 30); assert.equal(target.x, recoveryX);

  const second = tacticalTarget('charger');
  Object.assign(second.game.player, { x: second.target.x - 180, y: second.target.y, onGround: true });
  Object.assign(second.target, { state: 'ready', cooldown: 0 }); step(second.game);
  const lockedFacing = second.target.facing;
  key(second.game, 'KeyD'); step(second.game, 60); release(second.game, 'KeyD');
  assert.ok(second.game.player.x > second.target.x, 'the player crossed the locked direction during the warning');
  assert.equal(second.target.facing, lockedFacing); assert.equal(second.target.state, 'active');
});

test('tactical sniper shoots the old aimed position and remains on its authored platform', () => {
  const { game, target } = tacticalTarget('sniper');
  Object.assign(game.player, { x: 650, y: 500, onGround: true });
  Object.assign(target, { state: 'ready', cooldown: 0 }); step(game);
  assert.equal(target.state, 'windup'); const aim = { x: target.aimX, y: target.aimY }, origin = { x: target.x, y: target.y };
  key(game, 'KeyD'); step(game, 22); release(game, 'KeyD');
  assert.ok(Math.abs(game.player.x - aim.x) > 80); assert.equal(target.aimX, aim.x); assert.equal(target.aimY, aim.y);
  step(game, 50);
  const shot = game.shots.find(shot => shot.owner === 'enemy'); assert.ok(shot);
  const aimedAngle = Math.atan2(aim.y - (origin.y - target.radius), aim.x - origin.x);
  assert.ok(Math.abs(Math.atan2(shot.vy, shot.vx) - aimedAngle) < .0001);
  assert.equal(target.x, origin.x); assert.equal(target.y, origin.y); assert.equal(target.state, 'recover');
});

test('tactical manual damage interrupts sniper warning and cancels its pending shot', () => {
  const { game, target } = tacticalTarget('sniper');
  Object.assign(game.player, { x: target.x - 65, y: target.y, onGround: true, facing: 1 });
  Object.assign(target, { state: 'ready', cooldown: 0 }); step(game);
  assert.equal(target.state, 'windup'); tap(game, 'KeyJ'); step(game, 20);
  assert.ok(target.hp < 10000); assert.equal(target.state, 'recover'); assert.equal(target.tell, 0);
  step(game, 55); assert.equal(game.shots.filter(shot => shot.owner === 'enemy').length, 0);
  assert.equal(target.y, 500); assert.equal(target.x, target.homeX);
});

test('tactical all seven characters retain manual J K L I attacks against enemies on the new upper platform', () => {
  for (let index = 0; index < CHARACTERS.length; index++) for (const code of ['KeyJ', 'KeyK', 'KeyL', 'KeyI']) {
    const game = tacticalGame(index, true);
    Object.assign(game.player, { x: 610, y: 500, onGround: true });
    if (game.char.id === 'xiao' && code === 'KeyL') airborne(game, 610, 410);
    enemy(game, 65, { y: 500 });
    tap(game, code); step(game, 160);
    assert.ok(game.damageDealt > 0, `${game.char.id} ${code}`);
    assert.equal(game.phase, 'playing'); assert.equal(game.player.attack, null);
  }
});

test('tactical summons use the active map for platform placement solid terrain and projectile bounds', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = tacticalGame(CHARACTERS.findIndex(character => character.id === id), true);
    Object.assign(game.player, { x: 610, y: 500, onGround: true });
    tap(game, 'KeyL'); step(game, game.player.attack.def.startup);
    assert.ok(game.summons.entities.length > 0);
    for (const summon of game.summons.entities) assert.equal(summon.feetY, 500, id);
    const context = game.summonContext();
    assert.equal(context.surfaceAt(2100, 400), 500);
    assert.equal(context.surfaceAt(2300, 400), null);
    assert.equal(context.projectileBlocked(1100, 800, 1750, 800), true, 'east slope blocks the sweep');
    assert.equal(context.projectileBlocked(1100, 400, 1750, 400), false, 'clear air above the slope');
    assert.equal(context.projectileBlocked(610, 450, 610, 550), false, 'soft upper platforms allow projectiles');
  }
});

test('tactical pressure permits at most two warnings or active attacks while every role gets a turn', () => {
  const game = tacticalGame();
  Object.assign(game.player, { x: 650, y: 900, onGround: true });
  for (const foe of game.enemies) Object.assign(foe, {
    x: foe.role === 'guard' ? 570 : foe.role === 'charger' ? 840 : 1010,
    y: 900, state: 'ready', cooldown: 0,
  });
  const acted = new Set(); let maximum = 0;
  for (let tick = 0; tick < 240; tick++) {
    step(game);
    const busy = game.enemies.filter(foe => foe.state === 'windup' || foe.state === 'active');
    maximum = Math.max(maximum, busy.length);
    assert.ok(busy.length <= 2, `pressure exceeded its limit at tick ${tick}`);
    busy.forEach(foe => acted.add(foe.role));
  }
  assert.equal(maximum, 2); assert.deepEqual([...acted].sort(), ['charger', 'guard', 'sniper']);
});

test('tactical Zhongli meteor freezes an enemy action timer and resumes its warning after petrification', () => {
  const game = tacticalGame(CHARACTERS.findIndex(character => character.id === 'zhongli'));
  const target = game.enemies.find(foe => foe.role === 'guard'); game.enemies = [target];
  Object.assign(target, { x: 700, y: 500, hp: 10000, state: 'windup', stateTimer: 200, tell: 200 });
  Object.assign(game.player, { x: 610, y: 500, onGround: true, facing: 1 });
  tap(game, 'KeyI');
  for (let tick = 0; tick < 70 && !target.petrify; tick++) step(game);
  assert.ok(target.petrify > 0 && target.hp < 10000);
  const timer = target.stateTimer, position = { x: target.x, y: target.y }, frozenTicks = target.petrify;
  step(game, frozenTicks);
  assert.equal(target.petrify, 0); assert.equal(target.stateTimer, timer);
  assert.deepEqual({ x: target.x, y: target.y }, position);
  step(game); assert.equal(target.stateTimer, timer - 1); assert.equal(target.state, 'windup');
});

test('tactical a persistent summoned pillar actually damages and interrupts a sniper warning', () => {
  const game = tacticalGame(CHARACTERS.findIndex(character => character.id === 'zhongli'));
  const target = game.enemies.find(foe => foe.role === 'sniper'); game.enemies = [];
  Object.assign(game.player, { x: 610, y: 500, onGround: true, facing: 1 });
  tap(game, 'KeyL'); step(game, 100); assert.equal(game.player.attack, null);
  assert.equal(game.summons.entities.length, 1);
  Object.assign(target, { x: 730, homeX: 730, y: 500, hp: 10000, state: 'windup', stateTimer: 200, tell: 200 });
  game.enemies = [target]; const damage = game.damageDealt;
  for (let tick = 0; tick < 150 && target.hp === 10000; tick++) step(game);
  assert.ok(target.hp < 10000 && game.damageDealt > damage);
  assert.equal(target.state, 'recover'); assert.equal(target.tell, 0);
  assert.equal(game.shots.filter(shot => shot.owner === 'enemy').length, 0);
});

for (const role of ['guard', 'charger', 'sniper']) test(`tactical Jean updraft moves ${role} once per tick in each action state and lands again`, () => {
  for (const state of role === 'sniper' ? ['ready', 'windup', 'recover'] : ['ready', 'windup', 'active', 'recover']) {
    const game = tacticalGame(CHARACTERS.findIndex(character => character.id === 'jean'));
    const target = game.enemies.find(foe => foe.role === role); game.enemies = [target];
    Object.assign(target, { x: 600, homeX: 600, y: 700, hp: 10000, maxHp: 10000, state: 'recover', stateTimer: 200 });
    Object.assign(game.player, { x: 515, y: 700, onGround: true, facing: 1 });
    tap(game, 'KeyI');
    for (let tick = 0; tick < 40 && target.vy >= 0; tick++) step(game);
    assert.ok(target.hp < 10000 && target.vy < 0, `${role} is launched by the actual I field`);
    // Continue the same launched enemy in each legal state to catch omitted or double physics.
    Object.assign(target, { state, stateTimer: 200, cooldown: 1000, facing: -1 });
    const before = { y: target.y, vy: target.vy };
    step(game);
    assert.equal(target.vy, before.vy + .5, `${role}/${state} applies gravity exactly once`);
    assert.equal(target.y, before.y + target.vy, `${role}/${state} really moves upward`);
    assert.equal(target.grounded, false);
    step(game, 100);
    assert.equal(target.grounded, true, `${role}/${state} returns to a support surface`);
    assert.equal(target.vy, 0);
    assert.ok(target.y === game.groundHeightAt(target.x) || game.world.platforms.some(platform => target.x >= platform.x - 16 && target.x <= platform.x + platform.w + 16 && target.y === platform.y));
  }
});

test('tactical map selection safely defaults unknown IDs and never changes ordinary survival', () => {
  for (const mapId of [undefined, '', 'missing-arena', 'constructor', '__proto__', 'toString']) {
    const game = tacticalGame(0, false, mapId);
    assert.equal(data.getTacticalMap(mapId).id, 'wind-ruins');
    assert.equal(game.getSnapshot().mapId, 'wind-ruins');
    assert.equal(game.world, data.TACTICAL_WORLD);
    assert.equal(game.tacticalMap.wind, data.TACTICAL_WIND);
    assert.equal(game.tacticalMap.encounters, data.TACTICAL_ENCOUNTERS);
    assert.ok(game.enemies.some(foe => foe.role === 'sniper' && foe.y === 500));
  }
  const ordinary = makeGame(0, 'survival', 'broken-bridge');
  assert.equal(ordinary.world, data.SURVIVAL_WORLD);
  assert.equal(ordinary.getSnapshot().remaining, 600);
  assert.equal(ordinary.player.x, data.SURVIVAL_WORLD.width / 2);
  assert.equal(ordinary.enemies.length, 0);
  assert.equal(ordinary.getSnapshot().skillLevel, 1);
});

test('tactical broken-bridge alternating starts and rematches preserve only the selected arena', () => {
  const game = tacticalGame(5, false, 'broken-bridge');
  for (const mapId of ['broken-bridge', 'wind-ruins', 'broken-bridge']) {
    game.start({ player: 5, variant: 'tactical', mapId });
    const arena = data.getTacticalMap(mapId);
    assert.equal(game.world, arena.world); assert.equal(game.getSnapshot().mapName, arena.name);
    assert.equal(game.player.x, arena.spawnX); assert.equal(game.player.y, game.groundHeightAt(arena.spawnX));
    tap(game, 'KeyL'); step(game, 60); assert.ok(game.summons.entities.length > 0);
    game.tacticalStats.windRides = 2; game.tacticalStats.layerChanges = 3;
    game.damageDealt = 200; game.pendingSpawns.push({ role: 'guard', x: 2000, y: 500 });
    game.rematch();
    assert.equal(game.getSnapshot().mapId, mapId); assert.equal(game.selectedPlayer, 5);
    assert.equal(game.frame, 0); assert.equal(game.damageDealt, 0);
    assert.equal(game.summons.entities.length, 0); assert.equal(game.pendingSpawns.length, 0);
    assert.equal(game.enemies.length, 3); assert.equal(game.shots.length, 0);
    assert.ok(Object.values(game.tacticalStats).every(count => count === 0));
  }
  game.start({ player: 0 });
  assert.equal(game.world, data.SURVIVAL_WORLD); assert.equal(game.duration, 600);
  assert.equal(game.enemies.length, 0); assert.equal(game.summons.entities.length, 0);
});

test('tactical broken-bridge has no inherited lift at the original wind shaft', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = tacticalGame(index, true, 'broken-bridge');
    Object.assign(game.player, { x: data.TACTICAL_WIND.x, y: 900, onGround: true });
    step(game, 80);
    assert.equal(game.player.y, 900, game.char.id); assert.equal(game.player.vy, 0);
    assert.equal(game.tacticalStats.windRides, 0);
    tap(game, 'KeyW'); step(game, 100);
    assert.equal(game.player.y, 900); assert.equal(game.tacticalStats.windRides, 0);
  }
});

for (const mapId of ['broken-bridge', 'mechanism-hall']) test(`tactical ${mapId} formations spawn on real surfaces once at each encounter boundary`, () => {
  const game = tacticalGame(0, false, mapId);
  Object.assign(game.player, { x: 38, y: game.groundHeightAt(38) });
  const observed = new Set(); const counts = [];
  function inspectNewFoes() {
    for (const foe of game.enemies) if (!observed.has(foe.id)) {
      observed.add(foe.id);
      assert.ok(foe.role && !foe.elite && !foe.boss);
      assert.ok(foe.y === game.groundHeightAt(foe.x) || game.world.platforms.some(platform =>
        foe.x >= platform.x && foe.x <= platform.x + platform.w && foe.y === platform.y),
      `${foe.role} at ${foe.x},${foe.y} starts on a support surface`);
    }
  }
  inspectNewFoes();
  for (let frame = 1; frame < 5400; frame++) {
    if (frame === 1799 || frame === 3599) game.enemies = [];
    step(game); inspectNewFoes();
    if (frame === 1798 || frame === 3598 || frame === 5399) counts.push(observed.size);
  }
  assert.deepEqual(counts, [3, 7, 12]); assert.equal(game.nextId, 13);
  assert.equal(game.encounterIndex, 2); assert.equal(game.pendingSpawns.length, 0);
  assert.equal(game.getSnapshot().encounterName, game.tacticalMap.encounters[2].name);
});

test('tactical broken-bridge all seven characters cross the gap in both directions with two jumps', () => {
  for (let index = 0; index < CHARACTERS.length; index++) for (const direction of [-1, 1]) {
    const game = tacticalGame(index, true, 'broken-bridge');
    Object.assign(game.player, { x: direction === 1 ? 980 : 1220, y: 580, onGround: true });
    const code = direction === 1 ? 'KeyD' : 'KeyA';
    key(game, code); tap(game, 'KeyW'); step(game, 17); tap(game, 'KeyW');
    for (let tick = 0; tick < 100 && (direction === 1 ? game.player.x < 1220 : game.player.x > 980); tick++) step(game);
    release(game, code); step(game, 100);
    assert.ok(direction === 1 ? game.player.x >= 1220 : game.player.x <= 980, `${game.char.id}/${direction} crosses`);
    assert.equal(game.player.y, 580, `${game.char.id}/${direction} lands on the opposite bridge`);
    assert.equal(game.player.onGround, true); assert.equal(game.player.jumps, 2);
  }
});

test('tactical broken-bridge all seven characters can return from the valley via the central ledge', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = tacticalGame(index, true, 'broken-bridge');
    Object.assign(game.player, { x: 1100, y: 900, onGround: true });
    tap(game, 'KeyW'); step(game, 17); tap(game, 'KeyW'); step(game, 100);
    assert.equal(game.player.y, 740, `${game.char.id} reaches the middle ledge`);
    assert.equal(game.player.onGround, true); assert.equal(game.player.jumps, 2);
    key(game, 'KeyD'); tap(game, 'KeyW'); step(game, 17); tap(game, 'KeyW');
    for (let tick = 0; tick < 100 && game.player.x < 1250; tick++) step(game);
    release(game, 'KeyD'); step(game, 100);
    assert.equal(game.player.y, 580, `${game.char.id} returns from the middle ledge to the bridge`);
    assert.equal(game.player.onGround, true); assert.equal(game.tacticalStats.windRides, 0);
  }
});

test('tactical broken-bridge both valley ramps and flush shore-to-bridge seams are walkable by all seven characters', () => {
  for (let index = 0; index < CHARACTERS.length; index++) for (const direction of [-1, 1]) {
    const game = tacticalGame(index, true, 'broken-bridge');
    Object.assign(game.player, { x: 1100, y: 900, onGround: true });
    const away = direction === 1 ? 'KeyD' : 'KeyA', back = direction === 1 ? 'KeyA' : 'KeyD';
    key(game, away); step(game, 300); release(game, away);
    assert.equal(game.player.y, 580, `${game.char.id}/${direction} walks out of the valley`);
    assert.equal(game.player.onGround, true);
    key(game, back);
    for (let tick = 0; tick < 160 && (direction === 1 ? game.player.x > 1600 : game.player.x < 600); tick++) {
      step(game);
      assert.equal(game.player.y, 580, `${game.char.id}/${direction} stays level across the bridge seam`);
      assert.equal(game.player.onGround, true);
    }
    release(game, back);
    assert.ok(direction === 1 ? game.player.x <= 1600 : game.player.x >= 600);
    assert.equal(game.tacticalStats.windRides, 0);
  }
});

test('tactical broken-bridge down input and walking off the bridge both leave the upper route', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const drop = tacticalGame(index, true, 'broken-bridge');
    Object.assign(drop.player, { x: 850, y: 580, onGround: true });
    key(drop, 'KeyS'); step(drop, 80); release(drop, 'KeyS');
    assert.equal(drop.player.y, 900, `${drop.char.id} deliberately drops to the valley`);
    assert.equal(drop.player.onGround, true); assert.equal(drop.player.hp, 100);
    const gap = tacticalGame(index, true, 'broken-bridge');
    Object.assign(gap.player, { x: 980, y: 580, onGround: true });
    key(gap, 'KeyD');
    for (let tick = 0; tick < 80 && gap.player.x < 1100; tick++) step(gap);
    release(gap, 'KeyD'); step(gap, 100);
    assert.equal(gap.player.y, 740, `${gap.char.id} naturally falls onto the central safety ledge`);
    assert.equal(gap.player.onGround, true); assert.equal(gap.player.hp, 100);
  }
});

test('tactical broken-bridge fast ground skills keep their footing when crossing a shore seam', () => {
  for (const [id, code] of [['diluc', 'KeyL'], ['xiao', 'KeyI']]) for (const direction of [-1, 1]) {
    const game = tacticalGame(CHARACTERS.findIndex(character => character.id === id), true, 'broken-bridge');
    Object.assign(game.player, { x: direction === 1 ? 290 : 1910, y: 580, onGround: true, facing: direction });
    tap(game, code); step(game, 70);
    assert.ok(direction === 1 ? game.player.x > 310 : game.player.x < 1890, `${id}/${direction} crosses the seam`);
    assert.equal(game.player.y, 580, `${id}/${direction} stays on the bridge`);
    assert.equal(game.player.onGround, true); assert.equal(game.player.attack, null);
  }
});

test('tactical broken-bridge summons respect the bridge valley slopes and map bounds', () => {
  for (const id of ['zhongli', 'furina']) {
    const game = tacticalGame(CHARACTERS.findIndex(character => character.id === id), true, 'broken-bridge');
    Object.assign(game.player, { x: 600, y: 580, onGround: true });
    tap(game, 'KeyL'); step(game, game.player.attack.def.startup);
    assert.ok(game.summons.entities.length > 0);
    for (const summon of game.summons.entities) assert.equal(summon.feetY, 580, id);
    const summonContext = game.summonContext();
    assert.equal(summonContext.surfaceAt(1100, 700), 740);
    assert.equal(summonContext.surfaceAt(1100, 800), 900);
    assert.equal(summonContext.surfaceAt(2300, 500), null);
    assert.equal(summonContext.projectileBlocked(1100, 800, 1900, 800), true);
    assert.equal(summonContext.projectileBlocked(1100, 500, 1900, 500), false);
    assert.equal(summonContext.projectileBlocked(600, 530, 600, 630), false);
  }
});

test('tactical broken-bridge completes ninety active seconds and restarts the same arena cleanly', () => {
  const game = tacticalGame(6, false, 'broken-bridge');
  step(game, 5399); assert.equal(game.phase, 'playing'); assert.ok(game.getSnapshot().remaining > 0);
  step(game); assert.equal(game.phase, 'victory'); assert.equal(game.getSnapshot().remaining, 0);
  assert.equal(game.getSnapshot().mapId, 'broken-bridge'); assert.equal(game.tacticalStats.windRides, 0);
  game.rematch();
  assert.equal(game.phase, 'playing'); assert.equal(game.getSnapshot().remaining, 90);
  assert.equal(game.getSnapshot().mapId, 'broken-bridge'); assert.equal(game.char.id, 'furina');
  assert.equal(game.player.x, 200); assert.equal(game.player.y, 580);
  assert.equal(game.enemies.length, 3); assert.equal(game.encounterIndex, 0);
  assert.equal(game.getSnapshot().encounterName, '01 · 断桥试探');
  assert.ok(Object.values(game.tacticalStats).every(count => count === 0));
});

function mechanismGame(player = 0) {
  const game = tacticalGame(player, true, 'mechanism-hall');
  game.player.invuln = 0;
  return game;
}
function westFire(game) { return game.getSnapshot().tacticalHazards.find(hazard => hazard.id === 'west-fire'); }
function atFire(game, frame = 479, x = 650, y = 900) {
  game.frame = frame; game.elapsed = frame / 60;
  Object.assign(game.player, { x, y, vx: 0, vy: 0, onGround: true, invuln: 0, dodge: 0 });
}

test('tactical mechanism-hall selection rematch and returning to older modes reset hazard state', () => {
  const game = mechanismGame(6), arena = data.getTacticalMap('mechanism-hall');
  assert.equal(game.world, arena.world); assert.equal(game.tacticalMap.wind, null);
  assert.equal(game.getSnapshot().mapName, '机关回廊'); assert.equal(game.player.x, 240);
  assert.equal(game.getSnapshot().tacticalHazards.length, 2);
  atFire(game); step(game); assert.equal(game.player.hp, 92);
  game.rematch(); game.enemies = [];
  assert.equal(game.frame, 0); assert.equal(game.player.hp, 100); assert.equal(game.char.id, 'furina');
  assert.equal(game.getSnapshot().mapId, 'mechanism-hall');
  assert.ok(game.getSnapshot().tacticalHazards.every(hazard => hazard.state === 'off' && hazard.cycleIndex === -1));
  atFire(game); step(game); assert.equal(game.player.hp, 92, 'the first eruption can hurt again after rematch');
  for (const mapId of ['wind-ruins', 'broken-bridge']) {
    game.start({ player: 6, variant: 'tactical', mapId });
    game.enemies = []; atFire(game); step(game);
    assert.deepEqual(plain(game.getSnapshot().tacticalHazards), []); assert.equal(game.player.hp, 100);
  }
  game.start({ player: 0, mapId: 'mechanism-hall' });
  assert.equal(game.world, data.SURVIVAL_WORLD); assert.equal(game.duration, 600);
  assert.deepEqual(plain(game.getSnapshot().tacticalHazards), []);
  game.start({ player: 0, variant: 'tactical', mapId: 'mechanism-hall' });
  game.enemies = []; atFire(game); step(game); assert.equal(game.player.hp, 92, 'switching maps clears accepted hits');
});

test('tactical mechanism-hall fire boundaries follow active simulation time with no overlapping eruptions', () => {
  const game = mechanismGame();
  for (const [frame, state, remaining, cycle] of [[0, 'off', 6, -1], [359, 'off', 1 / 60, -1], [360, 'warning', 2, 0], [479, 'warning', 1 / 60, 0], [480, 'active', 2, 0], [599, 'active', 1 / 60, 0], [600, 'off', 12, 0], [1320, 'warning', 2, 1], [1440, 'active', 2, 1]]) {
    game.frame = frame; const hazard = westFire(game);
    assert.equal(hazard.state, state, `frame ${frame}`); assert.equal(hazard.cycleIndex, cycle);
    assert.ok(Math.abs(hazard.phaseRemaining - remaining) < .00001);
  }
  const seen = new Set();
  for (let frame = 0; frame < 5400; frame++) {
    game.frame = frame; const active = game.getTacticalHazards().filter(hazard => hazard.state === 'active');
    assert.ok(active.length <= 1, `both vents erupted at frame ${frame}`);
    active.forEach(hazard => seen.add(hazard.id));
  }
  assert.deepEqual([...seen].sort(), ['east-fire', 'west-fire']);
});

test('tactical mechanism-hall warnings are harmless and stepping into an ongoing eruption hurts once', () => {
  const game = mechanismGame(); atFire(game, 359);
  step(game, 120); assert.equal(game.frame, 479); assert.equal(game.player.hp, 100);
  game.player.x = 470; step(game, 10); assert.equal(westFire(game).state, 'active');
  assert.equal(game.player.hp, 100);
  key(game, 'KeyD');
  for (let tick = 0; tick < 30 && game.player.hp === 100; tick++) step(game);
  release(game, 'KeyD'); assert.equal(game.player.hp, 92);
  assert.ok(game.frame > 480 && game.frame < 600); assert.ok(game.hitstop > 0);
  // Leave and re-enter after hurt immunity ends: this eruption remains consumed.
  game.player.x = 460; step(game, 65); game.player.x = 650; game.player.invuln = 0; step(game);
  assert.equal(westFire(game).state, 'active'); assert.equal(game.player.hp, 92);
  game.frame = 1439; game.elapsed = game.frame / 60; step(game);
  assert.equal(game.player.hp, 84); assert.equal(westFire(game).cycleIndex, 1);
});

test('tactical mechanism-hall invulnerability does not consume an eruption before protection expires', () => {
  const game = mechanismGame(); atFire(game); game.player.invuln = 4;
  step(game, 3); assert.equal(game.player.hp, 100);
  step(game); assert.equal(game.player.hp, 92); assert.equal(westFire(game).state, 'active');
});

test('tactical mechanism-hall actual H dodge blocks fire and leaves that eruption dangerous afterwards', () => {
  const game = mechanismGame(); atFire(game, 479, 530); game.player.facing = 1;
  tap(game, 'KeyH'); assert.equal(game.player.hp, 100); assert.ok(game.player.dodge > 0);
  for (let tick = 0; tick < 30 && game.player.hp === 100; tick++) step(game);
  assert.equal(game.player.hp, 92); assert.ok(game.player.x > 650 && game.player.x < 800);
  assert.equal(westFire(game).state, 'active');
});

test('tactical mechanism-hall actual Zhongli shield absorbs one fire hit and consumes the eruption', () => {
  const game = mechanismGame(CHARACTERS.findIndex(character => character.id === 'zhongli'));
  tap(game, 'KeyL'); step(game, 70);
  const shield = game.getSnapshot().shieldHp; assert.ok(shield > 8);
  atFire(game); step(game);
  assert.equal(game.player.hp, 100); assert.equal(game.getSnapshot().shieldHp, shield - 8);
  step(game, 70); game.player.invuln = 0; step(game);
  assert.equal(westFire(game).state, 'active');
  assert.equal(game.player.hp, 100); assert.equal(game.getSnapshot().shieldHp, shield - 8);
});

test('tactical mechanism-hall fire uses the shared armor mitigation path', () => {
  const game = mechanismGame(); game.progress.upgrades.armor = 3;
  atFire(game); step(game);
  const loss = 100 - game.player.hp;
  assert.ok(loss > 0 && loss < 8);
  assert.ok(Math.abs(loss - 8 * getSurvivalStats(game.progress).armorMultiplier) < .00001);
});

test('tactical mechanism-hall rising jumps escape fire while deliberate platform drops enter it', () => {
  const jump = mechanismGame(); atFire(jump, 470);
  tap(jump, 'KeyW'); step(jump, 100);
  assert.equal(jump.player.hp, 100); assert.equal(jump.player.y, 790); assert.equal(jump.player.onGround, true);
  const drop = mechanismGame(); atFire(drop, 489, 650, 790);
  step(drop, 10); assert.equal(drop.player.hp, 100);
  tap(drop, 'KeyS'); step(drop, 30);
  assert.equal(drop.player.y, 900); assert.equal(drop.player.hp, 92);
});

test('tactical mechanism-hall middle and upper platforms remain outside the ground fire volume', () => {
  for (const [x, y] of [[650, 790], [1550, 790], [1100, 590]]) {
    const game = mechanismGame(); atFire(game, x > 1400 ? 959 : 479, x, y);
    step(game, 120); assert.equal(game.player.hp, 100); assert.equal(game.player.y, y);
  }
});

test('tactical mechanism-hall pause and actual hurt hitstop freeze the same hazard clock', () => {
  const game = mechanismGame(); atFire(game, 420);
  game.pause(); const paused = plain(game.getSnapshot().tacticalHazards);
  step(game, 300); assert.deepEqual(plain(game.getSnapshot().tacticalHazards), paused); assert.equal(game.frame, 420);
  game.resume(); step(game); assert.equal(game.frame, 421);
  atFire(game); step(game); const hurt = plain(game.getSnapshot().tacticalHazards), frame = game.frame;
  assert.ok(game.hitstop > 0); step(game, game.hitstop);
  assert.equal(game.frame, frame); assert.deepEqual(plain(game.getSnapshot().tacticalHazards), hurt);
  step(game); assert.equal(game.frame, frame + 1); assert.ok(westFire(game).phaseRemaining < hurt[0].phaseRemaining);
});

test('tactical mechanism-hall lethal fire ends immediately and never advances enemy actions after defeat', () => {
  const game = tacticalGame(0, false, 'mechanism-hall');
  const target = game.enemies[0]; target.stateTimer = 100;
  atFire(game); game.player.hp = 8;
  const age = target.age, timer = target.stateTimer; step(game);
  assert.equal(game.phase, 'defeat'); assert.equal(game.player.hp, 0);
  assert.equal(target.age, age); assert.equal(target.stateTimer, timer); assert.equal(game.hitstop, 0);
  const frozen = plain(game.getSnapshot()); step(game, 300); assert.deepEqual(plain(game.getSnapshot()), frozen);
});

test('tactical mechanism-hall fire does not damage enemies or remove persistent summons', () => {
  const game = mechanismGame(CHARACTERS.findIndex(character => character.id === 'zhongli'));
  Object.assign(game.player, { x: 560, y: 900, onGround: true });
  tap(game, 'KeyL'); step(game, 70);
  const pillar = game.summons.entities[0]; assert.ok(pillar.x > 520 && pillar.x < 780 && pillar.feetY === 900);
  const target = enemy(game, 80, { x: 680, y: 900, hp: 10000, maxHp: 10000, role: 'guard', state: 'recover', stateTimer: 1000 });
  // Keep the pillar's independent combat pulse idle so any enemy damage is from the vent.
  pillar.cooldown = 1000; game.summons.effects = []; game.fields = [];
  game.player.x = 240; game.frame = 479; const life = pillar.life;
  step(game, 120);
  assert.equal(target.hp, 10000); assert.equal(game.damageDealt, 0); assert.equal(game.kills, 0);
  assert.ok(game.summons.entities.includes(pillar)); assert.equal(pillar.life, life - 120);
});

test('tactical mechanism-hall every character can single-jump onto shelter and double-jump to the upper lane', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = mechanismGame(index);
    Object.assign(game.player, { x: 1100, y: 900, onGround: true });
    tap(game, 'KeyW'); step(game, 100);
    assert.equal(game.player.y, 790, `${game.char.id} single-jumps onto shelter`); assert.equal(game.player.jumps, 2);
    tap(game, 'KeyW'); step(game, 17); tap(game, 'KeyW'); step(game, 100);
    assert.equal(game.player.y, 590, `${game.char.id} double-jumps onto the upper lane`);
    assert.equal(game.player.onGround, true); assert.equal(game.tacticalStats.windRides, 0);
    assert.equal(game.player.hp, 100);
  }
});

test('tactical mechanism-hall the slowest character can retreat from either vent within its warning', () => {
  const index = CHARACTERS.reduce((slowest, character, i) => character.speed < CHARACTERS[slowest].speed ? i : slowest, 0);
  for (const [x, warningStart, code] of [[650, 360, 'KeyA'], [1560, 840, 'KeyD']]) {
    const game = mechanismGame(index); atFire(game, warningStart, x);
    key(game, code); step(game, 60); release(game, code); step(game, 70);
    assert.equal(game.player.hp, 100);
    const active = game.getTacticalHazards().find(hazard => hazard.state === 'active'); assert.ok(active);
    assert.ok(game.player.x + 18 <= active.x || game.player.x - 18 >= active.x + active.width);
  }
});

for (const [mapId, cap] of [['wind-ruins', 2], ['broken-bridge', 2], ['mechanism-hall', 1]]) test(`tactical ${mapId} reserves its intended concurrent special-attack budget`, () => {
  const game = tacticalGame(0, false, mapId);
  Object.assign(game.player, { x: 650, y: 900, onGround: true });
  for (const foe of game.enemies) Object.assign(foe, { x: foe.role === 'guard' ? 570 : foe.role === 'charger' ? 840 : 1010, homeX: foe.role === 'guard' ? 570 : 840, y: 900, state: 'ready', cooldown: 0 });
  let maximum = 0;
  for (let tick = 0; tick < 300; tick++) {
    step(game); const busy = game.enemies.filter(foe => foe.state === 'windup' || foe.state === 'active').length;
    maximum = Math.max(maximum, busy); assert.ok(busy <= cap, `${mapId} tick ${tick}`);
  }
  assert.equal(maximum, cap);
});

test('tactical mechanism-hall completes ninety active seconds then freezes hazards and enemies until rematch', () => {
  const game = tacticalGame(6, false, 'mechanism-hall'); step(game, 5399);
  assert.equal(game.phase, 'playing'); assert.ok(game.getSnapshot().remaining > 0);
  assert.equal(westFire(game).state, 'active');
  const age = game.enemies[0].age;
  Object.assign(game.player, { x: 650, y: 900, onGround: true, hp: 8, invuln: 0 });
  step(game); assert.equal(game.phase, 'victory'); assert.equal(game.player.hp, 8); assert.equal(game.getSnapshot().remaining, 0);
  assert.equal(game.enemies[0].age, age); assert.equal(westFire(game).state, 'off');
  const frozen = plain(game.getSnapshot()); step(game, 180); assert.deepEqual(plain(game.getSnapshot()), frozen);
  game.rematch(); assert.equal(game.getSnapshot().mapId, 'mechanism-hall'); assert.equal(game.char.id, 'furina');
  assert.equal(game.player.x, 240); assert.equal(game.player.y, 900); assert.equal(game.getSnapshot().remaining, 90);
  assert.equal(game.enemies.length, 3); assert.equal(game.encounterIndex, 0);
});

// Expedition checks exercise the production game through the same input/update
// pipeline; terrain-only runs remove opponents to isolate navigation failures.
function expeditionGame(player = 0) {
  return makeGame(player, 'expedition');
}
function terrainStep(game, frames = 1) {
  for (let frame = 0; frame < frames; frame++) {
    game.enemies = []; game.shots = []; step(game);
  }
}
function walkTo(game, destination, groundRoute = false) {
  const direction = destination > game.player.x ? 1 : -1;
  const code = direction > 0 ? 'KeyD' : 'KeyA';
  if (groundRoute) key(game, 'KeyS');
  key(game, code);
  let ticks = 0;
  while ((destination - game.player.x) * direction > 0 && ticks++ < 6000) {
    terrainStep(game);
    assert.equal(game.phase, 'playing', `${game.char.id} route remains playable`);
    assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y));
  }
  release(game, code); if (groundRoute) release(game, 'KeyS');
  assert.ok((destination - game.player.x) * direction <= 0, `${game.char.id} reaches x=${destination}`);
}

test('expedition starts every available character at level one in the shared ten-minute world', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = expeditionGame(index), snapshot = game.getSnapshot();
    assert.equal(snapshot.variant, 'expedition'); assert.equal(snapshot.duration, 600);
    assert.equal(snapshot.remaining, 600); assert.equal(snapshot.worldWidth, 7200);
    assert.equal(game.world, data.EXPEDITION_WORLD); assert.equal(game.world.height, 1080);
    assert.equal(game.player.x, 400); assert.equal(snapshot.skillLevel, 1); assert.equal(snapshot.secondaryLevel, 1);
    assert.equal(snapshot.branch, null); assert.equal(snapshot.level, 1); assert.equal(snapshot.rerollsRemaining, 2);
    assert.equal(snapshot.expedition.regionId, 'wind-ruins');
    assert.deepEqual(plain(snapshot.expedition.visitedRegions), ['wind-ruins']);
    assert.equal(snapshot.expedition.bossStarted, false);
  }
});

test('expedition every character walks the complete connected world and both seams in both directions without resetting progress', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = expeditionGame(index);
    game.player.hp = 73; game.level = 3; game.xp = 2; game.kills = 7; game.damageDealt = 123;
    game.progress.skillLevel = 2; game.progress.secondaryLevel = 2; game.progress.upgrades.armor = 1;
    const progress = plain(game.progress);
    // S keeps the player on the walkable ground route, including the wind shaft
    // and the bridge valley; no teleports or direct position writes along it.
    for (const destination of [2350, 4750, 4850, 7080, 4750, 2350, 2100, 400]) {
      walkTo(game, destination, true);
      assert.ok(Math.abs(game.player.y - game.groundHeightAt(game.player.x)) < 1, `${game.char.id} stands on connected ground at ${destination}`);
      assert.equal(game.player.onGround, true); assert.equal(game.player.hp, 73);
      assert.deepEqual(plain(game.progress), progress); assert.equal(game.xp, 2); assert.equal(game.level, 3);
      assert.equal(game.kills, 7); assert.equal(game.damageDealt, 123);
    }
    assert.equal(game.getSnapshot().expedition.regionId, 'wind-ruins');
    assert.deepEqual([...game.getSnapshot().expedition.visitedRegions].sort(), ['broken-bridge', 'mechanism-hall', 'wind-ruins']);
    assert.ok(game.elapsed > 30 && game.elapsed < 600); assert.equal(game.frame, game.elapsed * 60);
  }
});

test('expedition translated bridge has traversable flush shores, a real gap and a valley return for every character', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = expeditionGame(index);
    for (const direction of [-1, 1]) {
      Object.assign(game.player, { x: 2400 + (direction > 0 ? 290 : 1910), y: 580, vy: 0, onGround: true, jumps: 2 });
      walkTo(game, 2400 + (direction > 0 ? 600 : 1600));
      assert.equal(game.player.y, 580, `${game.char.id}/${direction} keeps bridge footing`);
      assert.equal(game.player.onGround, true);
    }
    Object.assign(game.player, { x: 3380, y: 580, vy: 0, onGround: true, jumps: 2 });
    walkTo(game, 3500); terrainStep(game, 100);
    assert.equal(game.player.y, 740, `${game.char.id} falls through the translated bridge gap onto the safety ledge`);
    tap(game, 'KeyS'); terrainStep(game, 80); assert.equal(game.player.y, 900);
    tap(game, 'KeyW'); terrainStep(game, 17); tap(game, 'KeyW'); terrainStep(game, 100);
    assert.equal(game.player.y, 740); assert.equal(game.player.onGround, true);
    key(game, 'KeyD'); tap(game, 'KeyW'); terrainStep(game, 17); tap(game, 'KeyW');
    for (let tick = 0; tick < 100 && game.player.x < 3650; tick++) terrainStep(game);
    release(game, 'KeyD'); terrainStep(game, 100);
    assert.equal(game.player.y, 580, `${game.char.id} returns to the translated bridge with actual jumps`);
    assert.equal(game.player.onGround, true);
  }
});

test('expedition wind retains actual ascent and controllable platform descent for every character', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = expeditionGame(index);
    Object.assign(game.player, { x: data.TACTICAL_WIND.x, y: 900, onGround: true, vy: 0 });
    terrainStep(game, 70); assert.ok(game.player.y < 500, `${game.char.id} rises above the upper lane`);
    key(game, 'KeyS'); terrainStep(game, 80);
    assert.equal(game.player.y, 500);
    release(game, 'KeyS'); key(game, 'KeyS'); terrainStep(game, 40); assert.equal(game.player.y, 700);
    release(game, 'KeyS'); key(game, 'KeyS'); terrainStep(game, 40); assert.equal(game.player.y, 900);
    release(game, 'KeyS'); terrainStep(game); assert.ok(game.player.vy < 0);
  }
});

test('expedition translated fire starts safely on entry and freezes through pause and an actual upgrade', () => {
  const game = expeditionGame(); game.frame = 12345; game.elapsed = game.frame / 60;
  assert.deepEqual(plain(game.getTacticalHazards()), []);
  Object.assign(game.player, { x: 5650, y: 900, vy: 0, onGround: true }); terrainStep(game);
  assert.equal(game.getSnapshot().expedition.regionId, 'mechanism-hall');
  assert.equal(westFire(game).x, 5520); assert.equal(westFire(game).state, 'off');
  assert.ok(westFire(game).phaseRemaining > 5.9);
  terrainStep(game, 358); assert.equal(westFire(game).state, 'off');
  terrainStep(game); assert.equal(westFire(game).state, 'warning'); assert.equal(westFire(game).phaseRemaining, 2);
  game.pause(); const paused = plain(game.getSnapshot().tacticalHazards), before = game.frame;
  terrainStep(game, 300); assert.equal(game.frame, before); assert.deepEqual(plain(game.getSnapshot().tacticalHazards), paused);
  game.resume(); game.xp = xpForLevel(game.level); game.checkLevelUp(); assert.equal(game.phase, 'upgrade');
  terrainStep(game, 300); assert.equal(game.frame, before); assert.deepEqual(plain(game.getSnapshot().tacticalHazards), paused);
  assert.ok(game.chooseUpgrade('core')); assert.equal(game.progress.skillLevel, 2);
  terrainStep(game, 119); assert.equal(westFire(game).state, 'warning');
  terrainStep(game); assert.equal(westFire(game).state, 'active');
});

test('expedition translated fire damages ground once, spares shelter and resets its safe clock when reentered', () => {
  const game = expeditionGame();
  Object.assign(game.player, { x: 5650, y: 900, vy: 0, onGround: true, invuln: 0 }); terrainStep(game);
  terrainStep(game, 478); assert.equal(game.player.hp, 100);
  terrainStep(game); assert.equal(game.player.hp, 92); assert.equal(westFire(game).state, 'active');
  const hazard = plain(westFire(game)), frame = game.frame;
  terrainStep(game, game.hitstop); assert.equal(game.frame, frame); assert.deepEqual(plain(westFire(game)), hazard);
  terrainStep(game, 60); game.player.invuln = 0; terrainStep(game); assert.equal(game.player.hp, 92);
  Object.assign(game.player, { x: 4750, y: game.groundHeightAt(4750), vy: 0 }); terrainStep(game);
  assert.deepEqual(plain(game.getTacticalHazards()), []);
  Object.assign(game.player, { x: 5650, y: 790, vy: 0, onGround: true, invuln: 0 }); terrainStep(game);
  assert.equal(westFire(game).state, 'off'); assert.ok(westFire(game).phaseRemaining > 5.9);
  terrainStep(game, 479); assert.equal(westFire(game).state, 'active'); assert.equal(game.player.hp, 92);
  tap(game, 'KeyS'); terrainStep(game, 30);
  assert.equal(game.player.y, 900); assert.equal(game.player.hp, 84, 'a fresh eruption can hit after a deliberate shelter drop');
});

test('expedition local formations and pursuit enemies arrive away from the player with harmless visible warning time', () => {
  for (const x of [60, 400, 3400, 5650, 7140]) {
    const game = expeditionGame(); game.enemies = []; game.spawnTimer = 0;
    Object.assign(game.player, { x, y: game.groundHeightAt(x), vy: 0, onGround: true });
    step(game);
    assert.ok(game.enemies.length > 0);
    const normal = game.enemies.find(foe => !foe.role); assert.ok(normal);
    for (const foe of game.enemies) {
      assert.equal(foe.state, 'arriving'); assert.ok(foe.stateTimer >= 73);
      const gap = Math.hypot(foe.x - game.player.x, foe.y - game.player.y);
      assert.ok(gap >= 175, `${x}/${foe.role ?? foe.kind} starts at a safe distance`);
      assert.ok(Math.abs(foe.x - game.player.x) <= 780);
      assert.ok(foe.x >= 0 && foe.x <= 7200);
      assert.ok(foe.y <= game.groundHeightAt(foe.x), 'arrivals are not buried in the terrain');
    }
    assert.ok(Math.abs(normal.x - game.player.x) >= 320);
    const hp = normal.hp; game.hurtEnemy(normal, 10000, 1, 'manual'); assert.equal(normal.hp, hp, 'warning cannot be farmed');
    Object.assign(game.player, { x: normal.x, y: normal.y, vy: 0, onGround: true, invuln: 0 });
    step(game, 20); assert.equal(normal.state, 'arriving'); assert.equal(game.player.hp, 100);
    assert.equal(normal.hp, hp);
  }
});

test('expedition occupied local outposts wait in place and region waves use time actually spent there', () => {
  const game = expeditionGame(); game.enemies = []; game.frame = 200 * 60; game.elapsed = 200;
  const spawn = data.EXPEDITION_MAPS[1].encounters[0].enemies[0];
  Object.assign(game.player, { x: spawn.x, y: spawn.y, vy: 0, onGround: true }); step(game);
  assert.equal(game.enemies.some(foe => foe.homeX === spawn.x), false, 'occupied authored point remains empty');
  assert.ok([...game.expeditionOutposts].filter(key => key.startsWith('broken-bridge:')).every(key => key.startsWith('broken-bridge:0:')), 'late first visit does not dump all three formations');
  key(game, 'KeyA'); step(game, 55); release(game, 'KeyA');
  const foe = game.enemies.find(candidate => candidate.homeX === spawn.x);
  assert.ok(foe); assert.equal(foe.x, spawn.x); assert.equal(foe.state, 'arriving');
  const id = foe.id; game.enemies = [];
  Object.assign(game.player, { x: 500, y: 900, vy: 0 }); step(game);
  Object.assign(game.player, { x: spawn.x - 220, y: spawn.y, vy: 0 }); step(game);
  assert.equal(game.enemies.some(candidate => candidate.homeX === spawn.x || candidate.id === id), false, 'retired outpost does not respawn on revisit');
});

test('expedition level-one manual combat kills a local defender and its crystal triggers a real upgrade', () => {
  const game = expeditionGame(); game.enemies = [];
  Object.assign(game.player, { x: 400, y: 900, vy: 0, onGround: true, facing: 1 });
  game.spawnTacticalEnemy({ role: 'guard', x: 460, y: 900 });
  const target = game.enemies.at(-1);
  Object.assign(target, { state: 'recover', stateTimer: 10000, cooldown: 10000 });
  assert.ok(target.hp < 125 && target.xp > 0);
  game.xp = xpForLevel(game.level) - target.xp;
  for (let attack = 0; attack < 12 && target.hp > 0; attack++) { tap(game, 'KeyK'); step(game, 60); }
  assert.ok(target.hp <= 0, 'level-one heavy attacks can defeat the intact local guard');
  assert.ok(game.kills >= 1); assert.ok(game.damageDealt > 0); assert.equal(game.progress.skillLevel, 1);
  // Move only after the real kill, so the crystal must use the pickup pipeline.
  Object.assign(game.player, { x: target.x, y: target.y, vy: 0 });
  for (let tick = 0; tick < 150 && game.phase === 'playing'; tick++) step(game);
  assert.equal(game.phase, 'upgrade'); assert.equal(game.level, 2);
  assert.ok(game.choices.some(choice => choice.id === 'core'));
  assert.ok(game.chooseUpgrade('core')); assert.equal(game.progress.skillLevel, 2); assert.equal(game.phase, 'playing');
});

test('expedition leaving enemies far behind retires them without teleporting, rewards or accumulated reinforcements', () => {
  const game = expeditionGame(); game.spawnTimer = 0; step(game, 5);
  const oldIds = new Set(game.enemies.map(foe => foe.id)); assert.ok(oldIds.size);
  const kills = game.kills, xp = game.xp, damage = game.damageDealt;
  Object.assign(game.player, { x: 6300, y: 900, vy: 0 }); step(game);
  assert.ok(game.enemies.every(foe => !oldIds.has(foe.id)));
  assert.equal(game.kills, kills); assert.equal(game.xp, xp); assert.equal(game.damageDealt, damage); assert.equal(game.orbs.length, 0);
  for (let visit = 0; visit < 18; visit++) {
    const x = [500, 3500, 6300][visit % 3];
    Object.assign(game.player, { x, y: game.groundHeightAt(x), vy: 0 }); game.spawnTimer = 0; step(game, 10);
    assert.ok(game.enemies.length <= 14);
    assert.ok(game.enemies.every(foe => Math.abs(foe.x - game.player.x) <= 1350));
  }
});

for (const [region, x, cap] of [['wind-ruins', 650, 2], ['broken-bridge', 3050, 2], ['mechanism-hall', 5650, 1]]) test(`expedition ${region} keeps its regional strong-attack pressure budget`, () => {
  const game = expeditionGame(); game.enemies = [];
  for (const map of data.EXPEDITION_MAPS) map.encounters.forEach((encounter, wave) => encounter.enemies.forEach((_, spawn) => game.expeditionOutposts.add(`${map.id}:${wave}:${spawn}`)));
  Object.assign(game.player, { x, y: 900, vy: 0, onGround: true });
  for (const [role, offset] of [['guard', -80], ['charger', 190], ['sniper', 360]]) {
    game.spawnTacticalEnemy({ role, x: x + offset, y: 900 });
    Object.assign(game.enemies.at(-1), { state: 'ready', cooldown: 0 });
  }
  let maximum = 0;
  for (let tick = 0; tick < 360; tick++) {
    step(game); const busy = game.enemies.filter(foe => foe.state === 'windup' || foe.state === 'active').length;
    maximum = Math.max(maximum, busy); assert.ok(busy <= cap, `${region} at ${tick}`);
  }
  assert.equal(maximum, cap, 'the regional budget still allows enemies to act');
});

test('expedition ninth-minute boss arrives once, extinguishes fire and stops reinforcements across revisits', () => {
  const game = expeditionGame(); Object.assign(game.player, { x: 5650, y: 900, vy: 0 }); step(game);
  game.expeditionHazardFrame = 479; game.frame = 540 * 60 - 1; game.spawnTimer = 0; step(game);
  assert.equal(game.getSnapshot().expedition.bossStarted, true);
  const boss = game.enemies.find(foe => foe.boss); assert.ok(boss); assert.equal(boss.state, 'arriving');
  assert.ok(boss.stateTimer >= 149); assert.ok(Math.abs(boss.x - game.player.x) >= 320);
  assert.ok(game.getTacticalHazards().every(hazard => hazard.state === 'off'));
  const nextId = game.nextId;
  for (const x of [500, 3500, 6300, 500, 5650]) {
    Object.assign(game.player, { x, y: game.groundHeightAt(x), vy: 0 }); game.spawnTimer = 0; step(game, 10);
    assert.equal(game.nextId, nextId); assert.equal(game.enemies.filter(foe => foe.boss).length, 1);
    assert.equal(game.enemies.find(foe => foe.boss).id, boss.id);
    assert.ok(game.getTacticalHazards().every(hazard => hazard.state === 'off'));
  }
  game.frame = 35999; step(game); assert.equal(game.phase, 'victory'); assert.equal(game.elapsed, 600);
  assert.equal(game.bossKilled, false, 'survival victory does not require boss damage');
});

test('expedition rematch clears growth visits hazard hits and outposts without changing older modes', () => {
  const game = expeditionGame(CHARACTERS.length - 1), charId = game.char.id;
  Object.assign(game.player, { x: 5650, y: 900, vy: 0 }); step(game, 500);
  game.player.hp = 17; game.level = 5; game.xp = 9; game.progress.skillLevel = 3; game.kills = 8; game.damageDealt = 200;
  game.hazardHitCycles.set('west-fire', 0); game.rematch();
  const snapshot = game.getSnapshot();
  assert.equal(snapshot.variant, 'expedition'); assert.equal(snapshot.charId, charId); assert.equal(snapshot.remaining, 600);
  assert.equal(snapshot.hp, 100); assert.equal(snapshot.level, 1); assert.equal(snapshot.xp, 0); assert.equal(snapshot.skillLevel, 1);
  assert.equal(snapshot.kills, 0); assert.equal(snapshot.damageDealt, 0); assert.equal(game.player.x, 400);
  assert.deepEqual(plain(snapshot.expedition.visitedRegions), ['wind-ruins']); assert.equal(snapshot.expedition.bossStarted, false);
  assert.equal(game.hazardHitCycles.size, 0); assert.equal(game.expeditionHazardFrame, 0);
  assert.ok([...game.expeditionOutposts].every(key => key.startsWith('wind-ruins:0:')));
  for (const mapId of ['wind-ruins', 'broken-bridge', 'mechanism-hall']) {
    game.start({ player: 0, variant: 'tactical', mapId });
    assert.equal(game.world, data.getTacticalMap(mapId).world); assert.equal(game.duration, 90); assert.equal(game.getSnapshot().expedition, null);
  }
  game.start({ player: 0, variant: 'survival' });
  assert.equal(game.world, data.SURVIVAL_WORLD); assert.equal(game.duration, 600); assert.equal(game.getSnapshot().expedition, null);
  assert.deepEqual(plain(game.getTacticalHazards()), []);
});

test('expedition every character completes ten-minute moving combat with real upgrades and bounded finite entities', () => {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const game = expeditionGame(index); game.spawnTimer = 0;
    let direction = 1, choices = 0, ticks = 0, maxEnemies = 0;
    const visited = new Set();
    while (game.phase !== 'victory' && ticks++ < 45000) {
      if (game.phase === 'upgrade') {
        const choice = game.choices.find(candidate => candidate.id === 'core') ?? game.choices[0];
        assert.ok(choice && game.chooseUpgrade(choice.id)); choices++;
        continue;
      }
      assert.equal(game.phase, 'playing', game.char.id);
      if (game.player.x > 7050) direction = -1;
      if (game.player.x < 150) direction = 1;
      release(game, direction > 0 ? 'KeyA' : 'KeyD'); key(game, direction > 0 ? 'KeyD' : 'KeyA'); key(game, 'KeyS');
      const attacks = [['KeyJ', 35], ['KeyK', 83], ['KeyL', 227], ['KeyI', 181]];
      for (const [code, period] of attacks) { if (ticks % period === 0) key(game, code); else release(game, code); }
      step(game);
      visited.add(game.getSnapshot().expedition.regionId); maxEnemies = Math.max(maxEnemies, game.enemies.length);
      if (ticks % 60 === 0) {
        assert.ok(game.enemies.length <= 15, `${game.char.id} nearby population stays bounded including boss`);
        assert.ok(game.shots.length <= data.SURVIVAL_LIMITS.projectiles); assert.ok(game.orbs.length <= data.SURVIVAL_LIMITS.gems);
        assert.ok(game.effects.length <= data.SURVIVAL_LIMITS.effects);
        assert.ok([game.player.x, game.player.y, game.player.hp].every(Number.isFinite));
        assert.ok(game.enemies.every(foe => [foe.x, foe.y, foe.hp].every(Number.isFinite)));
      }
    }
    assert.equal(game.phase, 'victory', `${game.char.id} finishes the active ten-minute run`);
    assert.equal(game.elapsed, 600); assert.equal(visited.size, 3); assert.ok(maxEnemies > 1);
    assert.ok(game.kills > 0 && game.damageDealt > 0, `${game.char.id} fought during traversal`);
    assert.ok(choices > 0 && game.level > 1, `${game.char.id} collected and chose real upgrades`);
    assert.equal(game.expeditionBossStarted, true); assert.equal(game.eliteMilestones.size, 1);
  }
});

let failures = 0;
const selectedCases = process.argv[2] ? cases.filter(({ name }) => new RegExp(process.argv[2]).test(name)) : cases;
assert.ok(selectedCases.length, 'the requested regression filter must select at least one check');
for (const { name, run } of selectedCases) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
for (const game of games) game.destroy();
console.log(`\n${selectedCases.length - failures}/${selectedCases.length} survival regression checks passed.`);
process.exitCode = failures ? 1 : 0;
