import { clamp, timingOf, frameAt, nextFrameTime, registration, releasePoint, validateClip } from './preview-model.js';

const $ = id => document.getElementById(id);
const gameUrl = new URL('/', location.href);
if (location.port === '3101') gameUrl.port = '3000';
$('return-game').href = gameUrl.href;
const canvas = $('stage'), context = canvas.getContext('2d');
const state = { clip: new URLSearchParams(location.search).get('clip') === 'jab' ? 'jab' : 'idle', time: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, facing: 1, height: 350, compare: true, effects: true, guides: false, loop: true };
const clips = new Map(), images = new Map();
const portrait = { src: './assets/master.png', pivot: [538, 1520], bodyHeight: 1508,
  landmarks: [['头顶', 12], ['肩', 270], ['胯', 665], ['膝', 1020], ['脚底', 1520]] };
let ready = false, lastTimestamp = 0;
const floorY = 535;
const imageKey = (clip, sheet) => `${clip}:${sheet}`;

function loadImage(key, url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => { clearTimeout(timeout); image.onload = null; image.onerror = null; };
    const timeout = setTimeout(() => { clear(); image.removeAttribute('src'); reject(new Error(`图片加载超时：${url}`)); }, 60000);
    image.onload = () => { clear(); images.set(key, image); resolve(image); };
    image.onerror = () => { clear(); reject(new Error(`图片无法加载：${url}`)); };
    image.src = url;
  });
}

