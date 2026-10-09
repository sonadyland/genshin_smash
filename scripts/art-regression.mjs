import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { inflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function harness(rejected = () => false, metadataTransform = value => value, enhanced = false, fixtures = {}) {
  const calls = [];
  const decodes = [], fetched = [];
  const noop = () => undefined;
  const draw = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'getImageData') return (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => { calls.push({ kind: key, args }); return { addColorStop: (...stops) => calls.push({ kind: 'addColorStop', args: stops }) }; };
      return (...args) => calls.push({ kind: key, args });
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  class Image {
    src = ''; naturalWidth = 400; naturalHeight = 400;
    async decode() {
      decodes.push(this.src);
      if (rejected(this.src)) throw new Error('fixture: unavailable image');
      if (/-v4\//.test(this.src)) {
        if (!enhanced) throw new Error('fixture: legacy regression pack');
        if (fixtures[this.src]) { this.naturalWidth = fixtures[this.src].width; this.naturalHeight = fixtures[this.src].height; return; }
        const png = fs.readFileSync(path.join(root, 'public', this.src));
        this.naturalWidth = png.readUInt32BE(16); this.naturalHeight = png.readUInt32BE(20); return;
      }
      if (this.src.includes('/effects/')) this.naturalHeight = 200;
      if (this.src.includes('/animations/') || this.src.endsWith('xiao-plunge-v3.png') || this.src.endsWith('secondary-effects-v1.png')) {
        const meta = readMetadata(this.src.replace(/\.png$/, '.json'));
        this.naturalWidth = meta.width; this.naturalHeight = meta.height;
      }
    }
  }
  const readMetadata = url => fixtures[url] ? JSON.parse(JSON.stringify(fixtures[url])) : JSON.parse(fs.readFileSync(path.join(root, 'public', url), 'utf8'));
  const context = vm.createContext({ console, Image, fetch: async url => { fetched.push(url); return { ok: !rejected(url), json: async () => metadataTransform(readMetadata(url), url) }; }, document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) } });
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
  const rawLoad = art.loadGameArt;
  art.loadGameArt = (ids = enhanced ? ['eula'] : []) => rawLoad(ids);
  return { art, decodes, fetched, load, animation: load(path.join(root, 'src/game/animation.ts')), draw, calls, reset: () => { calls.length = 0; draw.globalAlpha = 1; draw.save = noop; draw.restore = noop; } };
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

