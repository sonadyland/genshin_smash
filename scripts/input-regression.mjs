import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/game/input.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(`(function(exports) { ${compiled}\n})`)(exports);
const { BattleInput } = exports;
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('independent fingers can move, jump and attack at once without releasing each other', () => {
  const input = new BattleInput();
  input.setTouchAction('right', 'left-thumb', true);
  input.setTouchAction('jump', 'right-thumb', true);
  input.setTouchAction('jab', 'third-finger', true);
  assert.equal(input.horizontal(), 1);
  assert.equal(input.justPressed('jump'), true);
  assert.equal(input.justPressed('jab'), true);
  input.setTouchAction('jab', 'third-finger', false);
  assert.equal(input.held('jump'), true); assert.equal(input.horizontal(), 1);
});

test('held attacks never repeat, while a new physical press creates one new edge', () => {
  const input = new BattleInput();
  input.setTouchAction('secondary', 'skill', true); assert.equal(input.justPressed('secondary'), true);
  input.endTick();
  for (let tick = 0; tick < 600; tick++) {
    input.setTouchAction('secondary', 'skill', true);
    assert.equal(input.justPressed('secondary'), false);
    input.endTick();
  }
  input.setTouchAction('secondary', 'skill', false); input.setTouchAction('secondary', 'skill', true);
  assert.equal(input.justPressed('secondary'), true);
});

test('two jump sources preserve ownership and can trigger a deliberate second jump', () => {
  const input = new BattleInput();
  input.setTouchAction('jump', 'dpad-up', true); input.endTick();
  input.setTouchAction('jump', 'jump-button', true);
  assert.equal(input.justPressed('jump'), true);
  input.setTouchAction('jump', 'dpad-up', false); input.endTick();
  assert.equal(input.held('jump'), true); assert.equal(input.justPressed('jump'), false);
  input.setTouchAction('jump', 'jump-button', false); assert.equal(input.held('jump'), false);
});

test('simultaneous jump sources are coalesced into one tick and short taps survive release', () => {
  const input = new BattleInput();
  input.setTouchAction('jump', 'up', true); input.setTouchAction('jump', 'jump', true);
  input.setTouchAction('jump', 'up', false); input.setTouchAction('jump', 'jump', false);
  assert.equal(input.held('jump'), false); assert.equal(input.justPressed('jump'), true);
  input.endTick(); assert.equal(input.justPressed('jump'), false);
});

test('keyboard and touch share logical controls but retain independent held ownership', () => {
  const input = new BattleInput();
  input.setKey('KeyA', true); input.setTouchAction('left', 'move', true);
  input.setKey('KeyA', false); assert.equal(input.horizontal(), -1);
  input.setKey('KeyW', true); input.endTick(); input.setTouchAction('jump', 'up', true);
  assert.equal(input.justPressed('jump'), true);
  input.setTouchAction('jump', 'up', false); assert.equal(input.held('jump'), true);
  input.clearTouch(); assert.equal(input.held('jump'), true);
});

test('opposite directions neutralize regardless of source and resolve when one is released', () => {
  const input = new BattleInput();
  input.setKey('KeyA', true); input.setTouchAction('right', 'right', true);
  assert.equal(input.horizontal(), 0);
  input.setKey('KeyA', false); assert.equal(input.horizontal(), 1);
});

test('P2 keyboard aliases remain independent of P1 touch and have separate action edges', () => {
  const input = new BattleInput();
  input.setTouchAction('special', 'skill', true); input.setKey('ArrowLeft', true); input.setKey('Quote', true);
  assert.equal(input.justPressed('special', 1), false); assert.equal(input.justPressed('secondary', 1), true);
  assert.equal(input.justPressed('secondary', 0), false); assert.equal(input.horizontal(1), -1);
});

test('pause clearing blocks old fingers and clears keyboard state without requiring a lost keyup', () => {
  const input = new BattleInput();
  input.setTouchAction('right', 'move', true); input.setTouchAction('jab', 'attack', true); input.setKey('KeyW', true);
  input.clear();
  input.setTouchAction('right', 'move', true); input.setTouchAction('jab', 'attack', true);
  assert.equal(input.horizontal(), 0); assert.equal(input.justPressed('jab'), false); assert.equal(input.justPressed('jump'), false);
  input.setTouchAction('right', 'move', false); input.setTouchAction('right', 'move', true);
  input.setKey('KeyW', true);
  assert.equal(input.horizontal(), 1); assert.equal(input.justPressed('jump'), true);
});

test('presses begun in a menu or countdown cannot leak into gameplay', () => {
  const input = new BattleInput();
  input.setTouchAction('jab', 'menu-finger', true, false); input.setKey('KeyL', true, false);
  input.endTick(); input.setTouchAction('jab', 'menu-finger', true);
  assert.equal(input.justPressed('jab'), false); assert.equal(input.justPressed('special'), false);
  input.setTouchAction('jab', 'menu-finger', false); input.setTouchAction('jab', 'menu-finger', true);
  assert.equal(input.justPressed('jab'), true);
});

let failures = 0;
for (const { name, run } of cases) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} input regression checks passed.`);
process.exitCode = failures ? 1 : 0;
