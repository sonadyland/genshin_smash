import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as previewModel from '../public/previews/tharja-v2/preview-model.js';
import { createClipLoader } from '../public/previews/tharja-v2/preview-loading.js';
import { castPoint, effectTiming, frameAt, nextFrameTime, registration, timingOf, validateClip } from '../public/previews/tharja-v2/preview-model.js';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'public/previews/tharja-v2');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const partial=process.argv.includes('--partial');
const clips=manifest.clips.filter(info=>fs.existsSync(path.join(dir,info.src))).map(info=>({info,clip:JSON.parse(fs.readFileSync(path.join(dir,info.src),'utf8'))}));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const size=file=>{const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes[25],6);return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};};
console.log(`Verifying ${clips.length}/9 available clips, ${clips.reduce((n,{clip})=>n+clip.frames.length,0)}/84 frames${partial?' (partial run)':''}`);
test('approved stance v3 is copied byte for byte',()=>assert.equal(sha(path.join(dir,'assets/master.png')),'a749eb9ae59ebdbfdfed4bf728f4fc574f9d69ef39446d415844dd756d679777'));
test('all nine review actions and all 84 authored frames are present',{skip:partial},()=>{assert.equal(clips.length,9);assert.equal(clips.reduce((n,{clip})=>n+clip.frames.length,0),84);});
test('real image crops, source scale and palm metadata validate',()=>{for(const{info,clip}of clips){assert.equal(clip.frames.length,info.frames);assert.equal(clip.id,info.id);assert.ok(validateClip(clip,clip.sheets.map(sheet=>size(path.join(dir,sheet.src)))));assert.ok(new Set(clip.frames.map(f=>f.phase)).size<=4);}});
test('same-sheet anatomical scale never changes across poses, airborne roots stay authored',()=>{for(const{clip}of clips)for(const height of[112,224,350])for(const frame of clip.frames){const r=registration(frame,clip,height),offset=frame.rootOffset??[0,0];assert.equal(r.scale,height/clip.sheets[frame.sheet].standingBodyHeight);assert.ok(Math.abs(r.x+frame.pivot[0]*r.scale-offset[0]*r.scale)<1e-10);assert.ok(Math.abs(r.y+frame.pivot[1]*r.scale-offset[1]*r.scale)<1e-10);}});
test('every frame boundary, paused last frame and frame-step wrap are stable',()=>{for(const{clip}of clips){const{starts,duration}=timingOf(clip);assert.equal(frameAt(duration,clip),clip.frames.length-1);for(let i=0;i<clip.frames.length;i++){assert.equal(frameAt(starts[i],clip),i);assert.equal(frameAt(starts[i+1]-.001,clip),i);}assert.equal(nextFrameTime(0,-1,clip),starts.at(-2));assert.equal(nextFrameTime(starts.at(-2),1,clip),0);}});
test('all spell releases start on their frame and reflect their actual palm',()=>{for(const{clip}of clips){if(!clip.effect)continue;const start=timingOf(clip).starts[clip.releaseFrame];assert.equal(effectTiming(clip,start-.01).started,false);assert.equal(effectTiming(clip,start).started,true);for(const height of[112,224,350]){const a=castPoint(clip,clip.releaseFrame,height,1),b=castPoint(clip,clip.releaseFrame,height,-1);assert.ok(a&&b);assert.equal(a.x,-b.x);assert.equal(a.y,b.y);assert.ok(a.y<0);}if(clip.returnFrame!==undefined){const at=timingOf(clip).starts[clip.returnFrame];assert.equal(effectTiming(clip,at-.01).returning,false);assert.equal(effectTiming(clip,at).returning,true);}}});
test('damaged contracts reject missing palms, image bounds and per-pose normalization',()=>{const source=clips.find(({clip})=>clip.effect).clip,bad=structuredClone(source);delete bad.frames[bad.releaseFrame].castOrigin;assert.throws(()=>validateClip(bad),/掌心/);const frameScale=structuredClone(source);frameScale.frames[0].scale=1.1;assert.throws(()=>validateClip(frameScale),/单帧/);const outside=structuredClone(source);outside.frames[0].rect[0]=9999;assert.throws(()=>validateClip(outside,outside.sheets.map(()=>({width:1254,height:1254}))),/越界/);});

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function loaderFixture(){
  const cache=new Map(),events=[],requests=[],clip=structuredClone(clips.find(({clip})=>clip.id==='idle').clip);
  const loader=createClipLoader({clips:cache,sourceFor:()=> 'idle.json',loadJson:async()=>clip,validate:validateClip,onStatus:(...event)=>events.push(event),loadImage:()=>{const request=deferred();requests.push(request);return request.promise;}});
  return{loader,cache,events,requests,clip};
}
const imageSize={naturalWidth:1254,naturalHeight:1254};
test('failed image batch retains its error when another image succeeds late',async()=>{
  const f=loaderFixture(),work=f.loader.ensure('idle');await flush();
  const rejection=assert.rejects(work,/offline/);f.requests[0].reject(new Error('offline'));await rejection;
  const snapshot=structuredClone(f.events);assert.equal(snapshot.at(-1)[1],'error');assert.equal(f.cache.has('idle'),false);
  f.requests[1].resolve(imageSize);await flush();assert.deepEqual(f.events,snapshot);assert.equal(f.cache.has('idle'),false);
});
test('retry progress and pending ownership survive the old batch finishing late',async()=>{
  const f=loaderFixture(),first=f.loader.ensure('idle');await flush();
  const rejection=assert.rejects(first,/offline/);f.requests[0].reject(new Error('offline'));await rejection;
  const retry=f.loader.ensure('idle');await flush();assert.equal(f.loader.ensure('idle'),retry);
  f.requests[2].resolve(imageSize);await flush();const snapshot=structuredClone(f.events);assert.equal(snapshot.at(-1)[2],1);
  f.requests[1].resolve(imageSize);await flush();assert.deepEqual(f.events,snapshot);assert.equal(f.loader.ensure('idle'),retry);
  f.requests[3].resolve(imageSize);assert.equal(await retry,f.clip);assert.equal(f.events.at(-1)[1],'ready');assert.equal(f.cache.get('idle'),f.clip);
});

