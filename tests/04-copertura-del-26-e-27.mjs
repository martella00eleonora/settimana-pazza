import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.clock.install({time: new Date(2026,11,26,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
// punto vero il 26
await pg.tap('.row[data-open="g5"]'); await pg.tap('[data-give="p:p0"]'); await pg.tap('#sh-close');
// prova lasciata attiva
await pg.tap('#adm-fab'); await pg.tap('[data-trial="2026-12-27"]'); await pg.waitForTimeout(200);
await pg.tap('.row[data-open="g0"]'); await pg.tap('[data-give="p:p0"]'); await pg.tap('#sh-close');
// mezzanotte
await pg.clock.setSystemTime(new Date(2026,11,28,0,10)); await pg.clock.runFor(31000); await pg.waitForTimeout(300);
R.trialCleared = await pg.evaluate(()=>localStorage.getItem('sp-prova'));
R.trialPointsLeft = await pg.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('settimana-pazza-winter-26-27-v5')).points).filter(x=>x.trial).length);
R.multiDisabled = await pg.isDisabled('#multi-btn');
// cerimonia
await pg.tap('[data-reveal="1"]'); for (let i=0;i<40;i++){ const n=await pg.$('#cer:not(.winner) [data-cer="next"]'); if (n){ await n.evaluate(e=>e.click()); await pg.waitForTimeout(300);} } await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="close"]', e=>e.click());
await pg.tap('[data-tab="storico"]'); R.adminButtons = await pg.$$eval('#log button', e=>e.length);
R.trialSel = await pg.isHidden('#trial-chips');
// spettatore
await pg.tap('#adm-fab'); await pg.tap('#mode-btn'); await pg.waitForTimeout(200);
R.viewerLog = await pg.$$eval('.lev .lt', e=>e.map(x=>x.textContent));
await pg.tap('[data-tab="classifica"]'); R.viewerMary = await pg.$eval('[data-tot="g5"]', e=>e.textContent); R.covered = await pg.isVisible('.covered');
R.count = (await pg.textContent('#count')).replace(/\s+/g,' ').trim();
// riapertura pagina il giorno dopo: tutto resta scoperto e bloccato
await pg.clock.setSystemTime(new Date(2026,11,29,12,0)); await pg.reload(); await pg.waitForTimeout(300);
R.dayAfter = {mary: await pg.$eval('[data-tot="g5"]', e=>e.textContent), covered: await pg.isVisible('.covered')};
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
