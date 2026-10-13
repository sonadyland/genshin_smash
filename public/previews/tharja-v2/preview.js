import { clamp, timingOf, frameAt, nextFrameTime, registration, castPoint, effectTiming, validateClip } from './preview-model.js';
import { createClipLoader } from './preview-loading.js';
const $ = id => document.getElementById(id), canvas = $('stage'), ctx = canvas.getContext('2d');
const state = { clip: new URLSearchParams(location.search).get('clip') || 'idle', time: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, facing: 1, height: 350, compare: true, effects: true, guides: false, loop: true, reel: false };
const clips = new Map(), images = new Map(), statuses = new Map();
let manifest, lastTimestamp = 0, requestId = 0, initialized = false;
const floorY = 535, gameUrl = new URL('/', location.href);
if (location.port === '3101') gameUrl.port = '3000'; $('return-game').href = gameUrl.href;
const imageKey = (id, sheet) => `${id}:${sheet}`;
const ready = () => clips.has(state.clip) && images.has('portrait');
async function json(url) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 15000);
  try { const response = await fetch(url, { signal: abort.signal }); if (!response.ok) throw new Error(`${url} · HTTP ${response.status}`); return await response.json(); }
  catch (error) { if (abort.signal.aborted) throw new Error('配置加载超时'); throw error; }
  finally { clearTimeout(timer); }
}
function image(key, url) {
  if (images.has(key)) return Promise.resolve(images.get(key));
  return new Promise((resolve, reject) => {
    const picture = new Image(), clean = () => { clearTimeout(timer); picture.onload = null; picture.onerror = null; };
    const timer = setTimeout(() => { clean(); picture.removeAttribute('src'); reject(new Error(`图片加载超时：${url}`)); }, 60000);
    picture.onload = () => { clean(); images.set(key, picture); resolve(picture); };
    picture.onerror = () => { clean(); reject(new Error(`图片无法加载：${url}`)); }; picture.src = url;
  });
}
function status(id, value, loaded = 0, total = 0) {
  statuses.set(id, { value, loaded, total });
  const button = document.querySelector(`[data-clip="${id}"]`), info = manifest.clips.find(item => item.id === id);
  if (button) { button.dataset.state = value; button.querySelector('small').textContent = value === 'loading' ? `加载 ${loaded} / ${total || '—'}` : value === 'ready' ? `${info.subtitle} · 已就绪` : value === 'error' ? '加载失败 · 点击重试' : info.subtitle; }
  if (state.clip === id && value === 'loading') { $('asset-status').hidden = false; $('asset-status').textContent = `正在加载 ${info.label} · ${loaded} / ${total || '—'} 张图`; }
}
const clipLoader = createClipLoader({ clips, sourceFor: id => manifest.clips.find(item => item.id === id).src, loadJson: json, loadImage: (id, index, url) => image(imageKey(id, index), url), validate: validateClip, onStatus: status });
const ensureClip = id => clipLoader.ensure(id);
function playButton() { $('play-toggle').textContent = state.playing ? 'Ⅱ' : '▶'; $('play-toggle').setAttribute('aria-label', state.playing ? '暂停播放' : '继续播放'); }
function controls(enabled) { for (const id of ['play-toggle','step-back','step-forward','timeline','restart']) $(id).disabled = !enabled; }
function showError(error) { $('asset-status').hidden = false; $('asset-status').textContent = `当前动作尚未完整加载：${error.message}`; const retry = document.createElement('button'); retry.textContent = '重新加载当前动作'; retry.addEventListener('click', () => chooseClip(state.clip)); $('asset-status').append(retry); }
async function chooseClip(id) {
  // Initial portrait/configuration failures keep their own visible retry path.
  if (!initialized) return;
  if (!manifest.clips.some(item => item.id === id)) id = 'idle';
  const sequence = ++requestId; state.clip = id; state.time = 0; controls(false);
  document.querySelectorAll('[data-clip]').forEach(button => { const active = button.dataset.clip === id; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  $('clip-caption').textContent = manifest.clips.find(item => item.id === id).label; $('phase-label').textContent = '加载中';
  const url = new URL(location.href); url.searchParams.set('clip', id); history.replaceState(null, '', url); render();
  try {
    const clip = await ensureClip(id); if (sequence !== requestId) return;
    $('asset-status').hidden = true; controls(true); $('clip-caption').textContent = clip.title; $('motion-note').textContent = clip.note;
    $('timeline').max = timingOf(clip).duration;
    $('beats').replaceChildren(...[...new Set(clip.frames.map(frame => frame.phase))].map((phase, i) => { const li = document.createElement('li'), n = document.createElement('span'); n.textContent = `0${i + 1}`; li.append(n, phase); li.dataset.phase = phase; return li; }));
    lastTimestamp = 0; render();
  } catch (error) { if (sequence === requestId) { state.playing = false; playButton(); showError(error); } }
}
function background() {
  const g = ctx.createLinearGradient(0,0,0,640); g.addColorStop(0,'#211a2a'); g.addColorStop(.75,'#403147'); g.addColorStop(1,'#1c1625'); ctx.fillStyle=g;ctx.fillRect(0,0,1100,640);
  ctx.save();ctx.strokeStyle='#c1a7c918';ctx.lineWidth=1;for(const x of [76,1024])ctx.strokeRect(x,116,18,419);
  ctx.fillStyle='#15101c75';ctx.fillRect(0,floorY,1100,105);ctx.strokeStyle='#ceb6d354';ctx.beginPath();ctx.moveTo(0,floorY);ctx.lineTo(1100,floorY);ctx.stroke();ctx.restore();
}
function reference() {
  const r=manifest.reference,picture=images.get('portrait');if(!picture)return;const scale=state.height/r.bodyHeight;
  ctx.save();ctx.translate(245,floorY);ctx.scale(state.facing,1);ctx.drawImage(picture,-r.pivot[0]*scale,-r.pivot[1]*scale,picture.naturalWidth*scale,picture.naturalHeight*scale);ctx.restore();
  if(state.guides){ctx.save();ctx.font='12px system-ui';for(const [label,y] of r.landmarks){const yy=floorY-(r.pivot[1]-y)*scale;ctx.strokeStyle='#d9c7df40';ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(120,yy);ctx.lineTo(945,yy);ctx.stroke();ctx.fillStyle='#d8c4df';ctx.fillText(label,957,yy+4);}ctx.restore();}
}
function sprite(clip, frame, x) {
  const r=registration(frame,clip,state.height);ctx.save();ctx.translate(x,floorY);ctx.scale(state.facing,1);ctx.drawImage(images.get(imageKey(state.clip,frame.sheet)),...frame.rect,r.x,r.y,r.width,r.height);
  if(state.guides){ctx.strokeStyle='#e9a4e180';ctx.strokeRect(r.x,r.y,r.width,r.height);ctx.strokeStyle='#f1d69b';ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();if(frame.castOrigin){ctx.strokeStyle='#ffc1ed';ctx.beginPath();ctx.arc(r.x+frame.castOrigin[0]*r.scale,r.y+frame.castOrigin[1]*r.scale,6,0,Math.PI*2);ctx.stroke();}}ctx.restore();
}
function orb(x,y,radius,age,color='#d69af5') {
  const g=ctx.createRadialGradient(x,y,0,x,y,radius*2.7);g.addColorStop(0,'#efd6ffed');g.addColorStop(.3,color+'aa');g.addColorStop(1,'#5f346b00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius*2.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,radius*1.45,radius*.6,age/110,0,Math.PI*1.7);ctx.stroke();ctx.fillStyle='#21102eee';ctx.beginPath();ctx.arc(x,y,radius*.46,0,Math.PI*2);ctx.fill();
}
function effects(clip,index,x) {
  if(!state.effects||!clip.effect)return;const release=castPoint(clip,clip.releaseFrame,state.height,state.facing);if(!release)return;
  const timing=timingOf(clip),effectClock=effectTiming(clip,state.time),age=effectClock.age,s=state.height/350,dir=state.facing;if(!effectClock.started)return;
  ctx.save();const startX=x+release.x,startY=floorY+release.y;
  if(clip.effect==='flux'||clip.effect==='ruin'){
    const heavy=clip.effect==='ruin',life=heavy?880:630,t=clamp(age/life);if(age<=life){ctx.globalAlpha=clamp((1-t)*4);const px=startX+dir*t*(heavy?210:280)*s;orb(px,startY,(heavy?21:11)*s,age,heavy?'#e7a4d8':'#d69af5');ctx.strokeStyle='#b682d970';ctx.beginPath();ctx.moveTo(px-dir*40*s,startY+3*s);ctx.lineTo(px-dir*10*s,startY);ctx.stroke();if(heavy){ctx.strokeStyle='#ffe6f0';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(px+Math.cos(i*1.7)*5*s,startY+Math.sin(i*1.7)*5*s);ctx.lineTo(px+Math.cos(i*1.7+.25)*17*s,startY+Math.sin(i*1.7+.25)*17*s);ctx.stroke();}}}
  }else if(clip.effect==='nosferatu'){
    const end=clip.effectEndFrame===undefined?timing.actionDuration:timing.starts[clip.effectEndFrame],releaseAt=timing.starts[clip.releaseFrame],life=Math.max(250,end-releaseAt);
    if(age<=life){const hand=castPoint(clip,index,state.height,dir)??release,handX=x+hand.x,handY=floorY+hand.y,targetX=x+dir*230*s,targetY=floorY-195*s,t=clamp(age/life);ctx.globalAlpha=clamp(t*7)*clamp((1-t)*6);ctx.strokeStyle='#c58dcc77';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(targetX,targetY);ctx.quadraticCurveTo((targetX+handX)/2,Math.min(targetY,handY)-35*s,handX,handY);ctx.stroke();ctx.strokeStyle='#d693c4';ctx.beginPath();ctx.ellipse(targetX,targetY,20*s,34*s,0,0,Math.PI*2);ctx.stroke();if(effectClock.returning)for(let i=0;i<5;i++){const p=(effectClock.returnProgress*1.6+i/5)%1,px=targetX+(handX-targetX)*p,py=targetY+(handY-targetY)*p-Math.sin(p*Math.PI)*23*s;orb(px,py,4*s,age+i*50,'#d597b4');}}
  }else if(clip.effect==='mire'){
    const life=1150,t=clamp(age/life),tx=x+dir*230*s,ty=floorY;if(age<=life){ctx.globalAlpha=clamp(t*7)*clamp((1-t)*5);ctx.strokeStyle='#bf91d3';ctx.lineWidth=2*s;for(const k of [1,.65]){ctx.beginPath();ctx.ellipse(tx,ty-3*s,70*s*k,18*s*k,0,0,Math.PI*2);ctx.stroke();}const rise=Math.sin(clamp((t-.1)/.7)*Math.PI);if(t>.1){const g=ctx.createLinearGradient(0,ty-150*s,0,ty);g.addColorStop(0,'#ad79c400');g.addColorStop(.6,'#723b9477');g.addColorStop(1,'#291138dd');ctx.fillStyle=g;for(let i=0;i<7;i++){const dx=(i-3)*15*s,h=(80+Math.sin(i*2.4)*30)*s*rise;ctx.beginPath();ctx.moveTo(tx+dx-13*s,ty);ctx.bezierCurveTo(tx+dx+15*s,ty-h*.5,tx+dx-20*s,ty-h*.8,tx+dx+7*s,ty-h);ctx.bezierCurveTo(tx+dx+21*s,ty-h*.6,tx+dx+13*s,ty-h*.3,tx+dx+14*s,ty);ctx.fill();}}}
  }ctx.restore();
}
function render() {
  background();if(!manifest)return;if(state.compare)reference();if(!ready())return;const clip=clips.get(state.clip),t=timingOf(clip),index=frameAt(state.time,clip),frame=clip.frames[index],x=state.compare?720:540;sprite(clip,frame,x);effects(clip,index,x);
  ctx.save();ctx.fillStyle='#d5bfdc';ctx.font='15px system-ui';ctx.textAlign='center';if(state.compare)ctx.fillText('批准 v3 站姿 · 同一身高',245,95);ctx.fillText(`连续动作 · ${state.height}px`,x,95);ctx.restore();
  $('phase-label').textContent=state.time>=t.actionDuration&&clip.restMs?'归位 · 循环间隔':frame.phase;$('frame-label').textContent=`${String(index+1).padStart(2,'0')} / ${clip.frames.length} 帧`;$('time-label').textContent=`${(state.time/1000).toFixed(2)} / ${(t.duration/1000).toFixed(2)}s`;$('timeline').value=state.time;$('view-caption').textContent=`${state.compare?'v3 站姿与动作 · 固定比例':'独立动作 · 固定比例'}${clip.effect&&state.effects?' · 法术为美术演示':''}`;for(const beat of $('beats').children)beat.classList.toggle('current',beat.dataset.phase===frame.phase);
}
async function nextClip(){const i=manifest.clips.findIndex(item=>item.id===state.clip);await chooseClip(manifest.clips[(i+1)%manifest.clips.length].id);}
function tick(timestamp){if(ready()&&state.playing&&lastTimestamp){state.time+=Math.min(80,timestamp-lastTimestamp)*state.speed;const duration=timingOf(clips.get(state.clip)).duration;if(state.time>=duration){if(state.reel){state.time=duration;void nextClip();}else if(state.loop)state.time%=duration;else{state.time=duration;state.playing=false;playButton();}}}lastTimestamp=timestamp;render();requestAnimationFrame(tick);}
function toggle(){if(!ready())return;if(state.time>=timingOf(clips.get(state.clip)).duration)state.time=0;state.playing=!state.playing;playButton();}
function step(direction){if(!ready())return;state.playing=false;state.time=nextFrameTime(state.time,direction,clips.get(state.clip));playButton();render();}
$('play-toggle').addEventListener('click',toggle);$('step-back').addEventListener('click',()=>step(-1));$('step-forward').addEventListener('click',()=>step(1));
$('timeline').addEventListener('input',event=>{if(!ready())return;state.playing=false;state.time=Number(event.target.value);playButton();render();});
for(const key of ['speed','facing','height'])$(key).addEventListener('change',event=>{state[key]=Number(event.target.value);render();});for(const key of ['compare','effects','guides','loop','reel'])$(key).addEventListener('change',event=>{state[key]=event.target.checked;render();});
$('restart').addEventListener('click',()=>{state.time=0;state.playing=true;playButton();render();});
addEventListener('keydown',event=>{if(!initialized||event.repeat||event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??''))return;const keys={KeyJ:'jab',KeyK:'smash',KeyL:'special',KeyI:'secondary'};if(keys[event.code]){void chooseClip(keys[event.code]);state.playing=true;playButton();}else if(event.code==='Space'&&document.activeElement?.tagName!=='BUTTON'){event.preventDefault();toggle();}else if(['ArrowRight','ArrowLeft'].includes(event.code)){event.preventDefault();step(event.code==='ArrowRight'?1:-1);}});
addEventListener('visibilitychange',()=>{lastTimestamp=0;});playButton();requestAnimationFrame(tick);
async function init(){try{manifest=await json('./manifest.json');for(const info of manifest.clips){const button=document.createElement('button'),label=document.createElement('span'),sub=document.createElement('small');button.dataset.clip=info.id;button.disabled=true;button.setAttribute('aria-pressed','false');label.textContent=info.label;sub.textContent=info.subtitle;button.append(label,sub);button.addEventListener('click',()=>{void chooseClip(info.id);});$('clip-tabs').append(button);}await image('portrait',manifest.reference.src);initialized=true;document.querySelectorAll('[data-clip]').forEach(button=>{button.disabled=false;});await chooseClip(state.clip);}catch(error){initialized=false;controls(false);document.querySelectorAll('[data-clip]').forEach(button=>{button.disabled=true;});$('asset-status').hidden=false;$('asset-status').textContent=`预览配置无法加载：${error.message}`;const retry=document.createElement('button');retry.textContent='重新加载预览';retry.addEventListener('click',()=>location.reload());$('asset-status').append(retry);}}
init();
