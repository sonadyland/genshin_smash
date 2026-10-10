const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d');
const images = new Map();
const errors = new Map();
const frameBounds = new Map();
const state = { clip: 'l-skill', playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, time: 0, facing: 1, effects: true, guides: false };
let metadata, lastTimestamp = 0, lastFrame = -1, lastPhase = -1;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;

function loadImage(key, url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { images.set(key, image); errors.delete(key); resolve(image); };
    image.onerror = () => { errors.set(key, url); resolve(null); };
    image.src = url;
  });
}

// The renderer samples actual sprite frames. Character drawing never rotates or
// deforms one pose to impersonate an action; only facing is mirrored.
function measureFrames(key, clip) {
  const image = images.get(key);
  if (!image) return;
  const scratch = document.createElement('canvas');
  const cw = image.naturalWidth / clip.columns, ch = image.naturalHeight / clip.rows;
  scratch.width = Math.ceil(cw); scratch.height = Math.ceil(ch);
  const scan = scratch.getContext('2d', { willReadFrequently: true });
  const bounds = [];
  for (let i = 0; i < clip.frameCount; i++) {
    const custom = clip.frames?.[i];
    const sx = Math.floor(i % clip.columns * cw), sy = Math.floor(Math.floor(i / clip.columns) * ch);
    const rect = custom?.rect ?? [sx, sy, Math.floor((i % clip.columns + 1) * cw) - sx, Math.floor((Math.floor(i / clip.columns) + 1) * ch) - sy];
    scan.clearRect(0, 0, scratch.width, scratch.height);
    scan.drawImage(image, ...rect, 0, 0, scratch.width, scratch.height);
    const pixels = scan.getImageData(0, 0, scratch.width, scratch.height).data;
    let bottom = scratch.height - 1, found = false;
    for (let y = scratch.height - 1; y >= 0 && !found; y--) {
      let count = 0;
      for (let x = 0; x < scratch.width; x++) if (pixels[(y * scratch.width + x) * 4 + 3] > 48) count++;
      if (count >= 3) { bottom = y; found = true; }
    }
    let shoeLeft = scratch.width, shoeRight = 0;
    if (clip.anchorToFeet) {
      for (let y = Math.max(0, bottom - Math.ceil(scratch.height * .065)); y <= bottom; y++) {
        for (let x = 0; x < scratch.width; x++) if (pixels[(y * scratch.width + x) * 4 + 3] > 80) { shoeLeft = Math.min(shoeLeft, x); shoeRight = Math.max(shoeRight, x); }
      }
    }
    const footX = shoeLeft <= shoeRight ? (shoeLeft + shoeRight) * .5 / scratch.width * rect[2] : rect[2] * .5;
    bounds.push({ rect, pivotX: custom?.pivot?.[0] ?? footX, pivotY: custom?.pivot?.[1] ?? bottom / scratch.height * rect[3], scale: custom?.scale ?? 1 });
  }
  frameBounds.set(key, bounds);
}

