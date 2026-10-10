import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Exercise the actual engines and both real rendering paths, with Canvas calls recorded.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const noop = () => undefined;
const trace = [];
const gradient = { addColorStop: noop };
const drawing = new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return text => ({ width: String(text).length * 8 });
    return (...args) => {
      trace.push([key, ...args]);
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return gradient;
    };
  },
  set(target, key, value) { trace.push(['set', key, value]); target[key] = value; return true; },
});
const canvas = () => ({ width: 0, height: 0, getContext: () => drawing });
let seed = 1, randomCalls = 0;
const math = Object.create(Math);
math.random = () => { randomCalls++; seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const context = vm.createContext({
  console, Math: math, performance: { now: () => 0 },
  requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
  window: { addEventListener: noop, removeEventListener: noop },
  document: { addEventListener: noop, removeEventListener: noop, hidden: false, createElement: canvas },
  HTMLElement: class {},
});
const plain = value => JSON.parse(JSON.stringify(value, (_key, item) => Object.prototype.toString.call(item) === '[object Set]' ? [...item] : item));
const modules = new Map();
function loadModule(file) {
  if (file.endsWith('/summoner-art.ts')) return { drawSummonArt: (_canvas, kind, x, feetY, height, options) => { trace.push(['summon', kind, x, feetY, height, plain(options)]); return true; } };
  if (file.endsWith('/art.ts')) return {
    acquireGameArt: () => ({ ready: Promise.resolve(), release: noop }),
    drawArenaBackground: () => true, drawCharacterArt: () => true,
    drawFighterArt: (_canvas, id, x, y, height, animation, options) => { trace.push(['fighter', id, x, y, height, plain(animation), plain(options)]); return true; },
    drawElementEffect: () => true, drawSecondaryEffect: () => true,
    drawXiaoPlungeEffect: () => true, hasRegisteredMeleeTrail: () => false,
  };
  if (modules.has(file)) return modules.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} }; modules.set(file, mod);
  const require = specifier => loadModule(path.resolve(path.dirname(file), `${specifier}.ts`).replaceAll('\\', '/'));
  vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename: file })(mod.exports, require, mod);
  return mod.exports;
}
const { Game } = loadModule(path.join(root, 'src/game/engine.ts').replaceAll('\\', '/'));
const { SurvivalGame } = loadModule(path.join(root, 'src/game/survival-engine.ts').replaceAll('\\', '/'));
const { renderSurvival } = loadModule(path.join(root, 'src/game/survival-render.ts').replaceAll('\\', '/'));
const cases = [];
const games = [];
const test = (name, run) => cases.push({ name, run });
const stateKeys = {
  pvp: ['frame', 'state', 'remainingFrames', 'fighters', 'items', 'projectiles', 'particles', 'texts', 'impacts', 'afterimages', 'shake', 'shakeOffset', 'flash', 'itemTimer'],
  survival: ['phase', 'frame', 'elapsed', 'hitstop', 'player', 'enemies', 'orbs', 'shots', 'fields', 'effects', 'texts', 'summons', 'camera', 'progress', 'level', 'xp', 'kills', 'damageDealt', 'pendingAttack', 'spawnTimer', 'nextId'],
};
function state(game, mode) { return plain(Object.fromEntries(stateKeys[mode].map(key => [key, game[key]]))); }
function simulate(mode, quality) {
  seed = 61823; randomCalls = 0;
  const element = canvas();
  const game = mode === 'pvp' ? new Game(element) : new SurvivalGame(element);
  games.push(game); game.setMuted(true); game.setVisualQuality(quality);
  if (mode === 'pvp') {
    game.start({ mode: 'pvp', player: 0, opponent: 1, difficulty: 'normal', stocks: 3, duration: 180, items: true });
    for (let tick = 0; tick < 150; tick++) { game.frame++; game.update(); }
  } else game.start({ player: 0 });
  for (let tick = 0; tick < 180; tick++) {
    for (const [action, interval] of [['jump', 67], ['jab', 31], ['secondary', 107]]) {
      if (tick % interval === 0) game.setTouchAction(action, action, true);
      if (tick % interval === 1) game.setTouchAction(action, action, false);
    }
    if (tick === 1) game.setTouchAction('right', 'move', true);
    if (tick === 41) game.setTouchAction('right', 'move', false);
    if (mode === 'pvp') game.frame++;
    game.update();
  }
  return { game, element, simulation: state(game, mode), randomCalls, seed };
}

