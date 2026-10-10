import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activePacks = JSON.parse(fs.readFileSync(path.join(root, 'src/game/animation-packs.json'), 'utf8'));
const modules = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} }; modules.set(file, mod);
  vm.runInNewContext(`(function(exports,require,module){${output}\n})`)(mod.exports, name => load(path.relative(root, path.resolve(path.dirname(file), `${name}.ts`))), mod);
  return mod.exports;
}
const { EULA_CLIPS, EULA_ATTACKS, VARIANT_ATTACKS, validClipManifest, validVariantClips, newMotionState, advanceMotion, selectClipFrame, selectedClip } = load('src/game/clip-animation.ts');
const { CHARACTERS } = load('src/game/data.ts');
const { attackPhase } = load('src/game/animation.ts');
const { createPreviewClock, advancePreviewClock, previewFrame } = load('src/game/animation-preview-state.ts');
const eula = CHARACTERS.find(character => character.id === 'eula');
const phases = ['windup', 'contact', 'followthrough', 'recover'];
const clone = value => JSON.parse(JSON.stringify(value));
function manifestFixture() {
  return { version: 1, character: 'eula', clips: Object.fromEntries(EULA_CLIPS.map(name => {
    const attack = ['jab', 'smash', 'special', 'secondary'].includes(name);
    const count = ['idle', 'dodge'].includes(name) ? 4 : ['special', 'secondary'].includes(name) ? 12 : 8;
    return [name, { image: `${name}.png`, width: 1600, height: 1200, standingBodyHeightPixels: 240, frames: Array.from({ length: count }, (_, i) => ({
      sourceRect: { x: i % 4 * 400, y: Math.floor(i / 4) * 400, width: 400, height: 400 }, footAnchor: { x: 0.5, y: 0.9 }, duration: name === 'idle' ? 10 : 6,
      ...(attack ? { phase: phases[Math.floor(i / (count / 4))], weaponTip: { x: 330 - i * 10, y: 100 + i * 6 } } : {}),
      ...(name === 'jump' ? { name: ['takeoff', 'rise', 'rise', 'apex', 'fall', 'fall', 'land', 'land'][i] } : {}),
    })) }];
  })) };
}
const manifest = manifestFixture();
const extended = { ...clone(manifest), variants: Object.fromEntries(VARIANT_ATTACKS.map(kind => [kind, { ...clone(manifest.clips[kind]), image: `${kind}-alternate.png` }])) };
const base = () => ({ state: 'free', attack: null, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 0, motion: newMotionState() });
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('manifest rejects incomplete packs, invalid source dimensions and unsafe asset paths', () => {
  assert.equal(validClipManifest(manifest), true);
  for (const mutate of [m => { delete m.clips.run; }, m => { m.clips.jab.frames[0] = null; }, m => { m.clips.jump.frames[0] = 4; }, m => { m.clips.idle.image = '../old.png'; }, m => { m.clips.run.frames[0].sourceRect.width = 1700; }, m => { m.clips.run.frames[0].sourceRect.x = 0.5; }, m => { m.clips.smash.frames[0].phase = 'recover'; }, m => { m.clips.jump.frames[0].name = 'rise'; }, m => { m.clips.idle.frames[0].duration = 0; }, m => { m.clips.jab.frames[0].weaponTip.x = 401; }]) {
    const broken = clone(manifest); mutate(broken); assert.equal(validClipManifest(broken), false);
  }
});

test('multi-atlas frames validate their own dimensions, path and uniform scale', () => {
  const multiple = clone(manifest);
  multiple.clips.special.frames[4] = { ...multiple.clips.special.frames[4], image: 'second-atlas.png', width: 2000, height: 1600, sourceScale: 1.12 };
  assert.equal(validClipManifest(multiple), true);
  for (const mutate of [frame => { frame.image = '../escape.png'; }, frame => { delete frame.width; }, frame => { frame.width = 20; }, frame => { frame.sourceScale = 0; }, frame => { frame.height = NaN; }]) {
    const broken = clone(multiple); mutate(broken.clips.special.frames[4]); assert.equal(validClipManifest(broken), false);
  }
  const repeated = clone(manifest); repeated.clips.idle.frames[1] = clone(repeated.clips.idle.frames[0]);
  assert.equal(validClipManifest(repeated), true, 'returning to an identical approved neutral pose is authored reuse');
  repeated.clips.idle.frames[1].sourceRect.x = 3;
  assert.equal(validClipManifest(repeated), false, 'partially overlapping source cells remain rejected');
});

