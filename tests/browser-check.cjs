const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8000/');
   await page.locator('#length').fill('52.5');await page.locator('#width').fill('52.5');await page.locator('#height').fill('62.5');await page.locator('#weight').fill('21');
   assert.match(await page.locator('#metrics').innerText(),/0\.1723 m³/);
   assert.match(await page.locator('#metrics').innerText(),/\$43\.07/);
   assert.match(await page.locator('#fee-note').innerText(),/请输入预计售价/);
   await page.locator('#price').fill('59.99');await page.locator('#factory').fill('100');
   assert.match(await page.locator('#fee-note').innerText(),/基础费/);
   assert.notEqual(await page.locator('#profit').innerText(),'—');
   assert.match(await page.locator('#breakdown').innerText(),/\$13\.89/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
   assert.ok(await page.locator('#length').evaluate(el=>el.getBoundingClientRect().height>=44));
   await page.locator('#factory').fill('0');assert.match(await page.locator('#report').innerText(),/¥0\.00/);
   await page.locator('#copy').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.length>0);assert.ok((await page.locator('#copy-status').innerText()).length>0);
   await page.locator('#length').fill('-1');assert.equal(await page.locator('#length').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#fee-note').innerText(),/有效/);
   await page.locator('#length').fill('52.5');
   if(width===390)await page.screenshot({path:'/tmp/fba-mobile.png',fullPage:true});
   if(width===1440)await page.screenshot({path:'/tmp/fba-desktop.png',fullPage:true});
   assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px: real-time input, validation, pending-rate safety, zero cost, copy, no horizontal overflow`);
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