test('Eula pilot loads eight base and two alternate sheets and selects every registered frame with one body scale', async () => {
  const h = harness(() => false, value => value, true); await h.art.loadGameArt();
  assert.equal(h.art.getEulaAnimationStatus().status, 'ready'); assert.equal(h.art.getEulaAnimationStatus().frames, 80); assert.equal(h.art.getEulaAnimationStatus().variants, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  const phases = ['windup', 'contact', 'followthrough', 'recover'];
  const entries = [...Object.entries(manifest.clips).map(([name, clip]) => [name, clip, 'base']), ...Object.entries(manifest.variants).map(([name, clip]) => [name, clip, 'alternate'])];
  for (const [name, clip, visualVariant] of entries) {
    for (const [index, frame] of clip.frames.entries()) {
      const weightedProgress = peers => (peers.slice(0, peers.indexOf(frame)).reduce((sum, peer) => sum + (peer.duration ?? 6), 0) + (frame.duration ?? 6) / 2) / peers.reduce((sum, peer) => sum + (peer.duration ?? 6), 0);
      const sample = { state: 'free', attack: null, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, time: 0,
        motion: { distance: 0, age: 0, airAge: 0, landAge: -1, turnAge: -1, grounded: true, facing: 1, slope: 0, moving: false } };
      if (name === 'idle') sample.motion.age = clip.frames.slice(0, index).reduce((sum, f) => sum + (f.duration ?? 10), 0);
      else if (name === 'run') { sample.motion.moving = true; sample.motion.distance = weightedProgress(clip.frames) * 96; }
      else if (name === 'dodge') sample.dodgeTimer = 16 * (1 - weightedProgress(clip.frames));
      else if (name === 'jump') {
        const progress = weightedProgress(clip.frames.filter(peer => peer.name === frame.name));
        sample.onGround = frame.name === 'land';
        sample.motion.airAge = frame.name === 'takeoff' ? 0 : frame.name === 'rise' ? progress * 18 : 30;
        sample.vy = frame.name === 'takeoff' || frame.name === 'rise' ? -8 : frame.name === 'fall' ? progress * 12 : 0;
        if (frame.name === 'land') sample.motion.landAge = progress * 8;
      } else {
        const phase = phases.indexOf(frame.phase), peers = clip.frames.filter(f => f.phase === frame.phase);
        const progress = weightedProgress(peers);
        sample.state = 'attack';
        sample.attack = { def: { kind: name, startup: 30, active: 24, endlag: 40 }, visualVariant, t: [0, 30, 54, 76][phase] + progress * [30, 24, 22, 18][phase] };
      }
      h.art.drawFighterArt(h.draw, 'eula', 300, 400, 112, sample, { facing: -1, flash: true }); // Warm the lazy flash surface separately from the draw under test.
      h.reset(); assert.equal(h.art.drawFighterArt(h.draw, 'eula', 300, 400, 112, sample, { facing: -1, flash: true }), true);
      const draws = h.calls.filter(call => call.kind === 'drawImage'); assert.equal(draws.length, 2);
      const source = frame.sourceRect, scale = 112 / clip.standingBodyHeightPixels;
      assert.ok(draws[0].args[0].src.endsWith(`/eula-v4/${clip.image}`), name);
      assert.deepEqual(draws[0].args.slice(1, 5), [source.x + 1, source.y + 1, source.width - 2, source.height - 2], `${name}/${index}`);
      assert.deepEqual(draws[0].args.slice(5), [(1 - source.width * frame.footAnchor.x) * scale, (1 - source.height * frame.footAnchor.y) * scale, (source.width - 2) * scale, (source.height - 2) * scale]);
      assert.deepEqual(draws[1].args.slice(1), draws[0].args.slice(1));
      assert.deepEqual(h.calls.find(call => call.kind === 'scale').args, [-1, 1]);
    }
  }
});

test('Eula PVP damage stays in the new art generation with the established recoil transform', async () => {
  const h = harness(() => false, value => value, true); await h.art.loadGameArt(); h.reset();
  assert.equal(h.art.drawFighterArt(h.draw, 'eula', 0, 112, 112, { ...animation, state: 'hitstun', attack: null }), true);
  assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('/eula-v4/jump.png'));
  assert.ok(h.calls.some(call => call.kind === 'rotate' && call.args[0] === -0.22));
  assert.ok(h.calls.some(call => call.kind === 'scale' && call.args[0] === 0.94 && call.args[1] === 1.03));
});

test('Eula sword light is one fading smooth arc ending at the current blade tip only during contact', async () => {
  const h = harness(() => false, value => value, true); await h.art.loadGameArt();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  const clip = manifest.clips.special, scale = 112 / clip.standingBodyHeightPixels;
  for (const facing of [-1, 1]) for (const t of [19, 25, 32]) {
    const sample = { ...animation, attack: { def: { kind: 'special', startup: 20, active: 12, endlag: 24 }, t } };
    const before = JSON.stringify(sample); h.reset(); h.art.drawFighterArt(h.draw, 'eula', 0, 112, 112, sample, { facing });
    const curves = h.calls.filter(call => call.kind === 'quadraticCurveTo');
    assert.equal(curves.length, t === 25 ? 1 : 0); assert.equal(h.calls.filter(call => call.kind === 'lineTo').length, 0);
    if (curves.length) {
      const crop = h.calls.find(call => call.kind === 'drawImage').args;
      const frame = clip.frames.find(frame => frame.sourceRect.x + 1 === crop[1] && frame.sourceRect.y + 1 === crop[2]);
      assert.deepEqual(curves[0].args.slice(2), [(frame.weaponTip.x - frame.sourceRect.width * frame.footAnchor.x) * scale, (frame.weaponTip.y - frame.sourceRect.height * frame.footAnchor.y) * scale]);
      assert.ok(h.calls.some(call => call.kind === 'addColorStop' && call.args[0] === 0 && call.args[1].endsWith(',0)')));
      assert.deepEqual(h.calls.find(call => call.kind === 'scale').args, [facing, 1]);
    }
    assert.equal(JSON.stringify(sample), before);
  }
});