test('summoner releases use the approved cast poses and Furina hat continuity sources', () => {
  const releases = { zhongli: { special: 9, secondary: 11 }, furina: { special: 10, secondary: 10 } };
  for (const [id, timings] of Object.entries(releases)) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${activePacks[id]}/manifest.json`), 'utf8'));
    for (const [kind, index] of Object.entries(timings)) {
      const input = { ...base(), state: 'attack', attack: { def: { kind, startup: 50, active: 8, endlag: 26 }, t: 50 } };
      assert.equal(selectClipFrame(pack, input).frame, index, `${id}/${kind} release`);
      input.attack.t = 49; assert.equal(selectClipFrame(pack, input).phase, 'windup');
    }
    if (id === 'furina') {
      const letters = pack.clips.special.frames.map(frame => (frame.image ?? pack.clips.special.image).match(/-([abcd])\.png$/)[1]);
      assert.deepEqual(letters, ['a', 'd', 'd', 'd', 'b', 'b', 'b', 'b', 'c', 'c', 'c', 'c', 'd', 'd', 'd', 'a']);
      const clip = pack.clips.special;
      assert.deepEqual(clip.frames[0].sourceRect, clip.frames.at(-1).sourceRect);
    } else assert.equal(pack.clips.special.image, 'l-skill-cross-charge.png');
  }
});

test('all Eula attack frames are selected within their live startup/contact/recovery windows in both modes', () => {
  for (const kind of ['jab', 'smash', 'special', 'secondary']) {
    for (const survival of [false, true]) {
      const def = { ...eula[kind], endlag: survival ? Math.round(eula[kind].endlag * 0.7) : eula[kind].endlag };
      const visited = new Set();
      const animation = { ...base(), state: 'attack', attack: { def, t: 0 } };
      for (let t = 0; t < def.startup + def.active + def.endlag; t++) {
        animation.attack.t = t;
        const selection = selectClipFrame(manifest, animation); visited.add(selection.frame);
        assert.equal(selection.clip, kind);
        assert.equal(selection.phase === 'windup', t < def.startup);
        assert.equal(selection.phase === 'contact', t >= def.startup && t < def.startup + def.active);
        assert.equal(manifest.clips[kind].frames[selection.frame].phase, selection.phase);
      }
      assert.equal(visited.size, manifest.clips[kind].frames.length, `${kind}/${survival}`);
    }
  }
});

test('attack-speed changes remap pictures to the new action duration without changing gameplay data', () => {
  for (const kind of ['jab', 'smash', 'special', 'secondary']) {
    const original = clone(eula[kind]);
    const def = { ...eula[kind], startup: Math.max(3, Math.round(eula[kind].startup / 1.3)), endlag: Math.round(eula[kind].endlag * 0.7 / 1.3) };
    const animation = { ...base(), state: 'attack', attack: { def, t: def.startup } };
    assert.equal(selectClipFrame(manifest, animation).phase, 'contact');
    animation.attack.t = def.startup + def.active;
    assert.equal(selectClipFrame(manifest, animation).phase, 'followthrough');
    assert.deepEqual(clone(eula[kind]), original);
  }
});

test('optional J/K variants validate independently without permitting unrelated skill forms', () => {
  assert.equal(validVariantClips(extended), true);
  for (const mutate of [m => { m.variants.special = m.clips.special; }, m => { m.variants.smash.frames[0].phase = 'contact'; }, m => { m.variants.jab.image = '../bad.png'; }, m => { m.variants.smash.frames[0].weaponTip.y = 500; }]) {
    const broken = clone(extended); mutate(broken);
    assert.equal(validClipManifest(broken), true); assert.equal(validVariantClips(broken), false);
  }
  assert.equal(validVariantClips(manifest), false);
  const onlyJab = clone(extended); delete onlyJab.variants.smash; assert.equal(validVariantClips(onlyJab), true);
});

test('both visual forms stay on live attack phases at every survival attack speed and remain pure during hitstop', () => {
  for (const kind of EULA_ATTACKS) for (const speedLevel of [-1, 0, 1, 2, 3]) for (const visualVariant of ['base', 'alternate']) {
    const survival = speedLevel >= 0, speed = survival ? 1 + speedLevel * 0.035 : 1;
    const def = { ...eula[kind], startup: survival ? Math.max(3, Math.round(eula[kind].startup / speed)) : eula[kind].startup,
      endlag: survival ? Math.round(eula[kind].endlag * 0.7 / speed) : eula[kind].endlag };
    const animation = { ...base(), state: 'attack', attack: { def, t: 0, visualVariant } }, visited = new Set();
    for (let t = 0; t < def.startup + def.active + def.endlag; t++) {
      animation.attack.t = t; const before = clone(animation), selection = selectClipFrame(extended, animation); visited.add(selection.frame);
      assert.equal(selection.variant, VARIANT_ATTACKS.includes(kind) ? visualVariant : 'base'); assert.equal(selectedClip(extended, selection).frames[selection.frame].phase, attackPhase(animation.attack).phase);
      for (let i = 0; i < 5; i++) assert.deepEqual(clone(selectClipFrame(extended, animation)), clone(selection));
      assert.deepEqual(clone(animation), before);
    }
    assert.equal(visited.size, selectedClip(extended, { clip: kind, variant: visualVariant }).frames.length, `${kind}/${speedLevel}/${visualVariant}`);
    assert.equal(selectClipFrame(manifest, animation).variant, 'base', 'missing alternates retain the base clip');
  }
});

test('preview form changes preserve paused timing and alternate only across complete attack cycles', () => {
  for (const survival of [false, true]) {
    const settings = { clip: 'smash', form: 'new', survival, speed: 1, paused: true, facing: 1, slope: 0 }, clock = createPreviewClock();
    advancePreviewClock(clock, 0, settings, 24);
    const before = clone(clock), initial = previewFrame(clock, settings);
    assert.equal(initial.animation.attack.visualVariant, 'alternate');
    settings.form = 'original'; advancePreviewClock(clock, 500, settings);
    const original = previewFrame(clock, settings); assert.equal(original.t, initial.t); assert.equal(original.animation.attack.visualVariant, 'base');
    assert.deepEqual(clone(clock), before);
    settings.form = 'alternate'; assert.equal(previewFrame(clock, settings).animation.attack.visualVariant, 'alternate');
    advancePreviewClock(clock, 0, settings, initial.cycle);
    assert.equal(previewFrame(clock, settings).t, initial.t); assert.equal(previewFrame(clock, settings).animation.attack.visualVariant, 'base');
    advancePreviewClock(clock, 0, settings, initial.cycle);
    assert.equal(previewFrame(clock, settings).animation.attack.visualVariant, 'alternate');
  }
});

test('gait advances by resolved distance across speed changes and stops at walls or involuntary movement', () => {
  const motion = newMotionState();
  for (const dx of [1, 3, 8, 2]) advanceMotion(motion, { dx, onGround: true, facing: 1, walking: true });
  assert.equal(motion.distance, 14);
  const phase = selectClipFrame(manifest, { ...base(), motion, vx: 2 }).frame;
  advanceMotion(motion, { dx: 0, onGround: true, facing: 1, walking: true });
  assert.equal(motion.distance, 14); assert.equal(motion.moving, false);
  for (const dx of [12, -18]) advanceMotion(motion, { dx, onGround: true, facing: 1, walking: false });
  assert.equal(motion.distance, 14);
  advanceMotion(motion, { dx: 0, onGround: false, facing: 1, walking: true });
  assert.equal(motion.distance, 14);
  motion.moving = true;
  assert.equal(selectClipFrame(manifest, { ...base(), motion, vx: 90, time: 100000 }).frame, phase);
});

test('all eight run drawings form a full distance loop independently of elapsed clock', () => {
  const motion = newMotionState(), visited = new Set();
  for (let i = 0; i < 96; i++) {
    advanceMotion(motion, { dx: 1, onGround: true, facing: 1, walking: true });
    visited.add(selectClipFrame(manifest, { ...base(), motion, time: 1e8, vx: 5 }).frame);
  }
  assert.equal(visited.size, 8); assert.equal(motion.distance, 0);
});

test('summoner run cycles preserve Eula gait phases across full-distance loops and both facings', () => {
  const eulaPack = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  for (const id of ['zhongli', 'furina']) {
    const character = CHARACTERS.find(item => item.id === id);
    const pack = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${activePacks[id]}/manifest.json`), 'utf8'));
    assert.equal(pack.clips.run.image, 'run-v2.png');
    assert.deepEqual(pack.clips.run.frames.map(frame => frame.name), eulaPack.clips.run.frames.map(frame => frame.name));
    assert.deepEqual(pack.clips.run.frames.map(frame => frame.duration), eulaPack.clips.run.frames.map(frame => frame.duration));
    for (const facing of [-1, 1]) for (const speed of [character.speed, character.speed * 1.24]) {
      const motion = newMotionState(facing), visited = new Set();
      for (let tick = 0; tick < 120; tick++) {
        advanceMotion(motion, { dx: facing * speed, onGround: true, facing, walking: true });
        const input = { ...base(), motion, vx: facing * speed, time: 1e8 + tick };
        const selection = selectClipFrame(pack, input); visited.add(selection.frame);
        assert.equal(selection.frame, selectClipFrame(eulaPack, input).frame, `${id}: same distance means same gait phase`);
      }
      assert.equal(visited.size, 8, `${id}: every frame remains visible at live movement speeds`);
      motion.distance = 95.99; motion.moving = true;
      assert.equal(selectClipFrame(pack, { ...base(), motion }).frame, 7);
      advanceMotion(motion, { dx: facing * 0.02, onGround: true, facing, walking: true });
      assert.equal(selectClipFrame(pack, { ...base(), motion }).frame, 0);
    }
  }
});

