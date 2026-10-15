import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Execute the production simulation; only browser rendering/audio are substituted.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/tharja-v1/manifest.json'), 'utf8'));
const noop = () => undefined;
const canvas = () => ({ getContext: () => ({}) });
const browser = { addEventListener: noop, removeEventListener: noop };
const context = vm.createContext({ console, Math, performance: { now: () => 0 },
  requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  window: browser, document: { ...browser, hidden: false, createElement: canvas }, HTMLElement: class {} });
const modules = new Map();
function load(relative) {
  const file = path.resolve(root, relative).replaceAll('\\', '/');
  if (file.endsWith('/survival-render.ts')) return { renderSurvival: noop };
  if (file.endsWith('/audio.ts')) return { BattleAudio: class { play() {} restart() {} setScene() {} setMuted() {} destroy() {} unlock() {} } };
  if (file.endsWith('/art.ts')) return {
    acquireGameArt: () => ({ ready: Promise.resolve(), release: noop }), getSwordCastTip: noop,
    getTharjaCastOrigin: registeredPalm,
    getCharacterCastOrigin: (_id, x, y, height, animation, facing) => registeredPalm(x, y, height, animation.attack?.def.kind ?? 'special', facing),
  };
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} }; modules.set(file, mod);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = name => load(path.resolve(path.dirname(file), `${name}.ts`));
  vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename: file })(mod.exports, require, mod);
  return mod.exports;
}
const { CHARACTERS } = load('src/game/data.ts');
const { SurvivalGame } = load('src/game/survival-engine.ts');
const { makeInitialProgress, getUpgradeChoices, applyChoice, getTharjaSurvivalProfile, getSecondaryProfile, getUpgradeSummary } = load('src/game/survival-data.ts');
const { THARJA_COMBAT } = load('src/game/tharja.ts');
function registeredPalm(x, y, height, kind, facing = 1) {
  const clip = manifest.clips[kind], frame = clip.frames.find(frame => frame.phase === 'contact');
  const palm = load('src/game/clip-animation.ts').registeredCastOrigin(clip, frame, height);
  return { x: x + facing * palm.x, y: y + palm.y };
}
const cases = [], games = [];
const test = (name, run) => cases.push({ name, run });
const plain = value => JSON.parse(JSON.stringify(value));
function game() {
  const run = new SurvivalGame(canvas());
  run.start({ player: CHARACTERS.findIndex(character => character.id === 'tharja') });
  run.setMuted(true); run.spawnTimer = 100000; run.player.invuln = 100000;
  // A flat portion of the actual survival world keeps combat fixtures stationary.
  run.player.x = 2100; run.player.y = run.groundHeightAt(2100);
  games.push(run); return run;
}
function enemy(run, dx, changes = {}) {
  const target = { id: run.nextId++, kind: 'slime', elite: false, boss: false, x: run.player.x + dx, y: run.player.y,
    vx: 0, vy: 0, radius: 27, hp: 10000, maxHp: 10000, speed: 0, damage: 0, xp: 0,
    age: 0, flash: 0, slow: 0, cooldown: 100000, tell: 0, aimX: 0, aimY: 0, stacks: 0, grounded: true, ...changes };
  run.enemies.push(target); return target;
}
function ticks(run, count = 1) { for (let i = 0; i < count; i++) run.update(); }
function cast(run, kind) { run.beginAttack(kind); ticks(run, run.player.attack.def.startup); }
function magicTicks(run, count) { for (let i = 0; i < count; i++) run.updateTharja(); }

test('J is one manual ranged projectile; no melee hit or idle/held-repeat attack', () => {
  const run = game(), behind = enemy(run, -20), distant = enemy(run, 240);
  ticks(run, 150); assert.equal(run.damageDealt, 0);
  cast(run, 'jab'); assert.equal(run.tharja.effects.filter(effect => effect.kind === 'flux').length, 1);
  assert.equal(behind.hp, 10000); assert.equal(distant.hp, 10000); assert.equal(run.shots.length, 0);
  ticks(run, 150); assert.equal(behind.hp, 10000);
  assert.ok(Math.abs(10000 - distant.hp - THARJA_COMBAT.flux.damage * 6.4) < 1e-8);
  const damage = run.damageDealt; ticks(run, 150); assert.equal(run.damageDealt, damage);
});

test('actual approved palm coordinates launch visible J/K paths that hit spawned blue slimes and short fixtures', () => {
  for (const kind of ['jab', 'smash']) for (const facing of [-1, 1]) for (const spawned of [false, true]) {
    const run = game(); run.player.facing = facing;
    const target = spawned ? run.spawnEnemy('slime', false, false, run.player.x + facing * 65) : enemy(run, facing * 65);
    Object.assign(target, { hp: 10000, maxHp: 10000, speed: 0, damage: 0, xp: 0 });
    const palm = registeredPalm(run.player.x, run.player.y, 112, kind, facing);
    assert.ok(palm.y < run.player.y - 85, 'the original high palm origin stays unchanged');
    run.releaseTharja(kind);
    const shot = run.tharja.effects[0]; assert.equal(shot.x, palm.x); assert.equal(shot.y, palm.y);
    magicTicks(run, 75); assert.ok(target.hp < 10000, `${kind} ${facing} must hit ${spawned ? 'the real spawned blue slime' : 'the short fixture'}`);
  }
});

