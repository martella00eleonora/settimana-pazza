import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.clock.install({time: new Date(2026,11,22,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
// Bardy: 1 malus; Mary: nessuno
await pg.tap('.row[data-open="g0"]'); await pg.tap('[data-give="p:p4"]'); await pg.tap('#sh-close');
await pg.tap('#multi-btn'); await pg.tap('[data-pick="jolly"]');
R.tags = await pg.$$eval('[data-sel="g0"] .tagdone,[data-sel="g5"] .tagdone', e=>e.map(x=>x.textContent));
await pg.tap('[data-sel="g0"]'); await pg.tap('[data-sel="g5"]'); await pg.tap('#mu-go'); await pg.waitForTimeout(300); console.log('ERR', errs, await pg.$eval('#toast-root', e=>e.innerHTML)); R.toast = await pg.textContent('.toast');
await pg.$eval('[data-sel="g5"]', e=>e.click()); R.warn = await pg.textContent('.toast.warn'); await pg.tap('#sh-close');
const tot = async id => pg.$eval(`[data-tot="${id}"]`, e=>e.textContent);
R.bardy = await tot('g0'); R.mary = await tot('g5');
// Mary con +2: un malus dopo non deve far scattare il Malus Ele
await pg.tap('.row[data-open="g5"]'); await pg.tap('[data-give="p:p9"]'); R.maryToast = await pg.textContent('.toast'); R.maryAfter = await pg.textContent('#sh-tot');
R.maryJollyBtn = await pg.textContent('#sh-jolly'); await pg.tap('#sh-close');
// Jolly singolo +2 dal pannello (Laura)
await pg.tap('.row[data-open="g10"]'); R.lauraBtn = await pg.textContent('#sh-jolly'); await pg.tap('#sh-jolly'); await pg.tap('#sh-jolly'); R.laura = await pg.textContent('#sh-tot');
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