test('any missing or invalid Eula clip falls back to the complete original fighter and leaves others untouched', async () => {
  for (const [reject, transform] of [
    [url => url.endsWith('/run.png'), value => value],
    [() => false, (value, url) => url.includes('eula-v4/manifest') ? { ...value, clips: { ...value.clips, run: { ...value.clips.run, width: 1 } } } : value],
  ]) {
    const h = harness(reject, transform, true); await h.art.loadGameArt(); assert.equal(h.art.getEulaAnimationStatus().status, 'fallback');
    for (const id of ['eula', 'raiden', 'jean', 'diluc', 'xiao']) {
      h.reset(); assert.equal(h.art.drawFighterArt(h.draw, id, 0, 76, 112, animation), true);
      assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith(`${id}-actions-v3.png`));
    }
  }
});

test('all 64 base and 16 alternate Eula drawings have RGBA transparency and no cell-edge weapon clipping', () => {
  const directory = path.join(root, 'public/assets/animations/eula-v4');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(Object.values(manifest.clips).reduce((total, clip) => total + clip.frames.length, 0), 64);
  assert.equal(Object.values(manifest.variants).reduce((total, clip) => total + clip.frames.length, 0), 16);
  for (const [name, clip] of [...Object.entries(manifest.clips), ...Object.entries(manifest.variants)]) {
    const { width, height, pixels } = readRgbaPng(path.join(directory, clip.image));
    assert.equal(width, clip.width); assert.equal(height, clip.height);
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
    assert.ok(transparent / (width * height) > 0.45, name);
    for (const [index, frame] of clip.frames.entries()) {
      const r = frame.sourceRect; let visible = 0, edge = 0;
      for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
        if (pixels[(y * width + x) * 4 + 3] <= 32) continue;
        visible++;
        if (x < r.x + 3 || x >= r.x + r.width - 3 || y < r.y + 3 || y >= r.y + r.height - 3) edge++;
      }
      assert.ok(visible > 1000, `${name}/${index} must contain a new visible pose`);
      assert.equal(edge, 0, `${name}/${index} needs transparent cell padding`);
    }
  }
});

test('a missing or malformed optional J/K drawing keeps the base pack and the other valid variant', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  for (const kind of ['jab', 'smash']) for (const malformed of [false, true]) {
    const h = harness(url => !malformed && url.endsWith(`/${manifest.variants[kind].image}`), (value, url) => {
      if (malformed && url.includes('eula-v4/manifest')) value.variants[kind].frames[0].weaponTip.y = -1;
      return value;
    }, true);
    await h.art.loadGameArt();
    const status = h.art.getEulaAnimationStatus();
    assert.equal(status.status, 'ready'); assert.equal(status.frames, 72); assert.equal(status.variants, true);
    assert.equal(status.variantKinds.includes(kind), false);
    for (const move of ['jab', 'smash', 'special', 'secondary']) {
      const sample = { ...animation, attack: { def: { kind: move, startup: 20, active: 6, endlag: 26 }, t: 20, visualVariant: 'alternate' } };
      h.reset(); assert.equal(h.art.drawFighterArt(h.draw, 'eula', 0, 76, 112, sample), true);
      const expected = move !== kind && manifest.variants[move] ? manifest.variants[move].image : manifest.clips[move].image;
      assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith(`/eula-v4/${expected}`));
    }
  }
});

