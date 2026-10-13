export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const timingOf = clip => {
  const starts = [0];
  clip.frames.forEach(frame => starts.push(starts.at(-1) + frame.durationMs));
  return { starts, actionDuration: starts.at(-1), duration: starts.at(-1) + (clip.restMs ?? 0) };
};
export function frameAt(time, clip) {
  const { starts } = timingOf(clip), boundary = starts.findIndex((start, index) => index > 0 && time < start);
  return boundary < 0 ? clip.frames.length - 1 : Math.max(0, boundary - 1);
}
export function nextFrameTime(time, direction, clip) {
  const starts = timingOf(clip).starts.slice(0, -1);
  return direction > 0 ? starts.find(start => start > time + .01) ?? 0 : starts.findLast(start => start < time - .01) ?? starts.at(-1);
}
export function registration(frame, clip, bodyHeight) {
  const scale = bodyHeight / clip.sheets[frame.sheet].standingBodyHeight;
  const [offsetX, offsetY] = frame.rootOffset ?? [0, 0];
  return { scale, x: (-frame.pivot[0] + offsetX) * scale, y: (-frame.pivot[1] + offsetY) * scale,
    width: frame.rect[2] * scale, height: frame.rect[3] * scale };
}
export function castPoint(clip, index, bodyHeight, facing = 1) {
  const frame = clip.frames[index];
  if (!frame?.castOrigin) return null;
  const r = registration(frame, clip, bodyHeight);
  return { x: (r.x + frame.castOrigin[0] * r.scale) * facing, y: r.y + frame.castOrigin[1] * r.scale };
}
export function effectTiming(clip, time) {
  if (!clip.effect || clip.releaseFrame === undefined) return null;
  const timing = timingOf(clip), release = timing.starts[clip.releaseFrame];
  const returnAt = clip.returnFrame === undefined ? release : timing.starts[clip.returnFrame];
  const end = clip.effectEndFrame === undefined ? timing.actionDuration : timing.starts[clip.effectEndFrame];
  return { age: time - release, started: time >= release, returning: time >= returnAt,
    returnProgress: clamp((time - returnAt) / Math.max(1, end - returnAt)), end, release };
}
export function validateClip(clip, dimensions) {
  if (!clip || !Array.isArray(clip.sheets) || !clip.sheets.length || !Array.isArray(clip.frames) || !clip.frames.length) throw new Error('缺少动作图集或帧');
  const vector = a => Array.isArray(a) && a.length === 2 && a.every(Number.isFinite);
  for (const sheet of clip.sheets) if (typeof sheet.src !== 'string' || !sheet.src.startsWith('./assets/') || sheet.src.includes('..') || !Number.isFinite(sheet.standingBodyHeight) || sheet.standingBodyHeight <= 0) throw new Error('无效图集或站姿标尺');
  if (clip.restMs !== undefined && (!Number.isFinite(clip.restMs) || clip.restMs < 0)) throw new Error('循环间隔无效');
  clip.frames.forEach((frame, index) => {
    if (!Number.isInteger(frame.sheet) || !clip.sheets[frame.sheet] || !Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || !Array.isArray(frame.rect) || frame.rect.length !== 4 || !frame.rect.every(Number.isInteger)) throw new Error(`第${index + 1}帧配置无效`);
    const [x, y, w, h] = frame.rect;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || !vector(frame.pivot) || Math.abs(frame.pivot[0]) > w * 2 || Math.abs(frame.pivot[1]) > h * 2) throw new Error(`第${index + 1}帧锚点无效`);
    if (frame.rootOffset && (!vector(frame.rootOffset) || frame.rootOffset.some(value => Math.abs(value) > clip.sheets[frame.sheet].standingBodyHeight))) throw new Error('根位移无效');
    if (frame.castOrigin && (!vector(frame.castOrigin) || frame.castOrigin[0] < 0 || frame.castOrigin[0] > w || frame.castOrigin[1] < 0 || frame.castOrigin[1] > h)) throw new Error('掌心锚点无效');
    const size = dimensions?.[frame.sheet];
    if (size && (x + w > size.width || y + h > size.height)) throw new Error(`第${index + 1}帧裁切越界`);
    if (Object.hasOwn(frame, 'scale')) throw new Error('不允许单帧外框缩放');
  });
  if (clip.effect && !['flux', 'ruin', 'nosferatu', 'mire'].includes(clip.effect)) throw new Error('未知演示效果');
  if (clip.releaseFrame !== undefined && (!Number.isInteger(clip.releaseFrame) || !clip.frames[clip.releaseFrame]?.castOrigin)) throw new Error('缺少释放帧掌心锚点');
  for (const key of ['returnFrame', 'effectEndFrame']) if (clip[key] !== undefined && (!Number.isInteger(clip[key]) || !clip.frames[clip[key]])) throw new Error('回流时序无效');
  return true;
}