test('J penetration/double-cast and K explosion/double-cast are live upgrade forms', () => {
  const flux = game(); flux.progress.upgrades['tharja-flux'] = 3;
  cast(flux, 'jab'); assert.equal(flux.tharja.effects.length, 2);
  assert.ok(flux.tharja.effects.every(effect => effect.pierce === 3));
  const ruin = game(); ruin.progress.upgrades['tharja-ruin'] = 3;
  cast(ruin, 'smash'); assert.equal(ruin.tharja.effects.length, 2);
  assert.ok(ruin.tharja.effects.every(effect => effect.blastRadius > 110));
  assert.ok(ruin.tharja.effects[0].vy !== ruin.tharja.effects[1].vy);
  const pierced = game(); pierced.progress.upgrades['tharja-flux'] = 2;
  const first = enemy(pierced, 140), second = enemy(pierced, 230), third = enemy(pierced, 320), fourth = enemy(pierced, 410);
  cast(pierced, 'jab'); magicTicks(pierced, 65);
  assert.ok([first, second, third].every(target => target.hp < 10000)); assert.equal(fourth.hp, 10000);
});

test('K detonates once per victim and breaks tactical guard on projectile impact', () => {
  const run = game(), target = enemy(run, 140, { role: 'guard', state: 'ready', stateTimer: 100, facing: -1 }), neighbor = enemy(run, 190);
  cast(run, 'smash'); magicTicks(run, 65);
  assert.ok(Math.abs(10000 - target.hp - THARJA_COMBAT.ruin.damage * 4.8) < 1e-8);
  assert.ok(Math.abs(10000 - neighbor.hp - THARJA_COMBAT.ruin.damage * 4.8) < 1e-8);
  assert.equal(target.state, 'recover'); assert.equal(run.tacticalStats.guardsBroken, 1);
});

test('dark projectiles respect facing, solid slopes, lifetime and pause', () => {
  const left = game(); left.player.facing = -1;
  const target = enemy(left, -210), wrongSide = enemy(left, 210);
  cast(left, 'jab'); magicTicks(left, 65); assert.ok(target.hp < 10000); assert.equal(wrongSide.hp, 10000);
  const blocked = game();
  blocked.world = { width: 1200, height: 1080, groundY: 920, terrain: [{ x: 0, y: 920 }, { x: 600, y: 920 }, { x: 800, y: 600 }, { x: 1200, y: 600 }], platforms: [] };
  blocked.player.x = 530; blocked.player.y = 920;
  const beyond = enemy(blocked, 370, { y: 920 });
  cast(blocked, 'jab'); blocked.pause();
  const frozen = plain(blocked.tharja.effects); ticks(blocked, 100); assert.deepEqual(plain(blocked.tharja.effects), frozen);
  blocked.pause(); magicTicks(blocked, 200); assert.equal(beyond.hp, 10000); assert.equal(blocked.tharja.effects.length, 0);
});

test('L empty, behind, arriving or escaped targets never heal; return has a real delay', () => {
  for (const state of ['empty', 'behind', 'arriving', 'escaped']) {
    const run = game(); run.player.hp = 40;
    const target = state === 'empty' ? null : enemy(run, state === 'behind' ? -130 : 130, state === 'arriving' ? { state: 'arriving', stateTimer: 1000, role: 'guard' } : {});
    cast(run, 'special'); assert.equal(run.player.hp, 40);
    if (state === 'escaped') target.x += 2000;
    magicTicks(run, 45); assert.equal(run.player.hp, 40, state);
  }
  const run = game(); run.player.hp = 40; const target = enemy(run, 130);
  cast(run, 'special'); magicTicks(run, 14); assert.equal(target.hp, 10000); assert.equal(run.player.hp, 40);
  magicTicks(run, 2); assert.ok(target.hp < 10000); assert.equal(run.player.hp, 52);
});

test('L healing uses actual damage, has a per-cast total cap, and clamps maximum HP', () => {
  const low = game(); low.player.hp = 40; enemy(low, 150, { hp: 1, maxHp: 1 });
  cast(low, 'special'); magicTicks(low, 20); assert.equal(low.player.hp, 40.45);
  const crowd = game(); crowd.player.hp = 20; crowd.progress.skillLevel = 5; crowd.progress.branch = 'tharja-coven';
  for (let i = 0; i < 5; i++) enemy(crowd, 100 + i * 45);
  cast(crowd, 'special'); assert.equal(crowd.tharja.effects[0].targetIds.length, 5); magicTicks(crowd, 20);
  assert.equal(crowd.player.hp, 40); assert.ok(crowd.enemies.every(target => target.hp < 10000));
  const full = game(); full.player.hp = 99; enemy(full, 150); cast(full, 'special'); magicTicks(full, 20); assert.equal(full.player.hp, 100);
});