test('alternate contact blades descend in support coordinates and their mirrored trails end at the current sword tip', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8'));
  const h = harness(() => false, value => value, true); await h.art.loadGameArt();
  for (const [kind, clip] of Object.entries(manifest.variants)) {
    const contacts = clip.frames.filter(frame => frame.phase === 'contact');
    const relativeY = frame => frame.weaponTip.y - frame.sourceRect.height * frame.footAnchor.y;
    assert.ok(relativeY(contacts.at(-1)) > relativeY(contacts[0]) + 15, `${kind} must visibly cut downward during contact`);
    for (const facing of [-1, 1]) for (const [index, frame] of contacts.entries()) {
      const weight = contacts.slice(0, index).reduce((sum, peer) => sum + (peer.duration ?? 6), 0) + (frame.duration ?? 6) / 2;
      const progress = weight / contacts.reduce((sum, peer) => sum + (peer.duration ?? 6), 0);
      const sample = { ...animation, attack: { def: { kind, startup: 20, active: 20, endlag: 30 }, t: 20 + progress * 20, visualVariant: 'alternate' } }, before = JSON.stringify(sample);
      h.reset(); h.art.drawFighterArt(h.draw, 'eula', 0, 76, 112, sample, { facing });
      const curve = h.calls.find(call => call.kind === 'quadraticCurveTo'), scale = 112 / clip.standingBodyHeightPixels;
      assert.ok(curve, `${kind}/${index} must have a registered blade trail`);
      assert.deepEqual(curve.args.slice(2), [(frame.weaponTip.x - frame.sourceRect.width * frame.footAnchor.x) * scale, relativeY(frame) * scale]);
      assert.deepEqual(h.calls.find(call => call.kind === 'scale').args, [facing, 1]); assert.equal(JSON.stringify(sample), before);
    }
  }
});

function syntheticPack(id) {
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/eula-v4/manifest.json'), 'utf8')); pack.character = id;
  for (const clip of [...Object.values(pack.clips), ...Object.values(pack.variants)]) {
    Object.assign(clip, { image: 'shared.png', width: 2048, height: 2048, standingBodyHeightPixels: 100 });
    clip.frames.forEach((frame, index) => {
      frame.sourceRect = { x: index * 128, y: 0, width: 128, height: 128 }; frame.footAnchor = { x: 0.5, y: 0.9 };
      if (frame.weaponTip) frame.weaponTip = { x: 10 + index * 9, y: 35 + index * 5 };
    });
  }
  if (id === 'xiao') pack.clips.special.frames.forEach(frame => { frame.name = { windup: 'windup', contact: 'dive', followthrough: 'impact', recover: 'recover' }[frame.phase]; });
  if (id === 'raiden' || id === 'xiao') pack.clips.jab.trail = 'thrust';
  return pack;
}
const packFixtures = ids => Object.fromEntries(ids.flatMap(id => [[`/assets/animations/${id}-v4/manifest.json`, syntheticPack(id)], [`/assets/animations/${id}-v4/shared.png`, { width: 2048, height: 2048 }]]));

test('packs load only requested characters, preserve concurrent requests, and decode a shared atlas once', async () => {
  const h = harness(() => false, value => value, true, packFixtures(['raiden', 'jean']));
  await h.art.loadGameArt([]); assert.equal(h.decodes.some(url => url.includes('-v4/')), false);
  const raiden = h.art.loadGameArt(['raiden']), jean = h.art.loadGameArt(['jean']);
  await Promise.all([raiden, jean, h.art.loadGameArt(['raiden', 'jean'])]);
  for (const id of ['raiden', 'jean']) {
    assert.equal(h.art.getCharacterAnimationStatus(id).status, 'ready'); assert.equal(h.art.getCharacterAnimationStatus(id).frames, 80);
    assert.equal(h.decodes.filter(url => url.endsWith(`/${id}-v4/shared.png`)).length, 1);
    assert.equal(h.fetched.filter(url => url.endsWith(`/${id}-v4/manifest.json`)).length, 1);
    h.reset(); h.art.drawFighterArt(h.draw, id, 0, 112, 112, animation);
    assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith(`/${id}-v4/shared.png`));
  }
  assert.equal(h.art.getCharacterAnimationStatus('xiao').status, 'loading');
});

