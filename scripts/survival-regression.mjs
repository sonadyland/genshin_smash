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
function loadModule(file) {
  if (file.endsWith('/survival-render.ts')) return { renderSurvival: noop };
  if (file.endsWith('/art.ts')) return {
    loadGameArt: () => Promise.resolve(), drawCharacterArt: () => false,
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

test('all five characters have distinct, valid evolution pairs and reproducible starting progress', () => {
  assert.equal(CHARACTERS.length, 5);
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
function makeGame(player = 0) {
  const game = new SurvivalGame(canvas());
  game.setMuted(true); game.start({ player });
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
  assert.equal(game.player.attack, null); assert.equal(game.keys.has('KeyJ'), true);
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
    assert.equal(game.pendingAttack, null); assert.equal(game.keys.size, 0);
  }
});

test('pause, blur, hidden documents and upgrade selection freeze the simulation', () => {
  const game = makeGame(); enemy(game);
  tap(game, 'KeyJ');
  const signature = () => JSON.stringify({ frame: game.frame, player: game.player, enemies: game.enemies, shots: game.shots, fields: game.fields, elapsed: game.elapsed });
  for (const cause of ['pause', 'blur', 'hidden', 'upgrade']) {
    game.resume();
    if (cause === 'pause') game.pause();
    if (cause === 'blur') { game.keys.add('KeyD'); game.onBlur(); }
    if (cause === 'hidden') { context.document.hidden = true; game.onVisibility(); context.document.hidden = false; }
    if (cause === 'upgrade') { game.xp = xpForLevel(game.level); game.checkLevelUp(); }
    const before = signature(); step(game, 100);
    assert.equal(signature(), before, cause);
    assert.equal(game.keys.size, 0);
  }
});

test('Xiao refuses grounded L without cooldown and lands on the first crossed platform', () => {
  const game = makeGame(4);
  tap(game, 'KeyL');
  assert.equal(game.player.attack, null); assert.equal(game.player.skillCooldown, 0);
  assert.match(game.notice, /跳跃/);
  airborne(game, 2400, 470);
  game.keys.add('KeyS'); game.player.drop = 20;
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
  assert.equal(game.keys.has('KeyA'), true);
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
    noticeTimer: game.noticeTimer, pending: game.pendingAttack, keys: [...game.keys], pressed: [...game.pressed] });
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
  assert.equal(game.pressed.has('KeyW'), true); assert.equal(game.pressed.has('KeyJ'), true);
  step(game);
  assert.ok(game.player.x > x && game.player.y < y);
  assert.equal(game.player.jumps, 1); assert.equal(game.player.attack.def.kind, 'jab');
  assert.equal(game.pressed.size, 0);
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
    assert.equal(game.keys.size, 0); assert.equal(game.pressed.size, 0); assert.equal(game.pendingAttack, null);
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
  game.bossKilled = true; game.frame = 2000; game.elapsed = 33; game.player.hp = 12; game.keys.add('KeyD'); enemy(game);
  game.player.invuln = 0; game.hurtPlayer(5); assert.equal(game.hitstop, 4);
  game.addOrb(400, 700, 5, false); game.rematch();
  const snapshot = game.getSnapshot();
  assert.equal(snapshot.charId, 'xiao'); assert.equal(snapshot.elapsed, 0); assert.equal(snapshot.level, 1);
  assert.equal(snapshot.hp, 100); assert.equal(snapshot.branch, null); assert.equal(snapshot.kills, 0);
  assert.equal(game.enemies.length + game.orbs.length + game.shots.length + game.fields.length, 0);
  assert.equal(game.keys.size, 0); assert.equal(game.hitstop, 0);
  game.player.invuln = 0; game.hurtPlayer(5); assert.equal(game.hitstop, 4);
  game.destroy();
  for (const [name, count] of Object.entries(before)) assert.equal(listeners.window.get(name).size, count - 1);
  key(game, 'KeyJ'); assert.equal(game.pressed.size, 0);
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
      } else {
        assert.equal(game.shots.length, profile.count);
        if (index === 3) assert.ok(game.shots.every(shot => shot.piercing === (level >= 3)));
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
  game.keys.add('KeyD'); const x = p.x; step(game);
  assert.equal(p.motion.distance, p.x - x); assert.equal(p.motion.moving, true); assert.notEqual(p.motion.slope, 0);
  Object.assign(p, { x: data.SURVIVAL_WORLD.width - 38, y: data.groundHeightAt(data.SURVIVAL_WORLD.width - 38) });
  const distance = p.motion.distance; step(game, 5);
  assert.equal(p.motion.distance, distance); assert.equal(p.motion.moving, false);
  game.keys.clear(); tap(game, 'KeyI');
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
