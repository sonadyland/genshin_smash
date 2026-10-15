import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'..'),directory=path.join(root,'public/assets/animations/tharja-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
const authored=Object.fromEntries(Object.keys(manifest.clips).map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,`public/previews/tharja-v2/${kind}.json`),'utf8'))]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function dimensions(bytes){
  if(bytes.toString('ascii',1,4)==='PNG')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  for(let offset=12;offset+8<=bytes.length;){const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),data=offset+8;
    if(type==='VP8X')return[1+bytes.readUIntLE(data+4,3),1+bytes.readUIntLE(data+7,3)];
    if(type==='VP8 ')return[bytes.readUInt16LE(data+6)&0x3fff,bytes.readUInt16LE(data+8)&0x3fff];
    if(type==='VP8L'){const bits=bytes.readUInt32LE(data+1);return[1+(bits&0x3fff),1+((bits>>>14)&0x3fff)];}offset=data+size+size%2;}
  throw Error('missing WebP dimensions');
}
function harness(){
  const modules=new Map(),draws=[],decodes=[];
  const draw=new Proxy({globalAlpha:1},{get(target,key){if(key in target)return target[key];if(key==='getImageData')return()=>({data:new Uint8ClampedArray(0)});if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(){}});return(...args)=>draws.push({kind:key,args});},set(target,key,value){target[key]=value;return true;}});
  class Image{async decode(){decodes.push(this.src);[this.naturalWidth,this.naturalHeight]=dimensions(fs.readFileSync(path.join(root,'public',this.src)));}}
  const context=vm.createContext({console,Image,fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'public',url),'utf8'))}),document:{createElement:()=>({width:0,height:0,getContext:()=>draw})}});
  function load(file){
    if(file.endsWith('.json'))return{default:JSON.parse(fs.readFileSync(file,'utf8'))};
    if(modules.has(file))return modules.get(file).exports;
    const source=fs.readFileSync(file,'utf8').replaceAll('import.meta.env.BASE_URL',"'/'").replaceAll('import.meta.env.VITE_GAME_ASSET_BASE_URL',"''"),module={exports:{}};modules.set(file,module);
    const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    vm.runInContext(`(function(exports,require,module){${output}\n})`,context)(module.exports,name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:`${name}.ts`)),module);return module.exports;
  }
  return{load,art:load(path.join(root,'src/game/art.ts')),model:load(path.join(root,'src/game/clip-animation.ts')),data:load(path.join(root,'src/game/data.ts')),draw,draws,decodes};
}
const h=harness(),character=h.data.CHARACTERS.find(character=>character.id==='tharja');
const base=()=>({state:'free',attack:null,onGround:true,vx:0,vy:0,dodgeTimer:0,time:0,motion:h.model.newMotionState()});

