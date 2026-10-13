import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { frameAt, nextFrameTime, registration, releasePoint, timingOf, validateClip } from '../public/previews/tharja-v1/preview-model.js';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'public/previews/tharja-v1');
const clips = ['idle', 'jab'].map(id => JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8')));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pngSize = file => {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes[25], 6, `${file}: requires original RGBA PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

test('approved portrait is copied without any pixel or encoding change', () => {
  const approved = '93c586cf7c2b6a63baae8712a112f8dc812e448a333b265efcfbffb5e95b9357';
  assert.equal(sha(path.join(dir, 'assets/master.png')), approved);
  assert.equal(sha(path.join(root, 'public/previews/tharja-v2/portrait.png')), approved);
});

test('all 20 source frames have valid real image crops and anatomical scale metadata', () => {
  assert.deepEqual(clips.map(clip => clip.frames.length), [8, 12]);
  for (const clip of clips) {
    const dimensions = clip.sheets.map(sheet => pngSize(path.join(dir, sheet.src)));
    assert.ok(validateClip(clip, dimensions));
    assert.ok(new Set(clip.frames.map(frame => frame.phase)).size <= 4);
    for (const frame of clip.frames) assert.equal(Object.hasOwn(frame, 'scale'), false, 'frame-specific bbox scale is not allowed');
  }
});

test('pose changes and different crop heights never change same-sheet body scale', () => {
  for (const clip of clips) for (const height of [112, 224, 350]) {
    for (const [index, sheet] of clip.sheets.entries()) {
      const frames = clip.frames.filter(frame => frame.sheet === index);
      const scales = new Set(frames.map(frame => registration(frame, clip, height).scale));
      assert.equal(scales.size, 1);
      assert.equal([...scales][0], height / sheet.standingBodyHeight);
      for (const frame of frames) {
        const result = registration(frame, clip, height);
        assert.equal(result.x + frame.pivot[0] * result.scale, 0);
        assert.equal(result.y + frame.pivot[1] * result.scale, 0);
      }
    }
  }
});

test('timeline endpoints and frame stepping retain intentional last poses and loop cleanly', () => {
  for (const clip of clips) {
    const { starts, duration, actionDuration } = timingOf(clip);
    assert.equal(frameAt(0, clip), 0);
    assert.equal(frameAt(actionDuration, clip), clip.frames.length - 1);
    assert.equal(frameAt(duration, clip), clip.frames.length - 1);
    for (let i = 0; i < clip.frames.length; i++) {
      assert.equal(frameAt(starts[i], clip), i);
      assert.equal(frameAt(starts[i + 1] - .001, clip), i);
    }
    assert.equal(nextFrameTime(starts.at(-2), 1, clip), 0);
    assert.equal(nextFrameTime(0, -1, clip), starts.at(-2));
  }
});

test('ranged spell starts at the authored palm and mirrors in both display sizes', () => {
  const clip = clips[1], frame = clip.frames[clip.releaseFrame];
  assert.ok(frame.castOrigin);
  for (const height of [112, 224, 350]) {
    const right = releasePoint(clip, height, 1), left = releasePoint(clip, height, -1);
    const placement = registration(frame, clip, height);
    assert.ok(Math.abs(right.x - (placement.x + frame.castOrigin[0] * placement.scale)) < 1e-10);
    assert.ok(Math.abs(right.y - (placement.y + frame.castOrigin[1] * placement.scale)) < 1e-10);
    assert.equal(right.x, -left.x);
    assert.equal(right.y, left.y);
    assert.ok(right.x > 0 && right.y < 0, 'right-facing palm must be forward and above the floor');
  }
});

test('invalid art contracts fail explicitly instead of falling back to a moving portrait', () => {
  const bad = structuredClone(clips[1]);
  bad.frames[bad.releaseFrame].castOrigin = undefined;
  assert.throws(() => validateClip(bad), /掌心释放帧/);
  const outside = structuredClone(clips[0]); outside.frames[0].rect[0] = 5000;
  assert.throws(() => validateClip(outside, outside.sheets.map(() => ({ width: 2048, height: 2048 }))), /源图边界/);
});