async function loadClipConfig(key) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`./${key}.json`, { signal: controller.signal });
    if (!response.ok) throw new Error(`${key} 配置 ${response.status}`);
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${key} 配置加载超时`);
    throw error;
  } finally { clearTimeout(timeout); }
}

function playButton() {
  $('play-toggle').textContent = state.playing ? 'Ⅱ' : '▶';
  $('play-toggle').setAttribute('aria-label', state.playing ? '暂停播放' : '继续播放');
}

function chooseClip(key, restart = true) {
  if (!clips.has(key)) return;
  state.clip = key;
  if (restart) state.time = 0;
  const clip = clips.get(key);
  document.querySelectorAll('[data-clip]').forEach(button => {
    const active = button.dataset.clip === key;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
  });
  $('clip-caption').textContent = clip.title;
  $('motion-note').textContent = clip.note;
  $('timeline').max = timingOf(clip).duration;
  const phases = [...new Set(clip.frames.map(frame => frame.phase))];
  $('beats').replaceChildren(...phases.map((phase, index) => {
    const item = document.createElement('li'), number = document.createElement('span');
    number.textContent = `0${index + 1}`; item.append(number, phase); item.dataset.phase = phase; return item;
  }));
  const url = new URL(location.href); url.searchParams.set('clip', key); history.replaceState(null, '', url);
  render();
}

function background() {
  const gradient = context.createLinearGradient(0, 0, 0, 640);
  gradient.addColorStop(0, '#211a2a'); gradient.addColorStop(.75, '#403147'); gradient.addColorStop(1, '#1c1625');
  context.fillStyle = gradient; context.fillRect(0, 0, 1100, 640);
  context.save(); context.strokeStyle = '#c1a7c914'; context.lineWidth = 1;
  for (const x of [76, 1024]) { context.strokeRect(x, 116, 18, floorY - 116); context.strokeRect(x - 5, 510, 28, 25); }
  context.beginPath(); context.arc(550, 340, 360, Math.PI * 1.13, Math.PI * 1.87); context.stroke();
  context.fillStyle = '#15101c75'; context.fillRect(0, floorY, 1100, 105);
  context.strokeStyle = '#ceb6d354'; context.beginPath(); context.moveTo(0, floorY); context.lineTo(1100, floorY); context.stroke();
  context.restore();
}

function sprite(clip, frame, x) {
  const image = images.get(imageKey(state.clip, frame.sheet));
  const r = registration(frame, clip, state.height);
  context.save(); context.translate(x, floorY); context.scale(state.facing, 1);
  context.drawImage(image, ...frame.rect, r.x, r.y, r.width, r.height);
  if (state.guides) {
    context.strokeStyle = '#e9a4e180'; context.lineWidth = 1; context.strokeRect(r.x, r.y, r.width, r.height);
    context.strokeStyle = '#f1d69b'; context.beginPath(); context.moveTo(-9, 0); context.lineTo(9, 0); context.moveTo(0, -9); context.lineTo(0, 9); context.stroke();
    if (frame.castOrigin) { context.strokeStyle = '#ffc1ed'; context.beginPath(); context.arc((frame.castOrigin[0] - frame.pivot[0]) * r.scale, (frame.castOrigin[1] - frame.pivot[1]) * r.scale, 6, 0, Math.PI * 2); context.stroke(); }
  }
  context.restore();
}

function reference() {
  const scale = state.height / portrait.bodyHeight;
  context.save(); context.translate(245, floorY); context.scale(state.facing, 1);
  const image = images.get('portrait');
  context.drawImage(image, -portrait.pivot[0] * scale, -portrait.pivot[1] * scale, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
  if (state.guides) {
    context.save(); context.font = '12px system-ui'; context.textAlign = 'left';
    for (const [name, sourceY] of portrait.landmarks) {
      const y = floorY - (portrait.pivot[1] - sourceY) * scale;
      context.strokeStyle = '#d9c7df40'; context.setLineDash([4, 6]); context.beginPath(); context.moveTo(120, y); context.lineTo(945, y); context.stroke();
      context.fillStyle = '#d8c4df'; context.fillText(name, 957, y + 4);
    }
    context.restore();
  }
}

function flux(clip, x) {
  if (state.clip !== 'jab' || !state.effects) return;
  const point = releasePoint(clip, state.height, state.facing);
  if (!point) return;
  const { starts } = timingOf(clip), age = state.time - starts[clip.releaseFrame];
  const travelMs = 630, scale = state.height / 350;
  if (age < 0 || age > travelMs) return;
  const t = clamp(age / travelMs);
  const orbX = x + point.x + state.facing * t * 280 * scale, orbY = floorY + point.y;
  const radius = (11 + Math.sin(t * Math.PI) * 3) * scale;
  context.save(); context.globalAlpha = clamp((1 - t) * 3);
  const glow = context.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius * 2.7);
  glow.addColorStop(0, '#efd6ffed'); glow.addColorStop(.26, '#c98affb0'); glow.addColorStop(.6, '#70449170'); glow.addColorStop(1, '#5f346b00');
  context.fillStyle = glow; context.beginPath(); context.arc(orbX, orbY, radius * 2.7, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#e3b6f5'; context.lineWidth = Math.max(.7, 1.5 * scale);
  context.beginPath(); context.ellipse(orbX, orbY, radius * 1.45, radius * .58, age / 110, 0, Math.PI * 1.7); context.stroke();
  context.fillStyle = '#21102eed'; context.beginPath(); context.arc(orbX, orbY, radius * .46, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#b682d970'; context.beginPath(); context.moveTo(orbX - state.facing * 42 * scale, orbY + Math.sin(t * 14) * 3 * scale); context.quadraticCurveTo(orbX - state.facing * 19 * scale, orbY - 5 * scale, orbX - state.facing * radius, orbY); context.stroke();
  context.restore();
}

function render() {
  background();
  if (!ready) return;
  const clip = clips.get(state.clip), { actionDuration, duration } = timingOf(clip), index = frameAt(state.time, clip), frame = clip.frames[index];
  const x = state.compare ? 720 : 540;
  if (state.compare) reference();
  sprite(clip, frame, x); flux(clip, x);
  context.save(); context.fillStyle = '#d5bfdc'; context.font = '15px system-ui'; context.textAlign = 'center';
  if (state.compare) context.fillText('批准立绘 · 同一站姿身高', 245, 95);
  context.fillText(`${state.compare ? '连续动作' : 'Tharja'} · ${state.height}px`, x, 95); context.restore();
  $('phase-label').textContent = state.time >= actionDuration && clip.restMs ? '归位 · 循环间隔' : frame.phase;
  $('frame-label').textContent = `${String(index + 1).padStart(2, '0')} / ${String(clip.frames.length).padStart(2, '0')} 帧`;
  $('time-label').textContent = `${(state.time / 1000).toFixed(2)} / ${(duration / 1000).toFixed(2)}s`;
  $('timeline').value = state.time;
  $('view-caption').textContent = `${state.compare ? '同一站姿身高 · 原画比例对照' : '原始动作帧 · 固定比例'}${state.clip === 'jab' && state.effects ? ' · 法球为美术演示' : ''}`;
  for (const beat of $('beats').children) beat.classList.toggle('current', beat.dataset.phase === frame.phase);
}

function tick(timestamp) {
  if (ready && state.playing && lastTimestamp) {
    const { duration } = timingOf(clips.get(state.clip));
    state.time += Math.min(80, timestamp - lastTimestamp) * state.speed;
    if (state.time >= duration) {
      if (state.loop) state.time %= duration;
      else { state.time = duration; state.playing = false; playButton(); }
    }
  }
  lastTimestamp = timestamp; render(); requestAnimationFrame(tick);
}

function step(direction) {
  if (!ready) return;
  state.playing = false; state.time = nextFrameTime(state.time, direction, clips.get(state.clip)); playButton(); render();
}

document.querySelectorAll('[data-clip]').forEach(button => button.addEventListener('click', () => chooseClip(button.dataset.clip)));
$('play-toggle').addEventListener('click', () => { if (state.time >= timingOf(clips.get(state.clip)).duration) state.time = 0; state.playing = !state.playing; playButton(); });
$('step-back').addEventListener('click', () => step(-1)); $('step-forward').addEventListener('click', () => step(1));
$('timeline').addEventListener('input', event => { if (!ready) return; state.playing = false; state.time = Number(event.target.value); playButton(); render(); });
for (const key of ['speed', 'facing', 'height']) $(key).addEventListener('change', event => { state[key] = Number(event.target.value); render(); });
for (const key of ['compare', 'effects', 'guides', 'loop']) $(key).addEventListener('change', event => { state[key] = event.target.checked; render(); });
$('restart').addEventListener('click', () => { state.time = 0; state.playing = true; playButton(); render(); });
addEventListener('keydown', event => {
  if (!ready || event.repeat || event.altKey || event.ctrlKey || event.metaKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
  if (event.code === 'KeyJ') { chooseClip('jab'); state.playing = true; playButton(); }
  else if (event.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); state.playing = !state.playing; playButton(); }
  else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') { event.preventDefault(); step(event.code === 'ArrowRight' ? 1 : -1); }
});
addEventListener('visibilitychange', () => { lastTimestamp = 0; });
playButton(); requestAnimationFrame(tick);

async function init() {
  try {
    await Promise.all(['idle', 'jab'].map(async key => {
      const clip = await loadClipConfig(key); validateClip(clip);
      const sources = await Promise.all(clip.sheets.map((sheet, index) => loadImage(imageKey(key, index), sheet.src)));
      validateClip(clip, sources.map(image => ({ width: image.naturalWidth, height: image.naturalHeight })));
      clips.set(key, clip);
    }));
    await loadImage('portrait', portrait.src);
    ready = true; $('asset-status').hidden = true;
    document.querySelectorAll('button[disabled],input[disabled]').forEach(control => { control.disabled = false; });
    chooseClip(state.clip, false);
  } catch (error) {
    state.playing = false; playButton(); $('asset-status').hidden = false;
    $('asset-status').textContent = `预览资源未完整加载。${error.message}`;
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新加载'; retry.addEventListener('click', () => location.reload());
    $('asset-status').append(retry); console.error(error);
  }
}
init();
