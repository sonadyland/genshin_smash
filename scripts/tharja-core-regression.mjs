import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..'), noop = () => undefined;
const gradient = { addColorStop: noop };
const drawing = new Proxy({}, { get: (target, key) => target[key] ?? (key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : noop), set: (target, key, value) => { target[key] = value; return true; } });
const canvas = () => ({ width: 0, height: 0, getContext: () => drawing });
class HTMLElement { tagName = 'DIV'; isContentEditable = false; }
const context = vm.createContext({ console, HTMLElement, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  window: { addEventListener: noop, removeEventListener: noop }, document: { addEventListener: noop, removeEventListener: noop, createElement: canvas, hidden: false } });
const modules = new Map();
const art = { acquireGameArt: () => ({ ready: Promise.resolve(), release: noop }), getTharjaCastOrigin: (x, y, _height, _kind, facing) => ({ x: x + facing * 29, y: y - 88 }),
  getCharacterCastOrigin: (_id, x, y, _height, _animation, facing) => ({ x: x + facing * 17, y: y - 75 }) };
function load(file) {
  if (file.endsWith('/art.ts')) return new Proxy(art, { get: (target, key) => target[key] ?? (() => false) });
  if (file.endsWith('/summoner-art.ts')) return { drawSummonArt: () => false };
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} }; modules.set(file, mod);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = specifier => load(path.resolve(path.dirname(file), `${specifier}.ts`).replaceAll('\\', '/'));
  vm.runInContext(`(function(exports,require,module){${output}\n})`, context)(mod.exports, require, mod); return mod.exports;
}
const { TharjaRuntime, THARJA_COMBAT, drawTharjaEffects } = load(`${root}/src/game/tharja.ts`.replaceAll('\\', '/'));
const { CHARACTERS, STAGE } = load(`${root}/src/game/data.ts`.replaceAll('\\', '/'));
const { Game } = load(`${root}/src/game/engine.ts`.replaceAll('\\', '/'));
const owner = { id: 0, x: 300, feetY: 500, facing: 1, alive: true }, origin = { x: 329, y: 412 };
const target = (id = 100, x = 450, feetY = 500) => ({ id, ownerId: 1, x, feetY, width: 38, height: 96, alive: true });
const environment = (targets = [target()], changes = {}) => ({ owners: [owner], targets, surfaceAt: () => 500, ...changes });
const advance = (runtime, ctx, count) => Array.from({ length: count }, () => runtime.step(ctx)).flat();
const cases = [], test = (name, run) => cases.push({ name, run });
const games = [], blank = { left: false, right: false, up: false, down: false, jab: false, smash: false, special: false, secondary: false, downPressed: false, dodge: false };
function game() {
  const result = new Game(canvas()); result.setMuted(true); result.start({ mode: 'pvp', player: CHARACTERS.findIndex(c => c.id === 'tharja'), opponent: 0, difficulty: 'normal', stocks: 3, duration: 180, items: false });
  result.state = 'fight'; games.push(result); return result;
}

