import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { inflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function harness(rejected = () => false, metadataTransform = value => value) {
  const calls = [];
  const noop = () => undefined;
  const draw = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'getImageData') return (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) });
      return (...args) => calls.push({ kind: key, args });
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  class Image {
    src = ''; naturalWidth = 400; naturalHeight = 400;
    async decode() {
      if (rejected(this.src)) throw new Error('fixture: unavailable image');
      if (this.src.includes('/effects/')) this.naturalHeight = 200;
      if (this.src.includes('/animations/') || this.src.endsWith('xiao-plunge-v3.png') || this.src.endsWith('secondary-effects-v1.png')) {
        const meta = readMetadata(this.src.replace(/\.png$/, '.json'));
        this.naturalWidth = meta.width; this.naturalHeight = meta.height;
      }
    }
  }
  const readMetadata = url => JSON.parse(fs.readFileSync(path.join(root, 'public', url), 'utf8'));
  const context = vm.createContext({ console, Image, fetch: async url => ({ ok: !rejected(url), json: async () => metadataTransform(readMetadata(url), url) }), document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) } });
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'");
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const mod = { exports: {} }; modules.set(file, mod);
    vm.runInContext(`(function(exports, require, module) { ${output}\n})`, context, { filename: file })(mod.exports, specifier => load(path.resolve(path.dirname(file), `${specifier}.ts`)), mod);
    return mod.exports;
  }
  const art = load(path.join(root, 'src/game/art.ts'));
  return { art, animation: load(path.join(root, 'src/game/animation.ts')), draw, calls, reset: () => { calls.length = 0; draw.globalAlpha = 1; draw.save = noop; draw.restore = noop; } };
}
// A small read-only PNG decoder keeps shipped sprite integrity checks independent
// of browser mocks and external image packages. These assets are RGBA8 PNGs.
function readRgbaPng(file) {
  const fileData = fs.readFileSync(file);
  assert.equal(fileData.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let width, height;
  const chunks = [];
  for (let offset = 8; offset < fileData.length;) {
    const size = fileData.readUInt32BE(offset), type = fileData.toString('ascii', offset + 4, offset + 8);
    const chunk = fileData.subarray(offset + 8, offset + 8 + size);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      assert.deepEqual([...chunk.subarray(8)], [8, 6, 0, 0, 0], `${file}: requires noninterlaced RGBA8`);
    }
    if (type === 'IDAT') chunks.push(chunk);
    offset += size + 12;
  }
  const compressed = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  assert.equal(compressed.length, (stride + 1) * height);
  const pixels = new Uint8Array(stride * height);
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  for (let y = 0; y < height; y++) {
    const row = y * stride, source = y * (stride + 1), filter = compressed[source];
    assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[row + x - 4] : 0, up = y ? pixels[row + x - stride] : 0;
      const upperLeft = y && x >= 4 ? pixels[row + x - stride - 4] : 0;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter];
      pixels[row + x] = (compressed[source + x + 1] + predictor) & 255;
    }
  }
  return { width, height, pixels };
}
const animation = { state: 'attack', attack: { def: { kind: 'smash', startup: 20, active: 6, endlag: 26 }, t: 20 }, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 200 };
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('cold/failed assets degrade to portrait or existing pixel fallback', async () => {
  const h = harness(url => url.includes('/animations/') || url.includes('/effects/'));
  assert.equal(h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation), false);
  await h.art.loadGameArt();
  h.reset();
  assert.equal(h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation), true);
  assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('raiden-v2.png'));
  assert.equal(h.art.drawElementEffect(h.draw, 'raiden', false, 0, 0, 100, 100), false);
  const missing = harness(() => true);
  await missing.art.loadGameArt();
  assert.equal(missing.art.drawFighterArt(missing.draw, 'raiden', 0, 76, 112, animation), false);
});

