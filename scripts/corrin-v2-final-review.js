async (page) => {
  await page.setViewportSize({width:1400,height:1120});
  const requested=[];
  const onRequest=request=>{if(new URL(request.url()).pathname.endsWith('.png'))requested.push(request.url());};
  page.on('request',onRequest);
  await page.goto('http://127.0.0.1:3101/previews/corrin-v1/index.html?revision=master-proportions-v2');
  await page.locator('#asset-status').waitFor({state:'hidden'});
  const initial=await page.evaluate(()=>{const s=corrinPreview.snapshot();return {revision:s.revision,clips:s.clips,required:s.requiredClips,loaded:s.loadedImages,errors:s.catalogueErrors,badge:document.querySelector('#study-badge').textContent};});
  page.off('request',onRequest);
  if(initial.revision!=='master-proportions-v2'||initial.badge.includes('局部')||initial.errors.length||initial.clips.some(c=>c.key==='fx:fx-yato-slash'))throw Error('Default catalogue did not switch fully to v2');
  if(initial.required.some(key=>!initial.clips.some(c=>c.key===key)))throw Error('Missing required final clip');
  if(initial.loaded.length!==3||initial.loaded.some(src=>!/human-v2-idle|dragon-idle-[ab]/.test(src)))throw Error('Initial scene eagerly loaded non-idle artwork');
  await page.locator('[data-view="human"]').click();
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#timeline').fill('0');
  await page.locator('#compare').check();
  await page.locator('#comparison').selectOption('side');
  await page.locator('#guides').uncheck();
  await page.locator('.motion-panel').screenshot({path:'output/playwright/corrin-v2-final-idle-master.png'});
  await page.screenshot({path:'output/playwright/corrin-v2-final-fullpage.png',fullPage:true});
  for(const [action,indices] of [['jab1',[3,4]],['smash',[5]],['run',[0,2,4,6]],['transform-to-human-ground',[11]],['transform-to-human-air',[2,3,7]]]){
    await page.locator('#clip-select').selectOption(action);
    await page.locator('#asset-status').waitFor({state:'hidden'});
    await page.locator('#timeline').fill('0');
    const info=await page.evaluate(()=>{const s=corrinPreview.snapshot();return {frames:s.layout.entries.find(e=>!e.reference).clip.frames,duration:s.duration};});
    for(const index of indices){
      const time=info.frames.slice(0,index).reduce((sum,f)=>sum+f.duration,0)+info.frames[index].duration*.55;
      await page.locator('#timeline').fill(String(Math.round(time/info.duration*1000)));
      await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-final-${action}-f${index+1}.png`});
    }
  }
  await page.evaluate(value=>{window.corrinFinalReview=value;},{initial,requested,groups:initial.clips.length,frames:initial.clips.reduce((sum,c)=>sum+c.frames,0)});
  console.log(JSON.stringify({groups:initial.clips.length,frames:initial.clips.reduce((sum,c)=>sum+c.frames,0),initialImages:initial.loaded,requested}));
}
