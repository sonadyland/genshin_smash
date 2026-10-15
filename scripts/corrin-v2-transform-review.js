async (page) => {
  await page.setViewportSize({width:1400,height:1120});
  await page.locator('[data-view="human"]').click();
  await page.locator('#compare').check();
  await page.locator('#comparison').selectOption('side');
  await page.locator('#guides').uncheck();
  await page.locator('#speed').selectOption('0.25');
  await page.locator('#facing').selectOption('1');
  await page.locator('#size').selectOption('review');
  const results=[];
  for(const action of ['transform-to-dragon-ground','transform-to-human-ground','transform-to-dragon-air','transform-to-human-air']){
    await page.locator('#clip-select').selectOption(action);
    await page.locator('#asset-status').waitFor({state:'hidden'});
    await page.locator('#timeline').fill('0');
    const info=await page.evaluate(()=>{const s=corrinPreview.snapshot(),c=s.layout.entries.find(e=>!e.reference).clip;return {frames:c.frames,duration:s.duration,sheets:c.sheets};});
    const frames=[];
    for(let index=0;index<info.frames.length;index++){
      const time=info.frames.slice(0,index).reduce((sum,f)=>sum+f.duration,0)+info.frames[index].duration*.4;
      await page.locator('#timeline').fill(String(Math.round(time/info.duration*1000)));
      await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-${action}-f${index+1}.png`});
      frames.push(await page.evaluate(()=>{const s=corrinPreview.snapshot(),e=s.layout.entries.find(e=>!e.reference),c=e.clip,f=c.frames.find((f,i)=>c.frames.slice(0,i+1).reduce((t,x)=>t+x.duration,0)>s.state.time);return {frame:document.querySelector('#frame-label').textContent,source:c.sheets[f.sheet].src,bodyHeight:c.sheets[f.sheet].bodyHeight,pivot:f.pivot,anchors:f.anchors};}));
    }
    results.push({action,frames});
  }
  await page.evaluate(value=>{window.corrinTransformReview=value;},results);
  console.log(JSON.stringify(results));
}
