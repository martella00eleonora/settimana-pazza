import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
await pg.clock.install({time: new Date(2026,11,21,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('[data-tab="programma"]'); await pg.waitForTimeout(300); R.prog21 = await pg.$$eval('#dayview .act h3', e=>e.map(x=>x.textContent));
await pg.screenshot({path:'look/d-prog21.png'});
await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); let n=0; const sc={g0:5,g1:3,g2:3,g3:2,g4:1,g5:6,g6:0,g7:-1,g8:-2,g9:4,g10:1,g11:-3};
 for (const [pid,v] of Object.entries(sc)) d.points['x'+(n++)]={playerId:pid,delta:v,reason:'Prova',activityId:'',day:'2026-12-22',at:new Date('2026-12-22T22:00').getTime()}; localStorage.setItem(k,JSON.stringify(d));},K);
await pg.clock.setSystemTime(new Date(2026,11,28,0,10)); await pg.reload(); await pg.waitForTimeout(400);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('[data-reveal="1"]'); await pg.waitForTimeout(3600); R.btn0 = await pg.textContent('[data-cer="next"]');
let steps = 0;
while (await pg.$('#cer:not(.winner) [data-cer="next"]')){ await pg.$eval('#cer:not(.winner) [data-cer="next"]', e=>e.click()); steps++; await pg.waitForTimeout(250);
  if (!R.first && await pg.$('.place.now')) { await pg.waitForTimeout(800); await pg.screenshot({path:'look/d-cer1.png'}); R.first = (await pg.textContent('.place.now')).replace(/\s+/g,' '); }
  if (!R.btn8 && (await pg.textContent('[data-cer="next"]').catch(()=>'')).includes('2° posto')) { await pg.waitForTimeout(800); await pg.screenshot({path:'look/d-cer8.png'}); R.btn8 = await pg.textContent('[data-cer="next"]').catch(()=>null); }
}
R.steps = steps; await pg.waitForTimeout(500); await pg.screenshot({path:'look/d-win0.png'}); await pg.waitForTimeout(7500); await pg.screenshot({path:'look/d-win.png'});
R.winner = await pg.textContent('.win-name'); R.conf = await pg.$$eval('.conf', e=>e.length);
await pg.evaluate(()=>document.querySelector('#cer').scrollTo(0,9999)); await pg.waitForTimeout(300); await pg.screenshot({path:'look/d-win2.png'});
await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="close"]', e=>e.click()); await pg.waitForTimeout(300); R.closed = !(await pg.$('#cer'));
console.log(R, errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