test('jump rise/apex/fall use physics and landing can immediately yield to input or attack', () => {
  const animation = base(); animation.onGround = false; animation.motion.grounded = false;
  const name = () => manifest.clips.jump.frames[selectClipFrame(manifest, animation).frame].name;
  animation.vy = -10; animation.motion.airAge = 0; assert.equal(name(), 'takeoff');
  animation.motion.airAge = 10; assert.equal(name(), 'rise');
  animation.vy = 0; assert.equal(name(), 'apex');
  animation.vy = 8; assert.equal(name(), 'fall');
  advanceMotion(animation.motion, { dx: 0, onGround: true, facing: 1, walking: false });
  animation.onGround = true; assert.equal(name(), 'land');
  advanceMotion(animation.motion, { dx: 4, onGround: true, facing: 1, walking: true });
  assert.equal(selectClipFrame(manifest, animation).clip, 'run');
  animation.attack = { def: eula.jab, t: 0 };
  assert.equal(selectClipFrame(manifest, animation).clip, 'jab');
});

test('drawing repeatedly during pause or hitstop is a pure read of frame, feet and sword state', () => {
  const animation = { ...base(), state: 'attack', attack: { def: eula.special, t: 24 } };
  const before = clone(animation), selected = clone(selectClipFrame(manifest, animation));
  for (let i = 0; i < 120; i++) assert.deepEqual(clone(selectClipFrame(manifest, animation)), selected);
  assert.deepEqual(clone(animation), before);
});