test('a bad roster manifest or shared atlas falls back atomically for only that character', async () => {
  const fixtures = packFixtures(['raiden', 'jean']);
  for (const wrongCharacter of [false, true]) {
    const h = harness(url => !wrongCharacter && url.endsWith('/raiden-v4/shared.png'), (value, url) => {
      if (wrongCharacter && url.endsWith('/raiden-v4/manifest.json')) value.character = 'jean'; return value;
    }, true, fixtures);
    await h.art.loadGameArt(['raiden', 'jean']);
    assert.equal(h.art.getCharacterAnimationStatus('raiden').status, 'fallback'); assert.equal(h.art.getCharacterAnimationStatus('jean').status, 'ready');
    h.reset(); h.art.drawFighterArt(h.draw, 'raiden', 0, 112, 112, animation);
    assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith('/raiden-actions-v3.png'));
  }
});

test('blade trails follow each character color and move shape while plunge and lightning summons omit sword arcs', async () => {
  const ids = ['raiden', 'jean', 'diluc', 'xiao'], h = harness(() => false, value => value, true, packFixtures(ids)); await h.art.loadGameArt(ids);
  for (const [id, kind, shape, color] of [['raiden', 'jab', 'lineTo', '#9b6dd8'], ['jean', 'special', 'lineTo', '#6fb7e8'], ['diluc', 'smash', 'quadraticCurveTo', '#e86a4a'], ['xiao', 'secondary', 'lineTo', '#55e4c2']]) {
    h.reset(); h.art.drawFighterArt(h.draw, id, 0, 112, 112, { ...animation, attack: { def: { ...animation.attack.def, kind }, t: 23 } });
    assert.ok(h.calls.some(call => call.kind === shape), `${id}/${kind}`);
    assert.ok(h.calls.some(call => call.kind === 'addColorStop' && call.args[1] === color), id);
  }
  for (const [id, attack] of [['raiden', { def: { ...animation.attack.def, kind: 'secondary' }, t: 23 }], ['xiao', { def: { ...animation.attack.def, kind: 'special' }, t: 23, plunge: { phase: 'dive', elapsed: 40 } }]]) {
    h.reset(); h.art.drawFighterArt(h.draw, id, 0, 112, 112, { ...animation, attack });
    assert.ok(!h.calls.some(call => call.kind === 'quadraticCurveTo' || call.kind === 'lineTo'));
    assert.ok(h.calls.find(call => call.kind === 'drawImage').args[0].src.endsWith(`/${id}-v4/shared.png`));
  }
});

