const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const images = new Map();
const measured = new Map();
const state = { clip: 'l-skill', playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, time: 0, facing: 1, mode: 'complete', guides: false, compare: false };
let metadata, lastTimestamp = 0;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;
const startsOf = (durations) => durations.reduce((starts, duration) => [...starts, starts.at(-1) + duration], [0]);
const frameAt = (time, starts) => {
  const end = starts.findIndex((boundary, i) => i > 0 && time < boundary);
  return end === -1 ? starts.length - 2 : Math.max(0, end - 1);
};

function loadImage(key, url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { images.set(key, image); resolve(image); };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

const sheetKey = (key, index = 0) => index === 0 ? key : `${key}:sheet:${index}`;
const sheetUrls = (clip) => clip.sheets ?? [clip.sheet];
const hasClip = (key, clip) => sheetUrls(clip).every((_, index) => images.has(sheetKey(key, index)));

// Read alpha only to locate feet/body pivots; never alter source image pixels.
// Custom rectangles accommodate real generated sheets instead of assuming grids.
function measureFrames(key, clip) {
  if (!hasClip(key, clip)) return;
  const scratch = document.createElement('canvas');
  const scan = scratch.getContext('2d', { willReadFrequently: true });
  const frames = [];
  for (let i = 0; i < clip.frameCount; i++) {
    const custom = clip.frames?.[i];
    const imageKey = sheetKey(key, custom?.sheet ?? 0), image = images.get(imageKey);
    const cw = image.naturalWidth / clip.columns, ch = image.naturalHeight / clip.rows;
    const localFrame = custom?.sourceFrame ?? i % (clip.columns * clip.rows);
    const x = Math.floor(localFrame % clip.columns * cw), y = Math.floor(Math.floor(localFrame / clip.columns) * ch);
    const rect = custom?.rect ?? [x, y, Math.floor((localFrame % clip.columns + 1) * cw) - x, Math.floor((Math.floor(localFrame / clip.columns) + 1) * ch) - y];
    scratch.width = rect[2]; scratch.height = rect[3];
    scan.drawImage(image, ...rect, 0, 0, rect[2], rect[3]);
    const pixels = scan.getImageData(0, 0, rect[2], rect[3]).data;
    let left = rect[2], right = 0, top = rect[3], bottom = 0;
    for (let py = 0; py < rect[3]; py++) {
      for (let px = 0; px < rect[2]; px++) if (pixels[(py * rect[2] + px) * 4 + 3] > 64) {
        left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
      }
    }
    let shoeLeft = rect[2], shoeRight = 0;
    if (clip.anchorToFeet) for (let py = Math.max(top, bottom - Math.ceil(rect[3] * .06)); py <= bottom; py++) {
      for (let px = 0; px < rect[2]; px++) if (pixels[(py * rect[2] + px) * 4 + 3] > 100) { shoeLeft = Math.min(shoeLeft, px); shoeRight = Math.max(shoeRight, px); }
    }
    frames.push({ imageKey, rect, pivotX: custom?.pivot?.[0] ?? (shoeLeft <= shoeRight ? (shoeLeft + shoeRight) / 2 : (left + right) / 2), pivotY: custom?.pivot?.[1] ?? bottom, scale: custom?.scale ?? clip.sheetScales?.[custom?.sheet ?? 0] ?? 1, height: bottom - top });
  }
  measured.set(key, { frames, scale: clip.displayScale ?? (clip.displayHeight ?? clip.displayCellHeight ?? 350) / Math.max(...frames.map((frame) => frame.height)) });
}

function clipTiming() {
  const clip = metadata.clips[state.clip], starts = startsOf(clip.frameMs);
  return { clip, starts, actionDuration: starts.at(-1), duration: starts.at(-1) + clip.restMs };
}
function duration() {
  if (state.mode === 'pets') return startsOf(metadata.petFrameMs).at(-1);
  const timing = clipTiming();
  return state.mode === 'character' || state.compare ? timing.actionDuration + 600 : timing.duration;
}
function playButton() {
  $('play-toggle').textContent = state.playing ? 'Ⅱ' : '▶';
  $('play-toggle').setAttribute('aria-label', state.playing ? '暂停播放' : '继续播放');
}
function selectClip(key) {
  state.clip = key; state.time = 0;
  document.querySelectorAll('[data-clip]').forEach((button) => { const active = button.dataset.clip === key; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  updateView();
}
function updateView() {
  if (!metadata) return;
  const clip = metadata.clips[state.clip], petsOnly = state.mode === 'pets';
  const phases = petsOnly ? ['灵动待机', '蓄势准备', '各显身手', '回弹收势'] : clip.phases;
  $('clip-caption').textContent = petsOnly ? '沙龙成员 / THE SALON MEMBERS' : clip.title;
  $('effect-caption').textContent = { complete: '人物 + 沙龙成员 + 水元素', character: '仅人物 · 逐帧动作', pets: '仅三宠 · 独立逐帧循环' }[state.mode];
  if (state.compare && !petsOnly) $('effect-caption').textContent = '母版与动作 · 同一站姿标定身高';
  $('proportion-compare').disabled = petsOnly;
  $('guides').disabled = state.compare && !petsOnly;
  $('comparison-note').hidden = !state.compare || petsOnly;
  canvas.setAttribute('aria-label', petsOnly ? '三位沙龙成员待机及攻击逐帧动画' : `芙宁娜${clip.title.split(' / ')[0]}逐帧动画`);
  $('motion-note').textContent = petsOnly ? '前 4 帧为待机 / 游动，后 8 帧演示蓄势、出手与回收。此视图让三宠同步步进，便于比较动作；完整演出中会错开各自的登场与攻击。' : clip.note;
  $('beats').replaceChildren(...phases.map((phase, i) => { const li = document.createElement('li'); const number = document.createElement('span'); number.textContent = `0${i + 1}`; const name = document.createElement('strong'); name.textContent = phase; li.append(number, name); return li; }));
  const missing = [];
  if (!petsOnly && !hasClip(state.clip, clip)) missing.push('当前人物逐帧美术尚未加载。');
  if (state.compare && !petsOnly && !images.has('portrait')) missing.push('母版立绘尚未加载。');
  if (state.mode !== 'character' && (petsOnly || state.clip !== 'jab-thrust')) for (const [key, pet] of Object.entries(metadata.pets)) if (!images.has(key)) missing.push(`${pet.name}逐帧美术尚未加载。`);
  $('asset-status').hidden = !missing.length;
  $('asset-status').textContent = missing.join(' ');
}

function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
function background() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 570);
  gradient.addColorStop(0, '#111934'); gradient.addColorStop(.7, '#1b365b'); gradient.addColorStop(1, '#0d1b35');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1000, 570);
  const light = ctx.createRadialGradient(470, 225, 5, 470, 225, 465);
  light.addColorStop(0, '#759dd02b'); light.addColorStop(1, '#08162e00'); ctx.fillStyle = light; ctx.fillRect(0, 0, 1000, 570);
  ctx.save(); ctx.strokeStyle = '#b7d5ff13'; ctx.lineWidth = 2;
  for (const x of [92, 908]) {
    ctx.strokeRect(x - 12, 115, 24, 324); ctx.strokeRect(x - 18, 405, 36, 34);
    ctx.beginPath(); ctx.moveTo(x - 23, 117); ctx.lineTo(x + 23, 117); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(500, 273, 321, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.strokeStyle = '#92bde019'; ctx.beginPath(); ctx.arc(500, 273, 305, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.fillStyle = '#3f4b7833'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(30, 35, 52, 186, 0, 314); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1000, 0); ctx.bezierCurveTo(970, 35, 948, 186, 1000, 314); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#08172b8a'; ctx.fillRect(0, 439, 1000, 131);
  ctx.strokeStyle = '#a6c4e047'; ctx.beginPath(); ctx.moveTo(0, 439); ctx.lineTo(1000, 439); ctx.stroke();
  ctx.strokeStyle = '#92bde00d';
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(500 + i * 130, 439); ctx.lineTo(500 + i * 230, 570); ctx.stroke(); }
  for (const y of [473, 521]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.restore();
}
function drawSprite(key, frame, x, y, alpha = 1, extraScale = 1) {
  const asset = measured.get(key), bounds = asset?.frames[frame], image = images.get(bounds?.imageKey);
  if (!image || !bounds) return;
  const scale = asset.scale * bounds.scale * extraScale;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(image, ...bounds.rect, x - bounds.pivotX * scale, y - bounds.pivotY * scale, bounds.rect[2] * scale, bounds.rect[3] * scale);
  ctx.restore();
}
function ripple(x, y, age, size = 1, life = 780) {
  if (age < 0 || age > life) return;
  const t = age / life;
  ctx.save(); ctx.globalAlpha *= (1 - t) * .82; ctx.strokeStyle = '#a8f0ff'; ctx.lineWidth = 2.4 * (1 - t) + .7; ctx.shadowColor = '#58bfff'; ctx.shadowBlur = 12;
  ellipse(x, y, (18 + easeOut(t) * 95) * size, (7 + easeOut(t) * 17) * size); ctx.stroke();
  ctx.globalAlpha *= .55; ellipse(x, y, (10 + easeOut(t) * 72) * size, (4 + easeOut(t) * 13) * size); ctx.stroke(); ctx.restore();
}
function bubbles(x, y, age, size = 1) {
  if (age < 0 || age > 750) return;
  const t = age / 750;
  ctx.save(); ctx.globalAlpha *= (1 - t) * .85; ctx.strokeStyle = '#b6f2ff'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) { const dx = Math.sin(i * 13.7) * (15 + t * 66) * size, dy = (15 + i % 4 * 12) * Math.sin(t * Math.PI) * size; ellipse(x + dx, y - dy, (2 + i % 3) * size, (3 + i % 3) * size); ctx.stroke(); }
  ctx.restore();
}
function petState(key, pet) {
  const petStarts = startsOf(metadata.petFrameMs), petDuration = petStarts.at(-1);
  if (state.mode === 'pets') {
    // A paused scrubber may sit exactly at its right endpoint; retain frame 12
    // there instead of wrapping the sprites underneath a 12 / 12 label.
    const cycle = clamp(state.time, 0, petDuration - .001);
    return { active: true, age: state.time, cycle, frame: frameAt(cycle, petStarts), alpha: 1 };
  }
  if (state.clip === 'jab-thrust') return { active: false };
  const { clip, starts } = clipTiming();
  const spawnTime = state.clip === 'l-skill' ? starts[clip.effectStartFrame] + pet.delayMs : 0;
  const age = state.time - spawnTime;
  if (age < 0) return { active: false };
  const cycle = Math.max(0, age - (state.clip === 'i-burst' ? pet.delayMs : 0)) % petDuration;
  return { active: true, age, cycle, frame: frameAt(cycle, petStarts), alpha: state.clip === 'l-skill' ? easeOut(age / 200) : 1 };
}
function petPosition(key, pet) {
  if (state.mode !== 'pets') return { x: pet.x, y: pet.y, scale: 1 };
  const index = Object.keys(metadata.pets).indexOf(key);
  return { x: 245 + index * 260, y: key === 'crabaletta' ? 439 : 329, scale: 1.48 };
}
function petFx(key, pet, status, position) {
  const { x, y, scale } = position;
  if (state.mode !== 'pets' && state.clip === 'l-skill') ripple(x, key === 'crabaletta' ? y + 2 : y + 13, status.age, .7);
  const shotAge = status.cycle - startsOf(metadata.petFrameMs)[pet.attackFrame];
  if (shotAge < 0) return;
  if (key === 'crabaletta') { ripple(x + 30 * scale, y, shotAge, .8 * scale); bubbles(x + 30 * scale, y, shotAge, scale); return; }
  if (shotAge > 620) return;
  const t = shotAge / 620, shotX = x + (key === 'usher' ? 64 : 68) * scale + 70 * t * scale, shotY = y - (key === 'usher' ? 47 : 42) * scale;
  ctx.save(); ctx.globalAlpha = (1 - t) * .85;
  const radius = (key === 'usher' ? 13 : 7) * scale;
  const fill = ctx.createRadialGradient(shotX - radius / 3, shotY - radius / 3, 0, shotX, shotY, radius);
  fill.addColorStop(0, '#e4fbffcc'); fill.addColorStop(.4, '#89dfff55'); fill.addColorStop(1, '#73caff11');
  ctx.fillStyle = fill; ctx.strokeStyle = '#a9efff'; ctx.lineWidth = 1.5; ellipse(shotX, shotY, radius * (key === 'chevalmarin' ? 1.6 : 1), radius); ctx.fill(); ctx.stroke();
  if (key === 'chevalmarin') { ctx.strokeStyle = '#79ccff66'; ctx.beginPath(); ctx.moveTo(shotX - 22 * scale, shotY); ctx.lineTo(shotX - 6 * scale, shotY); ctx.stroke(); }
  ctx.restore();
}
function drawPets() {
  if (state.mode === 'character') return;
  for (const [key, pet] of Object.entries(metadata.pets)) {
    const status = petState(key, pet), position = petPosition(key, pet);
    const label = $('pet-' + key);
    if (!images.has(key)) { label.textContent = '逐帧美术尚未加载'; continue; }
    if (!status.active) { label.textContent = state.clip === 'jab-thrust' ? '剑术演示 · 暂不登场' : '等待邀宾'; continue; }
    const beat = status.frame < 4 ? '待机' : status.frame < 8 ? '蓄势' : status.frame < 10 ? '出手' : '回收';
    label.textContent = `${beat} · ${String(status.frame + 1).padStart(2, '0')} / 12 帧`;
    ctx.save(); ctx.globalAlpha = status.alpha;
    ctx.fillStyle = '#050e2666'; ellipse(position.x, 444, 42 * position.scale, 7 * position.scale); ctx.fill();
    drawSprite(key, status.frame, position.x, position.y, 1, position.scale);
    petFx(key, pet, status, position); ctx.restore();
  }
}
function burstFx(clip, starts, foreground) {
  const age = state.time - starts[clip.impactFrame];
  if (age < 0) return;
  const strength = clamp(age / 150) * clamp((duration() - state.time) / 380);
  ctx.save(); ctx.globalAlpha = strength;
  if (!foreground) {
    const glow = ctx.createLinearGradient(0, 40, 0, 438); glow.addColorStop(0, '#75c9ff00'); glow.addColorStop(.6, '#75c9ff09'); glow.addColorStop(1, '#78d4ff35');
    ctx.fillStyle = glow;
    for (const [x, width] of [[340, 92], [555, 58], [710, 58], [757, 48]]) { ctx.beginPath(); ctx.moveTo(x - 15, 55); ctx.lineTo(x + 15, 55); ctx.lineTo(x + width, 439); ctx.lineTo(x - width, 439); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#8fdaff35'; ctx.lineWidth = 1.5;
    ellipse(500, 439, 337, 37); ctx.stroke(); ellipse(500, 439, 310, 29); ctx.stroke();
  } else {
    ripple(500, 439, age, 2.5, 1100);
    ctx.globalAlpha *= .5;
    for (let i = 0; i < 13; i++) { const t = (age / 1800 + i / 13) % 1; ctx.fillStyle = '#a8eaff'; ellipse(195 + i * 50, 426 - t * 183, 1.5, 2.7); ctx.fill(); }
  }
  ctx.restore();
}
function swordFx(clip, starts) {
  const age = state.time - starts[clip.impactFrame];
  if (age < 0 || age > 420) return;
  const t = age / 420, tipX = clip.rootX + (clip.impactPoint?.[0] ?? 278), tipY = clip.floorY + (clip.impactPoint?.[1] ?? -204);
  ctx.save(); ctx.globalAlpha = (1 - t) * .75; ctx.strokeStyle = '#c5f3ff'; ctx.shadowColor = '#76d3ff'; ctx.shadowBlur = 10; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tipX - 105, tipY); ctx.lineTo(tipX + t * 24, tipY); ctx.stroke();
  ellipse(tipX, tipY, 4 + t * 20, 11 + t * 29); ctx.stroke(); ctx.restore();
}
function guides(clip, frame) {
  ctx.save(); ctx.strokeStyle = '#afe9ff88'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(100, clip.floorY); ctx.lineTo(900, clip.floorY); ctx.moveTo(clip.rootX, 65); ctx.lineTo(clip.rootX, 485); ctx.stroke();
  if (state.mode !== 'pets') { const asset = measured.get(state.clip), bounds = asset?.frames[frame]; if (bounds) { const scale = asset.scale * bounds.scale; ctx.strokeStyle = '#d0d9ff55'; ctx.strokeRect(clip.rootX - bounds.pivotX * scale, clip.floorY - bounds.pivotY * scale, bounds.rect[2] * scale, bounds.rect[3] * scale); } }
  ctx.restore();
}

function drawComparison(clip, frame) {
  const portrait = images.get('portrait'), reference = metadata.portraitReference;
  const referenceX = 240, actionX = 685, floor = clip.floorY;
  if (!portrait || !reference) return;
  const scale = reference.displayBodyHeight / reference.bodyHeight;
  ctx.save();
  ctx.fillStyle = '#09172a55'; ctx.fillRect(56, 53, 391, 415); ctx.fillRect(501, 53, 443, 415);
  ctx.strokeStyle = '#92c9ec26'; ctx.lineWidth = 1; ctx.strokeRect(56, 53, 391, 415); ctx.strokeRect(501, 53, 443, 415);
  ctx.save();
  if (state.facing === -1) { ctx.translate(referenceX * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(portrait, referenceX - reference.pivot[0] * scale, floor - reference.pivot[1] * scale, portrait.naturalWidth * scale, portrait.naturalHeight * scale);
  ctx.restore();
  ctx.save();
  if (state.facing === -1) { ctx.translate(actionX * 2, 0); ctx.scale(-1, 1); }
  drawSprite(state.clip, frame, actionX, floor);
  ctx.restore();
  ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
  ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  for (const landmark of reference.landmarks) {
    const y = floor - (reference.pivot[1] - landmark.y) * scale;
    ctx.strokeStyle = landmark.label === '脚底' ? '#abdff577' : '#abdff530';
    ctx.beginPath(); ctx.moveTo(77, y); ctx.lineTo(427, y); ctx.moveTo(522, y); ctx.lineTo(923, y); ctx.stroke();
    ctx.fillStyle = '#b7d9eb'; ctx.fillText(landmark.label, 475, y + 4);
  }
  ctx.setLineDash([]); ctx.font = '14px system-ui'; ctx.fillStyle = '#d9ecff';
  ctx.fillText('母版立绘', referenceX, 496);
  ctx.fillText(`新动作 · ${String(frame + 1).padStart(2, '0')} / ${clip.frameCount}`, actionX, 496);
  ctx.restore();
}

function render() {
  if (!metadata) return;
  const { clip, starts, actionDuration } = clipTiming(), frame = frameAt(state.time, starts), petsOnly = state.mode === 'pets';
  const petFrame = frameAt(state.time, startsOf(metadata.petFrameMs));
  let phase = 0;
  (petsOnly ? [0, 4, 8, 10] : clip.phaseFrames).forEach((start, i) => { if ((petsOnly ? petFrame : frame) >= start) phase = i; });
  background(); ctx.save();
  const compare = state.compare && !petsOnly;
  if (compare) drawComparison(clip, frame);
  else {
    if (state.facing === -1) { ctx.translate(1000, 0); ctx.scale(-1, 1); }
    if (state.mode === 'complete' && state.clip === 'i-burst') burstFx(clip, starts, false);
    if (!petsOnly) { ctx.fillStyle = '#050d2380'; ellipse(clip.rootX, clip.floorY + 4, 58, 9); ctx.fill(); drawSprite(state.clip, frame, clip.rootX, clip.floorY); }
    drawPets();
    if (state.mode === 'complete') { if (state.clip === 'i-burst') burstFx(clip, starts, true); else if (state.clip === 'jab-thrust') swordFx(clip, starts); }
    if (state.guides) guides(clip, frame);
  }
  ctx.restore();
  if (state.guides && !compare) { ctx.fillStyle = '#b4e5ff'; ctx.font = '11px system-ui'; ctx.textAlign = state.facing === 1 ? 'left' : 'right'; ctx.fillText('脚底基线', state.facing === 1 ? 104 : 896, clip.floorY + 22); }
  if (state.mode === 'character' || compare) for (const key of Object.keys(metadata.pets)) $('pet-' + key).textContent = '人物审片 · 已隐藏';
  $('frame-label').textContent = petsOnly ? `三宠 ${String(petFrame + 1).padStart(2, '0')} / 12 帧` : `${String(frame + 1).padStart(2, '0')} / ${clip.frameCount} 帧`;
  [...$('beats').children].forEach((el, i) => el.classList.toggle('current', i === phase));
  $('phase-label').textContent = !petsOnly && state.time >= actionDuration ? state.mode === 'complete' && !compare && state.clip !== 'jab-thrust' ? '宾客演出 · 舞台余韵' : '收势 · 循环间隔' : [...$('beats').children][phase]?.lastChild.textContent ?? '';
  $('timeline').value = String(Math.round(state.time / duration() * 1000));
  $('time-label').textContent = `${(state.time / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)}s`;
}
function tick(timestamp) {
  const delta = lastTimestamp ? Math.min(timestamp - lastTimestamp, 100) : 0; lastTimestamp = timestamp;
  if (metadata && state.playing && !document.hidden) {
    const hasPlayableAssets = state.mode === 'pets' ? Object.keys(metadata.pets).some((key) => images.has(key)) : hasClip(state.clip, metadata.clips[state.clip]);
    if (hasPlayableAssets) state.time = (state.time + delta * state.speed) % duration();
  }
  render(); requestAnimationFrame(tick);
}
function step(direction) {
  if (!metadata) return;
  state.playing = false; playButton();
  const { clip, starts } = clipTiming();
  const points = state.mode === 'pets' ? startsOf(metadata.petFrameMs).slice(0, -1) : starts.slice(0, -1);
  // During the long salon coda, frame stepping follows every actual pet event.
  if (state.mode === 'complete' && !state.compare && state.clip !== 'jab-thrust') {
    const petStarts = startsOf(metadata.petFrameMs), cycleDuration = petStarts.at(-1);
    for (const pet of Object.values(metadata.pets)) {
      const spawn = (state.clip === 'l-skill' ? starts[clip.effectStartFrame] : 0) + pet.delayMs;
      for (let cycle = 0; cycle < 4; cycle++) for (const start of petStarts.slice(0, -1)) {
        const point = spawn + cycle * cycleDuration + start;
        if (point < duration()) points.push(point);
      }
    }
  }
  const ordered = [...new Set(points)].sort((a, b) => a - b);
  state.time = direction > 0 ? ordered.find((point) => point > state.time + .5) ?? 0 : ordered.findLast((point) => point < state.time - .5) ?? ordered.at(-1);
  render();
}

document.querySelectorAll('[data-clip]').forEach((button) => button.addEventListener('click', () => { if (metadata) selectClip(button.dataset.clip); }));
$('play-toggle').addEventListener('click', () => { state.playing = !state.playing; playButton(); });
$('step-back').addEventListener('click', () => step(-1)); $('step-forward').addEventListener('click', () => step(1));
$('timeline').addEventListener('input', (event) => { if (!metadata) return; state.playing = false; playButton(); state.time = Number(event.target.value) / 1000 * duration(); render(); });
$('speed').addEventListener('change', (event) => { state.speed = Number(event.target.value); });
$('facing').addEventListener('change', (event) => { state.facing = Number(event.target.value); render(); });
$('effect-mode').addEventListener('change', (event) => { state.mode = event.target.value; state.time = 0; updateView(); render(); });
$('guides').addEventListener('change', (event) => { state.guides = event.target.checked; render(); });
$('proportion-compare').addEventListener('change', (event) => { state.compare = event.target.checked; state.time = Math.min(state.time, duration()); updateView(); render(); });
$('restart').addEventListener('click', () => { state.time = 0; state.playing = true; playButton(); });
document.addEventListener('visibilitychange', () => { lastTimestamp = 0; });
document.addEventListener('keydown', (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
  const shortcuts = { KeyL: 'l-skill', KeyI: 'i-burst', KeyJ: 'jab-thrust' };
  if (metadata && shortcuts[event.code]) { selectClip(shortcuts[event.code]); state.playing = true; playButton(); }
});
playButton(); background(); requestAnimationFrame(tick);

async function init() {
  try {
    const response = await fetch('./metadata.json'); if (!response.ok) throw new Error(`metadata ${response.status}`);
    metadata = await response.json();
    await Promise.all([loadImage('portrait', metadata.portrait), ...Object.entries(metadata.clips).flatMap(([key, clip]) => sheetUrls(clip).map((url, index) => loadImage(sheetKey(key, index), url))), ...Object.entries(metadata.pets).map(([key, pet]) => loadImage(key, pet.sheet))]);
    const portrait = images.get('portrait');
    if (portrait) { $('portrait').src = portrait.src; $('portrait').hidden = false; $('portrait-status').hidden = true; } else $('portrait-status').textContent = '角色美术尚未加载';
    for (const [key, data] of [...Object.entries(metadata.clips), ...Object.entries(metadata.pets)]) measureFrames(key, data);
    selectClip(state.clip);
  } catch (error) { $('asset-status').hidden = false; $('asset-status').textContent = '无法加载预览配置，请刷新重试。'; console.error(error); }
}
init();
