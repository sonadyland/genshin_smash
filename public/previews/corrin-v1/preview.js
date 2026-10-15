const $ = id => document.getElementById(id);
const canvas = $('stage'), ctx = canvas.getContext('2d');
const query = new URLSearchParams(location.search);
const state = {
  view: ['human', 'dragon', 'both', 'fx'].includes(query.get('form')) ? query.get('form') : 'both',
  action: query.get('clip') || 'idle', time: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  speed: 1, facing: 1, size: 'review', compare: true, comparison: 'side', guides: false, effects: true, loop: true, frozen: null,
};
const clips = new Map(), pictures = new Map(), imageJobs = new Map(), loadJobs = new Map();
const catalogueErrors = new Map();
let activeManifest = null;
const swordEffects = { jab1: 'fx-v2-yato-diagonal', jab2: 'fx-v2-yato-sweep', jab3: 'fx-v2-yato-thrust', smash: 'fx-v2-yato-downstroke' };
const labels = { human: '人形', dragon: '白龙', transform: '变形', fx: '特效' };
const actionNames = { idle: '待机 · 安定呼吸', run: '移动 · 交替踏步', jump: '跳跃 · 起跳与落地', dodge: '闪避 · 低身避让', hurt: '受击 · 短暂回震', defeat: '倒下 · 支撑与伏地', jab1: 'J ① · 踏步斜斩', jab2: 'J ② · 反手横斩', jab3: 'J ③ · 短促突刺', jab: 'J · 水弹吐息', smash: 'K · 蓄力释放', secondary: 'I · 形态技能' };
const transformNames = {
  'transform-to-dragon-ground': 'L · 地面：人形 → 白龙', 'transform-to-human-ground': 'L · 地面：白龙 → 人形',
  'transform-to-dragon-air': 'L · 空中：人形 → 白龙', 'transform-to-human-air': 'L · 空中：白龙 → 人形',
};
const fxNames = { 'fx-water-orb': '水弹 · 成形、飞行与散开', 'fx-water-beam': '水柱 · 喷发、持续与消散', 'fx-water-burst': '水爆 · 落地、水冠与波纹', 'fx-yato-slash': '夜刀神 · 旧版斩光', 'fx-dragon-fang': '龙牙 · 前臂穿刺光', 'fx-v2-yato-diagonal':'夜刀神 · 斜下斩迹', 'fx-v2-yato-sweep':'夜刀神 · 横扫薄弧', 'fx-v2-yato-thrust':'夜刀神 · 直刺光迹', 'fx-v2-yato-downstroke':'夜刀神 · 下劈残迹' };
const phaseNames = { 'near contact':'近侧触地','near weight':'近侧承重','near pass':'近侧过步','near lift':'近侧抬腿','far contact':'远侧触地','far weight':'远侧承重','far pass':'远侧过步','far lift':'远侧抬腿',crouch:'压低重心',launch:'后肢蹬地',rise:'收肢上升',apex:'腾空顶点',descend:'伸肢下落','fore contact':'前肢触地',compression:'四足缓冲',recover:'回到戒备',compress:'收身蓄力',dash:'快速避让',brake:'支撑减速',flinch:'短促回震',recoil:'身体回收',settle:'恢复支撑',weaken:'失去支撑',kneel:'屈肢落地',lower:'降低头部',rest:'伏地停留',brace:'四足站稳',inhale:'胸颈蓄力',charge:'凝聚水息',release:'释放',sustain:'持续吐息',lift:'抬起头颈',gather:'凝聚水团',cast:'向前抛出',retract:'回收头颈' };
Object.assign(phaseNames, { 'near load':'近侧承重','near passing':'近侧过步','far load':'远侧承重','far passing':'远侧过步',lunge:'低身避让',catch:'前爪刹停',peak:'受击峰值','fore collapse':'前肢屈伏',fold:'后肢收拢',aim:'压颈瞄准',close:'闭口收势',crest:'蓄力峰值',follow:'释放随动',raise:'继续抬颈',coil:'胸颈蓄力' });
const humanPhases = { grip:'双手握柄',raise:'抬剑起势',overhead:'双手举剑',windup:'沉肩蓄力',crest:'蓄力峰值',downstroke:'向下劈斩',impact:'命中重压',absorb:'屈膝卸力','release-left':'左手松握',idle:'回到待机' };
Object.assign(humanPhases, { 'draw-sword':'收剑让位','arm-transform':'左臂龙化','fang-ready':'龙牙成形',step:'踏步蓄力',release:'龙牙突刺',retract:'龙牙回收',coil:'收臂卸力','restore-hand':'恢复手掌','human-return':'回归人形' });
Object.assign(humanPhases, { 'reach-grip':'合手握柄','lift-sword':'双手抬剑','overhead-windup':'举剑蓄力','charged-overhead':'头顶蓄力峰值','release-vertical':'开始下劈','downstroke-horizontal':'刃线切过前方','impact-downright':'前下重劈',followthrough:'下劈随动',straighten:'起身归稳','claw-form':'手掌龙化','fang-form':'龙牙延展','fang-coil':'屈臂蓄刺',aim:'龙牙瞄准',thrust:'龙牙刺出','full-extension':'穿刺延展',recoil:'刺后回收','fold-arm':'收臂卸力','claw-restore':'龙牙消退','human-hand':'恢复人手' });
let width = 1000, height = 560, lastTimestamp = 0, activeLoad = 0, arrangementCache = null;
const total = clip => clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
const startAt = (clip, index) => clip.frames.slice(0, index).reduce((sum, frame) => sum + frame.duration, 0);
const srcKey = src => new URL(src, location.href).href;
const finitePair = pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite);
function frameAt(clip, time, loop = false) {
  const local = loop ? time % total(clip) : Math.min(time, total(clip) - .001);
  let end = 0;
  for (let i = 0; i < clip.frames.length; i++) { end += clip.frames[i].duration; if (local < end) return i; }
  return clip.frames.length - 1;
}
function invalidate() { arrangementCache = null; }
async function readJson(src) {
  const response = await fetch(src, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${src} · HTTP ${response.status}`);
  return response.json();
}
function normalise(raw, form, action) {
  const clip = { ...raw, form, id: action || raw.id, key: `${form}:${action || raw.id}`, gameHeight: raw.worldHeight || raw.gameHeight || (form === 'dragon' ? 135 : 112), loop: raw.loop ?? (action === 'idle') };
  clip.sheets = raw.sheets.map(sheet => {
    const url = new URL(sheet.src, location.href), hash = sheet.sha256 || sheet.measurement?.sha256;
    if (hash) url.searchParams.set('v', hash.slice(0, 12));
    return { ...sheet, src: url.href };
  });
  clip.frames = raw.frames.map(frame => ({ ...frame, duration: frame.duration ?? frame.durationMs }));
  if (raw.reference) clip.reference = { ...raw.reference, src: srcKey(raw.reference.src) };
  clip.status = clip.sheets.every(s => s.bodyHeight > 0) && clip.frames.every(f => finitePair(f.pivot) && f.duration > 0) ? 'unloaded' : 'pending';
  return clip;
}
async function catalogue() {
  catalogueErrors.clear(); clips.clear(); activeManifest = null;
  const sources = [
    ['human-idle.json', 'human', true], ['dragon-idle.json', 'dragon', true],
    ['human-motion-registration.json', 'human'], ['dragon-motion-registration.json', 'dragon'],
    ['human-skill-registration.json', 'human'], ['transform-fx-registration.json', 'mixed'],
  ];
  await Promise.all(sources.map(async ([src, form, idle]) => {
    try {
      const data = await readJson(src);
      for (const raw of idle ? [data] : data.clips) {
        const group = form === 'mixed' ? raw.id.startsWith('fx-') ? 'fx' : 'transform' : form;
        const clip = normalise(raw, group, idle ? 'idle' : raw.id);
        clips.set(clip.key, clip);
      }
    } catch (error) { catalogueErrors.set(src, error.message); }
  }));
  const approvedReferences=Object.fromEntries(['human','dragon'].map(form=>[form,clips.get(`${form}:idle`)?.reference]));
  // A complete manifest opts in to reviewed replacements. Historical PNGs stay intact.
  try {
    const response = await fetch('human-v2-manifest.json', { cache:'no-cache' });
    if (response.ok) {
      const manifest = await response.json();
      const reviewGroups=(query.get('review')||'').split(',').filter(Boolean);
      if (manifest.ready || reviewGroups.length) {
        const selected=manifest.ready?manifest.sources:manifest.sources.filter(source=>reviewGroups.includes(source.group));
        const replacedKeys=[];
        const replacements = await Promise.all(selected.map(async source => ({source,data:await readJson(source.src)})));
        for (const {source,data} of replacements) for (const raw of source.single ? [data] : data.clips) {
          const form = source.form || (raw.id.startsWith('fx-') ? 'fx' : 'human');
          const clip = normalise(raw,form,source.single ? (source.id || raw.id) : raw.id);
          clip.artRevision=manifest.revision;replacedKeys.push(clip.key);
          clips.set(clip.key,clip);
        }
        if(manifest.ready)for (const key of manifest.retired || []) clips.delete(key);
        if (manifest.weaponEffects && (manifest.ready||reviewGroups.some(group=>['combat','skills'].includes(group)))) {
          const bindings = await readJson(manifest.weaponEffects);
          for (const [id,binding] of Object.entries(bindings.clips)) {
            const clip = clips.get(`human:${id}`); if (clip) clip.weaponEffect = binding;
          }
        }
        activeManifest = {...manifest,partial:!manifest.ready,requiredClips:manifest.ready?manifest.requiredClips:replacedKeys};
      }
    }
  } catch (error) { catalogueErrors.set('human-v2-manifest.json',error.message); }
  try {
    const overrides = await readJson('preview-registration-overrides.json');
    for (const [key, override] of Object.entries(overrides.clips)) {
      const clip = clips.get(key); if (!clip) continue;
      if (override.pivotY) clip.frames.forEach((frame, index) => { frame.pivot = [frame.pivot[0], override.pivotY[index]]; });
    }
  } catch (error) { catalogueErrors.set('preview-registration-overrides.json', error.message); }
  for (const clip of clips.values()) {
    if (['human', 'dragon'].includes(clip.form)) clip.reference = clips.get(`${clip.form}:idle`)?.reference || approvedReferences[clip.form];
    if(clip.form==='transform'){clip.reference=approvedReferences.human;clip.referenceForm='human';}
    if(clip.reference&&activeManifest?.referenceAnchors?.[clip.referenceForm||clip.form])clip.reference.anchors=activeManifest.referenceAnchors[clip.referenceForm||clip.form];
  }
  updateOptions(); invalidate();
  const count = [...clips.values()].reduce((sum, clip) => sum + clip.frames.length, 0);
  const required = activeManifest?.requiredClips || ['human:idle','human:run','human:jump','human:dodge','human:hurt','human:defeat','human:jab1','human:jab2','human:jab3','human:smash','human:secondary'];
  $('study-badge').textContent = `${activeManifest?.partial?'局部新版审片 · ':''}${clips.size} 组 · ${count} 帧${catalogueErrors.size || required.some(key=>!clips.has(key)) || [...clips.values()].some(c => c.status === 'pending') ? ' · 目录待补全' : ''}`;
}
function optionList() {
  if (state.view === 'fx') return Object.entries(fxNames).filter(([id])=>clips.has(`fx:${id}`));
  const common = ['idle', 'run', 'jump', 'dodge', 'hurt', 'defeat'];
  const attacks = state.view === 'dragon' ? ['jab', 'smash', 'secondary'] : ['jab1', 'jab2', 'jab3', 'smash', 'secondary'];
  return [...common, ...attacks].map(id => [id, actionTitle(id)]).concat(Object.entries(transformNames));
}
function actionTitle(id) {
  if (id === 'smash') return state.view === 'human' ? 'K · 双手下劈' : state.view === 'dragon' ? 'K · 高压水束' : 'K · 人形下劈 / 白龙水束';
  if (id === 'secondary') return state.view === 'human' ? 'I · 龙牙突刺' : state.view === 'dragon' ? 'I · 仰首抛射' : 'I · 龙牙突刺 / 仰首抛射';
  return actionNames[id] || id;
}
function updateOptions() {
  const options = optionList();
  if (!options.some(([id]) => id === state.action)) state.action = options[0][0];
  $('clip-select').replaceChildren(...options.map(([id, title]) => {
    const option = document.createElement('option'); option.value = id;
    const form = id.startsWith('transform-') ? 'transform' : state.view === 'both' ? 'human' : state.view;
    const clip = clips.get(`${form}:${id}`);
    option.textContent = `${title}${clip && clip.status !== 'pending' ? '' : ' · 待登记'}`; return option;
  }));
  $('clip-select').value = state.action;
}
function visibleKeys() {
  if (state.action.startsWith('transform-')) return [`transform:${state.action}`];
  if (state.view === 'fx') return [`fx:${state.action}`];
  const forms = state.view === 'both' ? ['human', 'dragon'] : [state.view];
  return forms.map(form => `${form}:${form === 'dragon' && state.action.startsWith('jab') ? 'jab' : state.action}`);
}
const currentClips = () => visibleKeys().map(key => clips.get(key)).filter(Boolean);
const readyClips = () => currentClips().filter(clip => clip.status === 'ready');
function effectKeys(clip) {
  if (!state.effects) return [];
  if (clip.form === 'human') return clip.id === 'secondary' ? ['fx-dragon-fang'] : swordEffects[clip.id] ? [clip.weaponEffect?.id || (clip.artRevision ? swordEffects[clip.id] : 'fx-yato-slash')] : [];
  if (clip.form === 'dragon') return clip.id === 'jab' ? ['fx-water-orb'] : clip.id === 'smash' ? ['fx-water-beam'] : clip.id === 'secondary' ? ['fx-water-orb', 'fx-water-burst'] : [];
  return [];
}
function emissionAnchors(clip) {
  if (clip.form === 'dragon') return ['mouth'];
  if (clip.id === 'secondary') return ['castOrigin','dragonFangTip','fangTip','dragonFang'];
  return ['swordTip','weaponTip'];
}
function loadImage(src) {
  if (pictures.has(src)) return Promise.resolve(pictures.get(src));
  if (imageJobs.has(src)) return imageJobs.get(src);
  const job = new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => { image.onload = null; image.onerror = null; image.removeAttribute('src'); reject(new Error(`图片加载超时：${new URL(src).pathname.split('/').pop()}`)); }, 60000);
    image.onload = () => { clearTimeout(timeout); pictures.set(src, image); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error(`图片无法加载：${new URL(src).pathname.split('/').pop()}`)); };
    image.src = src;
  }).finally(() => imageJobs.delete(src));
  imageJobs.set(src, job); return job;
}
// Alpha is read solely to reserve stage space; source PNGs and anatomical scales are never rewritten.
function measureBounds(image, rect) {
  const probe = document.createElement('canvas'); probe.width = rect[2]; probe.height = rect[3];
  const context = probe.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, ...rect, 0, 0, rect[2], rect[3]);
  const data = context.getImageData(0, 0, rect[2], rect[3]).data;
  let left = rect[2], top = rect[3], right = 0, bottom = 0, transparent = 0;
  for (let y = 0; y < rect[3]; y++) for (let x = 0; x < rect[2]; x++) {
    const alpha = data[(y * rect[2] + x) * 4 + 3];
    if (alpha === 0) transparent++;
    if (alpha > 16) { left = Math.min(left,x); right = Math.max(right,x+1); top = Math.min(top,y); bottom = Math.max(bottom,y+1); }
  }
  if (!transparent) throw new Error('图表没有真正透明的背景，需完成素材透明度修正');
  if (right <= left) throw new Error('动作单元格没有可见原画');
  return [left, top, right-left, bottom-top];
}
function validateAndMeasure(clip) {
  for (const sheet of clip.sheets) {
    const image = pictures.get(sheet.src);
    if (image.naturalWidth !== sheet.width || image.naturalHeight !== sheet.height || !(sheet.bodyHeight > 0)) throw new Error(`${clip.title}：原图尺寸或固定身体标尺不符`);
  }
  for (const frame of clip.frames) {
    const sheet = clip.sheets[frame.sheet], [x,y,w,h] = frame.rect;
    if (!sheet || ![x,y,w,h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x+w > sheet.width || y+h > sheet.height || !finitePair(frame.pivot) || !(frame.duration > 0)) throw new Error(`${clip.title}：帧坐标登记不完整`);
    frame.bounds = measureBounds(pictures.get(sheet.src), frame.rect);
    const needsEmission = clip.form === 'dragon' && ['jab','smash','secondary'].includes(clip.id) || clip.form === 'human' && ['jab1','jab2','jab3','smash','secondary'].includes(clip.id);
    if (needsEmission && !emissionAnchors(clip).some(name => finitePair(frame.anchors?.[name]))) throw new Error(`${clip.title}：技能发射点尚未登记`);
    if(clip.weaponEffect){
      const axis=clip.weaponEffect.kind==='fang'?['castOrigin','fangTip']:['weaponBase','swordTip'];
      if(axis.some(name=>!finitePair(frame.anchors?.[name])))throw new Error(`${clip.title}：需要逐帧登记${axis.join(' / ')}`);
    }
  }
  if(clip.artRevision&&clip.form==='human'&&swordEffects[clip.id]&&!clip.weaponEffect)throw new Error(`${clip.title}：新剑术的激活帧与轨迹纹理尚未登记`);
  if(clip.weaponEffect){
    const effect=clips.get(`fx:${clip.weaponEffect.id}`);
    if(!effect||!Array.isArray(clip.weaponEffect.active)||!clip.weaponEffect.active.length)throw new Error(`${clip.title}：剑光绑定不完整`);
    for(const slot of clip.weaponEffect.active)if(!clip.frames[slot.frame]||!(slot.fxFrames||[slot.fxFrame]).every(index=>effect.frames[index])||(slot.previous!==undefined&&!clip.frames[slot.previous]))throw new Error(`${clip.title}：剑光绑定引用了不存在的原画帧`);
  }
}
async function loadClip(clip) {
  if (!clip || clip.status === 'pending' || clip.status === 'ready') return;
  if (loadJobs.has(clip.key)) return loadJobs.get(clip.key);
  clip.status = 'loading'; clip.error = null;
  const job = (async () => {
    try { await Promise.all(clip.sheets.map(sheet => loadImage(sheet.src))); validateAndMeasure(clip); clip.status = 'ready'; }
    catch (error) { clip.status = 'error'; clip.error = error.message; }
    finally { loadJobs.delete(clip.key); invalidate(); }
  })();
  loadJobs.set(clip.key, job); return job;
}
function comparing() { return state.compare && ['human','dragon'].includes(state.view); }
async function loadSelection(resetTime = true) {
  const token = ++activeLoad; if (resetTime){state.time = 0;state.frozen=null;$('freeze-frame').textContent='冻结当前帧作对照';} lastTimestamp = 0; invalidate(); updateStatus(); render();
  const needed = currentClips();
  const fx = needed.flatMap(effectKeys).map(id => clips.get(`fx:${id}`));
  await Promise.all([...needed, ...fx].map(loadClip));
  if (comparing()) await Promise.all(needed.map(async clip => {
    try { if (clip.reference) await loadImage(clip.reference.src); }
    catch (error) { clip.referenceError = error.message; }
  }));
  if (token !== activeLoad) return;
  invalidate(); updateStatus(); render();
}
function updateStatus() {
  const visible = currentClips(), missing = visible.filter(clip => clip.status !== 'ready');
  const unavailable = visibleKeys().filter(key => !clips.has(key));
  const failedFx = visible.flatMap(effectKeys).map(id => clips.get(`fx:${id}`)).filter(clip => clip && clip.status !== 'ready');
  const errors = [...missing,...failedFx].map(clip => clip.error || `${clip.title}：${clip.status === 'pending' ? '坐标登记尚未完成' : '正在加载素材'}`);
  if (unavailable.length) errors.push('该动作尚未登记，请完成资源后刷新');
  const referenceErrors = comparing() ? visible.map(c => c.referenceError).filter(Boolean) : [];
  errors.push(...referenceErrors);
  const enabled = readyClips().length > 0;
  for (const id of ['play-toggle','step-back','step-forward','timeline','restart']) $(id).disabled = !enabled;
  $('compare').disabled = !['human','dragon'].includes(state.view);
  $('comparison').disabled=$('compare').disabled||!state.compare;
  $('freeze-frame').disabled=!enabled||state.view==='fx';
  $('effects').disabled = ['fx'].includes(state.view) || state.action.startsWith('transform-');
  $('asset-status').hidden = !errors.length;
  if (errors.length) {
    $('asset-status').replaceChildren(document.createTextNode(errors.join('；')));
    if (missing.some(c => c.status === 'error' || c.status === 'pending') || unavailable.length || failedFx.some(c => c.status === 'error') || referenceErrors.length) {
      const retry = document.createElement('button'); retry.textContent = '重新读取资源'; retry.addEventListener('click', refresh); $('asset-status').append(retry);
    }
  }
  const missingSkills = [['smash','K'],['secondary','I']].filter(([id]) => !clips.has(`human:${id}`)).map(([,key]) => key);
  $('clip-detail').textContent = visible.map(c => `${labels[c.form]} ${c.frames.length} 帧 · ${(total(c)/1000).toFixed(2)}s`).join(' / ') + (missingSkills.length ? ` · 人形 ${missingSkills.join(' / ')} 素材制作中` : '');
}
function syncURL() { const url = new URL(location.href); url.searchParams.set('form',state.view); url.searchParams.set('clip',state.action); history.replaceState(null,'',url); }
async function chooseView(view) {
  state.view = view; updateOptions(); syncURL();
  document.querySelectorAll('[data-view]').forEach(button => { const selected = button.dataset.view === view; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
  await loadSelection();
}
function releaseIndex(clip) { return clip.form === 'dragon' ? clip.id === 'jab' ? 3 : 5 : clip.id.startsWith('jab') ? 3 : 5; }
function effectEnd(clip) {
  if (!effectKeys(clip).length) return total(clip);
  const release = startAt(clip, releaseIndex(clip));
  return Math.max(total(clip), release + (clip.form === 'dragon' && clip.id === 'secondary' ? 650 + (clips.get('fx:fx-water-burst') ? total(clips.get('fx:fx-water-burst')) : 600) : clip.form === 'dragon' && clip.id === 'jab' ? 780 : 320));
}
function sceneDuration() { return Math.max(1, ...readyClips().map(effectEnd)); }
function clipTime(clip, time) { return clip.loop ? time % total(clip) : Math.min(time,total(clip)-.001); }
function characterSample(clip,time,reference=false) {
  const index = frameAt(clip,clipTime(clip,time));
  const frame = reference ? { rect:[0,0,clip.reference.width,clip.reference.height],pivot:clip.reference.pivot,bounds:clip.reference.bounds,anchors:clip.reference.anchors } : clip.frames[index];
  const sheet = reference ? clip.reference : clip.sheets[frame.sheet];
  return { clip,frame,sheet,index,scale:clip.gameHeight/sheet.bodyHeight,x:0,y:!reference&&clip.id.endsWith('-air') ? -32 : 0,reference };
}
function anchorPoint(clip, time, names) {
  const sample = characterSample(clip,time);
  const anchor = names.map(name => sample.frame.anchors?.[name]).find(finitePair);
  if (!anchor) return null;
  return { x:sample.x+(anchor[0]-sample.frame.pivot[0])*sample.scale,y:sample.y+(anchor[1]-sample.frame.pivot[1])*sample.scale };
}
function weaponGeometry(clip,index) {
  const time=startAt(clip,index),sample=characterSample(clip,time);
  const point=names=>{
    const value=names.map(name=>sample.frame.anchors?.[name]).find(finitePair);
    return value ? {x:(value[0]-sample.frame.pivot[0])*sample.scale,y:sample.y+(value[1]-sample.frame.pivot[1])*sample.scale} : null;
  };
  const fang=clip.weaponEffect?.kind==='fang';
  const base=point(fang?['castOrigin']:['weaponBase','bladeBase']),tip=point(fang?['fangTip','dragonFangTip']:['swordTip','weaponTip']);
  return base&&tip ? {base,tip,index} : null;
}
// Map generated texture geometry to three measured points in the weapon sweep.
// Character images never use this matrix; their original proportions stay uniform.
function affineEffect(sample,source,destination) {
  const [o,a,b]=source,[p,q,r]=destination;
  const ax=a[0]-o[0],ay=a[1]-o[1],bx=b[0]-o[0],by=b[1]-o[1],det=ax*by-ay*bx;
  if(Math.abs(det)<1)return null;
  const qx=q.x-p.x,qy=q.y-p.y,rx=r.x-p.x,ry=r.y-p.y;
  sample.matrix=[(qx*by-rx*ay)/det,(qy*by-ry*ay)/det,(rx*ax-qx*bx)/det,(ry*ax-qy*bx)/det];
  sample.frame={...sample.frame,pivot:o};sample.x=p.x;sample.y=p.y;
  return sample;
}
function weaponEffectsAt(clip,time) {
  const binding=clip.weaponEffect;if(!binding)return [];
  const index=frameAt(clip,clipTime(clip,time)),slot=binding.active.find(item=>item.frame===index);
  if(!slot)return [];
  const current=weaponGeometry(clip,index),previous=weaponGeometry(clip,slot.previous ?? Math.max(0,index-1));
  if(!current||!previous)return [];
  const textureFrames=slot.fxFrames||[slot.fxFrame],local=(clipTime(clip,time)-startAt(clip,index))/clip.frames[index].duration;
  const textureIndex=textureFrames[Math.min(textureFrames.length-1,Math.floor(local*textureFrames.length))];
  const effect=fxSample(binding.id,textureIndex,current.base);if(!effect)return [];
  const anchors=binding.textureGeometry?.[textureIndex]||effect.frame.anchors||{},source=[anchors.origin,anchors.bladeTip,anchors.trailTip];
  if(!source.every(finitePair))return [];
  let destination=[current.base,current.tip,previous.tip],sweepPlaneAdjusted=false;
  if(binding.kind==='fang'){
    const dx=current.tip.x-current.base.x,dy=current.tip.y-current.base.y,length=Math.hypot(dx,dy);if(length<1)return [];
    const extension=Math.min(22,Math.max(14,length*.32)),unit=extension/(source[1][0]-source[0][0]);
    destination=[current.tip,{x:current.tip.x+dx/length*extension,y:current.tip.y+dy/length*extension},{x:current.tip.x-dy/length*(source[2][1]-source[0][1])*unit,y:current.tip.y+dx/length*(source[2][1]-source[0][1])*unit}];
  }else if(binding.kind==='thrust'){
    const dx=current.tip.x-current.base.x,dy=current.tip.y-current.base.y,length=Math.hypot(dx,dy);
    if(length<1)return [];
    destination=[current.tip,current.base,{x:current.tip.x-dy*.10,y:current.tip.y+dx*.10}];
  }else if(Math.hypot(current.tip.x-previous.tip.x,current.tip.y-previous.tip.y)<1)return [];
  else if(binding.kind==='horizontal-sweep'){
    // Edge-on backhand sweeps trace a shallow ribbon from the old tip to the
    // new tip. A fan through a nearly collinear hand/tip triangle would shear
    // the curved texture far beyond the real sword, so use the blade axis here.
    const dx=current.tip.x-current.base.x,dy=current.tip.y-current.base.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
    const along=Math.min(-length*.15,Math.max(-length*3,(previous.tip.x-current.tip.x)*ux+(previous.tip.y-current.tip.y)*uy));
    const from={x:current.tip.x+along*ux,y:current.tip.y+along*uy},depth=length*(binding.minimumPlaneWidth||.06);
    const sx=source[1][0]-source[0][0],sy=source[1][1]-source[0][1],slen2=sx*sx+sy*sy;
    const fraction=((source[2][0]-source[0][0])*sx+(source[2][1]-source[0][1])*sy)/slen2;
    destination=[from,current.tip,{x:from.x-along*ux*fraction+uy*depth,y:from.y-along*uy*fraction-ux*depth}];sweepPlaneAdjusted=true;
  }
  const mapped=affineEffect(effect,source,destination);if(!mapped)return [];
  mapped.opacity=slot.opacity??.8;mapped.layer=binding.layer;mapped.weaponDebug={current,previous,destination,sweepPlaneAdjusted};
  return [mapped];
}
function fxSample(id,index,point,scale=1) {
  const clip = clips.get(`fx:${id}`); if (clip?.status !== 'ready') return null;
  const frame = clip.frames[index], sheet = clip.sheets[frame.sheet];
  return {clip,frame,sheet,index,scale:clip.gameHeight/sheet.bodyHeight*scale,x:point.x,y:point.y,fx:true};
}
function effectsAt(clip,time) {
  if (!state.effects || !effectKeys(clip).length) return [];
  if(clip.form==='human'&&clip.weaponEffect)return weaponEffectsAt(clip,time);
  const release = startAt(clip,releaseIndex(clip)), elapsed = time-release;
  if (elapsed < 0) return [];
  const source = anchorPoint(clip,release,emissionAnchors(clip));
  if (!source) return [];
  const out = [];
  if (clip.form === 'human' && clip.id === 'jab3') {
    if (elapsed >= 55) return [];
    const spark = fxSample('fx-yato-slash',0,anchorPoint(clip,time,emissionAnchors(clip)) || source,.3);
    if (spark) spark.opacity = 1-elapsed/55;
    return spark ? [spark] : [];
  }
  if (clip.form === 'dragon' && ['jab','secondary'].includes(clip.id)) {
    const flight = clip.id === 'secondary' ? 650 : 680, progress = Math.min(1,elapsed/flight), orb = clips.get('fx:fx-water-orb');
    if (elapsed < flight && orb) {
      const index = elapsed < orb.frames[0].duration ? (orb.spawnFrame ?? 0) : orb.flightLoopFrames[Math.floor((elapsed-orb.frames[0].duration)/100)%orb.flightLoopFrames.length];
      const point = clip.id === 'secondary' ? {x:source.x+progress*210,y:source.y*(1-progress)-Math.sin(progress*Math.PI)*95} : {x:source.x+progress*210,y:source.y};
      out.push(fxSample('fx-water-orb',index,point));
    } else if (clip.id === 'jab' && elapsed < flight+100 && orb) out.push(fxSample('fx-water-orb',orb.impactFrame ?? 3,{x:source.x+210,y:source.y}));
    else if (clip.id === 'secondary') {
      const burst = clips.get('fx:fx-water-burst');
      if (burst && elapsed-flight < total(burst)) out.push(fxSample('fx-water-burst',frameAt(burst,elapsed-flight),{x:source.x+210,y:0}));
    }
  } else {
    const id = effectKeys(clip)[0], effect = clips.get(`fx:${id}`);
    if (effect && elapsed < total(effect)) {
      const point = anchorPoint(clip,time,emissionAnchors(clip)) || source;
      out.push(fxSample(id,frameAt(effect,elapsed),point,clip.form === 'human' && clip.id !== 'secondary' ? .68 : 1));
    }
  }
  return out.filter(Boolean);
}
function samplesAt(clip,time,reference=false) {
  if(reference)return [characterSample(clip,time,true)];
  const effects=effectsAt(clip,time);
  return [...effects.filter(s=>s.layer==='behind'),characterSample(clip,time),...effects.filter(s=>s.layer!=='behind')];
}
function samplePoint(sample,x,y){
  const dx=x-sample.frame.pivot[0],dy=y-sample.frame.pivot[1];
  if(sample.matrix){const[a,b,c,d]=sample.matrix;return{x:sample.x+a*dx+c*dy,y:sample.y+b*dx+d*dy};}
  return{x:sample.x+dx*sample.scale,y:sample.y+dy*sample.scale};
}
function boundsOf(samples) {
  const out = {left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
  for (const sample of samples) {
    const [x,y,w,h] = sample.frame.bounds || [0,0,sample.frame.rect[2],sample.frame.rect[3]];
    for(const point of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([u,v])=>samplePoint(sample,u,v))){out.left=Math.min(out.left,point.x);out.right=Math.max(out.right,point.x);out.top=Math.min(out.top,point.y);out.bottom=Math.max(out.bottom,point.y);}
  }
  return out;
}
function fullExtents(clip,reference=false) {
  if (reference) return boundsOf(samplesAt(clip,0,true));
  const samples = clip.frames.flatMap((frame,index) => samplesAt(clip,startAt(clip,index)));
  if (effectKeys(clip).length) for(let time=0;time<=effectEnd(clip);time+=24) samples.push(...effectsAt(clip,time));
  return boundsOf(samples);
}
function layout() {
  if (arrangementCache) return arrangementCache;
  const entries = [];
  for (const clip of readyClips()) {
    const reference=comparing()&&clip.reference&&pictures.has(clip.reference.src);
    if(reference&&state.comparison==='side')entries.push({clip,reference:true,e:fullExtents(clip,true)});
    if(state.frozen?.key===clip.key)entries.push({clip,frozen:true,time:state.frozen.time,e:boundsOf([characterSample(clip,state.frozen.time)])});
    const e=fullExtents(clip);
    if(reference&&state.comparison==='overlay'){const r=fullExtents(clip,true);e.left=Math.min(e.left,r.left);e.right=Math.max(e.right,r.right);e.top=Math.min(e.top,r.top);e.bottom=Math.max(e.bottom,r.bottom);}
    entries.push({clip,reference:false,overlay:reference&&state.comparison==='overlay',e});
  }
  if (!entries.length) return {entries,multiplier:1,floor:height-90};
  const gap = width < 550 ? 20 : 60, padding = width < 550 ? 14 : 35;
  const rawWidth=entries.reduce((sum,entry)=>sum+entry.e.right-entry.e.left,0);
  const rawTop=Math.max(...entries.map(entry=>-entry.e.top)),rawBottom=Math.max(0,...entries.map(entry=>entry.e.bottom));
  const available=Math.min((width-2*padding-gap*(entries.length-1))/rawWidth,(height-(width<470?185:160))/(rawTop+rawBottom));
  const multiplier=Math.max(.08,Math.min(state.size==='game'?1:2.7,available));
  const floor=height-(width<470?105:78)-rawBottom*multiplier;
  let left=(width-(rawWidth*multiplier+gap*(entries.length-1)))/2;
  for(const entry of entries){entry.x=left-(state.facing===1?entry.e.left:-entry.e.right)*multiplier;entry.center=left+(entry.e.right-entry.e.left)*multiplier/2;left+=(entry.e.right-entry.e.left)*multiplier+gap;}
  arrangementCache={entries,multiplier,floor};return arrangementCache;
}
function drawSample(sample,entry,arrangement) {
  const image=pictures.get(sample.sheet.src);if(!image)return;
  const s=sample.scale*arrangement.multiplier,[px,py]=sample.frame.pivot;
  ctx.save();ctx.translate(entry.x,arrangement.floor);ctx.scale(state.facing,1);
  if(sample.opacity !== undefined)ctx.globalAlpha=sample.opacity;
  if(sample.matrix){
    const m=arrangement.multiplier,[a,b,c,d]=sample.matrix;ctx.save();ctx.transform(a*m,b*m,c*m,d*m,sample.x*m,sample.y*m);
    ctx.drawImage(image,...sample.frame.rect,-px,-py,sample.frame.rect[2],sample.frame.rect[3]);ctx.restore();
  }else ctx.drawImage(image,...sample.frame.rect,(sample.x*arrangement.multiplier-px*s),(sample.y*arrangement.multiplier-py*s),sample.frame.rect[2]*s,sample.frame.rect[3]*s);
  if(state.guides && !sample.fx){
    ctx.strokeStyle='#ebd39c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();
    ctx.strokeStyle='#c6e4e65c';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-sample.clip.gameHeight*arrangement.multiplier);ctx.stroke();ctx.setLineDash([]);
    const anchors=sample.frame.anchors||{};
    for(const [name,point] of Object.entries(anchors))if(finitePair(point)&&!['origin','center'].includes(name)){const x=sample.x*arrangement.multiplier+(point[0]-px)*s,y=sample.y*arrangement.multiplier+(point[1]-py)*s;ctx.fillStyle='#9ce8f4';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
    for(const chain of [['headTop','chin','hip','kneeNear','ankleNear'],['shoulder','elbow','hand'],sample.clip.weaponEffect?.kind==='fang'?['castOrigin','fangTip']:['weaponBase','swordTip']]){
      const weaponAxis=chain[0]==='weaponBase'||chain[0]==='castOrigin';ctx.strokeStyle=weaponAxis?'#59efff':'#a6cec8a8';ctx.lineWidth=weaponAxis?2:1;ctx.beginPath();let started=false;
      for(const name of chain){const p=anchors[name];if(!finitePair(p))continue;const x=(p[0]-px)*s+sample.x*arrangement.multiplier,y=(p[1]-py)*s+sample.y*arrangement.multiplier;if(!started)ctx.moveTo(x,y);else ctx.lineTo(x,y);started=true;}ctx.stroke();
    }
    if(!sample.reference&&sample.clip.weaponEffect){
      const geometry=weaponGeometry(sample.clip,sample.index),slot=sample.clip.weaponEffect.active.find(item=>item.frame===sample.index);
      if(geometry&&slot){const previous=weaponGeometry(sample.clip,slot.previous??Math.max(0,sample.index-1));if(previous){const m=arrangement.multiplier;ctx.strokeStyle='#fd9f78';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(previous.base.x*m,previous.base.y*m);ctx.lineTo(previous.tip.x*m,previous.tip.y*m);ctx.lineTo(geometry.tip.x*m,geometry.tip.y*m);ctx.stroke();ctx.setLineDash([]);}}
    }
  }
  if(state.guides&&sample.weaponDebug){
    ctx.globalAlpha=1;ctx.fillStyle='#d5ff8d';for(const point of sample.weaponDebug.destination){ctx.beginPath();ctx.arc(point.x*arrangement.multiplier,point.y*arrangement.multiplier,3.5,0,Math.PI*2);ctx.fill();}
  }ctx.restore();
}
function render() {
  const a=layout(),floor=a.floor;
  const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,'#18313a');g.addColorStop(.7,'#345251');g.addColorStop(1,'#182e34');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#0e20264a';ctx.fillRect(0,floor,width,height-floor);ctx.strokeStyle='#b7d3c95c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,floor+.5);ctx.lineTo(width,floor+.5);ctx.stroke();
  for(const entry of a.entries){
    if(entry.overlay){const ghost=characterSample(entry.clip,0,true);ghost.opacity=.24;drawSample(ghost,entry,a);}
    for(const sample of entry.frozen?[characterSample(entry.clip,entry.time)]:samplesAt(entry.clip,state.time,entry.reference))drawSample(sample,entry,a);
    ctx.fillStyle='#c1d7d6';ctx.font='11px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(entry.reference?`${labels[entry.clip.referenceForm||entry.clip.form]} · 标准母版`:entry.frozen?`冻结 · 第 ${frameAt(entry.clip,entry.time)+1} 帧`:entry.clip.title,entry.center,height-(width<470?69:47));
  }
  const visible=readyClips();
  $('view-caption').textContent=transformNames[state.action]||fxNames[state.action]||`${state.view==='both'?'同地面 · 双形态':labels[state.view]} · ${actionTitle(state.action)}`;
  $('scale-label').textContent=`${state.size==='game'?'游戏尺寸':'审片尺寸'} · 人 ${Math.round(112*a.multiplier)} / 龙 ${Math.round(135*a.multiplier)}px${state.size==='game'&&a.multiplier<.999?' · 窄屏适配':''}`;
  $('frame-label').textContent=visible.map(c=>`${labels[c.form]} ${String(frameAt(c,clipTime(c,state.time))+1).padStart(2,'0')} / ${c.frames.length}`).join('　·　')||'—';
  $('phase-label').textContent=visible.map(c=>{const phase=c.frames[frameAt(c,clipTime(c,state.time))].phase;if(c.form==='human'&&c.id==='secondary'&&phase==='impact')return '穿刺命中';return (c.form==='human'&&humanPhases[phase])||phaseNames[phase]||phase;}).join(' / ')||'等待素材';
  const length=sceneDuration(),displayTime=state.loop&&visible.every(c=>c.loop)?state.time%length:Math.min(state.time,length);$('timeline').value=displayTime/length*1000;$('time-label').textContent=`${(displayTime/1000).toFixed(2)} / ${(length/1000).toFixed(2)}s`;
  $('motion-note').textContent=state.view==='fx'?'独立特效按原始成形、释放、消散顺序审看；技能叠加中的水弹飞行只循环稳定的中间两帧。':state.action.startsWith('transform-')?'双向变形分别使用真实原画；空中姿势以虚拟地面根节点登记，保留收腿与落体姿态。':state.action==='hurt'?'这里只展示受击原画；未来幸存者实装仍沿用短暂受击停顿，不中断玩家当前攻击、技能和跳跃。':'选择动作才加载对应图表。J ①／②／③分别审看，循环播放仅用于美术检查；游戏仍由玩家手动攻击。';
  if(state.guides)$('motion-note').textContent+=' 青线是当前剑刃／龙牙轴线，橙色虚线是上一帧轴线及尖端轨迹，浅绿点是特效纹理的对应点。';
}
function playButton(){ $('play-toggle').textContent=state.playing?'Ⅱ':'▶';$('play-toggle').setAttribute('aria-label',state.playing?'暂停播放':'继续播放'); }
function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);invalidate();render();}
function tick(timestamp){
  if(state.playing&&lastTimestamp&&readyClips().length){state.time+=Math.min(100,timestamp-lastTimestamp)*state.speed;const end=sceneDuration(),allLoops=readyClips().every(c=>c.loop);if(state.time>=end+(allLoops?0:400)&&!(allLoops&&state.loop)){if(state.loop)state.time=0;else{state.time=end-.001;state.playing=false;playButton();}}}
  lastTimestamp=timestamp;render();requestAnimationFrame(tick);
}
function toggle(){if(!readyClips().length)return;state.playing=!state.playing;playButton();}
function step(direction){const clip=readyClips()[0];if(!clip)return;state.playing=false;const index=(frameAt(clip,clipTime(clip,state.time))+direction+clip.frames.length)%clip.frames.length;state.time=startAt(clip,index);playButton();render();}
async function refresh(){loadJobs.clear();await catalogue();await loadSelection();}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>chooseView(button.dataset.view)));
$('clip-select').addEventListener('change',async event=>{state.action=event.target.value;syncURL();await loadSelection();});
$('refresh-assets').addEventListener('click',refresh);$('play-toggle').addEventListener('click',toggle);$('step-back').addEventListener('click',()=>step(-1));$('step-forward').addEventListener('click',()=>step(1));
$('timeline').addEventListener('input',event=>{state.playing=false;state.time=Math.min(sceneDuration()-.001,Number(event.target.value)/1000*sceneDuration());playButton();render();});
for(const key of ['speed','facing'])$(key).addEventListener('change',event=>{state[key]=Number(event.target.value);invalidate();render();});
$('size').addEventListener('change',event=>{state.size=event.target.value;invalidate();render();});
for(const key of ['compare','effects'])$(key).addEventListener('change',async event=>{state[key]=event.target.checked;await loadSelection(false);});
for(const key of ['guides','loop'])$(key).addEventListener('change',event=>{state[key]=event.target.checked;render();});
$('comparison').addEventListener('change',event=>{state.comparison=event.target.value;invalidate();render();});
$('freeze-frame').addEventListener('click',()=>{const clip=readyClips()[0];if(!clip)return;state.frozen=state.frozen?.key===clip.key?null:{key:clip.key,time:clipTime(clip,state.time)};$('freeze-frame').textContent=state.frozen?'取消冻结对照':'冻结当前帧作对照';invalidate();render();});
$('restart').addEventListener('click',()=>{state.time=0;state.playing=true;lastTimestamp=0;playButton();render();});
addEventListener('keydown',event=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??''))return;if(event.code==='Space'&&document.activeElement?.tagName!=='BUTTON'){event.preventDefault();toggle();}else if(['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();step(event.code==='ArrowRight'?1:-1);}});
addEventListener('visibilitychange',()=>{lastTimestamp=0;});
const gameUrl=new URL('/',location.href);if(location.port==='3101')gameUrl.port='3000';$('return-game').href=gameUrl.href;
// Read-only inspection data makes frame, loading and clipping checks reproducible in the browser.
window.corrinPreview={snapshot:()=>({state:{...state},revision:activeManifest?.revision||'full-motion-v1',requiredClips:activeManifest?.requiredClips,clips:[...clips.values()].map(c=>({key:c.key,status:c.status,frames:c.frames.length,error:c.error})),loadedImages:[...pictures.keys()],catalogueErrors:[...catalogueErrors],layout:layout(),duration:sceneDuration(),weapon:readyClips().filter(c=>c.weaponEffect).map(c=>({key:c.key,index:frameAt(c,clipTime(c,state.time)),geometry:weaponGeometry(c,frameAt(c,clipTime(c,state.time))),effects:weaponEffectsAt(c,state.time).map(s=>({matrix:s.matrix,opacity:s.opacity,debug:s.weaponDebug,anchors:s.frame.anchors}))}))})};
new ResizeObserver(resize).observe(canvas);playButton();requestAnimationFrame(tick);
await catalogue();await chooseView(state.view);