test('registered base and alternate J/K trails replace duplicate PVP and survival crescents without hiding skills or impacts', async () => {
  const ids = ['raiden', 'jean', 'eula'], h = harness(() => false, value => value, true); await h.art.loadGameArt(ids);
  const { Game } = h.load(path.join(root, 'src/game/engine.ts'));
  const { renderSurvival } = h.load(path.join(root, 'src/game/survival-render.ts'));
  const { CHARACTERS } = h.load(path.join(root, 'src/game/data.ts'));
  for (const id of ids) {
    const char = CHARACTERS.find(character => character.id === id);
    for (const kind of ['jab', 'smash']) for (const variant of ['base', 'alternate']) {
      assert.equal(h.art.hasRegisteredMeleeTrail(id, kind, variant), true, `${id}/${kind}/${variant}`);
      const attack = { def: char[kind], t: char[kind].startup + 2, visualVariant: variant }, fighter = { char, attack };
      const before = JSON.stringify(fighter); h.reset(); Game.prototype.drawAttackFx.call({}, h.draw, fighter);
      assert.equal(h.calls.some(call => call.kind === 'drawImage' || call.kind === 'ellipse'), false, 'PVP duplicate crescent omitted');
      assert.equal(JSON.stringify(fighter), before);
      // The slash remains in simulation for identical caps/timing; renderer uses
      // its captured form even after the player has recovered or started another move.
      const melee = { kind, variant }, effect = { kind: 'slash', x: 620, y: 710, size: 170, age: 3, life: 19, color: char.color, melee };
      const game = { char, context: h.draw, camera: { x: 0, y: 0 }, frame: 60, fields: [], orbs: [], enemies: [], shots: [], texts: [], effects: [effect], notice: '', hitstop: 0,
        player: { x: 620, y: 750, vx: 0, vy: 0, facing: 1, onGround: true, dodge: 0, attack: null, invuln: 0 } };
      const snapshot = JSON.stringify(effect); h.reset(); renderSurvival(game);
      assert.equal(h.calls.filter(call => call.kind === 'drawImage' && call.args[0].src?.endsWith('elemental-bursts-v3.png')).length, 0);
      assert.equal(JSON.stringify(effect), snapshot);
      game.effects = [{ ...effect, melee: undefined }, { ...effect, kind: 'impact', melee: undefined }]; h.reset(); renderSurvival(game);
      assert.equal(h.calls.filter(call => call.kind === 'drawImage' && call.args[0].src?.endsWith('elemental-bursts-v3.png')).length, 2, 'skill slashes and hit sparks remain');
    }
    for (const kind of ['special', 'secondary']) assert.equal(h.art.hasRegisteredMeleeTrail(id, kind, 'alternate'), false);
  }
  for (const kind of ['special', 'secondary']) {
    const char = CHARACTERS[0]; h.reset(); Game.prototype.drawAttackFx.call({}, h.draw, { char, attack: { def: char[kind], t: char[kind].startup + 2 } });
    assert.ok(h.calls.some(call => call.kind === 'drawImage'), `PVP ${kind} keeps its effect`);
  }
  const legacy = harness(); await legacy.art.loadGameArt();
  assert.equal(legacy.art.hasRegisteredMeleeTrail('raiden', 'jab', 'alternate'), false);
  const { Game: LegacyGame } = legacy.load(path.join(root, 'src/game/engine.ts'));
  legacy.reset(); LegacyGame.prototype.drawAttackFx.call({}, legacy.draw, { char: CHARACTERS[0], attack: { def: CHARACTERS[0].jab, t: 8 } });
  assert.ok(legacy.calls.some(call => call.kind === 'drawImage'), 'legacy fallback keeps its original crescent');
});

