import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
// 1) riepilogo nascondi / mostra
await pg.clock.install({time: new Date(2026,11,24,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); d.points.x1={playerId:'g0',delta:1,reason:'Bonus Bardahan · alcolico',activityId:'',day:'2026-12-23',at:new Date('2026-12-23T22:00').getTime()}; localStorage.setItem(k,JSON.stringify(d));},K); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('[data-tab="storico"]'); await pg.waitForTimeout(300);
R.recap = await pg.isVisible('.recap'); await pg.tap('.recap [data-recapx]'); await pg.waitForTimeout(200);
R.min = await pg.isVisible('.recap-min'); await pg.tap('.recap-min'); await pg.waitForTimeout(200); R.back = await pg.isVisible('.recap');
// 2) prova di una giornata dai bottoni
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
R.pgToolsDuringWeek = await pg.isVisible('#pg-tools');
// 3) novembre con dati rimasti della prova generale
await pg.clock.setSystemTime(new Date(2026,10,19,21,30)); await pg.reload(); await pg.waitForTimeout(400);
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); R.pgToolsNov = await pg.isVisible('#pg-tools'); R.note = await pg.textContent('#pg-note');
await pg.tap('[data-trial="2026-12-22"]'); await pg.waitForTimeout(300); R.trialBar = await pg.isVisible('#trial-bar');
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); R.outChip = await pg.isVisible('[data-trial=""]'); await pg.tap('[data-trial=""]'); await pg.waitForTimeout(300); R.trialAfter = await pg.isVisible('#trial-bar');
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); await pg.tap('#pg-clean'); await pg.tap('#pg-clean'); await pg.waitForTimeout(400);
R.left = await pg.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k)).points).length, K);
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); R.pgToolsAfter = await pg.isVisible('#pg-tools'); await pg.screenshot({path:'look/c-adm.png'});
console.log(R, errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