test('all 84 approved drawings retain their exact crops and one anatomical scale per sheet',()=>{
  assert.ok(h.model.validClipManifest(manifest));assert.equal(Object.values(manifest.clips).reduce((sum,clip)=>sum+clip.frames.length,0),84);
  for(const[kind,clip]of Object.entries(manifest.clips))for(const[index,frame]of clip.frames.entries()){
    const source=authored[kind].frames[index],sheet=authored[kind].sheets[source.sheet];
    assert.deepEqual(Object.values(frame.sourceRect),source.rect);assert.deepEqual(dimensions(fs.readFileSync(path.join(directory,frame.image??clip.image))),[1254,1254]);
    assert.ok(Math.abs(112/clip.standingBodyHeightPixels*frame.sourceScale-112/sheet.standingBodyHeight)<1e-12);
    assert.equal(clip.trail,'none');assert.equal(frame.rootOffset,undefined);
    if(source.castOrigin)assert.deepEqual(Object.values(frame.castOrigin),source.castOrigin);
    if(kind!=='jump')assert.ok(Math.abs(frame.footAnchor.y*frame.sourceRect.height-source.pivot[1])<1e-9);
  }
});
test('production compression and source artwork match the reproducible registration report',()=>{
  const report=JSON.parse(fs.readFileSync(path.join(root,'docs/tharja-art-registration.json'),'utf8'));assert.equal(report.frames,84);assert.equal(report.images.length,22);
  for(const image of report.images){assert.equal(sha(fs.readFileSync(path.join(root,image.source))),image.sourceSha256);assert.equal(sha(fs.readFileSync(path.join(root,image.target))),image.targetSha256);assert.equal(image.alphaLossless,true);}
  assert.ok(report.productionBytes<5*1024*1024);assert.ok(report.productionBytes<report.sourceBytes*.25);
  assert.equal(report.images.at(-1).source,'public/previews/tharja-v2/portrait.png');assert.ok(report.images.at(-1).height<=960);
});
test('existing seven active packs and lobby images keep their exact tracked content hashes',()=>{
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/tharja-existing-art-baseline.json'),'utf8'));assert.equal(baseline.files.length,142);
  for(const item of baseline.files){const raw=fs.readFileSync(path.join(root,item.path));const data=item.path.endsWith('.json')?Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n')):raw;const blob=createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');assert.equal(blob,item.gitBlobSha1,item.path);}
  console.log(`Verified ${baseline.files.length} existing artwork files against recorded Git object hashes.`);
});
test('release, return and settle stay on authored time for every live attack speed',()=>{
  for(const kind of ['jab','smash','special','secondary'])for(const level of [-1,0,1,2,3]){
    const clip=manifest.clips[kind],source=authored[kind],speed=1+Math.max(0,level)*.035;
    const def={...character[kind],startup:level<0?character[kind].startup:Math.max(3,Math.round(character[kind].startup/speed)),endlag:level<0?character[kind].endlag:Math.round(character[kind].endlag*.7/speed)};
    const sample=t=>h.model.selectClipFrame(manifest,{...base(),state:'attack',attack:{def,t}});
    assert.equal(sample(def.startup).frame,source.releaseFrame);assert.ok(sample(def.startup-.0001).frame<source.releaseFrame);
    const starts=source.frames.map((_,i)=>source.frames.slice(0,i).reduce((sum,frame)=>sum+frame.durationMs,0)),total=source.frames.reduce((sum,frame)=>sum+frame.durationMs,0),release=starts[source.releaseFrame];
    for(const key of ['returnFrame','effectEndFrame'])if(source[key]!==undefined){const index=source[key],at=def.startup+(starts[index]-release)/(total-release)*(def.active+def.endlag);assert.equal(sample(at+1e-7).frame,index);assert.equal(sample(at-1e-7).frame,index-1);}
    const visited=new Set();for(let t=0;t<def.startup+def.active+def.endlag;t++)visited.add(sample(t).frame);assert.equal(visited.size,clip.frames.length,`${kind}/speed${level}`);
    assert.equal(sample(def.startup+def.active+def.endlag-1e-7).frame,clip.frames.length-1);
  }
  const def=character.special;assert.equal(h.model.selectClipFrame(manifest,{...base(),state:'attack',attack:{def,t:def.startup+16}}).frame,6,'normal L life-return occurs in the authored pull gesture');
});
test('jump follows physical stages and hurt progresses without altering survival attacks',()=>{
  const sample={...base(),onGround:false,vy:-8};sample.motion.airAge=0;assert.equal(manifest.clips.jump.frames[h.model.selectClipFrame(manifest,sample).frame].name,'takeoff');sample.motion.airAge=10;assert.equal(manifest.clips.jump.frames[h.model.selectClipFrame(manifest,sample).frame].name,'rise');sample.vy=0;assert.equal(manifest.clips.jump.frames[h.model.selectClipFrame(manifest,sample).frame].name,'apex');sample.vy=8;assert.equal(manifest.clips.jump.frames[h.model.selectClipFrame(manifest,sample).frame].name,'fall');
  const hurt=new Set();for(let age=0;age<32;age++)hurt.add(h.model.selectClipFrame(manifest,{...base(),state:'hitstun',hitstunAge:age,hitstunDuration:32}).frame);assert.equal(hurt.size,4);
  assert.equal(h.model.selectClipFrame(manifest,{...base(),state:'attack',attack:{def:character.jab,t:character.jab.startup},hitstunAge:3}).clip,'jab');
  assert.ok(manifest.clips.jump.frames[3].footAnchor.y*627<authored.jump.frames[3].pivot[1],'preview-only whole-body rise is removed from the physics root');
});
test('strict lease decodes all atlases once and origins match the exact mirrored rendered palms',async()=>{
  const lease=h.art.acquireGameArt(['tharja'],{strict:true});await lease.ready;assert.equal(h.art.getCharacterAnimationStatus('tharja').frames,84);
  for(const kind of ['jab','smash','special','secondary'])for(const facing of [-1,1])for(const height of [112,224]){
    const clip=manifest.clips[kind],frame=clip.frames[clip.releaseFrame],scale=height/clip.standingBodyHeightPixels*frame.sourceScale,expected={x:420+(frame.castOrigin.x-frame.sourceRect.width*frame.footAnchor.x)*scale*facing,y:530+(frame.castOrigin.y-frame.sourceRect.height*frame.footAnchor.y)*scale};
    const animation={...base(),state:'attack',attack:{def:character[kind],t:character[kind].startup}};
    assert.deepEqual(JSON.parse(JSON.stringify(h.art.getTharjaCastOrigin(420,530,height,kind,facing))),expected);
    assert.deepEqual(JSON.parse(JSON.stringify(h.art.getCharacterCastOrigin('tharja',420,530,height,animation,facing))),expected);
    h.draws.length=0;assert.ok(h.art.drawFighterArt(h.draw,'tharja',420,530,height,animation,{facing}));const rendered=h.draws.find(call=>call.kind==='drawImage');assert.equal(rendered.args[0].src,`/assets/animations/tharja-v1/${frame.image??clip.image}`);
  }
  for(const[kind,clip]of Object.entries(manifest.clips))for(let index=0;index<clip.frames.length;index++)for(const facing of[-1,1]){
    const frame=clip.frames[index],total=clip.frames.reduce((sum,f)=>sum+f.duration,0),start=clip.frames.slice(0,index).reduce((sum,f)=>sum+f.duration,0);let animation=base();
    if(clip.releaseFrame!==undefined){const release=clip.frames.slice(0,clip.releaseFrame).reduce((sum,f)=>sum+f.duration,0),time=start+frame.duration*.5,def=character[kind];animation={...animation,state:'attack',attack:{def,t:index<clip.releaseFrame?time/release*def.startup:def.startup+(time-release)/(total-release)*(def.active+def.endlag)}};}
    else if(kind==='hurt')Object.assign(animation,{state:'hitstun',hitstunAge:(start+frame.duration*.5)/total*32,hitstunDuration:32});
    else if(kind==='idle')animation.time=start+frame.duration*.5,animation.motion=undefined;
    else if(kind==='run')animation.motion.moving=true,animation.motion.distance=(start+frame.duration*.5)/total*96;
    else if(kind==='dodge')animation.dodgeTimer=(1-(start+frame.duration*.5)/total)*16,animation.dodgeDuration=16;
    else{const peers=clip.frames.filter(f=>f.name===frame.name),before=peers.slice(0,peers.indexOf(frame)).reduce((sum,f)=>sum+f.duration,0),p=(before+frame.duration*.5)/peers.reduce((sum,f)=>sum+f.duration,0);animation.onGround=frame.name==='land';animation.vy=frame.name==='fall'?p*12:frame.name==='apex'?0:-8;Object.assign(animation.motion,{airAge:frame.name==='takeoff'?p*3:frame.name==='rise'?p*18:10,landAge:frame.name==='land'?p*8:-1});}
    assert.equal(h.model.selectClipFrame(manifest,animation).frame,index,`${kind}:${index}`);h.draws.length=0;h.art.drawFighterArt(h.draw,'tharja',0,112,112,animation,{facing});const rendered=h.draws.find(call=>call.kind==='drawImage');assert.deepEqual(rendered.args.slice(1,5),[frame.sourceRect.x+1,frame.sourceRect.y+1,frame.sourceRect.width-2,frame.sourceRect.height-2]);if(kind==='hurt')assert.equal(h.draws.some(call=>call.kind==='rotate'||call.kind==='scale'&&call.args[1]!==1),false,'authored reaction is not distorted again');
  }
  const atlasDecodes=h.decodes.filter(url=>url.includes('/tharja-v1/'));assert.equal(atlasDecodes.length,21);assert.equal(new Set(atlasDecodes).size,21);lease.release();assert.equal(h.art.getTharjaCastOrigin(0,0,112,'jab'),undefined);
});
test('malformed optional hurt, palm or release indices reject the pack',()=>{
  for(const mutate of [m=>{m.clips.hurt.frames[0].sourceRect.x=9999;},m=>{m.clips.jab.frames[5].castOrigin.x=9999;},m=>{m.clips.special.returnFrame=0;},m=>{m.clips.jab.releaseFrame=-1;},m=>{delete m.clips.jab.frames[5].castOrigin;}]){const bad=structuredClone(manifest);mutate(bad);assert.equal(h.model.validClipManifest(bad),false);}
});
