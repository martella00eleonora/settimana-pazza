import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.clock.install({time: new Date(2026,10,20,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.tap('[data-trial="2026-12-27"]'); await pg.waitForTimeout(300);
R.multiBefore = !(await pg.isDisabled('#multi-btn')); R.certBtn = await pg.isVisible('#cert-btn');
await pg.tap('.row[data-open="g0"]'); await pg.$eval('[data-give="p:p0"]', e=>e.click()); await pg.tap('#sh-close');
await pg.tap('#cert-btn'); await pg.waitForTimeout(200); R.warnText = (await pg.textContent('.ce-head p')).includes('si chiudono i punti');
await pg.fill('#ce-label','Re della pista'); await pg.tap('[data-csel="g5"]'); await pg.tap('#ce-go'); await pg.waitForTimeout(200); await pg.tap('#sh-close');
R.multiAfterCert = !(await pg.isDisabled('#multi-btn')); R.hint = await pg.textContent('#hint-board');
await pg.tap('.row[data-open="g1"]'); await pg.waitForTimeout(200); R.sheetGive = !!(await pg.$('[data-give]')); await pg.tap('#sh-close');
await pg.tap('#adm-fab'); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
for (let i=0;i<30;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await pg.waitForTimeout(120); }
await pg.waitForTimeout(3500); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="close"]', e=>e.click()); await pg.waitForTimeout(300);
R.afterCer = {multi: !(await pg.isDisabled('#multi-btn')), cert: await pg.isVisible('#cert-btn')};
await pg.tap('[data-tab="storico"]'); R.delBtns = await pg.$$eval('#log button', e=>e.length);
await pg.tap('#adm-fab'); await pg.waitForTimeout(200); R.exitChip = await pg.isVisible('[data-trial=""]'); await pg.tap('[data-trial=""]'); await pg.waitForTimeout(300);
R.trialOff = !(await pg.isVisible('#trial-bar'));
await pg.tap('#adm-fab'); await pg.tap('[data-trial="2026-12-22"]'); await pg.waitForTimeout(300); R.newTrialOpen = !(await pg.isDisabled('#multi-btn'));
console.log(R, errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
