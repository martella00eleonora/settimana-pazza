import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
await pg.clock.install({time: new Date(2026,10,20,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.waitForTimeout(200); await pg.tap('#trial-fill'); R.conferma = await pg.textContent('#trial-fill'); await pg.$eval('#trial-fill', e=>e.click()); await pg.waitForTimeout(1500);
R.toast = await pg.textContent('.toast').catch(()=>null); R.trialBar = await pg.textContent('#trial-day');
R.punti = await pg.evaluate(k=>Object.values(JSON.parse(localStorage.getItem(k)).points).filter(p=>p.trial).length, K);
R.righe = await pg.$$eval('#board .row .tot', e=>e.map(x=>x.textContent).join(' '));
await pg.screenshot({path:'look/l-board.png'});
await pg.tap('#adm-fab'); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
R.msg = (await pg.textContent('.proclama blockquote')).slice(0, 50);
const pages = [];
for (let i=0;i<60;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; pages.push(await n.textContent()); await n.evaluate(e=>e.click()); await pg.waitForTimeout(120); }
R.passi = pages.length; R.titoli = pages.filter(x=>x==='Prossimo titolo').length + 1; R.cert = pages.filter(x=>x==='Prossimo certificato').length + 1;
await pg.waitForTimeout(5000); R.vincitore = await pg.textContent('.win-name');
// avanti fino a «Chiudi» (dopo il vincitore: podio completo e ringraziamenti)
for (let i=0;i<5 && !(await pg.$('[data-cer="close"]'));i++){ await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(400); } await pg.$eval('[data-cer="close"]', e=>e.click()); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.waitForTimeout(500); await pg.$eval('[data-trial=""]', e=>e.click()); await pg.waitForTimeout(800);
R.dopoUscita = await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); return [Object.keys(d.points).length, Object.keys(d.extras||{}).length, Object.keys(d.settings||{}).length];}, K);
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
