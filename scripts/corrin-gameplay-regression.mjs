import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..'), noop = () => undefined;
const gradient = { addColorStop: noop };
const drawing = new Proxy({}, { get: (target, key) => target[key] ?? (String(key).startsWith('create') ? () => gradient : noop), set: (target, key, value) => (target[key] = value, true) });
const canvas = () => ({ getContext: () => drawing });
const browser = { addEventListener: noop, removeEventListener: noop };
const context = vm.createContext({ console, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  HTMLElement: class {}, window: browser, document: { ...browser, createElement: canvas, hidden: false } });
const modules = new Map();
const corrinPack = { manifest: JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/corrin-v1/manifest.json'), 'utf8')), sheets: new Map() };
function load(relative) {
  const file = path.resolve(root, relative).replaceAll('\\', '/');
  if (file.endsWith('/art.ts')) return new Proxy({
    acquireGameArt: () => ({ ready: Promise.resolve(), release: noop }),
    getCorrinCastOrigin: (...args) => load('src/game/corrin-art.ts').corrinCastOrigin(corrinPack, ...args),
    getCorrinFangSegment: (...args) => load('src/game/corrin-art.ts').corrinFangSegment(corrinPack, ...args),
  }, { get: (target, key) => target[key] ?? noop });
  if (file.endsWith('/survival-render.ts')) return { renderSurvival: noop };
  if (file.endsWith('/summoner-art.ts')) return { drawSummonArt: noop };
  if (file.endsWith('/audio.ts')) return { BattleAudio: class { play() {} restart() {} setScene() {} setMuted() {} destroy() {} unlock() {} } };
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInContext(`(function(exports,require,module){${code}\n})`, context, { filename: file })(module.exports, specifier => load(path.resolve(path.dirname(file), `${specifier}.ts`)), module);
  return module.exports;
}
const C = load('src/game/corrin.ts'), { CHARACTERS, STAGE } = load('src/game/data.ts');
const { Game } = load('src/game/engine.ts'), { SurvivalGame } = load('src/game/survival-engine.ts');
const U = load('src/game/survival-data.ts'), corrinIndex = CHARACTERS.findIndex(char => char.id === 'corrin');
const tests = [], test = (name, run) => tests.push({ name, run }), plain = value => JSON.parse(JSON.stringify(value));
const noInput = { left: false, right: false, up: false, down: false, jab: false, smash: false, special: false, secondary: false, downPressed: false, dodge: false };
const duel = () => { const game = new Game(canvas()); game.start({ mode: 'pvp', player: corrinIndex, opponent: corrinIndex, difficulty: 'normal', stocks: 3, duration: 180, items: false }); game.state = 'fight'; return game; };
function survival(variant = 'survival') { const game = new SurvivalGame(canvas()); game.start({ player: corrinIndex, variant }); game.spawnTimer = 100000; game.player.invuln = 100000; game.player.x = 2100; game.player.y = game.groundHeightAt(2100); return game; }
const ticks = (game, count) => { for (let i = 0; i < count; i++) game.update(); };
function enemy(game, dx, extra = {}) { const result = { id: game.nextId++, x: game.player.x + dx, y: game.player.y, vx: 0, vy: 0, radius: 27, hp: 10000, maxHp: 10000, kind: 'slime', speed: 0, damage: 0, xp: 0, age: 0, flash: 0, slow: 0, cooldown: 100000, tell: 0, aimX: 0, aimY: 0, stacks: 0, grounded: true, elite: false, boss: false, ...extra }; game.enemies.push(result); return result; }

test('two independent forms, four grounded/air transform clocks and commit boundaries', () => {
  for (const form of ['human', 'dragon']) for (const airborne of [false, true]) {
    const state = C.newCorrinState(); state.form = form; C.startCorrinTransform(state, airborne);
    const { duration, commit, to } = state.transform;
    for (let i = 0; i < commit - 1; i++) C.stepCorrinState(state);
    assert.equal(state.form, form); C.stepCorrinState(state); assert.equal(state.form, to);
    for (let i = commit; i < duration; i++) C.stepCorrinState(state);
    assert.equal(state.transform, undefined);
  }
  const one = C.newCorrinState(), two = C.newCorrinState(); C.startCorrinTransform(one, false); for (let i = 0; i < 24; i++) C.stepCorrinState(one);
  assert.equal(two.form, 'human'); assert.equal(two.transform, undefined);
});
test('duel transformation preserves velocity, feet, air jump budget and I cooldown; input cannot skip transition', () => {
  const game = duel(), f = game.fighters[0]; f.onGround = false; f.y = 130; f.vx = 2; f.vy = -3; f.jumpsLeft = 1; f.secondaryCooldown = 90;
  const before = [f.x, f.y, f.vx, f.vy, f.jumpsLeft, f.secondaryCooldown]; game.startAttack(f, f.char.special);
  assert.deepEqual([f.x, f.y, f.vx, f.vy, f.jumpsLeft, f.secondaryCooldown], before);
  for (let i = 0; i < 12; i++) game.updateFighter(f, { ...noInput, jab: true, special: true, dodge: true });
  assert.equal(f.attack, null); assert.equal(f.jumpsLeft, 1); assert.equal(f.secondaryCooldown, 78); assert.equal(f.corrin.transform.elapsed, 12);
  assert.equal(game.fighters[1].corrin.form, 'human'); assert.equal(CHARACTERS[corrinIndex].jab.effect, undefined); game.destroy();
});
test('duel hits cancel transition before or after commit without reverting committed shape', () => {
  for (const frames of [10, 26]) {
    const game = duel(), f = game.fighters[0], enemy = game.fighters[1]; game.startAttack(f, f.char.special);
    for (let i = 0; i < frames; i++) game.updateFighter(f, noInput);
    game.applyHit(enemy, f, enemy.char.jab);
    assert.equal(f.corrin.transform, undefined); assert.equal(f.corrin.form, frames < 24 ? 'human' : 'dragon'); assert.ok(f.specialCooldown > 0); game.destroy();
  }
});
test('manual J combo is 0/1/2 and resets after expiry; no automatic followup', () => {
  const game = duel(), f = game.fighters[0];
  for (const combo of [0, 1, 2, 0]) {
    game.startAttack(f, f.char.jab); assert.equal(f.attack.corrinCombo, combo);
    for (let i = 0; i < 40; i++) game.updateFighter(f, noInput);
    assert.equal(f.attack, null);
  }
  f.animationFrame += 111; game.startAttack(f, f.char.jab); assert.equal(f.attack.corrinCombo, 0); game.destroy();
});
test('dragon JKI release once at startup and never create generic melee boxes or secondary projectiles', () => {
  for (const kind of ['jab', 'smash', 'secondary']) {
    const game = duel(), f = game.fighters[0], sounds = []; game.sfx.play = (event, options) => sounds.push({ event, options }); f.corrin.form = 'dragon'; game.startAttack(f, C.getCorrinMoves('dragon')[kind]);
    for (let i = 0; i < f.attack.def.startup - 1; i++) game.updateFighter(f, noInput);
    assert.equal(game.corrinWater.effects.length, 0); game.updateFighter(f, noInput);
    assert.equal(game.corrinWater.effects.length, 1); assert.equal(game.attackHitbox(f), null); assert.equal(game.projectiles.length, 0);
    game.updateFighter(f, noInput); assert.equal(game.corrinWater.effects.length, 1); assert.equal(sounds.filter(sound => sound.event === 'cast').length, 1, `${kind} has exactly one release sound`); game.destroy();
  }
});
test('water travels visibly from origin, reflects facing, avoids behind targets and stops at terrain', () => {
  for (const facing of [-1, 1]) {
    const owner = { id: 1, x: 400, feetY: 500, facing, alive: true }, origin = { x: 400 + facing * 80, y: 440 };
    const targets = [1, -1].map((direction, i) => ({ id: i + 10, x: 400 + facing * direction * 220, feetY: 500, width: 54, height: 43.2, alive: true }));
    const ctx = { owners: [owner], targets, surfaceAt: () => 500 };
    const runtime = new C.CorrinRuntime(); runtime.cast('water-orb', owner, origin);
    assert.equal(runtime.effects[0].x, origin.x); assert.equal(runtime.effects[0].y, origin.y);
    const hits = Array.from({ length: 80 }, () => runtime.step(ctx)).flat(); assert.equal(hits.length, 1); assert.equal(hits[0].targetId, 10);
    runtime.cast('water-orb', owner, origin); assert.equal(runtime.step({ ...ctx, projectileBlocked: () => true }).length, 0); assert.equal(runtime.effects.length, 0);
  }
});
test('registered production mouths launch J and K that actually reach short ground enemies', () => {
  for (const kind of ['jab', 'smash']) for (const facing of [-1, 1]) for (const distance of [140, 280]) {
    const owner = { id: 1, x: 400, feetY: 500, facing, alive: true }, def = C.getCorrinMoves('dragon')[kind];
    const animation = { state: 'attack', attack: { def, t: def.startup, corrinForm: 'dragon' }, corrin: { form: 'dragon' }, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 0 };
    const origin = load('src/game/corrin-art.ts').corrinCastOrigin(corrinPack, owner.x, owner.feetY, 112, animation, facing);
    assert.ok(origin.y < owner.feetY - 45, 'real authored mouth stays above low targets');
    const target = { id: 10, x: owner.x + distance * facing, feetY: owner.feetY, width: 54, height: 43.2, alive: true };
    const runtime = new C.CorrinRuntime(); runtime.cast(def.effect, owner, origin);
    assert.equal(runtime.effects[0].x, origin.x); assert.equal(runtime.effects[0].y, origin.y);
    const hits = Array.from({ length: 80 }, () => runtime.step({ owners: [owner], targets: [target], surfaceAt: () => 500, castOriginAt: () => origin })).flat();
    assert.ok(hits.length > 0, `${kind}, facing ${facing}, distance ${distance}`);
  }
});
test('beam clips visible endpoint, pulses at most 3 or upgraded 4 times, and waterbomb explodes once', () => {
  const owner = { id: 1, x: 200, feetY: 500, facing: 1, alive: true }, origin = { x: 280, y: 440 };
  const near = { id: 10, x: 380, feetY: 500, width: 54, height: 43.2, alive: true };
  const ctx = { owners: [owner], targets: [near], surfaceAt: () => 500 };
  for (const count of [3, 4]) { const runtime = new C.CorrinRuntime(); runtime.cast('water-beam', owner, origin, { beamTicks: count }); const hits = Array.from({ length: 40 }, () => runtime.step(ctx)).flat(); assert.equal(hits.length, count); }
  const blocked = new C.CorrinRuntime(); blocked.cast('water-beam', owner, origin); blocked.step({ ...ctx, projectileBlocked: (_x, _y, newX) => newX > 330 }); assert.ok(blocked.effects[0].originX <= 330);
  const bomb = new C.CorrinRuntime(); bomb.cast('water-bomb', owner, origin); const bombHits = Array.from({ length: 120 }, () => bomb.step({ ...ctx, targets: [{ ...near, x: 600 }] })).flat(); assert.equal(bombHits.length, 1); assert.equal(bombHits[0].kind, 'secondary');
});
test('survival damage pauses and preserves transformations/attacks, pause/upgrade freezes projectiles', () => {
  const game = survival(); game.beginAttack('special'); ticks(game, 10); const snapshot = plain(game.player.corrin); game.player.invuln = 0; game.hurtPlayer(10);
  ticks(game, 4); assert.deepEqual(plain(game.player.corrin), snapshot); assert.equal(game.player.attack, null); ticks(game, 1); assert.equal(game.player.corrin.transform.elapsed, 11);
  game.phase = 'upgrade'; const elapsed = game.player.corrin.transform.elapsed; ticks(game, 50); assert.equal(game.player.corrin.transform.elapsed, elapsed);
  game.phase = 'playing'; ticks(game, 40); assert.equal(game.player.corrin.form, 'dragon'); game.beginAttack('jab'); ticks(game, game.player.attack.def.startup);
  const water = plain(game.corrinWater.effects); game.phase = 'paused'; ticks(game, 90); assert.deepEqual(plain(game.corrinWater.effects), water); game.destroy();
});
test('survival human fang uses physical segment, hits once, excludes behind and empty spell does not spawn hidden projectile', () => {
  const game = survival(), target = enemy(game, 95, { radius: 48 }), behind = enemy(game, -60), low = enemy(game, 100); game.beginAttack('secondary'); const startup = game.player.attack.def.startup;
  ticks(game, startup - 1); assert.equal(target.hp, 10000); ticks(game, 1); assert.ok(target.hp < 10000); const hp = target.hp; ticks(game, 20);
  assert.equal(target.hp, hp); assert.equal(behind.hp, 10000); assert.equal(low.hp, 10000, 'low slime stays below the authored raised dragon-fang'); assert.equal(game.shots.length, 0); assert.equal(game.corrinWater.effects.length, 0); game.destroy();
});
test('survival upgrades change both form damage, orb shape, beam pulses, waterburst radius and shared I cooldown', () => {
  const game = survival(), base = game.attackDamage('jab'); game.progress.skillLevel = 5; game.progress.secondaryLevel = 5; game.progress.upgrades['corrin-jab'] = 3; game.progress.upgrades['corrin-smash'] = 3; game.progress.branch = 'corrin-tide';
  assert.ok(game.attackDamage('jab') > base); game.player.corrin.form = 'dragon'; game.beginAttack('jab'); ticks(game, game.player.attack.def.startup);
  assert.equal(game.corrinWater.effects.length, 3); assert.ok(game.corrinWater.effects.every(effect => effect.pierce === 2));
  const profile = U.getCorrinSurvivalProfile(game.progress); assert.equal(profile.beamTicks, 4); assert.ok(profile.burstRadius > 140);
  game.player.attack = null; game.beginAttack('secondary'); const cd = game.player.secondaryCooldown; game.player.attack = null; game.beginAttack('special'); assert.equal(game.player.secondaryCooldown, cd);
  const choices = U.getUpgradeChoices({ ...U.makeInitialProgress('corrin'), skillLevel: 4 }); assert.equal(choices.length, 2); assert.ok(choices.every(choice => choice.id.startsWith('corrin-'))); game.destroy();
});
test('normal, tactical and expedition modes use same manual form system; reset and owner death clear all effects', () => {
  for (const variant of ['survival', 'tactical', 'expedition']) {
    const game = survival(variant); game.beginAttack('special'); ticks(game, 46); assert.equal(game.player.corrin.form, 'dragon');
    game.corrinWater.cast('water-orb', { id: 0, x: game.player.x, feetY: game.player.y, facing: 1, alive: true }, { x: game.player.x + 80, y: game.player.y - 60 });
    game.start({ player: corrinIndex, variant }); assert.equal(game.player.corrin.form, 'human'); assert.equal(game.corrinWater.effects.length, 0); game.destroy();
  }
  const game = duel(), f = game.fighters[0]; f.corrin.form = 'dragon'; game.startAttack(f, C.getCorrinMoves('dragon').jab); for (let i = 0; i < 20; i++) game.updateFighter(f, noInput);
  game.ko(f); assert.equal(f.corrin.form, 'human'); assert.equal(game.corrinWater.effects.length, 0); game.respawn(f); assert.equal(f.corrin.form, 'human'); assert.equal(f.y + f.h, 136); assert.equal(STAGE.main.y, 540); game.destroy();
});

test('stationary ranged CPU spells brake ground drift and unsafe airborne casting yields to recovery', () => {
  for (const charId of ['tharja', 'corrin']) {
    const game = duel(), f = game.fighters[1]; f.char = CHARACTERS.find(char => char.id === charId); f.isCPU = true; f.corrin.form = 'dragon';
    f.x = STAGE.main.x + 70; f.vx = -4; f.onGround = true;
    game.startAttack(f, charId === 'tharja' ? f.char.secondary : C.getCorrinMoves('dragon').smash);
    assert.equal(f.vx, 0); for (let i = 0; i < 115; i++) game.updateFighter(f, noInput);
    assert.equal(f.onGround, true); assert.ok(f.x > STAGE.main.x);
    f.state = 'free'; f.attack = null; f.onGround = false; f.x = 450; f.y = 330; f.vx = -4; f.vy = 2; f.aiThink = 0;
    const commands = game.cpuInput(f); assert.equal(commands.jab || commands.smash || commands.secondary || commands.special, false); game.destroy();
  }
});

let passed = 0;
for (const entry of tests) { try { entry.run(); passed++; console.log(`PASS ${entry.name}`); } catch (error) { console.error(`FAIL ${entry.name}`); throw error; } }
console.log(`${passed}/${tests.length} Corrin gameplay checks passed`);
