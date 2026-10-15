async (page) => {
  await page.setViewportSize({width:1400,height:1120});
  await page.locator('[data-view="human"]').click();
  await page.locator('#clip-select').selectOption('run');
  await page.locator('#asset-status').waitFor({state:'hidden'});
  await page.locator('#timeline').fill('0');
  await page.locator('#compare').check();
  await page.locator('#comparison').selectOption('side');
  await page.locator('#freeze-frame').click();
  await page.locator('#step-forward').click();
  const frozen=await page.evaluate(()=>{const s=corrinPreview.snapshot();return {time:s.state.time,frozen:s.state.frozen,entries:s.layout.entries.map(e=>({reference:!!e.reference,frozen:!!e.frozen,time:e.time}))};});
  if(frozen.time===0||frozen.frozen.time!==0||frozen.entries.filter(e=>e.frozen).length!==1)throw Error('Frozen frame did not remain at the selected phase');
  await page.locator('.motion-panel').screenshot({path:'output/playwright/corrin-v2-controls-frozen.png'});
  await page.locator('#freeze-frame').click();
  await page.locator('#comparison').selectOption('overlay');
  const overlay=await page.evaluate(()=>corrinPreview.snapshot().layout.entries.map(e=>({reference:!!e.reference,overlay:!!e.overlay})));
  if(overlay.length!==1||!overlay[0].overlay)throw Error('Master overlay did not use the current character origin');
  await page.locator('.motion-panel').screenshot({path:'output/playwright/corrin-v2-controls-overlay.png'});
  await page.locator('#comparison').selectOption('side');
  await page.locator('#facing').selectOption('-1');
  await page.locator('#size').selectOption('game');
  await page.setViewportSize({width:390,height:844});
  const mobile=[];
  for(const action of ['run','jab2','smash','secondary','transform-to-dragon-air','transform-to-human-ground']){
    await page.locator('#clip-select').selectOption(action);
    await page.locator('#asset-status').waitFor({state:'hidden'});
    await page.locator('#timeline').fill(action==='run'?'0':'500');
    const geometry=await page.evaluate(()=>{const s=corrinPreview.snapshot(),a=s.layout;return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,stage:document.querySelector('#stage').getBoundingClientRect().width,entries:a.entries.map(e=>({left:e.x-e.e.right*a.multiplier,right:e.x-e.e.left*a.multiplier,top:a.floor+e.e.top*a.multiplier}))};});
    if(geometry.scrollWidth>geometry.width||geometry.entries.some(e=>e.left<-.1||e.right>geometry.stage+.1||e.top<59))throw Error(action+' mobile clipping');
    await page.locator('.motion-panel').screenshot({path:`output/playwright/corrin-v2-mobile-${action}.png`});
    mobile.push({action,...geometry});
  }
  await page.setViewportSize({width:1400,height:1120});
  await page.locator('#facing').selectOption('1');
  await page.locator('#size').selectOption('review');
  await page.evaluate(value=>{window.corrinControlsReview=value;},{frozen,overlay,mobile});
  console.log(JSON.stringify({frozen,overlay,mobile}));
}