// Run the actual browser entry point with controlled DOM/network/image completion.
// This checks event wiring and retry visibility, not a second implementation of it.
function bootPreview(){
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.handlers={};this.disabled=false;this.hidden=false;this.classList={toggle(){}};this._text='';}
    set textContent(value){this._text=value;this.children=[];}get textContent(){return this._text;}
    append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
    setAttribute(){}addEventListener(type,callback){this.handlers[type]=callback;}
    querySelector(tag){return this.children.find(child=>child.tagName===tag.toUpperCase());}
  }
  const elements=new Map(),listeners={},requests=[],pictures=[];let reloads=0;
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const context2d=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  get('stage').getContext=()=>context2d;
  const document={activeElement:null,getElementById:get,createElement:tag=>new Element(tag),querySelectorAll:()=>get('clip-tabs').children,querySelector:selector=>get('clip-tabs').children.find(button=>button.dataset.clip===selector.match(/"([^"]+)"/)[1])};
  const location={href:'http://127.0.0.1:3101/previews/tharja-v2/index.html',search:'',port:'3101',reload:()=>{reloads++;}};
  class Picture{constructor(){this.naturalWidth=1254;this.naturalHeight=1254;pictures.push(this);}removeAttribute(){}set src(value){this.url=value;}}
  const context=vm.createContext({...previewModel,createClipLoader,document,location,history:{replaceState(){}},URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Image:Picture,matchMedia:()=>({matches:false}),requestAnimationFrame(){},addEventListener:(type,callback)=>{listeners[type]=callback;},fetch:async url=>{requests.push(url);return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(dir,url),'utf8'))};}});
  vm.runInContext(fs.readFileSync(path.join(dir,'preview.js'),'utf8').replace(/^import .+;\r?$/gm,''),context);
  return{context,get,listeners,requests,pictures,reloads:()=>reloads};
}
test('portrait failure keeps tabs gated, preserves its error and provides working reload',async()=>{
  const p=bootPreview();await flush();const tabs=p.get('clip-tabs').children;assert.equal(tabs.length,9);assert.ok(tabs.every(tab=>tab.disabled));
  tabs[4].handlers.click();p.listeners.keydown({code:'KeyK'});await flush();assert.deepEqual(p.requests,['./manifest.json']);
  p.pictures[0].onerror();await flush();const error=p.get('asset-status').textContent;assert.match(error,/预览配置无法加载/);assert.equal(p.get('asset-status').hidden,false);
  tabs[4].handlers.click();p.listeners.keydown({code:'KeyL'});await flush();assert.equal(p.get('asset-status').textContent,error);assert.equal(p.get('asset-status').hidden,false);assert.ok(tabs.every(tab=>tab.disabled));assert.equal(vm.runInContext('state.clip',p.context),'idle');assert.equal(p.get('play-toggle').disabled,true);
  const retry=p.get('asset-status').children[0];assert.equal(retry.textContent,'重新加载预览');retry.handlers.click();assert.equal(p.reloads(),1);
});
test('successful portrait initialization unlocks tabs and the selected action',async()=>{
  const p=bootPreview();await flush();p.pictures[0].onload();await flush();assert.ok(p.get('clip-tabs').children.every(tab=>!tab.disabled));assert.equal(p.requests.length,2);
  for(const picture of p.pictures.slice(1))picture.onload();await flush();assert.equal(p.get('asset-status').hidden,true);assert.equal(p.get('play-toggle').disabled,false);assert.equal(vm.runInContext('ready()',p.context),true);
});
