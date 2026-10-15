async (page) => {
  await page.locator('[data-view="human"]').click();
  await page.locator('#clip-select').selectOption('secondary');
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#effects').check();
  await page.locator('#timeline').fill('0');
  const info=await page.evaluate(()=>{const s=corrinPreview.snapshot();return {frames:s.layout.entries.find(e=>!e.reference).clip.frames,duration:s.duration};});
  const checks=[];
  for(let index=0;index<info.frames.length;index++){
    const time=info.frames.slice(0,index).reduce((sum,f)=>sum+f.duration,0)+info.frames[index].duration*.55;
    await page.locator('#timeline').fill(String(Math.round(time/info.duration*1000)));
    const geometry=await page.evaluate(()=>corrinPreview.snapshot().weapon[0]);
    if(Boolean(geometry.effects.length)!==[5,6].includes(index))throw Error('I effect outside release phase');
    checks.push(geometry);
    if([0,4,5,6,7,11].includes(index)){
      await page.locator('#guides').check();await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-secondary-f${index+1}-debug.png`});
      await page.locator('#guides').uncheck();await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-secondary-f${index+1}-clean.png`});
      if([5,6].includes(index)){await page.locator('#facing').selectOption('-1');await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-secondary-f${index+1}-left.png`});await page.locator('#facing').selectOption('1');}
    }
  }
  await page.evaluate(value=>{window.corrinFangReview=value;},checks);
}