test('PVP hit reactions reuse new-pack airborne artwork while Xiao plunge keeps its established path', () => {
  const hurt = selectClipFrame(manifest, { ...base(), state: 'hitstun' });
  assert.equal(hurt.clip, 'jump'); assert.equal(manifest.clips.jump.frames[hurt.frame].name, 'fall');
  assert.equal(selectClipFrame(manifest, { ...base(), attack: { def: eula.special, t: 20, plunge: { phase: 'dive', elapsed: 2 } } }), null);
});

test('paused preview mirrors and slopes the same airborne frame without resetting position or advancing time', () => {
  const clock = createPreviewClock(), settings = { clip: 'jump', survival: false, speed: 1, paused: true, facing: 1, slope: 0 };
  advancePreviewClock(clock, 0, settings, 12);
  const before = clone(clock), first = previewFrame(clock, settings);
  settings.facing = -1; settings.slope = 0.24;
  advancePreviewClock(clock, 200, settings);
  const mirrored = previewFrame(clock, settings);
  assert.deepEqual(clone(clock), before); assert.equal(mirrored.t, first.t); assert.equal(mirrored.y, first.y);
  assert.equal(mirrored.animation.motion.facing, -1); assert.equal(mirrored.animation.motion.slope, 0.24);
  assert.equal(selectClipFrame(manifest, mirrored.animation).frame, selectClipFrame(manifest, first.animation).frame);
  advancePreviewClock(clock, 0, settings, 1); assert.equal(clock.tick, before.tick + 1);
});