test('L survives nonfatal hurt and hitstop, while voluntary dodge cancels pending drain', () => {
  const run = game(); run.player.hp = 50; enemy(run, 160); cast(run, 'special');
  const attack = run.player.attack, age = run.tharja.effects[0].age;
  run.player.invuln = 0; run.hurtPlayer(5); assert.equal(run.player.attack, attack);
  ticks(run, 4); assert.equal(run.tharja.effects[0].age, age); assert.equal(run.player.hp, 45);
  ticks(run, 20); assert.equal(run.player.hp, 57);
  const dodge = game(); dodge.player.hp = 40; enemy(dodge, 160); cast(dodge, 'special');
  dodge.setTouchAction('dodge', 'test-dodge', true); ticks(dodge); assert.equal(dodge.player.attack, null);
  magicTicks(dodge, 45); assert.equal(dodge.player.hp, 40);
});

test('I follows real slopes and platforms, rejects out-of-world casts and avoids other floors', () => {
  const slope = game(); slope.player.x = 1160; slope.player.y = slope.groundHeightAt(1160);
  cast(slope, 'secondary'); const domain = slope.tharja.effects.find(effect => effect.kind === 'mire');
  assert.ok(domain); assert.equal(domain.y, slope.groundHeightAt(domain.x));
  assert.ok(domain.ground.every(point => Math.abs(point.y - slope.groundHeightAt(point.x)) < .001));
  assert.ok(new Set(domain.ground.map(point => point.y)).size > 1);
  const platform = game(); platform.player.x = 2000; platform.player.y = 750;
  const same = enemy(platform, 190, { y: 750 }), lower = enemy(platform, 190, { y: 920 });
  // Cast directly to retain both test targets on their authored layers.
  platform.releaseTharja('secondary'); const field = platform.tharja.effects[0];
  assert.equal(field.y, 750); magicTicks(platform, 1); assert.ok(same.hp < 10000); assert.equal(lower.hp, 10000);
  const edge = game(); edge.player.x = edge.world.width - 50; cast(edge, 'secondary');
  assert.equal(edge.tharja.effects.length, 0);
});

test('I upgrades really extend duration, radius and pulse frequency and one manual cast replaces old domain', () => {
  const base = game(), improved = game(); improved.progress.secondaryLevel = 5; improved.progress.upgrades.range = 3;
  cast(base, 'secondary'); cast(improved, 'secondary');
  const a = base.tharja.effects[0], b = improved.tharja.effects[0];
  assert.ok(b.radius > a.radius && b.maxLife > a.maxLife && b.tickFrames < a.tickFrames && b.amount > a.amount);
  improved.releaseTharja('secondary'); assert.equal(improved.tharja.effects.filter(effect => effect.kind === 'mire').length, 1);
  magicTicks(improved, 700); assert.equal(improved.tharja.effects.length, 0);
});

test('spell state clears on defeat, rematch and character switch without posthumous healing', () => {
  const dead = game(); dead.player.hp = 10; enemy(dead, 150); cast(dead, 'special'); dead.player.invuln = 0;
  dead.hurtPlayer(100); assert.equal(dead.phase, 'defeat'); assert.equal(dead.tharja.effects.length, 0); ticks(dead, 100); assert.equal(dead.player.hp, 0);
  const rematch = game(); cast(rematch, 'secondary'); rematch.rematch(); assert.equal(rematch.tharja.effects.length, 0);
  rematch.releaseTharja('secondary'); rematch.start({ player: 0 }); assert.equal(rematch.tharja.effects.length, 0); assert.equal(rematch.char.id, 'raiden');
});

test('all Tharja forms have attainable bounded upgrades, correct text and no cards in other rosters', () => {
  let progress = makeInitialProgress('tharja'); const seen = new Set();
  for (let i = 0; i < 75; i++) {
    const choices = getUpgradeChoices(progress, () => .999999); if (!choices.length) break;
    const wanted = choices.find(choice => choice.id.startsWith('tharja-') && choice.kind !== 'branch') ?? choices[0];
    seen.add(wanted.id); progress = applyChoice(progress, wanted.id, choices); assert.ok(progress);
  }
  assert.equal(progress.upgrades['tharja-flux'], 3); assert.equal(progress.upgrades['tharja-ruin'], 3);
  assert.ok(seen.has('core') && seen.has('secondary')); assert.equal(getUpgradeChoices(progress).length, 0);
  const summary = getUpgradeSummary(progress); assert.ok(summary.some(choice => choice.id === 'tharja-flux')); assert.ok(summary.some(choice => choice.id === 'tharja-ruin'));
  assert.ok(!getSecondaryProfile('tharja', 5).description.includes('undefined'));
  assert.equal(getTharjaSurvivalProfile(progress).fluxCount, 2);
  for (const id of ['raiden', 'furina']) for (let i = 0; i < 25; i++) assert.ok(getUpgradeChoices(makeInitialProgress(id)).every(choice => !choice.id.startsWith('tharja-')));
});

let failures = 0;
for (const { name, run } of cases) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
games.forEach(run => run.destroy());
console.log(`\n${cases.length - failures}/${cases.length} Tharja survival checks passed.`);
process.exitCode = failures ? 1 : 0;
