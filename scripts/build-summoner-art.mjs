/** Registers approved/generated pixels without cropping, resizing or repainting PNGs. */
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const generated = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/animations/summoner-generation.json'), 'utf8'));
const cache = new Map();
function png(file) {
  if (cache.has(file)) return cache.get(file);
  const bytes = fs.readFileSync(file), chunks = [];
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0) throw new Error(`Expected RGBA8 ${file}`);
  for (let pos = 8; pos < bytes.length;) {
    const count = bytes.readUInt32BE(pos);
    if (bytes.toString('ascii', pos + 4, pos + 8) === 'IDAT') chunks.push(bytes.subarray(pos + 8, pos + 8 + count));
    pos += count + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const at = y * stride + x, filter = raw[y * (stride + 1)], a = x >= 4 ? pixels[at - 4] : 0, b = y ? pixels[at - stride] : 0, c = x >= 4 && y ? pixels[at - stride - 4] : 0;
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    const predictor = [0, a, b, Math.floor((a + b) / 2), da <= db && da <= dc ? a : db <= dc ? b : c][filter];
    pixels[at] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
  }
  const result = { width, height, pixels }; cache.set(file, result); return result;
}
function measure(image, rect, threshold = 64) {
  const [sx, sy, w, h] = rect; let left = w, right = 0, top = h, bottom = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (image.pixels[((sy + y) * image.width + sx + x) * 4 + 3] > threshold) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  let footLeft = w, footRight = 0;
  for (let y = Math.max(top, bottom - Math.ceil(h * .06)); y <= bottom; y++) for (let x = 0; x < w; x++) if (image.pixels[((sy + y) * image.width + sx + x) * 4 + 3] > 100) {
    footLeft = Math.min(footLeft, x); footRight = Math.max(footRight, x);
  }
  return { left, right, top, bottom, pivot: [footLeft <= footRight ? (footLeft + footRight) / 2 : (left + right) / 2, bottom] };
}
const rectObject = ([x, y, width, height]) => ({ x, y, width, height });
const clone = x => structuredClone(x);
const round = x => Math.round(x * 1e8) / 1e8;
function frame(image, rect, pivot, rest = {}) {
  const anchor = pivot ?? measure(image, rect).pivot;
  return { sourceRect: rectObject(rect), footAnchor: { x: round(anchor[0] / rect[2]), y: round(anchor[1] / rect[3]) }, ...rest };
}
const summonManifest = { version: 1, assets: {} };
for (const id of ['zhongli', 'furina']) {
  const preview = path.join(root, 'public/previews', `${id}-v1`), dest = path.join(root, 'public/assets/animations', `${id}-v1`);
  fs.mkdirSync(dest, { recursive: true });
  const meta = JSON.parse(fs.readFileSync(path.join(preview, 'metadata.json'), 'utf8'));
  fs.copyFileSync(path.join(preview, 'assets/master.png'), path.join(dest, 'portrait.png'));
  const register = (key) => {
    const clip = meta.clips[key], sources = clip.sheets ?? [clip.sheet], pictures = sources.map(source => {
      const basename = path.basename(source), original = path.join(preview, source);
      fs.copyFileSync(original, path.join(dest, basename)); return { name: basename, ...png(original) };
    });
    const primary = pictures[0], impact = clip.impactFrame, recover = key === 'jab-thrust' ? 6 : 13;
    const frames = clip.frames.map((source, i) => {
      const sheet = source.sheet ?? 0, image = pictures[sheet], phase = i < impact ? 'windup' : i === impact ? 'contact' : i < recover ? 'followthrough' : 'recover';
      const override = sheet ? { image: image.name, width: image.width, height: image.height } : {};
      const rest = { name: `${key}-${i + 1}`, phase, duration: round(clip.frameMs[i] * .06), ...override, sourceScale: source.scale ?? clip.sheetScales?.[sheet] ?? 1 };
      // The approved D1 crop shares three transparent padding rows with D3.
      // Remove only that empty registration margin; retain the same foot pivot.
      const rect = id === 'furina' && key === 'l-skill' && sheet === 3 && source.rect[1] === 0
        ? [source.rect[0], source.rect[1], source.rect[2], 650] : source.rect;
      const result = frame(image, rect, source.pivot, rest);
      // J/K thrust trails use measured weapon-tip pixels from the approved contact frames.
      if (key === 'jab-thrust' && i >= 2 && i <= 5) {
        const bounds = measure(image, source.rect, 128), tipX = bounds.right;
        const ys = [];
        for (let y = 0; y < source.rect[3]; y++) if (image.pixels[((source.rect[1] + y) * image.width + source.rect[0] + tipX) * 4 + 3] >= 128) ys.push(y);
        if (ys.length) result.weaponTip = { x: tipX, y: ys[Math.floor(ys.length / 2)] };
      }
      return result;
    });
    return { image: primary.name, width: primary.width, height: primary.height, standingBodyHeightPixels: round(350 / clip.displayScale), trail: key === 'jab-thrust' ? 'thrust' : 'none', frames };
  };
  const jab = register('jab-thrust'), special = register('l-skill'), secondary = register('i-burst');
  // Running roots are authored at the pelvis projection and a fixed ground
  // baseline. Measuring the current lowest shoe would pin flight poses down
  // and move the entire body sideways whenever the support leg changes.
  const run = JSON.parse(fs.readFileSync(path.join(dest, 'run-v2.json'), 'utf8'));
  delete run.registration; // Review landmarks are authoring data, not runtime state.
  const runImage = png(path.join(dest, run.image));
  if (run.image !== 'run-v2.png' || run.width !== runImage.width || run.height !== runImage.height || run.frames.length !== 8) {
    throw new Error(`Invalid authored run-v2 registration for ${id}`);
  }
  const motion = { run };
  for (const type of ['air']) {
    const source = generated.find(item => item.id === `${id}-${type}`).source, name = `${type}.png`;
    if (!fs.existsSync(path.join(dest, name))) fs.copyFileSync(source, path.join(dest, name));
    const image = png(path.join(dest, name));
    const split = id === 'furina' ? 480 : 490;
    const standingBodyHeightPixels = id === 'furina' ? 410 : 445;
    // Source grid rows have different whitespace. One anatomical scale per sheet
    // preserves jump/crouch shortening instead of normalizing every alpha box.
    const frames = Array.from({ length: 8 }, (_, i) => {
      const columns = i < 4 ? undefined : id === 'zhongli' ? [0, 443, 887, 1370, image.width] : undefined;
      const x = columns?.[i % 4] ?? Math.floor(i % 4 * image.width / 4), x2 = columns?.[i % 4 + 1] ?? Math.floor((i % 4 + 1) * image.width / 4);
      // The last Furina air column begins its lower hat above the other columns.
      const columnSplit = id === 'furina' && i % 4 === 3 ? 474 : split;
      const y = i < 4 ? 0 : columnSplit, y2 = i < 4 ? columnSplit : image.height;
      return frame(image, [x, y, x2 - x, y2 - y], undefined, { duration: 6 });
    });
    motion[type] = { image: name, width: image.width, height: image.height, standingBodyHeightPixels, trail: 'none', frames };
  }
  const idle = { ...clone(jab), trail: 'none', frames: [clone(jab.frames[0]), clone(jab.frames.at(-1))].map((f, i) => { delete f.phase; delete f.weaponTip; return { ...f, name: i ? 'settle' : 'ready', duration: 36 }; }) };
  const jump = { ...clone(motion.air), frames: motion.air.frames.slice(0, 5).map((f, i) => ({ ...f, name: ['takeoff', 'rise', 'apex', 'fall', 'land'][i] })) };
  const dodge = { ...clone(motion.air), frames: motion.air.frames.slice(5).map((f, i) => ({ ...f, name: ['anticipation', 'travel', 'brake'][i], duration: [3, 8, 5][i] })) };
  const smash = clone(jab);
  smash.frames.forEach(f => { f.duration = round(f.duration * (f.phase === 'windup' ? 1.35 : f.phase === 'contact' ? 1.4 : 1)); });
  const manifest = { version: 1, character: id, generator: 'built-in image_gen', date: '2026-10-10', clips: { idle, run: motion.run, jump, dodge, jab, smash, special, secondary } };
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (id === 'zhongli') for (const name of ['pillar', 'meteor']) {
    const original = path.join(preview, 'assets', `${name}.png`), image = png(original);
    fs.copyFileSync(original, path.join(dest, `${name}.png`));
    const bounds = measure(image, [0, 0, image.width, image.height], 48), rect = [Math.max(0, bounds.left - 4), Math.max(0, bounds.top - 4), Math.min(image.width - bounds.left, bounds.right - bounds.left + 9), Math.min(image.height - bounds.top, bounds.bottom - bounds.top + 9)];
    summonManifest.assets[`geo-${name}`] = { owner: id, image: `${id}-v1/${name}.png`, width: image.width, height: image.height, standingBodyHeightPixels: rect[3], frames: [frame(image, rect)] };
  }
  if (id === 'furina') for (const [name, pet] of Object.entries(meta.pets)) {
    const original = path.join(preview, pet.sheet), image = png(original);
    fs.copyFileSync(original, path.join(dest, `${name}.png`));
    const frames = pet.frames.map((f, i) => frame(image, f.rect, f.pivot, { duration: round(meta.petFrameMs[i] * .06) }));
    summonManifest.assets[name] = { owner: id, image: `${id}-v1/${name}.png`, width: image.width, height: image.height, standingBodyHeightPixels: Math.max(...pet.frames.map(f => { const m = measure(image, f.rect); return m.bottom - m.top; })), frames };
  }
  console.log(`${id}: ${Object.values(manifest.clips).reduce((sum, clip) => sum + clip.frames.length, 0)} registered frames`);
}
fs.writeFileSync(path.join(root, 'src/game/summoner-art-manifest.json'), JSON.stringify(summonManifest, null, 2) + '\n');