test('registered release clocks and total durations follow approved JSON, with tome equipment', () => {
  const char = CHARACTERS.find(c => c.id === 'tharja'); assert.equal(char.weapon, 'tome');
  for (const kind of ['jab', 'smash', 'special', 'secondary']) {
    const clip = JSON.parse(fs.readFileSync(path.join(root, `public/previews/tharja-v2/${kind}.json`)));
    const ms = clip.frames.slice(0, clip.releaseFrame).reduce((sum, frame) => sum + frame.durationMs, 0), total = clip.frames.reduce((sum, frame) => sum + frame.durationMs, 0), def = char[kind];
    assert.equal(def.startup, Math.ceil(ms * .06)); assert.equal(def.startup + def.active + def.endlag, Math.ceil(total * .06));
  }
});
test('idle never spawns autonomous attacks; expired effects stop and dead owners clear', () => {
  const runtime = new TharjaRuntime(); assert.equal(advance(runtime, environment(), 300).length, 0); assert.equal(runtime.effects.length, 0);
  runtime.cast('flux', owner, origin, environment([])); advance(runtime, environment([]), 68); assert.equal(runtime.effects.length, 0);
  runtime.cast('mire', owner, origin, environment()); runtime.step(environment([], { owners: [{ ...owner, alive: false }] })); assert.equal(runtime.effects.length, 0);
});
test('Flux travels from the palm, hits only in its forward lane and has per-projectile hit limits', () => {
  const runtime = new TharjaRuntime(), front = target(), behind = target(101, 270), above = target(102, 450, 350), ally = { ...target(103, 360), ownerId: 0 };
  const ctx = environment([front, behind, above, ally]); runtime.cast('flux', owner, origin, ctx);
  assert.equal(runtime.effects[0].x, origin.x); assert.equal(runtime.step(ctx).length, 0);
  const hits = advance(runtime, ctx, 70); assert.equal(hits.length, 1); assert.equal(hits[0].targetId, front.id); assert.equal(hits[0].facing, 1);
  const upgraded = new TharjaRuntime(); upgraded.cast('flux', owner, origin, environment([target(1, 370), target(2, 450), target(3, 530)]), { pierce: 3 });
  assert.equal(advance(upgraded, environment([target(1, 370), target(2, 450), target(3, 530)]), 70).length, 3);
});
test('left-facing projectile mirrors correctly and blocked terrain consumes it without remote damage', () => {
  const runtime = new TharjaRuntime(), left = { ...owner, facing: -1 }, ctx = environment([target(1, 180)], { owners: [left] });
  runtime.cast('flux', left, { x: 271, y: 412 }, ctx); assert.ok(runtime.effects[0].vx < 0); assert.equal(advance(runtime, ctx, 60).length, 1);
  runtime.cast('ruin', owner, origin, environment()); assert.equal(advance(runtime, environment([target()], { projectileBlocked: () => true }), 80).length, 0);
});
test('real raised-hand origins descend along a visible fixed arc to hit nearby and distant small ground targets', () => {
  for (const [name, kind] of [['jab', 'flux'], ['smash', 'ruin']]) for (const facing of [-1, 1]) for (const distance of [65, 240]) {
    const clip = JSON.parse(fs.readFileSync(path.join(root, `public/previews/tharja-v2/${name}.json`))), frame = clip.frames[clip.releaseFrame], scale = 112 / clip.sheets[frame.sheet].standingBodyHeight;
    const source = { ...owner, facing }, palm = { x: owner.x + (frame.castOrigin[0] - frame.pivot[0]) * scale * facing, y: owner.feetY + (frame.castOrigin[1] - frame.pivot[1]) * scale };
    const small = { ...target(1, owner.x + facing * distance), width: 54, height: 43.2 }, ctx = environment([small], { owners: [source] });
    const runtime = new TharjaRuntime(); runtime.cast(kind, source, palm, ctx);
    assert.equal(runtime.effects[0].y, palm.y); assert.ok(advance(runtime, ctx, 70).some(hit => hit.targetId === small.id), `${name},${facing},${distance}`);
  }
});
test('Ruin detonates once on collision, damages a local area without duplicate direct damage', () => {
  const runtime = new TharjaRuntime(), ctx = environment([target(1, 400), target(2, 430), target(3, 650)]);
  runtime.cast('ruin', owner, origin, ctx); const hits = advance(runtime, ctx, 100);
  assert.equal(hits.length, 2); assert.deepEqual([...hits.map(hit => hit.targetId)].sort(), [1, 2]); assert.ok(hits.every(hit => hit.amount === 17));
});
test('Nosferatu locks at release, damages at return gesture, never heals empty/invalid or switched targets', () => {
  const runtime = new TharjaRuntime(), ctx = environment(); runtime.cast('nosferatu', owner, origin, ctx);
  assert.equal(advance(runtime, ctx, 16).length, 0); const hits = runtime.step(ctx); assert.equal(hits.length, 1); assert.equal(hits[0].heal, 7);
  assert.equal(advance(runtime, ctx, 40).length, 0);
  for (const invalid of [[], [{ ...target(), alive: false }], [target(999)]]) {
    const probe = new TharjaRuntime(); probe.cast('nosferatu', owner, origin, ctx); assert.equal(advance(probe, environment(invalid), 40).length, 0);
  }
  const empty = new TharjaRuntime(); empty.cast('nosferatu', owner, origin, environment([])); assert.equal(advance(empty, ctx, 40).length, 0);
});
test('Nosferatu cancellation, visibility, moving palm and multi-target total healing budget are bounded', () => {
  const runtime = new TharjaRuntime(), ctx = environment([target(1, 390), target(2, 440), target(3, 480)], { castOriginAt: () => ({ x: 317, y: 417 }) });
  runtime.cast('nosferatu', owner, origin, ctx, { drainTargets: 3, healCap: 20 }); runtime.step(ctx);
  assert.equal(runtime.effects[0].originX, 317); assert.equal(runtime.effects[0].targets.length, 3);
  const hits = advance(runtime, ctx, 35); assert.equal(hits.length, 3); assert.equal(hits.reduce((sum, hit) => sum + hit.heal, 0), 20);
  runtime.cast('nosferatu', owner, origin, ctx); runtime.cancelDrain(0); assert.equal(advance(runtime, ctx, 36).length, 0);
  runtime.cast('nosferatu', owner, origin, { ...ctx, projectileBlocked: () => true }); assert.equal(advance(runtime, ctx, 36).length, 0);
});
test('Mire requires connected actual ground and does not strike above platforms, through floors or below cliffs', () => {
  const runtime = new TharjaRuntime(); runtime.cast('mire', owner, origin, environment([], { surfaceAt: () => null })); assert.equal(runtime.effects.length, 0);
  const terrain = x => x > 545 ? 650 : x < 430 ? null : 500;
  const ctx = environment([target(1, 490), target(2, 490, 400), target(3, 555, 650), target(4, 490, 600)], { surfaceAt: terrain });
  runtime.cast('mire', owner, origin, ctx); const field = runtime.effects[0]; assert.ok(field.ground.every(point => point.x >= 430 && point.x <= 545));
  const hits = advance(runtime, ctx, 240); assert.equal(hits.length, 6); assert.ok(hits.every(hit => hit.targetId === 1)); assert.equal(runtime.effects.length, 0);
});
test('Mire follows slopes and recast replaces existing owner field; hard effect budgets hold', () => {
  const runtime = new TharjaRuntime(), ctx = environment([], { surfaceAt: x => 500 + (x - 490) * .2 });
  runtime.cast('mire', owner, origin, ctx); const field = runtime.effects[0]; assert.ok(field.ground.at(-1).y > field.ground[0].y);
  for (let i = 0; i < 120; i++) runtime.cast('mire', owner, origin, ctx); assert.equal(runtime.effects.length, 1);
  for (let i = 0; i < 120; i++) runtime.cast('flux', owner, origin, ctx); assert.ok(runtime.effects.length <= 96);
  runtime.clearOwner(0); assert.equal(runtime.effects.length, 0);
});
test('all four actual engine attacks release once at registered palm and never get default melee boxes', () => {
  for (const kind of ['jab', 'smash', 'special', 'secondary']) for (const facing of [-1, 1]) {
    const g = game(), f = g.fighters[0]; f.x = 600; f.facing = facing; g.fighters[1].invuln = 999;
    g.startAttack(f, f.char[kind]);
    for (let frame = 0; frame < f.char[kind].startup - 1; frame++) g.updateFighter(f, blank);
    assert.equal(g.darkMagic.effects.length, 0); g.updateFighter(f, blank); assert.equal(g.darkMagic.effects.length, 1); assert.equal(g.attackHitbox(f), null);
    const effect = g.darkMagic.effects[0]; if (kind !== 'secondary') { assert.equal(effect.x, f.x + facing * 29); assert.equal(effect.y, f.y + f.h - 88); }
    for (let frame = 0; frame < 140; frame++) g.updateFighter(f, blank); assert.equal(g.darkMagic.effects.length, 1); assert.equal(f.attack, null);
  }
});
test('actual versus drain heals only damage beyond shielding; hitstun cancels pending drain', () => {
  for (const shield of [false, true]) {
    const g = game(), [f, victim] = g.fighters; f.x = 500; f.percent = 30; victim.x = 650;
    if (shield) g.summons.castGeo(g.summonOwner(victim), g.summonContext());
    g.darkMagic.cast('nosferatu', g.summonOwner(f), { x: 529, y: STAGE.main.y - 88 }, g.tharjaContext());
    for (let i = 0; i <= 16; i++) g.updateDarkMagic();
    assert.equal(f.percent, shield ? 30 : 30 - 13 * .45); assert.equal(victim.percent, shield ? 0 : 13);
  }
  const g = game(), [f, victim] = g.fighters; f.x = 500; victim.x = 650;
  g.darkMagic.cast('nosferatu', g.summonOwner(f), { x: 529, y: STAGE.main.y - 88 }, g.tharjaContext());
  g.applyHit(victim, f, victim.char.jab); assert.equal(g.darkMagic.effects.length, 0);
});
test('ranged CPU can cast at distance, pause freezes effects and rematch/destroy clear ownership', () => {
  const g = game(), [f, victim] = g.fighters; f.x = 500; victim.x = 830; f.aiThink = 0; f.secondaryCooldown = 999;
  assert.equal(g.cpuInput(f).jab, true);
  g.darkMagic.cast('flux', g.summonOwner(f), { x: 529, y: 452 }, g.tharjaContext()); g.state = 'paused'; const age = g.darkMagic.effects[0].age;
  for (let i = 0; i < 20; i++) g.update(); assert.equal(g.darkMagic.effects[0].age, age);
  g.startMatch(); assert.equal(g.darkMagic.effects.length, 0); g.darkMagic.cast('flux', owner, origin, environment()); g.destroy(); assert.equal(g.darkMagic.effects.length, 0);
});
test('two Tharja owners cannot hurt themselves, and KO/respawn remove their own fields and locked drains', () => {
  const g = game(), [first, second] = g.fighters; second.char = first.char; first.x = 500; second.x = 690; first.facing = 1; second.facing = -1;
  for (const f of [first, second]) g.darkMagic.cast('mire', g.summonOwner(f), { x: f.x, y: f.y }, g.tharjaContext());
  g.updateDarkMagic(); assert.equal(first.percent, 3.2); assert.equal(second.percent, 3.2);
  g.respawn(first); assert.ok(g.darkMagic.effects.every(effect => effect.ownerId === second.idx));
  g.respawn(second); assert.equal(g.darkMagic.effects.length, 0);
});
test('all shared dark effects render as separate layers without changing simulation', () => {
  const runtime = new TharjaRuntime(), ctx = environment(); for (const kind of ['flux', 'ruin', 'nosferatu', 'mire']) runtime.cast(kind, owner, origin, ctx);
  const before = JSON.stringify(runtime.effects); drawTharjaEffects(drawing, runtime.effects); drawTharjaEffects(drawing, runtime.effects); assert.equal(JSON.stringify(runtime.effects), before);
});

let failures = 0;
for (const { name, run } of cases) { try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); } }
for (const g of games) g.destroy(); console.log(`\n${cases.length - failures}/${cases.length} Tharja core checks passed.`); process.exitCode = failures ? 1 : 0;
