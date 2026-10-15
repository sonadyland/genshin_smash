async (page) => {
  await page.setViewportSize({width:1400,height:1120});
  await page.locator('[data-view="human"]').click();
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#effects').uncheck();
  await page.locator('#compare').check();
  await page.locator('#comparison').selectOption('side');
  await page.locator('#speed').selectOption('0.25');
  const results=[];
  for(const action of ['idle','run','jump','dodge','hurt','defeat']){
    await page.locator('#clip-select').selectOption(action);
    await page.locator('#asset-status').waitFor({state:'hidden'});
    await page.locator('#timeline').fill('0');
    const count=await page.evaluate(()=>corrinPreview.snapshot().layout.entries.find(e=>!e.reference).clip.frames.length);
    const frames=[];
    for(let index=0;index<count;index++){
      const metadata=await page.evaluate(()=>{
        const snap=corrinPreview.snapshot(),entry=snap.layout.entries.find(e=>!e.reference),clip=entry.clip;
        let time=0,index=0;for(let i=0;i<clip.frames.length;i++){time+=clip.frames[i].duration;if(snap.state.time<time){index=i;break;}}
        const f=clip.frames[index],sheet=clip.sheets[f.sheet],a=f.anchors;
        return {index,phase:f.phase,sheet:sheet.src,bodyHeight:sheet.bodyHeight,headToBody:(a.chin[1]-a.headTop[1])/sheet.bodyHeight,headWorldY:(a.headTop[1]-f.pivot[1])*clip.gameHeight/sheet.bodyHeight,hipWorldY:(a.hip[1]-f.pivot[1])*clip.gameHeight/sheet.bodyHeight,worldScale:clip.gameHeight/sheet.bodyHeight,displayScale:snap.layout.multiplier,frameLabel:document.querySelector('#frame-label').textContent};
      });
      frames.push(metadata);
      if(action==='run'||action==='dodge'||index===0||action==='jump')await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-motion-${action}-f${index+1}.png`});
      await page.locator('#step-forward').click();
    }
    results.push({action,frames});
  }
  await page.evaluate(data=>{window.corrinMotionReview=data;},results);
  await page.locator('#clip-select').selectOption('run');
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#timeline').fill('0');
  console.log(JSON.stringify({results,catalogueErrors:await page.evaluate(()=>corrinPreview.snapshot().catalogueErrors)},null,2));
}