test('preview dodge timing matches PVP fifteen ticks and survival sixteen ticks exactly', () => {
  for (const survival of [false, true]) {
    const settings = { clip: 'dodge', survival, speed: 1, paused: true, facing: 1, slope: 0 }, clock = createPreviewClock();
    const duration = survival ? 16 : 15;
    assert.equal(previewFrame(clock, settings).animation.dodgeDuration, duration);
    advancePreviewClock(clock, 0, settings, duration - 1);
    assert.equal(selectClipFrame(manifest, previewFrame(clock, settings).animation).frame, 3);
    advancePreviewClock(clock, 0, settings, 1);
    assert.equal(previewFrame(clock, settings).animation.dodgeTimer, 0);
    assert.equal(selectClipFrame(manifest, previewFrame(clock, settings).animation).clip, 'idle');
  }
});

test('both 15-tick and 16-tick dodges show the first and final pose without extending invulnerability', () => {
  for (const duration of [15, 16]) {
    const animation = { ...base(), dodgeDuration: duration, dodgeTimer: duration - 1 };
    assert.equal(selectClipFrame(manifest, animation).frame, 0);
    animation.dodgeTimer = 1; assert.equal(selectClipFrame(manifest, animation).frame, 3);
    animation.dodgeTimer = 0; assert.equal(selectClipFrame(manifest, animation).clip, 'idle');
  }
});

test('every character maps attacks to live timings while L/I remain fixed even with a forced alternate flag', () => {
  for (const character of CHARACTERS) {
    const pack = clone(extended); pack.character = character.id;
    if (character.id === 'xiao') pack.clips.special.frames.forEach(frame => { frame.name = ['windup', 'dive', 'impact', 'recover'][phases.indexOf(frame.phase)]; });
    assert.equal(validClipManifest(pack), true, character.id);
    for (const kind of EULA_ATTACKS) for (const level of [-1, 0, 3]) {
      if (character.id === 'xiao' && kind === 'special') continue;
      const speed = 1 + Math.max(0, level) * 0.035, survival = level >= 0;
      const def = { ...character[kind], startup: survival ? Math.max(3, Math.round(character[kind].startup / speed)) : character[kind].startup,
        endlag: survival ? Math.round(character[kind].endlag * 0.7 / speed) : character[kind].endlag };
      for (let t = 0; t < def.startup + def.active + def.endlag; t++) {
        const input = { ...base(), attack: { def, t, visualVariant: 'alternate' } }, before = clone(input), selection = selectClipFrame(pack, input);
        assert.equal(selection.phase, attackPhase(input.attack).phase);
        assert.equal(selection.variant, VARIANT_ATTACKS.includes(kind) ? 'alternate' : 'base');
        assert.deepEqual(clone(input), before);
      }
    }
  }
  const shipped = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(shipped.variants).sort(), ['jab', 'smash']);
  assert.equal(shipped.clips.special.image, 'special.png'); assert.equal(shipped.clips.secondary.image, 'secondary-v5.png');
});

test('Xiao plunge uses distinct named poses and keeps only spear-down dive frames until real impact', () => {
  const pack = clone(manifest); pack.character = 'xiao';
  pack.clips.special.frames.forEach(frame => { frame.name = ['windup', 'dive', 'impact', 'recover'][phases.indexOf(frame.phase)]; });
  assert.equal(validClipManifest(pack), true);
  for (const phase of ['windup', 'dive', 'impact', 'recover']) for (const elapsed of [0, 2, 5, 27, 80, 600]) {
    const input = { ...base(), attack: { def: CHARACTERS.find(character => character.id === 'xiao').special, t: 999,
      visualVariant: 'alternate', plunge: { phase, elapsed, recoveryDuration: 20 } } };
    const selected = selectClipFrame(pack, input);
    assert.equal(selected.variant, 'base'); assert.equal(pack.clips.special.frames[selected.frame].name, phase);
  }
  const invalid = clone(pack); invalid.clips.special.frames[4].name = 'impact'; assert.equal(validClipManifest(invalid), false);
});