test('all 80 source cells and measured foot anchors match the shipped JSON with one scale per character', async () => {
  const h = harness(); await h.art.loadGameArt();
  for (const id of ['raiden', 'jean', 'eula', 'diluc', 'xiao']) {
    const metadata = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${id}-actions-v3.json`), 'utf8'));
    const scale = 112 / metadata.standingBodyHeightPixels;
    for (const frame of metadata.frames) {
      const { row, column, sourceRect: source, footAnchor: anchor } = frame;
      const sample = row === 0
        ? { ...animation, attack: null, state: 'free', onGround: column !== 3, vx: column === 1 || column === 2 ? 4 : 0, time: column === 2 ? 6 : 0 }
        : { ...animation, attack: { def: { ...animation.attack.def, kind: ['idle', 'jab', 'smash', 'special'][row] }, t: [0, 20, 26, 41][column] } };
      if (id === 'xiao' && row === 3) sample.attack.plunge = { phase: ['windup', 'dive', 'impact', 'recover'][column], elapsed: 0 };
      h.reset(); h.art.drawFighterArt(h.draw, id, 0, 76, 112, sample);
      const args = h.calls.find(call => call.kind === 'drawImage').args;
      assert.ok(args[0].src.endsWith(`${id}-actions-v3.png`));
      assert.deepEqual(args.slice(1, 5), [source.x + 1, source.y + 1, source.width - 2, source.height - 2]);
      assert.deepEqual(args.slice(5), [(1 - source.width * anchor.x) * scale, (1 - source.height * anchor.y) * scale, (source.width - 2) * scale, (source.height - 2) * scale]);
    }
  }
});

test('left facing mirrors the destination once and does not change atlas selection', async () => {
  const h = harness(); await h.art.loadGameArt();
  for (const facing of [-1, 1]) {
    h.reset(); h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation, { facing });
    assert.deepEqual(h.calls.find(call => call.kind === 'scale').args, [facing, 1]);
    assert.equal(h.calls.find(call => call.kind === 'drawImage').args[1], 314.5);
  }
});

test('Xiao plunge phases keep the spear vertical under either horizontal facing', async () => {
  const h = harness(); await h.art.loadGameArt();
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/xiao-actions-v3.json'), 'utf8'));
  for (const facing of [-1, 1]) {
    for (const [column, phase] of ['windup', 'dive', 'impact', 'recover'].entries()) {
      const plunge = { ...animation, onGround: false, attack: { ...animation.attack, def: { ...animation.attack.def, kind: 'special' }, plunge: { phase, elapsed: 3 } } };
      h.reset(); h.art.drawFighterArt(h.draw, 'xiao', 0, 76, 112, plunge, { facing });
      assert.deepEqual(h.calls.filter(call => call.kind === 'scale').map(call => call.args), [[facing, 1], [1, 1]]);
      assert.deepEqual(h.calls.find(call => call.kind === 'rotate').args, [0]);
      const source = metadata.frames[12 + column].sourceRect;
      assert.deepEqual(h.calls.find(call => call.kind === 'drawImage').args.slice(1, 5), [source.x + 1, source.y + 1, source.width - 2, source.height - 2]);
    }
  }
});

test('missing or invalid registration falls back instead of drawing misaligned frames', async () => {
  for (const invalid of [data => ({ ...data, width: 1 }), data => ({ ...data, standingBodyHeightPixels: 0 }), data => ({ ...data, frames: [] }), data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, footAnchor: { x: -1, y: 0.8 } })) })]) {
    const h = harness(() => false, invalid); await h.art.loadGameArt(); h.reset();
    assert.equal(h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation), true);
    assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('raiden-v2.png'));
  }
  const h = harness(url => url.endsWith('.json')); await h.art.loadGameArt(); h.reset();
  assert.equal(h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation), true);
  assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('raiden-v2.png'));
});

test('hit flashes use the same frame crop while HUD art remains the static portrait', async () => {
  const h = harness(); await h.art.loadGameArt();
  h.reset(); h.art.drawFighterArt(h.draw, 'raiden', 0, 76, 112, animation, { flash: true });
  const drawn = h.calls.filter(call => call.kind === 'drawImage');
  assert.equal(drawn.length, 2); assert.deepEqual(drawn[0].args.slice(1), drawn[1].args.slice(1));
  h.reset(); h.art.drawCharacterArt(h.draw, 'raiden', 0, 76, 112);
  assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('raiden-v2.png'));
});

test('elemental effect atlas selects all four columns and the correct impact row', async () => {
  const h = harness(); await h.art.loadGameArt();
  for (const [index, id] of ['raiden', 'jean', 'eula', 'diluc'].entries()) {
    for (const impact of [false, true]) {
      h.reset(); assert.equal(h.art.drawElementEffect(h.draw, id, impact, 0, 0, 110, 90), true);
      const args = h.calls.find(call => call.kind === 'drawImage').args;
      assert.equal(args[1], index * 100 + 1); assert.equal(args[2], impact ? 101 : 1);
    }
  }
});

test('Xiao shares the existing Anemo column without reading a fifth column', async () => {
  const h = harness(); await h.art.loadGameArt(); h.reset();
  assert.equal(h.art.drawElementEffect(h.draw, 'xiao', false, 0, 0, 110, 90), true);
  const args = h.calls.find(call => call.kind === 'drawImage').args;
  assert.equal(args[1], 101);
  h.reset(); assert.equal(h.art.drawElementEffect(h.draw, 'unknown', false, 0, 0, 110, 90), false);
  assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
});

test('dedicated Xiao plunge uses its registered descent and impact cells', async () => {
  const h = harness(); await h.art.loadGameArt();
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/effects/xiao-plunge-v3.json'), 'utf8'));
  for (const [index, phase] of ['descent', 'impact'].entries()) {
    h.reset(); assert.equal(h.art.drawXiaoPlungeEffect(h.draw, phase, 42, 96, 180, 220, 0.7), true);
    const source = metadata.frames[index].sourceRect;
    const args = h.calls.find(call => call.kind === 'drawImage').args;
    assert.ok(args[0].src.endsWith('xiao-plunge-v3.png'));
    assert.deepEqual(args.slice(1, 5), [source.x + 1, source.y + 1, source.width - 2, source.height - 2]);
    assert.deepEqual(args.slice(5), [-90, -110, 180, 220]);
    assert.deepEqual(h.calls.find(call => call.kind === 'translate').args, [42, 96]);
    assert.equal(h.draw.globalAlpha, 0.7);
  }
});

test('Xiao missing artwork and invalid plunge registration safely retain fallback rendering', async () => {
  const portraitOnly = harness(url => url.includes('/animations/xiao') || url.includes('/effects/xiao'));
  await portraitOnly.art.loadGameArt(); portraitOnly.reset();
  assert.equal(portraitOnly.art.drawFighterArt(portraitOnly.draw, 'xiao', 0, 76, 112, animation), true);
  assert.ok(portraitOnly.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('xiao-v3.png'));
  for (const phase of ['windup', 'dive', 'impact', 'recover']) {
    portraitOnly.reset();
    const plunge = { ...animation, attack: { ...animation.attack, plunge: { phase, elapsed: 0 } } };
    assert.equal(portraitOnly.art.drawFighterArt(portraitOnly.draw, 'xiao', 0, 76, 112, plunge), false);
    assert.equal(portraitOnly.calls.filter(call => call.kind === 'drawImage').length, 0, 'never reuse the raised-spear portrait during a plunge');
  }
  assert.equal(portraitOnly.art.drawXiaoPlungeEffect(portraitOnly.draw, 'descent', 0, 0, 100, 100), false);
  const missing = harness(url => url.includes('xiao'));
  await missing.art.loadGameArt();
  assert.equal(missing.art.drawFighterArt(missing.draw, 'xiao', 0, 76, 112, animation), false);
  for (const invalid of [data => ({ ...data, width: 1 }), data => ({ ...data, frames: [] }), data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, sourceRect: { x: -1, y: 0, width: 20, height: 20 } })) })]) {
    const h = harness(() => false, invalid); await h.art.loadGameArt(); h.reset();
    assert.equal(h.art.drawXiaoPlungeEffect(h.draw, 'impact', 0, 0, 100, 100), false);
    assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
  }
});

const secondaryAnimation = { ...animation, attack: { ...animation.attack, def: { ...animation.attack.def, kind: 'secondary' } } };
const characterIds = ['raiden', 'jean', 'eula', 'diluc', 'xiao'];

test('all 20 secondary poses use their dedicated source rectangles, foot anchors and shared body scale', async () => {
  const h = harness(); await h.art.loadGameArt();
  for (const id of characterIds) {
    const metadata = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${id}-secondary-v1.json`), 'utf8'));
    const scale = 112 / metadata.standingBodyHeightPixels;
    for (const [index, frame] of metadata.frames.entries()) {
      const sample = { ...secondaryAnimation, attack: { ...secondaryAnimation.attack, t: [0, 20, 26, 41][index] } };
      const selected = h.animation.selectActionFrame(sample);
      assert.equal(selected.pose, 'secondary'); assert.equal(selected.column, index);
      assert.equal(selected.phase, ['windup', 'contact', 'followthrough', 'recover'][index]);
      h.reset(); assert.equal(h.art.drawFighterArt(h.draw, id, 55, 91, 112, sample), true);
      const { sourceRect: r, footAnchor: a } = frame;
      const args = h.calls.find(call => call.kind === 'drawImage').args;
      assert.ok(args[0].src.endsWith(`${id}-secondary-v1.png`));
      assert.deepEqual(args.slice(1, 5), [r.x + 1, r.y + 1, r.width - 2, r.height - 2]);
      assert.deepEqual(args.slice(5), [(1 - r.width * a.x) * scale, (1 - r.height * a.y) * scale, (r.width - 2) * scale, (r.height - 2) * scale]);
    }
  }
});

