export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function timingOf(clip) {
  const starts = [0];
  for (const frame of clip.frames) starts.push(starts.at(-1) + frame.durationMs);
  return { starts, actionDuration: starts.at(-1), duration: starts.at(-1) + (clip.restMs ?? 0) };
}

export function frameAt(time, clip) {
  const { starts } = timingOf(clip);
  const boundary = starts.findIndex((start, index) => index > 0 && time < start);
  return boundary < 0 ? clip.frames.length - 1 : Math.max(0, boundary - 1);
}

export function nextFrameTime(time, direction, clip) {
  const { starts } = timingOf(clip);
  const frames = starts.slice(0, -1);
  return direction > 0
    ? frames.find(start => start > time + .01) ?? frames[0]
    : frames.findLast(start => start < time - .01) ?? frames.at(-1);
}

// One scale for all four drawings in a source sheet; never normalize an individual pose's bounds.
export function registration(frame, clip, bodyHeight) {
  const scale = bodyHeight / clip.sheets[frame.sheet].standingBodyHeight;
  return { scale, x: -frame.pivot[0] * scale, y: -frame.pivot[1] * scale,
    width: frame.rect[2] * scale, height: frame.rect[3] * scale };
}

export function releasePoint(clip, bodyHeight, facing = 1) {
  const frame = clip.frames[clip.releaseFrame];
  if (!frame?.castOrigin) return null;
  const { scale } = registration(frame, clip, bodyHeight);
  return { x: (frame.castOrigin[0] - frame.pivot[0]) * scale * facing,
    y: (frame.castOrigin[1] - frame.pivot[1]) * scale };
}

export function validateClip(clip, dimensions) {
  if (!clip || !Array.isArray(clip.sheets) || !clip.sheets.length || !Array.isArray(clip.frames) || !clip.frames.length) throw new Error('动作配置缺少图集或帧');
  for (const sheet of clip.sheets) {
    if (typeof sheet.src !== 'string' || !sheet.src.startsWith('./assets/') || sheet.src.includes('..') || !Number.isFinite(sheet.standingBodyHeight) || sheet.standingBodyHeight <= 0) throw new Error('图集路径或站姿标尺无效');
  }
  if (clip.restMs !== undefined && (!Number.isFinite(clip.restMs) || clip.restMs < 0)) throw new Error('循环间隔无效');
  clip.frames.forEach((frame, index) => {
    if (!Number.isInteger(frame.sheet) || !clip.sheets[frame.sheet] || !Number.isFinite(frame.durationMs) || frame.durationMs <= 0) throw new Error(`第 ${index + 1} 帧时序无效`);
    if (!Array.isArray(frame.rect) || frame.rect.length !== 4 || !frame.rect.every(Number.isInteger)) throw new Error(`第 ${index + 1} 帧裁切无效`);
    const [x, y, w, h] = frame.rect;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || !Array.isArray(frame.pivot) || frame.pivot.length !== 2 || !frame.pivot.every(Number.isFinite) || frame.pivot[0] < 0 || frame.pivot[0] > w || frame.pivot[1] < 0 || frame.pivot[1] > h) throw new Error(`第 ${index + 1} 帧锚点无效`);
    if (frame.castOrigin && (!Array.isArray(frame.castOrigin) || frame.castOrigin.length !== 2 || !frame.castOrigin.every(Number.isFinite) || frame.castOrigin[0] < 0 || frame.castOrigin[0] > w || frame.castOrigin[1] < 0 || frame.castOrigin[1] > h)) throw new Error(`第 ${index + 1} 帧释放点无效`);
    const size = dimensions?.[frame.sheet];
    if (size && (x + w > size.width || y + h > size.height)) throw new Error(`第 ${index + 1} 帧越过源图边界`);
  });
  if (clip.releaseFrame !== undefined && (!Number.isInteger(clip.releaseFrame) || !clip.frames[clip.releaseFrame]?.castOrigin)) throw new Error('普攻缺少已标定的掌心释放帧');
  return true;
}
