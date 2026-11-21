import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.clock.install({time: new Date(2026,10,20,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.tap('[data-trial="2026-12-27"]'); await pg.waitForTimeout(300);
await pg.tap('.row[data-open="g0"]'); await pg.$eval('[data-give="p:p0"]', e=>e.click()); await pg.tap('#sh-close');
await pg.tap('[data-bmode="day"]'); await pg.waitForTimeout(200); R.daysBefore = await pg.$$eval('[data-bday]', e=>e.length);
await pg.tap('[data-bmode="week"]');
await pg.tap('#adm-fab'); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
for (let i=0;i<40;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await pg.waitForTimeout(120); }
await pg.waitForTimeout(6000); // avanti fino a «Chiudi» (dopo il vincitore: podio completo e ringraziamenti)
for (let i=0;i<5 && !(await pg.$('[data-cer="close"]'));i++){ await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(400); } await pg.$eval('[data-cer="close"]', e=>e.click()); await pg.waitForTimeout(300);
await pg.tap('[data-bmode="day"]'); await pg.waitForTimeout(200); R.daysAfter = await pg.$$eval('[data-bday]', e=>e.length);
R.empty = await pg.$$eval('#board .empty', e=>e.map(x=>x.textContent));
console.log(R, errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