test('secondary left/right facing, damage flash and repeated frozen simulation frames preserve the selected pose', async () => {
  const h = harness(); await h.art.loadGameArt();
  for (const id of characterIds) {
    for (const facing of [-1, 1]) {
      let previous;
      for (let repeat = 0; repeat < 3; repeat++) {
        h.reset(); h.art.drawFighterArt(h.draw, id, 70, 90, 112, secondaryAnimation, { facing, flash: true, alpha: 0.75 });
        const draws = h.calls.filter(call => call.kind === 'drawImage');
        assert.equal(draws.length, 2);
        assert.deepEqual(draws[0].args.slice(1), draws[1].args.slice(1), 'flash must use the same secondary crop');
        assert.deepEqual(h.calls.filter(call => call.kind === 'scale').map(call => call.args), [[facing, 1], [1, 1]]);
        const signature = h.calls.map(call => [call.kind, call.kind === 'drawImage' ? call.args.slice(1) : call.args]);
        if (previous) assert.deepEqual(signature, previous, 'rendering does not advance an attack during hitstop/pause');
        previous = signature;
      }
    }
  }
});

test('secondary cold, missing and invalid sheets retain the geometric fallback instead of reusing old poses', async () => {
  const cold = harness();
  assert.equal(cold.art.drawFighterArt(cold.draw, 'raiden', 0, 0, 112, secondaryAnimation), false);
  for (const rejected of [url => url.includes('-secondary-'), url => url.includes('-secondary-') && url.endsWith('.json')]) {
    const h = harness(rejected); await h.art.loadGameArt();
    for (const id of characterIds) {
      h.reset(); assert.equal(h.art.drawFighterArt(h.draw, id, 0, 0, 112, secondaryAnimation), false);
      assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
      assert.equal(h.art.drawFighterArt(h.draw, id, 0, 0, 112, animation), true, 'old animations still work');
    }
  }
  const invalidTransforms = [
    data => ({ ...data, width: data.width - 1 }),
    data => ({ ...data, standingBodyHeightPixels: 0 }),
    data => ({ ...data, frames: data.frames.slice(0, 3) }),
    data => ({ ...data, frames: [...data.frames, ...data.frames] }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, column: 0 })) }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, sourceRect: { ...frame.sourceRect, x: -1 } })) }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, footAnchor: { x: 1.5, y: 0.8 } })) }),
  ];
  for (const invalid of invalidTransforms) {
    const h = harness(() => false, (data, url) => url.includes('-secondary-') ? invalid(data) : data);
    await h.art.loadGameArt(); h.reset();
    assert.equal(h.art.drawFighterArt(h.draw, 'raiden', 0, 0, 112, secondaryAnimation), false);
    assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
  }
});

