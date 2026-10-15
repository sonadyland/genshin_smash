import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'public/assets/animations/corrin-v1');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function dimensions(bytes) {
  if (bytes.toString('ascii', 1, 4) === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), data = offset + 8;
    if (type === 'VP8X') return [1 + bytes.readUIntLE(data + 4, 3), 1 + bytes.readUIntLE(data + 7, 3)];
    if (type === 'VP8 ') return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    if (type === 'VP8L') { const bits = bytes.readUInt32LE(data + 1); return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)]; }
    offset = data + size + size % 2;
  }
  throw Error('missing WebP dimensions');
}
function harness() {
  const modules = new Map(), draws = [], decodes = [];
  const draw = new Proxy({ globalAlpha: 1 }, {
    get(target, key) { if (key in target) return target[key]; if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(0) });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} }); return (...args) => draws.push({ kind: key, args }); },
    set(target, key, value) { target[key] = value; return true; },
  });
  class Image { async decode() { decodes.push(this.src); [this.naturalWidth, this.naturalHeight] = dimensions(fs.readFileSync(path.join(root, 'public', this.src))); } }
  const context = vm.createContext({ console, Image, fetch: async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, 'public', url), 'utf8')) }),
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) } });
  function load(file) {
    if (file.endsWith('.json')) return { default: JSON.parse(fs.readFileSync(file, 'utf8')) };
    if (modules.has(file)) return modules.get(file).exports;
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env.VITE_GAME_ASSET_BASE_URL', "''"), module = { exports: {} }; modules.set(file, module);
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInContext(`(function(exports,require,module){${output}\n})`, context)(module.exports, name => load(path.resolve(path.dirname(file), name.endsWith('.json') ? name : `${name}.ts`)), module); return module.exports;
  }
  return { art: load(path.join(root, 'src/game/art.ts')), corrin: load(path.join(root, 'src/game/corrin-art.ts')), moves: load(path.join(root, 'src/game/corrin.ts')).CORRIN_MOVES,
    motion: load(path.join(root, 'src/game/clip-animation.ts')), draws, draw, decodes };
}
const h = harness();
const base = form => ({ state: 'free', attack: null, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 0, motion: h.motion.newMotionState(), corrin: { form, combo: 0 } });
const clean = value => JSON.parse(JSON.stringify(value));
let pack;
test('production pack contains the complete approved catalogue and unchanged source geometry', () => {
  assert.ok(h.corrin.validCorrinManifest(manifest));
  assert.equal(Object.keys(manifest.clips).length, 32);
  assert.equal(Object.values(manifest.clips).reduce((sum, clip) => sum + clip.frames.length, 0), 228);
  for (const [key, clip] of Object.entries(manifest.clips)) {
    for (const sheet of clip.sheets) assert.deepEqual(dimensions(fs.readFileSync(path.join(directory, sheet.image))), [sheet.width, sheet.height], key);
    for (const frame of clip.frames) { assert.equal(frame.rootOffset, undefined); assert.ok(frame.duration > 0); }
    if (clip.form !== 'fx') assert.equal(clip.gameHeight, clip.form === 'dragon' ? 135 : 112);
  }
  for (const filename of ['human-v2-motion-registration.json', 'human-v2-combat-registration.json', 'human-v2-skills-registration.json', 'human-v2-transform-registration.json']) {
    const original = JSON.parse(fs.readFileSync(path.join(root, 'public/previews/corrin-v1', filename), 'utf8'));
    for (const source of original.clips) {
      const clip = manifest.clips[`${source.id.startsWith('transform-') ? 'transform' : 'human'}:${source.id}`];
      for (const [index, frame] of clip.frames.entries()) {
        const old = source.frames[index]; assert.deepEqual(frame.rect, old.rect); assert.deepEqual(frame.pivot, old.pivot); assert.deepEqual(frame.anchors, old.anchors);
        assert.equal(clip.sheets[frame.sheet].bodyHeight, source.sheets[old.sheet].bodyHeight);
      }
    }
  }
});
test('compression provenance verifies all source hashes, dimensions and lossless alpha', () => {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/corrin-art-registration.json'), 'utf8'));
  assert.equal(report.frames, 228);
  for (const image of report.images) {
    assert.equal(sha(fs.readFileSync(path.join(root, image.source))), image.sourceSha256);
    assert.equal(sha(fs.readFileSync(path.join(root, image.target))), image.targetSha256);
    assert.equal(image.alphaLossless, true);
  }
  assert.ok(report.productionBytes < report.sourceBytes * .4);
  assert.ok(report.images.some(image => image.source === 'public/previews/corrin-v1/portrait.png'));
});
test('all pre-existing tracked character artwork remains byte-identical to HEAD', () => {
  const files = JSON.parse(fs.readFileSync(path.join(root, 'docs/corrin-existing-art-baseline.json'), 'utf8')).files;
  let count = 0;
  for (const { path: filename, gitBlobSha1 } of files) {
    const actual = fs.readFileSync(path.join(root, filename));
    const normalized = filename.endsWith('.json') ? Buffer.from(actual.toString('utf8').replaceAll('\r\n', '\n')) : actual;
    assert.equal(createHash('sha1').update(`blob ${normalized.length}\0`).update(normalized).digest('hex'), gitBlobSha1, filename); count++;
  }
  console.log(`Preserved ${count} existing tracked artwork files.`);
});
test('strict lease loads only Corrin and shared art, deduplicates sheet aliases, and all 32 clips can draw', async () => {
  const lease = h.art.acquireGameArt(['corrin'], { strict: true }); await lease.ready;
  assert.equal(h.art.getCharacterAnimationStatus('corrin').frames, 228);
  const atlasNames = [...new Set(Object.values(manifest.clips).flatMap(clip => clip.sheets.map(sheet => sheet.image)))];
  assert.equal(h.decodes.filter(url => url.includes('/corrin-v1/')).length, atlasNames.length);
  assert.ok(h.decodes.every(url => !url.includes('/animations/') || url.includes('/corrin-v1/')));
  pack = await h.corrin.loadCorrinPack('/assets/animations/corrin-v1/manifest.json', async name => {
    const size = dimensions(fs.readFileSync(path.join(directory, name))); return { image: { naturalWidth: size[0], naturalHeight: size[1], name }, flash: null };
  });
  for (const form of ['human', 'dragon']) {
    for (const kind of ['jab', 'smash', 'secondary']) for (const combo of form === 'human' && kind === 'jab' ? [0, 1, 2] : [0]) {
      const def = h.moves[form][kind], visited = new Set();
      for (let t = 0; t < def.startup + def.active + def.endlag; t++) {
        const animation = { ...base(form), state: 'attack', attack: { def, t, corrinForm: form, corrinCombo: combo } };
        const selected = h.art.getCorrinAnimationSelection(animation); visited.add(selected.frame);
        assert.ok(h.art.drawFighterArt(h.draw, 'corrin', 340, 480, 112, animation, { facing: t % 2 ? -1 : 1 }));
        assert.equal(selected.key, `${form}:${kind === 'jab' && form === 'human' ? `jab${combo + 1}` : kind}`);
        const effect = h.corrin.corrinWeaponEffect(pack, selected, 112);
        if (effect) { assert.equal(selected.phase, 'contact'); assert.ok(effect.matrix.every(Number.isFinite)); }
        if (t === def.startup) assert.equal(selected.phase, 'contact');
      }
      assert.equal(visited.size, manifest.clips[`${form}:${kind === 'jab' && form === 'human' ? `jab${combo + 1}` : kind}`].frames.length);
    }
  }
  assert.ok(h.draws.filter(draw => draw.kind === 'drawImage').every(draw => draw.args.slice(1).every(Number.isFinite)));
  lease.release(); assert.equal(h.art.getCharacterAnimationStatus('corrin').frames, 0);
});
test('ground/air transformations retain selected route, physical feet root and consistent actor scale', () => {
  for (const from of ['human', 'dragon']) for (const airborne of [false, true]) {
    const to = from === 'human' ? 'dragon' : 'human', duration = airborne ? from === 'human' ? 34 : 32 : 46;
    const visited = new Set();
    for (let elapsed = 0; elapsed < duration; elapsed++) {
      const animation = { ...base(from), onGround: elapsed > 10, corrin: { form: elapsed > 15 ? to : from, transform: { from, to, airborne, elapsed, duration } } };
      const selection = h.corrin.selectCorrinFrame(manifest, animation); visited.add(selection.frame);
      assert.equal(selection.key, `transform:transform-to-${to}-${airborne ? 'air' : 'ground'}`);
      h.draws.length = 0; h.corrin.drawCorrinFighter(h.draw, pack, 320, 450, 112, animation, { facing: -1 });
      assert.deepEqual(h.draws.find(draw => draw.kind === 'translate').args, [320, 450]);
      const rendered = h.draws.find(draw => draw.kind === 'drawImage').args;
      assert.ok(Math.abs(rendered[7] / rendered[3] - rendered[8] / rendered[4]) < 1e-12, 'actor is never stretched');
    }
    assert.equal(visited.size, airborne ? 8 : 12);
  }
});
test('mouth and dragon-fang collisions share exactly mirrored rendered landmarks', () => {
  for (const form of ['human', 'dragon']) for (const facing of [-1, 1]) {
    const def = h.moves[form].secondary, animation = { ...base(form), state: 'attack', attack: { def, t: def.startup, corrinForm: form } };
    const selection = h.corrin.selectCorrinFrame(manifest, animation), clip = manifest.clips[selection.key], frame = clip.frames[selection.frame];
    const anchor = frame.anchors[form === 'human' ? 'castOrigin' : 'mouth'], scale = clip.gameHeight / clip.sheets[frame.sheet].bodyHeight;
    const expected = { x: 400 + (anchor[0] - frame.pivot[0]) * scale * facing, y: 520 + (anchor[1] - frame.pivot[1]) * scale };
    assert.deepEqual(clean(h.corrin.corrinCastOrigin(pack, 400, 520, 112, animation, facing)), expected);
    if (form === 'human') assert.deepEqual(clean(h.corrin.corrinFangSegment(pack, 400, 520, 112, animation, facing).base), expected);
  }
});
test('water effects render all frames and mirror from the simulation-owned origin', () => {
  for (const kind of ['water-orb', 'water-bomb', 'water-beam', 'water-burst']) for (const facing of [-1, 1]) for (const age of [0, 6, 12, 20, 30]) {
    h.draws.length = 0; assert.ok(h.corrin.drawCorrinWater(h.draw, pack, kind, 320, 400, 150, 70, age, facing));
    assert.deepEqual(h.draws.find(draw => draw.kind === 'translate').args, [320, 400]);
    assert.deepEqual(h.draws.find(draw => draw.kind === 'scale').args, [facing, 1]);
    assert.ok(h.draws.find(draw => draw.kind === 'drawImage').args.slice(1).every(Number.isFinite));
  }
});