for (const mode of ['pvp', 'survival']) test(`${mode} visual presets preserve complete simulation, RNG, frame timing and fixed resolution`, () => {
  const standard = simulate(mode, 'standard');
  const low = simulate(mode, 'low');
  assert.deepEqual(low.simulation, standard.simulation);
  assert.equal(low.randomCalls, standard.randomCalls); assert.equal(low.seed, standard.seed);
  assert.equal(low.element.width, 1280); assert.equal(low.element.height, 720);
  assert.equal(low.game.getSnapshot().visualQuality, 'low');
  low.game.setVisualQuality('standard'); assert.equal(low.game.getSnapshot().visualQuality, 'standard');
  assert.deepEqual(state(low.game, mode), low.simulation);
});

function renderTrace(game, mode, quality) {
  game.setVisualQuality(quality);
  const before = state(game, mode), beforeRandom = randomCalls;
  trace.length = 0;
  if (mode === 'pvp') game.render(); else renderSurvival(game);
  assert.deepEqual(state(game, mode), before, 'drawing must never mutate battle state');
  assert.equal(randomCalls, beforeRandom, 'drawing cannot consume gameplay randomness');
  return [...trace];
}
const positiveGlows = calls => calls.filter(([op, property, value]) => op === 'set' && property === 'shadowBlur' && value > 0);

test('PVP light rendering removes canvas glows and draws fewer cosmetic particles while keeping fighter poses', () => {
  const { game } = simulate('pvp', 'standard');
  game.particles = Array.from({ length: 12 }, (_, index) => ({ x: 550 + index, y: 300, vx: 0, vy: 0, life: 20, maxLife: 30, color: '#abcdef', size: 3, grav: 0 }));
  const standard = renderTrace(game, 'pvp', 'standard');
  const low = renderTrace(game, 'pvp', 'low');
  assert.ok(positiveGlows(standard).length > 0); assert.equal(positiveGlows(low).length, 0);
  assert.deepEqual(low.filter(([op]) => op === 'fighter'), standard.filter(([op]) => op === 'fighter'));
  assert.equal(standard.filter(([op, property, value]) => op === 'set' && property === 'fillStyle' && value === '#abcdef').length, 12);
  assert.equal(low.filter(([op, property, value]) => op === 'set' && property === 'fillStyle' && value === '#abcdef').length, 4);
  assert.equal(game.particles.length, 12, 'all twelve particles still belong to the simulation');
});

test('survival light rendering removes pickup/projectile/field glows without hiding threats, pickups or characters', () => {
  const { game } = simulate('survival', 'standard');
  const x = game.player.x, y = game.player.y;
  game.orbs.push({ x: x + 14, y: y - 20, vy: 0, value: 5, heal: false, age: 10 });
  game.shots.push({ x: x + 30, y: y - 70, startX: x, vx: -5, vy: 1, age: 1, life: 90, radius: 12, damage: 9, owner: 'enemy', color: '#f89666', hit: new Set(), returning: false, returned: false, kind: 'fire' });
  game.fields.push({ x, y: y - 20, radius: 90, age: 2, life: 150, damage: 5, kind: 'vortex', tick: 0 });
  const standard = renderTrace(game, 'survival', 'standard');
  const low = renderTrace(game, 'survival', 'low');
  assert.ok(positiveGlows(standard).length >= 2); assert.equal(positiveGlows(low).length, 0);
  assert.ok(low.filter(([op]) => op === 'createRadialGradient').length < standard.filter(([op]) => op === 'createRadialGradient').length);
  assert.deepEqual(low.filter(([op]) => op === 'fighter'), standard.filter(([op]) => op === 'fighter'));
  assert.deepEqual(low.filter(([op]) => op === 'translate'), standard.filter(([op]) => op === 'translate'));
  assert.deepEqual(low.filter(([op]) => op === 'ellipse'), standard.filter(([op]) => op === 'ellipse'));
});

let failures = 0;
for (const { name, run } of cases) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
for (const game of games) game.destroy();
console.log(`\n${cases.length - failures}/${cases.length} visual quality regression checks passed.`);
process.exitCode = failures ? 1 : 0;
