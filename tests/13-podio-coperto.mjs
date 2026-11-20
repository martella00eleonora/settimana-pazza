import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={btns:[]};
const K='settimana-pazza-winter-26-27-v5';
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); let n=0; const sc={g0:5,g1:3,g2:7,g3:2,g4:1,g5:6,g6:0,g7:-1,g8:-2,g9:4,g10:1,g11:-3};
 for (const [pid,v] of Object.entries(sc)) d.points['x'+(n++)]={playerId:pid,delta:v,reason:'Prova',activityId:'',day:'2026-12-22',at:1}; localStorage.setItem(k,JSON.stringify(d));},K); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
for (let i=0;i<40 && !(await pg.$('.ri-stage'));i++){ await pg.$eval('[data-cer="next"]', e=>e.click()); await pg.waitForTimeout(120); }
for (let i=0;i<40;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; const t = await n.textContent(); R.btns.push(t);
  await n.evaluate(e=>e.click()); await pg.waitForTimeout(200);
  if (t === 'Il podio'){ await pg.waitForTimeout(900); await pg.screenshot({path:'look/i-pod0.png'}); }
  if (t === 'Svela il 3° posto'){ await pg.waitForTimeout(900); await pg.screenshot({path:'look/i-drum3.png'}); await pg.waitForTimeout(2600); await pg.screenshot({path:'look/i-pod3.png'}); }
  if (t === 'Svela il 2° posto'){ await pg.waitForTimeout(3500); await pg.screenshot({path:'look/i-pod2.png'}); }
}
await pg.waitForTimeout(6000); R.winner = await pg.textContent('.win-name');
console.log(JSON.stringify(R), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