function clipTimes(clip) {
  const starts = [0];
  clip.frameMs.forEach((duration) => starts.push(starts.at(-1) + duration));
  return { starts, actionDuration: starts.at(-1), duration: starts.at(-1) + clip.restMs };
}
function currentFrame(clip, time) {
  const { starts } = clipTimes(clip);
  for (let i = 0; i < clip.frameCount; i++) if (time < starts[i + 1]) return i;
  return clip.frameCount - 1;
}
function playButton() {
  $('play-toggle').textContent = state.playing ? 'Ⅱ' : '▶';
  $('play-toggle').setAttribute('aria-label', state.playing ? '暂停播放' : '继续播放');
}
function selectClip(key) {
  state.clip = key; state.time = 0; lastFrame = -1; lastPhase = -1;
  const clip = metadata.clips[key];
  document.querySelectorAll('[data-clip]').forEach((button) => { const selected = button.dataset.clip === key; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
  $('clip-caption').textContent = clip.title;
  canvas.setAttribute('aria-label', `钟离${clip.title.split(' / ')[0]}逐帧动画与元素效果`);
  $('motion-note').textContent = clip.note;
  $('beats').replaceChildren(...clip.phases.map((phase, i) => { const li = document.createElement('li'); const number = document.createElement('span'); number.textContent = `0${i + 1}`; const name = document.createElement('strong'); name.textContent = phase; li.append(number, name); return li; }));
  updateStatus();
}
function updateStatus() {
  if (!metadata) return;
  const missing = [];
  if (!images.has(state.clip)) missing.push('此动作的逐帧图片尚未加载，请稍后刷新。');
  const fx = state.clip === 'l-skill' ? 'pillar' : state.clip === 'i-burst' ? 'meteor' : null;
  if (state.effects && fx && !images.has(fx)) missing.push(`${fx === 'pillar' ? '岩柱' : '陨星'}美术尚未加载。`);
  $('asset-status').hidden = missing.length === 0;
  $('asset-status').textContent = missing.join(' ');
}

function polygon(x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) { const angle = rotation + i * Math.PI * 2 / sides; const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
}
function background() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 570);
  gradient.addColorStop(0, '#122d34'); gradient.addColorStop(.72, '#28443e'); gradient.addColorStop(1, '#122b2c');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1000, 570);
  const landscape = images.get('background');
  if (landscape) { ctx.save(); ctx.globalAlpha = .19; ctx.drawImage(landscape, 0, 0, 1000, 570); ctx.restore(); }
  const light = ctx.createRadialGradient(600, 170, 0, 600, 170, 530);
  light.addColorStop(0, '#bdac6418'); light.addColorStop(1, '#061d2700'); ctx.fillStyle = light; ctx.fillRect(0, 0, 1000, 570);
  ctx.fillStyle = '#102827ba'; ctx.fillRect(0, 441, 1000, 129);
  ctx.strokeStyle = '#c9b87944'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 441); ctx.lineTo(1000, 441); ctx.stroke();
  ctx.strokeStyle = '#84977a13';
  for (let i = -5; i < 15; i++) { ctx.beginPath(); ctx.moveTo(500 + (i - 5) * 95, 441); ctx.lineTo(500 + (i - 5) * 195, 570); ctx.stroke(); }
  for (const y of [468, 511, 568]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(355, 444, 67, 12, 0, 0, Math.PI * 2); ctx.fill();
}
function drawCharacter(clip, frame) {
  const image = images.get(state.clip), bounds = frameBounds.get(state.clip)?.[frame];
  if (!image || !bounds) return;
  const scale = (clip.displayScale ?? clip.displayCellHeight / bounds.rect[3]) * bounds.scale;
  ctx.drawImage(image, ...bounds.rect, clip.rootX - bounds.pivotX * scale, clip.floorY - bounds.pivotY * scale, bounds.rect[2] * scale, bounds.rect[3] * scale);
}
function drawFxImage(key, x, floor, height, alpha = 1) {
  const image = images.get(key); if (!image) return;
  const width = image.naturalWidth / image.naturalHeight * height;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(image, x - width / 2, floor - height, width, height); ctx.restore();
}
function shockwave(x, y, age, amplitude = 1) {
  if (age < 0 || age > 800) return;
  const t = age / 800, radius = 30 + easeOut(t) * 235 * amplitude;
  ctx.save(); ctx.globalAlpha = (1 - t) * .9;
  ctx.lineWidth = 4 * (1 - t) + 1; ctx.strokeStyle = '#ffe097'; ctx.shadowColor = '#e9b54c'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .17, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, radius * .77, radius * .13, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function debris(x, y, age, strength = 1) {
  if (age < 0 || age > 850) return;
  const t = age / 850;
  ctx.save(); ctx.globalAlpha = 1 - t;
  for (let i = 0; i < 20; i++) { const direction = Math.sin(i * 17.71), speed = 65 + (i % 5) * 34; const px = x + direction * speed * t * strength, py = y - Math.sin(Math.PI * t) * (30 + i % 7 * 12) * strength; ctx.fillStyle = i % 3 === 0 ? '#f8d47c' : '#a58b56'; polygon(px, py, 2 + i % 5, 4, i + t * 2); ctx.fill(); }
  ctx.restore();
}
function shield(time, clip, foreground) {
  const starts = clipTimes(clip).starts;
  const age = time - starts[clip.impactFrame];
  if (age < 0) return;
  const chargedRelease = clip.motionStyle === 'cross-charge';
  // The release pose already has a visible shield during the impact hold.
  // Starting at alpha zero would delay the burst until the hold had finished.
  const opacity = (chargedRelease ? .86 + .14 * easeOut(age / 140) : clamp(age / 240)) * clamp((clipTimes(clip).duration - time) / 220);
  ctx.save(); ctx.translate(clip.rootX, 291); ctx.globalAlpha = opacity * (foreground ? .75 : .35);
  ctx.strokeStyle = '#f5d482'; ctx.lineWidth = chargedRelease ? 2 + 3 * clamp(1 - age / 230) : 2; ctx.shadowColor = '#efb843'; ctx.shadowBlur = chargedRelease ? 18 : 12;
  ctx.scale(.72, 1); polygon(0, 0, 172 * (chargedRelease ? .96 + .04 * easeOut(age / 140) : 1), 6, Math.PI / 6);
  if (foreground) { ctx.stroke(); ctx.scale(1 / .72, 1); for (const [x, y] of [[-107, -45], [112, 25], [-88, 103], [77, -107]]) { polygon(x, y, 11, 4); ctx.stroke(); } }
  else { const fill = ctx.createLinearGradient(-150, 0, 150, 0); fill.addColorStop(0, '#e1a94644'); fill.addColorStop(.5, '#edc87a08'); fill.addColorStop(1, '#e1a94644'); ctx.fillStyle = fill; ctx.fill(); }
  ctx.restore();
}
function geoCharge(time, clip) {
  if (clip.motionStyle !== 'cross-charge') return;
  const starts = clipTimes(clip).starts, start = starts[clip.chargeStartFrame], end = starts[clip.impactFrame];
  if (time < start || time >= end) return;
  const charge = clamp((time - start) / (end - start));
  const x = clip.rootX, y = 247, radius = 32 + charge * 31;
  ctx.save();
  // A small glow stays behind the crossed hands. No full shield appears yet.
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(255,212,111,${.07 + charge * .14})`);
  glow.addColorStop(.42, `rgba(242,173,48,${.04 + charge * .09})`);
  glow.addColorStop(1, '#f2ad3000');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffdc91'; ctx.globalAlpha = charge * .5;
  for (let i = 0; i < 7; i++) {
    const inward = (charge * 1.7 + i / 7) % 1, angle = i * Math.PI * 2 / 7;
    const distance = 64 - inward * 45;
    polygon(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * .65, 1.2 + inward, 4, Math.PI / 4); ctx.fill();
  }
  ctx.restore();
}
function geoRelease(time, clip) {
  if (clip.motionStyle !== 'cross-charge') return;
  const age = time - clipTimes(clip).starts[clip.impactFrame];
  if (age < 0 || age > 800) return;
  const strength = clamp(1 - age / 300);
  // Unfrozen release time gives an immediate pulse at full extension, while
  // the character and shield outline hold their impact pose briefly.
  ctx.save(); ctx.globalAlpha = strength * .1;
  ctx.fillStyle = '#ffe8b0'; ctx.fillRect(0, 0, 1000, 570); ctx.restore();
  shockwave(clip.rootX, clip.floorY + 3, age, 1.02);
}
function pillarFx(time, clip) {
  const { starts, duration } = clipTimes(clip), age = time - starts[clip.effectStartFrame];
  if (age < 0) return;
  const chargedRelease = clip.motionStyle === 'cross-charge';
  const x = 650, y = 445, rise = chargedRelease ? .26 + .74 * easeOut(age / 155) : easeOut(age / 230), opacity = clamp((duration - time) / 220);
  ctx.save(); ctx.globalAlpha = opacity;
  ctx.beginPath(); ctx.rect(0, 0, 1000, y); ctx.clip();
  drawFxImage('pillar', x, y + (1 - rise) * 295, 310);
  ctx.restore();
  const impactAge = time - starts[clip.impactFrame];
  shockwave(x, y, impactAge, .7); debris(x, y, impactAge, .85);
  if (impactAge > 180 && time < duration - 200) { const pulse = (impactAge - 180) % 1100; ctx.save(); ctx.globalAlpha = opacity * .36; shockwave(x, y, pulse, .8); ctx.restore(); }
}
function meteorFx(time, clip, foreground) {
  const { starts, duration } = clipTimes(clip), start = starts[clip.effectStartFrame], impact = starts[clip.impactFrame];
  if (time < start) return;
  const age = time - impact;
  if (age < 0 && !foreground) {
    const t = clamp((time - start) / (impact - start)), eased = t * t;
    const x = 840 - eased * 200, y = -190 + eased * 635;
    ctx.save(); ctx.globalAlpha = .5;
    // The trail follows the flight vector back toward the upper right. Its
    // leading edge ends inside the rock, so no polygon projects below it.
    const tail = ctx.createLinearGradient(x + 110, y - 440, x + 15, y - 150);
    tail.addColorStop(0, '#ffd78400'); tail.addColorStop(.45, '#ffd78416'); tail.addColorStop(1, '#ffd78488');
    ctx.fillStyle = tail; ctx.shadowColor = '#ffd78466'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(x + 121, y - 436); ctx.lineTo(x + 78, y - 130); ctx.lineTo(x - 48, y - 170); ctx.lineTo(x + 99, y - 444); ctx.closePath(); ctx.fill(); ctx.restore();
    drawFxImage('meteor', x, y, 255);
  }
  if (age >= 0 && foreground) {
    if (age < 140) { ctx.save(); ctx.globalAlpha = .2 * (1 - age / 140); ctx.fillStyle = '#fce6aa'; ctx.fillRect(0, 0, 1000, 570); ctx.restore(); }
    shockwave(640, 445, age, 1.2); debris(640, 440, age, 1.4);
    const opacity = clamp(age / 80) * clamp((duration - time) / 400) * .25;
    ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = '#ecbe5a'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); const x = 475 + i * 50; ctx.moveTo(640, 445); ctx.lineTo(x + 25, 461 + i % 3 * 9); ctx.lineTo(x, 467 + i % 3 * 9); ctx.stroke(); }
    ctx.restore();
  }
}
function drawGuides(clip, frame) {
  ctx.save(); ctx.strokeStyle = '#9cddd096'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(clip.rootX, 65); ctx.lineTo(clip.rootX, 482); ctx.moveTo(90, clip.floorY); ctx.lineTo(910, clip.floorY); ctx.stroke();
  const bounds = frameBounds.get(state.clip)?.[frame];
  if (bounds) { const scale = (clip.displayScale ?? clip.displayCellHeight / bounds.rect[3]) * bounds.scale; ctx.strokeStyle = '#eed18b66'; ctx.strokeRect(clip.rootX - bounds.pivotX * scale, clip.floorY - bounds.pivotY * scale, bounds.rect[2] * scale, bounds.rect[3] * scale); }
  ctx.restore();
}
function render() {
  if (!metadata) return;
  const clip = metadata.clips[state.clip], { starts, duration, actionDuration } = clipTimes(clip);
  const frame = currentFrame(clip, state.time);
  let phase = 0; clip.phaseFrames.forEach((start, i) => { if (frame >= start) phase = i; });
  const impactAt = starts[clip.impactFrame];
  // Each clip keeps its own impact hold; the existing I/J timing is unchanged.
  const holdMs = clip.hitstopMs ?? 75;
  const effectTime = state.time > impactAt ? state.time - Math.min(holdMs, state.time - impactAt) : state.time;
  ctx.save();
  if (state.facing === -1) { ctx.translate(1000, 0); ctx.scale(-1, 1); }
  background();
  if (state.effects) { if (state.clip === 'l-skill') { geoCharge(state.time, clip); pillarFx(effectTime, clip); shield(effectTime, clip, false); } else if (state.clip === 'i-burst') meteorFx(effectTime, clip, false); }
  drawCharacter(clip, frame);
  if (state.effects) { if (state.clip === 'l-skill') { shield(effectTime, clip, true); geoRelease(state.time, clip); } else if (state.clip === 'i-burst') meteorFx(effectTime, clip, true); }
  if (state.guides) drawGuides(clip, frame);
  ctx.restore();
  if (state.guides) {
    ctx.save(); ctx.fillStyle = '#afe4d3'; ctx.font = '11px system-ui'; ctx.textAlign = state.facing === 1 ? 'left' : 'right';
    ctx.fillText('脚底基线', state.facing === 1 ? 94 : 906, clip.floorY + 20); ctx.restore();
  }
  if (frame !== lastFrame) { $('frame-label').textContent = `${String(frame + 1).padStart(2, '0')} / ${clip.frameCount} 帧`; lastFrame = frame; }
  if (phase !== lastPhase) { [...$('beats').children].forEach((el, i) => el.classList.toggle('current', i === phase)); lastPhase = phase; }
  $('phase-label').textContent = state.time >= actionDuration ? '余韵 · 循环间隔' : state.effects && state.time >= impactAt && state.time < impactAt + holdMs ? '释放 · 命中停顿' : clip.phases[phase];
  $('timeline').value = String(Math.round(state.time / duration * 1000));
  $('time-label').textContent = `${(state.time / 1000).toFixed(2)} / ${(duration / 1000).toFixed(2)}s`;
}
function tick(timestamp) {
  const delta = lastTimestamp ? Math.min(timestamp - lastTimestamp, 100) : 0; lastTimestamp = timestamp;
  if (metadata && state.playing && !document.hidden && images.has(state.clip)) state.time = (state.time + delta * state.speed) % clipTimes(metadata.clips[state.clip]).duration;
  render(); requestAnimationFrame(tick);
}
function step(direction) {
  if (!metadata) return;
  state.playing = false; playButton();
  const clip = metadata.clips[state.clip], frame = currentFrame(clip, state.time), next = (frame + direction + clip.frameCount) % clip.frameCount;
  state.time = clipTimes(clip).starts[next]; render();
}
document.querySelectorAll('[data-clip]').forEach((button) => button.addEventListener('click', () => { if (metadata) selectClip(button.dataset.clip); }));
$('play-toggle').addEventListener('click', () => { state.playing = !state.playing; playButton(); });
$('step-back').addEventListener('click', () => step(-1)); $('step-forward').addEventListener('click', () => step(1));
$('timeline').addEventListener('input', (event) => { if (!metadata) return; state.playing = false; playButton(); state.time = Number(event.target.value) / 1000 * clipTimes(metadata.clips[state.clip]).duration; render(); });
$('speed').addEventListener('change', (event) => { state.speed = Number(event.target.value); });
$('facing').addEventListener('change', (event) => { state.facing = Number(event.target.value); });
$('effect-mode').addEventListener('change', (event) => { state.effects = event.target.value === 'complete'; $('effect-caption').textContent = state.effects ? '人物 + 元素效果' : '仅人物 · 逐帧动作'; updateStatus(); });
$('guides').addEventListener('change', (event) => { state.guides = event.target.checked; });
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
    const clipKeys = Object.keys(metadata.clips);
    const loads = [loadImage('portrait', metadata.portrait), loadImage('background', '/assets/backgrounds/liyue-dawn-v2.png'), ...clipKeys.map((key) => loadImage(key, metadata.clips[key].sheet)), ...Object.entries(metadata.effects).map(([key, path]) => loadImage(key, path))];
    await Promise.all(loads);
    const portrait = images.get('portrait');
    if (portrait) { $('portrait').src = portrait.src; $('portrait').hidden = false; $('portrait-status').hidden = true; }
    else $('portrait-status').textContent = '角色美术尚未加载';
    clipKeys.forEach((key) => measureFrames(key, metadata.clips[key]));
    selectClip(state.clip);
  } catch (error) { $('asset-status').hidden = false; $('asset-status').textContent = '无法加载预览配置，请刷新重试。'; console.error(error); }
}
init();
