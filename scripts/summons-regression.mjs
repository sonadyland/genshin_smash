import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/game/summons.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(`(function(exports,module){${output}\n})`, { console })(mod.exports, mod);
const { SummonRuntime } = mod.exports;
const owner = { id: 0, x: 300, feetY: 500, facing: 1, alive: true };
const target = { id: 100, x: 450, feetY: 500, width: 36, height: 72, alive: true };
const environment = (targets = [target], owners = [owner], surfaceAt = () => 500) => ({ owners, targets, surfaceAt });
const cases = [], test = (name, run) => cases.push({ name, run });

test('manual casts respect owners, cap repeated summons and place pillars on actual surfaces', () => {
  const runtime = new SummonRuntime(), other = { ...owner, id: 1, x: 700 };
  const context = environment([], [owner, other], x => x < 350 ? 460 : 540);
  runtime.castGeo(owner, context, { branch: 'geo-twin' });
  assert.equal(runtime.entities.length, 2);
  assert.equal(runtime.entities.find(entity => entity.x < 350).feetY, 460);
  assert.equal(runtime.entities.find(entity => entity.x > 350).feetY, 540);
  for (let i = 0; i < 20; i++) runtime.castSalon(other, context);
  assert.equal(runtime.entities.filter(entity => entity.ownerId === 1).length, 3);
  runtime.castGeo(owner, context);
  assert.equal(runtime.entities.filter(entity => entity.ownerId === 0).length, 1);
  runtime.clearOwner(0); assert.equal(runtime.entities.length, 3);
  assert.ok(runtime.effects.every(effect => effect.ownerId === 1));
});

test('no ground does not invent floating columns, but shield still works', () => {
  const runtime = new SummonRuntime(); runtime.castGeo(owner, environment([], [owner], () => null));
  assert.equal(runtime.entities.length, 0); assert.ok(runtime.getShield(0));
  assert.equal(runtime.absorb(0, 4), 0); assert.equal(runtime.getShield(0).hp, 15);
  assert.equal(runtime.absorb(0, 20), 5); assert.equal(runtime.getShield(0), undefined);
});

test('meteor and water curtain hit once at release, never damage their owning player', () => {
  const runtime = new SummonRuntime();
  const self = { ...target, id: 0, ownerId: 0, x: 300 };
  const context = environment([target, self]);
  runtime.castMeteor(owner, context); const hit = runtime.step(context);
  assert.equal(hit.length, 1); assert.equal(hit[0].kind, 'geo-meteor'); assert.equal(hit[0].controlFrames, 45);
  for (let i = 0; i < 60; i++) assert.equal(runtime.step(context).length, 0);
  runtime.castRevelry(owner, context); assert.equal(runtime.entities.length, 0);
  assert.equal(runtime.step(context).length, 1); assert.equal(runtime.damageMultiplier(0), 1.2);
  for (let i = 0; i < 360; i++) runtime.step(environment([]));
  assert.equal(runtime.damageMultiplier(0), 1);
});

test('three distinct salon attacks use windup, travel or area impact and cannot hit outside range', () => {
  const runtime = new SummonRuntime(); runtime.castSalon(owner, environment());
  runtime.effects = [];
  for (let i = 0; i < 27; i++) assert.equal(runtime.step(environment()).length, 0, `premature pet impact at tick ${i}`);
  const kinds = new Set();
  for (let i = 0; i < 260; i++) for (const hit of runtime.step(environment())) kinds.add(hit.kind);
  assert.ok(kinds.has('bubble')); assert.ok(kinds.has('water-pierce')); assert.ok(kinds.has('crab-splash'));
  const remote = new SummonRuntime(); remote.castSalon(owner, environment([{ ...target, x: 3000 }])); remote.effects = [];
  for (let i = 0; i < 260; i++) assert.equal(remote.step(environment([{ ...target, x: 3000 }])).length, 0);
});

test('a pet losing its target cannot hit a dead target or switch to a distant replacement mid swing', () => {
  const runtime = new SummonRuntime(); runtime.castSalon(owner, environment()); runtime.effects = [];
  for (let i = 0; i < 20; i++) runtime.step(environment());
  const gone = environment([{ ...target, alive: false }, { ...target, id: 101, x: 3000 }]);
  for (let i = 0; i < 150; i++) assert.equal(runtime.step(gone).length, 0);
});

test('pets follow and relocate after large owner movement without mutating the owner control state', () => {
  const runtime = new SummonRuntime(), moved = { ...owner, x: 1800, feetY: 720, facing: -1 };
  runtime.castSalon(owner, environment([]));
  const saved = JSON.stringify(moved); runtime.step(environment([], [moved], () => 720));
  assert.ok(runtime.entities.every(entity => Math.abs(entity.x - moved.x) < 100));
  assert.ok(runtime.entities.every(entity => entity.feetY === 720)); assert.equal(JSON.stringify(moved), saved);
});

test('summons and effects expire, and dead owners clear shields and buffs immediately', () => {
  const runtime = new SummonRuntime(); runtime.castSalon(owner, environment()); runtime.castGeo(owner, environment()); runtime.castRevelry(owner, environment());
  for (let i = 0; i < 780; i++) runtime.step(environment([]));
  assert.equal(runtime.entities.length, 0); assert.equal(runtime.effects.length, 0); assert.equal(runtime.getShield(0), undefined); assert.equal(runtime.getBuff(0), undefined);
  runtime.castSalon(owner, environment()); runtime.castGeo(owner, environment()); runtime.castRevelry(owner, environment());
  runtime.step(environment([target], [{ ...owner, alive: false }]));
  assert.equal(runtime.entities.length, 0); assert.equal(runtime.effects.length, 0); assert.equal(runtime.getShield(0), undefined); assert.equal(runtime.getBuff(0), undefined);
});

test('upgrade branches change real damage geometry and limited shield resonance', () => {
  const runtime = new SummonRuntime();
  runtime.castGeo(owner, environment(), { mainLevel: 5, branch: 'geo-shield', rangeMultiplier: 1.2 }); runtime.effects = [];
  const close = environment([{ ...target, x: 310 }]);
  let shieldPulse = false;
  for (let i = 0; i < 120; i++) {
    for (const hit of runtime.step(close)) if (hit.x === owner.x && hit.kind === 'geo-pulse') shieldPulse = true;
  }
  assert.equal(shieldPulse, true); assert.equal(runtime.getShield(0).maxHp, 43);
  runtime.castMeteor(owner, close, { secondaryLevel: 5, rangeMultiplier: 1.2 });
  const meteor = runtime.effects.find(effect => effect.kind === 'geo-meteor');
  assert.equal(meteor.radius, 246); assert.equal(meteor.amount, 34); assert.equal(meteor.controlFrames, 65);
});

let failures = 0;
for (const { name, run } of cases) { try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); } }
console.log(`\n${cases.length - failures}/${cases.length} summon runtime checks passed.`);
process.exitCode = failures ? 1 : 0;