test('all 400 delivered frames render their registered source in both facings with one decode per atlas', async () => {
  const ids = ['eula', 'raiden', 'jean', 'diluc', 'xiao'], h = harness(() => false, value => value, true); await h.art.loadGameArt(ids);
  let count = 0;
  for (const id of ids) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, `public/assets/animations/${id}-v4/manifest.json`), 'utf8'));
    const status = h.art.getCharacterAnimationStatus(id); assert.equal(status.status, 'ready'); assert.equal(status.frames, 80);
    for (const [kind, clip, variant] of [...Object.entries(manifest.clips).map(([kind, clip]) => [kind, clip, 'base']), ...Object.entries(manifest.variants).map(([kind, clip]) => [kind, clip, 'alternate'])]) {
      for (const frame of clip.frames) for (const facing of [-1, 1]) {
        const peers = clip.frames.filter(peer => kind === 'jump' ? peer.name === frame.name : peer.phase === frame.phase), index = peers.indexOf(frame);
        const progress = (peers.slice(0, index).reduce((sum, peer) => sum + (peer.duration ?? 6), 0) + (frame.duration ?? 6) / 2) / peers.reduce((sum, peer) => sum + (peer.duration ?? 6), 0);
        const t = frame.phase === 'windup' ? progress * 20 : frame.phase === 'contact' ? 20 + progress * 20 : frame.phase === 'followthrough' ? 40 + progress * 22 : 62 + progress * 18;
        let sample = { ...animation, attack: { def: { kind, startup: 20, active: 20, endlag: 40 }, t, visualVariant: variant } };
        if (['idle', 'run', 'jump', 'dodge'].includes(kind)) {
          sample = { ...animation, state: 'free', attack: null, time: progress * peers.reduce((sum, peer) => sum + (peer.duration ?? 6), 0) };
          if (kind === 'run') Object.assign(sample, { vx: 4, time: progress * 24 });
          if (kind === 'dodge') Object.assign(sample, { dodgeDuration: 16, dodgeTimer: 16 * (1 - progress) });
          if (kind === 'jump') Object.assign(sample, { onGround: frame.name === 'land', vy: frame.name === 'fall' ? progress * 12 : frame.name === 'apex' ? 0 : -10,
            motion: { grounded: frame.name === 'land', moving: false, slope: 0, age: 0, distance: 0, airAge: frame.name === 'takeoff' ? 0 : frame.name === 'rise' ? Math.max(3.01, progress * 18) : 10, landAge: frame.name === 'land' ? progress * 8 : -1 } });
        } else if (id === 'xiao' && kind === 'special') {
          const duration = frame.name === 'dive' ? peers.reduce((sum, peer) => sum + (peer.duration ?? 6), 0) : 20;
          sample.attack.plunge = { phase: frame.name, elapsed: progress * duration, recoveryDuration: 20 };
        }
        h.reset(); assert.equal(h.art.drawFighterArt(h.draw, id, 0, 112, 112, sample, { facing }), true);
        const drawn = h.calls.find(call => call.kind === 'drawImage').args;
        assert.ok(drawn[0].src.endsWith(`/${id}-v4/${clip.image}`));
        assert.deepEqual(drawn.slice(1, 5), [frame.sourceRect.x + 1, frame.sourceRect.y + 1, frame.sourceRect.width - 2, frame.sourceRect.height - 2]);
        if (facing === 1) count++;
      }
    }
    assert.equal(h.decodes.filter(url => url.includes(`/${id}-v4/`)).length, id === 'eula' ? 10 : 6);
  }
  assert.equal(count, 400);
});

test('real Xiao dive and impact spear tips share the physical ground registration without penetrating below it', async () => {
  const h = harness(() => false, value => value, true); await h.art.loadGameArt(['xiao']);
  const clip = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/xiao-v4/special.json'), 'utf8'));
  for (const phase of ['windup', 'dive', 'impact', 'recover']) for (const facing of [-1, 1]) {
    const frames = clip.frames.filter(frame => frame.name === phase);
    for (const [index, frame] of frames.entries()) {
      const total = frames.reduce((sum, peer) => sum + peer.duration, 0), progress = (frames.slice(0, index).reduce((sum, peer) => sum + peer.duration, 0) + frame.duration / 2) / total;
      const sample = { ...animation, onGround: ['impact', 'recover'].includes(phase), attack: { def: { kind: 'special', startup: total, active: total, endlag: total }, t: 0, plunge: { phase, elapsed: progress * total, recoveryDuration: total } } };
      const before = JSON.stringify(sample); h.reset(); h.art.drawFighterArt(h.draw, 'xiao', 500, 750, 112, sample, { facing });
      const source = frame.sourceRect, scale = 112 / clip.standingBodyHeightPixels;
      const dx = (frame.weaponTip.x - source.width * frame.footAnchor.x) * scale;
      const dy = (frame.weaponTip.y - source.height * frame.footAnchor.y) * scale;
      assert.ok(Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01, `${phase}/${index} uses the same spear-tip support point`);
      assert.ok(frame.weaponTip.y > source.height * 0.9, 'the registered tip stays at the bottom of the image');
      assert.equal(JSON.stringify(sample), before);
    }
  }
});

let failures = 0;
const selectedCases = process.argv[2] ? cases.filter(({ name }) => new RegExp(process.argv[2]).test(name)) : cases;
assert.ok(selectedCases.length, 'the requested art regression filter must select at least one check');
for (const { name, run } of selectedCases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`\n${selectedCases.length - failures}/${selectedCases.length} art regression checks passed.`);
process.exitCode = failures ? 1 : 0;
