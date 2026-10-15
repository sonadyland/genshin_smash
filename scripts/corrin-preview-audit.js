async (page) => {
  await page.reload();
  await page.locator('#asset-status').waitFor({state:'hidden'});
  const inventory = await page.evaluate(() => corrinPreview.snapshot());
  const required = inventory.requiredClips || inventory.clips.map(c=>c.key);
  if (inventory.catalogueErrors.length || required.some(key=>!inventory.clips.some(c=>c.key===key)) || inventory.clips.some(c => c.status === 'pending')) throw Error('Required motion catalogue is not ready');
  const checks = [];
  const groups = {
    human:['idle','run','jump','dodge','hurt','defeat','jab1','jab2','jab3','smash','secondary','transform-to-dragon-ground','transform-to-human-ground','transform-to-dragon-air','transform-to-human-air'],
    dragon:['idle','run','jump','dodge','hurt','defeat','jab','smash','secondary'],
    fx:inventory.clips.filter(c=>c.key.startsWith('fx:')).map(c=>c.key.slice(3)),
  };
  for (const [form, values] of Object.entries(groups)) {
    await page.locator('[data-view=' + form + ']').click();
    for (const action of values) {
      await page.locator('#clip-select').selectOption(action);
      await page.locator('#asset-status').waitFor({state:'hidden'});
      await page.locator('#timeline').fill('0');
      const count = await page.evaluate(() => corrinPreview.snapshot().layout.entries.filter(e => !e.reference)[0].clip.frames.length);
      const sequence = [];
      for (let i = 0; i < count; i++) {
        sequence.push(await page.locator('#frame-label').textContent());
        await page.locator('#step-forward').click();
      }
      const geometry = await page.evaluate(() => {
        const snap = corrinPreview.snapshot(), a = snap.layout, w = document.querySelector('#stage').getBoundingClientRect().width;
        return a.entries.map(e => ({left:e.x + e.e.left*a.multiplier,right:e.x + e.e.right*a.multiplier,top:a.floor + e.e.top*a.multiplier,bottom:a.floor + e.e.bottom*a.multiplier,width:w}));
      });
      if (new Set(sequence).size !== count) throw Error(form + ':' + action + ' frame sequence not complete');
      if (geometry.some(e => e.left < -.1 || e.right > e.width+.1 || e.top < 59)) throw Error(form + ':' + action + ' stage clipping');
      checks.push({form,action,count,sequence,geometry});
    }
  }
  const checkedKeys=checks.map(c=>`${c.action.startsWith('transform-')?'transform':c.form}:${c.action}`);
  if(required.some(key=>!checkedKeys.includes(key)))throw Error('Audit missed a required clip');
  await page.evaluate(data => { window.corrinAudit = data; }, checks);
}