test('six secondary effects use registered cells, centre anchors, facing, rotation and clamped alpha', async () => {
  const h = harness(); await h.art.loadGameArt();
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/effects/secondary-effects-v1.json'), 'utf8'));
  for (const frame of metadata.frames) {
    for (const facing of [-1, 1]) {
      h.reset();
      assert.equal(h.art.drawSecondaryEffect(h.draw, frame.id, 37, 81, 180, 140, { facing, rotation: 0.3, alpha: 0.6 }), true);
      const { sourceRect: r } = frame;
      const args = h.calls.find(call => call.kind === 'drawImage').args;
      assert.ok(args[0].src.endsWith('secondary-effects-v1.png'));
      assert.deepEqual(args.slice(1), [r.x + 1, r.y + 1, r.width - 2, r.height - 2, -90, -70, 180, 140]);
      assert.deepEqual(h.calls.find(call => call.kind === 'translate').args, [37, 81]);
      assert.deepEqual(h.calls.find(call => call.kind === 'scale').args, [facing, 1]);
      assert.deepEqual(h.calls.find(call => call.kind === 'rotate').args, [0.3]);
      assert.equal(h.draw.globalAlpha, 0.6);
    }
  }
  h.reset(); assert.equal(h.art.drawSecondaryEffect(h.draw, 'raiden', 0, 0, 100, 100, { impact: true, alpha: 4 }), true);
  assert.deepEqual(h.calls.find(call => call.kind === 'drawImage').args.slice(1, 3), [1025, 513]); assert.equal(h.draw.globalAlpha, 1);
  h.reset(); h.art.drawSecondaryEffect(h.draw, 'jean', 0, 0, 100, 100, { alpha: -2 }); assert.equal(h.draw.globalAlpha, 0);
  h.reset(); assert.equal(h.art.drawSecondaryEffect(h.draw, 'unknown', 0, 0, 100, 100), false);
  assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
});

