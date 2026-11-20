import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const out = {};
const devs = {"iPhone SE": devices['iPhone SE'], "iPhone 13": devices['iPhone 13'], "Pixel 7": devices['Pixel 7'], "iPad Mini": devices['iPad Mini'], "Computer": {viewport:{width:1366,height:800}}};
for (const [name, d] of Object.entries(devs)){
  const ctx = await b.newContext({...d}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const wide=[];
  const chk = async tag => { const [w, sw] = await pg.evaluate(()=>[innerWidth, Math.max(document.documentElement.scrollWidth, (c => c && getComputedStyle(c).overflowX !== 'hidden' ? c.scrollWidth : 0)(document.querySelector('#cer')))]); if (sw > w + 1) wide.push(`${tag}:${sw}>${w}`); };
  await pg.clock.install({time: new Date(2026,11,24,21,0)});
  await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  for (const t of ['classifica','programma','storico','regole']){ await pg.click(`[data-tab="${t}"]`); await pg.waitForTimeout(300); await chk(t); }
  await pg.click('[data-bmode="day"]').catch(()=>{});
  await pg.click('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.click('#pin-go'); await pg.waitForTimeout(300); await pg.click('#adm-fab'); await pg.waitForTimeout(300); await chk('admin');
  await pg.click('[data-trial="closing"]'); await pg.waitForTimeout(3600);
  for (let i=0;i<40;i++){ await chk('cer'+i); const n = await pg.$('[data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await pg.waitForTimeout(250); }
  await pg.waitForTimeout(3500); await chk('vincitore'); if (name === 'iPhone SE') await pg.screenshot({path:'look/h-se-win.png'});
  out[name] = {troppoLarghe: wide, errori: errs}; await ctx.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
if (Object.values(out).some(o => o.errori.length || o.troppoLarghe.length)) process.exitCode = 1;   // errori o pagine più larghe dello schermo = prova fallita
