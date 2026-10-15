async (page) => {
  await page.setViewportSize({width:1400,height:1120});
  await page.locator('[data-view="human"]').click();
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#effects').check();
  await page.locator('#compare').check();
  await page.locator('#comparison').selectOption('side');
  await page.locator('#speed').selectOption('0.25');
  const results=[];
  for(const action of ['jab1','jab2','jab3','smash','secondary']){
    await page.locator('#clip-select').selectOption(action);
    await page.locator('#asset-status').waitFor({state:'hidden'});
    await page.locator('#timeline').fill('0');
    const info=await page.evaluate(()=>{const s=corrinPreview.snapshot(),c=s.layout.entries.find(e=>!e.reference).clip;return {frames:c.frames,duration:s.duration,binding:c.weaponEffect};});
    const samples=[];
    for(let index=0;index<info.frames.length;index++){
      const time=info.frames.slice(0,index).reduce((sum,f)=>sum+f.duration,0)+info.frames[index].duration*.55;
      await page.locator('#timeline').fill(String(Math.round(time/info.duration*1000)));
      const sample=await page.evaluate(()=>corrinPreview.snapshot().weapon[0]);samples.push(sample);
      const shouldEmit=info.binding.active.some(item=>item.frame===index);
      if(Boolean(sample.effects.length)!==shouldEmit)throw Error(`${action} frame ${index+1}: unexpected emission state`);
      if(shouldEmit||index===info.binding.active[0].frame-1||index===info.binding.active.at(-1).frame+1){
        await page.locator('#guides').check();
        await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-${action}-f${index+1}-debug.png`});
        await page.locator('#guides').uncheck();
        await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-${action}-f${index+1}-clean.png`});
        if(shouldEmit){await page.locator('#facing').selectOption('-1');await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-weapon-${action}-f${index+1}-left.png`});await page.locator('#facing').selectOption('1');}
      }
    }
    results.push({action,samples});
  }
  await page.evaluate(value=>{window.corrinWeaponReview=value;},results);
  console.log(JSON.stringify(results));
}