test('secondary effects reject missing, wrong-size, duplicate-cell and out-of-range metadata', async () => {
  const cold = harness(); assert.equal(cold.art.drawSecondaryEffect(cold.draw, 'xiao', 0, 0, 100, 100), false);
  const missing = harness(url => url.includes('secondary-effects')); await missing.art.loadGameArt();
  assert.equal(missing.art.drawSecondaryEffect(missing.draw, 'xiao', 0, 0, 100, 100), false);
  for (const invalid of [
    data => ({ ...data, height: 1 }),
    data => ({ ...data, frames: data.frames.slice(0, 5) }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, id: 'raiden' })) }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, sourceRect: { ...frame.sourceRect, width: data.width + 1 } })) }),
    data => ({ ...data, frames: data.frames.map(frame => ({ ...frame, sourceRect: { x: 0, y: 0, width: 512, height: 512 } })) }),
  ]) {
    const h = harness(() => false, (data, url) => url.includes('secondary-effects') ? invalid(data) : data);
    await h.art.loadGameArt(); h.reset();
    assert.equal(h.art.drawSecondaryEffect(h.draw, 'jean', 0, 0, 100, 100), false);
    assert.equal(h.calls.filter(call => call.kind === 'drawImage').length, 0);
  }
});

test('actual six PNGs have registered dimensions, genuine alpha and isolated visible sprites in all 26 cells', () => {
  const files = [...characterIds.map(id => `animations/${id}-secondary-v1`), 'effects/secondary-effects-v1'];
  for (const file of files) {
    const base = path.join(root, 'public/assets', file), metadata = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
    const { width, height, pixels } = readRgbaPng(`${base}.png`);
    assert.equal(width, metadata.width, file); assert.equal(height, metadata.height, file);
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) transparent++;
    assert.ok(transparent / (width * height) > 0.6, `${file}: most of the atlas must be genuinely transparent`);
    for (const frame of metadata.frames) {
      const r = frame.sourceRect;
      let visible = 0, borderPixels = 0;
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = r.y; y < r.y + r.height; y++) {
        for (let x = r.x; x < r.x + r.width; x++) {
          const alpha = pixels[(y * width + x) * 4 + 3];
          if (alpha <= 32) continue;
          visible++; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
          if (x < r.x + 3 || x >= r.x + r.width - 3 || y < r.y + 3 || y >= r.y + r.height - 3) borderPixels++;
        }
      }
      assert.ok(visible > 1000, `${file} frame ${frame.index}: must contain real artwork`);
      assert.equal(borderPixels, 0, `${file} frame ${frame.index}: filtering must not bleed into neighbouring frames`);
      assert.ok(left >= r.x && top >= r.y && right < r.x + r.width && bottom < r.y + r.height);
      if (frame.footAnchor) {
        const anchorY = r.y + frame.footAnchor.y * r.height;
        assert.ok(Math.abs(anchorY - bottom) < 35, `${file} frame ${frame.index}: support feet must remain near visible base`);
      }
    }
  }
});

let failures = 0;
for (const { name, run } of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${cases.length - failures}/${cases.length} art regression checks passed.`);
process.exitCode = failures ? 1 : 0;
