import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd(), modules = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (modules.has(file)) return modules.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }; modules.set(file, module);
  vm.runInNewContext(`(function(exports,require,module){${output}\n})`)(module.exports, name => load(path.resolve(path.dirname(file), `${name}.ts`)), module);
  return module.exports;
}
const { createPreviewClock, advancePreviewClock, previewFrame } = load('src/game/animation-preview-state.ts');
const { getCorrinMoves, newCorrinState, startCorrinTransform } = load('src/game/corrin.ts');
const base = { character: 'corrin', clip: 'idle', survival: false, paused: true, speed: 1, facing: 1, slope: 0, corrinForm: 'human' };
let checks = 0;
for (const corrinForm of ['human', 'dragon']) {
  for (const clip of ['jab', 'smash', 'secondary']) {
    const clock = createPreviewClock(), settings = { ...base, corrinForm, clip };
    const frame = previewFrame(clock, settings);
    assert.equal(frame.animation.attack.def.name, getCorrinMoves(corrinForm)[clip].name);
    assert.equal(frame.animation.attack.corrinForm, corrinForm);
    for (let combo = 0; combo < 3; combo++) {
      clock.tick = frame.cycle * combo;
      assert.equal(previewFrame(clock, settings).animation.attack.corrinCombo, combo);
    }
    const before = clock.tick;
    advancePreviewClock(clock, 80, { ...settings, facing: -1, slope: .24 });
    assert.equal(clock.tick, before, 'paused view adjustments never advance the simulation');
    checks++;
  }
  for (const transformAir of [false, true]) {
    const settings = { ...base, clip: 'special', corrinForm, transformAir }, clock = createPreviewClock();
    const state = newCorrinState(); state.form = corrinForm; startCorrinTransform(state, transformAir);
    const transform = state.transform;
    clock.tick = transform.commit - 1;
    assert.equal(previewFrame(clock, settings).animation.corrin.form, corrinForm);
    clock.tick++;
    assert.equal(previewFrame(clock, settings).animation.corrin.form, transform.to);
    const middle = previewFrame(clock, settings);
    assert.equal(middle.animation.corrin.transform.airborne, transformAir);
    assert.equal(middle.animation.onGround, !transformAir);
    assert.equal(middle.y < 0, transformAir);
    clock.tick = transform.duration;
    assert.equal(previewFrame(clock, settings).animation.corrin.transform, undefined);
    assert.equal(previewFrame(clock, settings).animation.corrin.form, transform.to);
    checks++;
  }
}
console.log(`PASS ${checks} Corrin preview timing, form, combo and paused-state checks`);