test('Xiao preview manually-equivalent jump precedes L and landing alone advances dive to impact in both modes', () => {
  for (const survival of [false, true]) {
    const settings = { character: 'xiao', clip: 'special', form: 'new', survival, speed: 1, paused: true, facing: 1, slope: 0 }, clock = createPreviewClock();
    assert.equal(previewFrame(clock, settings).animation.attack, null);
    const phasesSeen = new Set(); let jumping = false;
    for (let tick = 0; tick < 100; tick++) {
      advancePreviewClock(clock, 0, settings, 1); const frame = previewFrame(clock, settings), state = frame.animation.attack?.plunge;
      if (!state && !frame.animation.onGround) jumping = true;
      if (state) {
        phasesSeen.add(state.phase); assert.equal(jumping, true); assert.equal(frame.animation.attack.visualVariant, 'base');
        assert.equal(frame.animation.onGround, state.phase === 'impact' || state.phase === 'recover');
        if (state.phase === 'dive' || state.phase === 'windup') assert.ok(frame.y < 0);
        else assert.equal(frame.y, 0);
      }
      const before = clone(clock); settings.facing = -1; advancePreviewClock(clock, 80, settings); assert.deepEqual(clone(clock), before);
    }
    assert.deepEqual([...phasesSeen], ['windup', 'dive', 'impact', 'recover']);
  }
});

test('all shipped character clips reach every combat drawing at current PVP and survival attack speeds', () => {
  const missing = [];
  for (const character of CHARACTERS) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${activePacks[character.id]}/manifest.json`), 'utf8'));
    assert.equal(validClipManifest(pack), true, character.id);
    if (pack.variants) assert.equal(validVariantClips(pack), true, character.id);
    for (const kind of EULA_ATTACKS) for (const visualVariant of ['base', 'alternate']) for (const level of [-1, 0, 1, 2, 3]) {
      const speed = 1 + Math.max(0, level) * 0.035, survival = level >= 0;
      const def = { ...character[kind], startup: survival ? Math.max(3, Math.round(character[kind].startup / speed)) : character[kind].startup,
        endlag: survival ? Math.round(character[kind].endlag * 0.7 / speed) : character[kind].endlag };
      const visited = new Set(), input = { ...base(), attack: { def, t: 0, visualVariant } };
      if (character.id === 'xiao' && kind === 'special') {
        const recoveryDuration = survival ? def.endlag : def.endlag - def.active;
        for (const [phase, duration] of [['windup', def.startup], ['dive', 120], ['impact', def.active], ['recover', recoveryDuration]]) {
          for (let elapsed = 0; elapsed < duration; elapsed++) {
            input.attack.plunge = { phase, elapsed, recoveryDuration }; const selected = selectClipFrame(pack, input); visited.add(selected.frame);
            assert.equal(pack.clips.special.frames[selected.frame].name, phase);
          }
        }
      } else {
        // Both live engines increment an accepted attack before its first draw.
        for (let t = 1; t < def.startup + def.active + def.endlag; t++) {
          input.attack.t = t; const selected = selectClipFrame(pack, input); visited.add(selected.frame);
          assert.equal(selectedClip(pack, selected).frames[selected.frame].phase, attackPhase(input.attack).phase);
        }
      }
      const clip = selectedClip(pack, { clip: kind, variant: visualVariant });
      if (visited.size !== clip.frames.length) missing.push(`${character.id}/${kind}/${visualVariant}/speed${level}: missing ${clip.frames.map((_, index) => index).filter(index => !visited.has(index)).join(',')}`);
    }
  }
  assert.deepEqual(missing, []);
});

let failures = 0;
for (const { name, run } of cases) {
  try { run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} clip animation regression checks passed.`);
process.exitCode = failures ? 1 : 0;
