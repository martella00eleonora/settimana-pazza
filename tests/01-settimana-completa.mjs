import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const R = {}; const errs=[];
const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
pg.on('pageerror',e=>errs.push(e.message));
const at = async (d) => { await pg.clock.setFixedTime(d); };
await pg.clock.install({time: new Date(2026,11,24,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
R.roles = await pg.$$eval('.row .role', e=>e.map(x=>x.closest('.n').textContent));
// 24: punti, Malus Ele (stesso malus ripetuto) e Jolly presidenziale (Antonio prende tutti i bonus)
await pg.tap('#multi-btn'); await pg.tap('[data-pick="p:p6"]'); for (const g of ['g0','g6']) await pg.tap(`[data-sel="${g}"]`); await pg.tap('#mu-go');
await pg.tap('[data-sel="g0"]'); await pg.tap('#mu-go');   // Bardy secondo inglesismo: scatta il Malus Ele
for (const k of ['p0','p1','p2','p9','p10']){ await pg.tap(`[data-pick="p:${k}"]`); await pg.tap('[data-sel="g6"]'); await pg.tap('#mu-go'); await pg.waitForTimeout(150); }
R.jollyToast = await pg.textContent('.toast:last-child');
await pg.tap('#sh-close');
// passa al 25 sera
await pg.clock.runFor(1000); await pg.clock.setSystemTime(new Date(2026,11,25,21,0)); await pg.reload(); await pg.waitForTimeout(300);
R.recap = await pg.isVisible('.recap'); R.recapTxt = (await pg.textContent('.recap')).replace(/\s+/g,' ').slice(0,160);
await pg.tap('.row[data-open="g6"]'); await pg.tap('[data-give="p:p0"]'); await pg.tap('#sh-close');
// 26 sera: classifica coperta
await pg.clock.setSystemTime(new Date(2026,11,26,22,0)); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('.row[data-open="g0"]'); await pg.tap('[data-give="p:p1"]'); await pg.tap('#sh-close');
R.adminSeesNumbers = await pg.$eval('[data-tot="g0"]', e=>e.textContent);
await pg.tap('#adm-fab'); await pg.tap('#mode-btn'); await pg.waitForTimeout(200);
R.viewerTot = await pg.$eval('[data-tot="g0"]', e=>e.textContent); R.coveredBox = await pg.isVisible('.covered');
await pg.tap('[data-tab="storico"]'); R.viewerLog = await pg.$$eval('.ev .l1', e=>e.map(x=>x.textContent));
await pg.tap('[data-tab="classifica"]');
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
// 27 sera: certificati
await pg.clock.setSystemTime(new Date(2026,11,27,23,10)); await pg.reload(); await pg.waitForTimeout(300);
R.certBtn = await pg.isVisible('#cert-btn');
await pg.tap('#cert-btn'); await pg.fill('#ce-label','Miglior ballerino'); await pg.tap('[data-csel="g5"]'); await pg.tap('#ce-go'); await pg.waitForTimeout(200);
R.certList = (await pg.textContent('#ce-list')).replace(/\s+/g,' ');
await pg.screenshot({path:'look/j1.png'});
await pg.tap('#sh-close');
// 28 00:05: chiusura
await pg.clock.setSystemTime(new Date(2026,11,28,0,5)); await pg.reload(); await pg.waitForTimeout(300);
R.revealBtn = await pg.isVisible('[data-reveal="1"]');
R.assignClosed = await pg.isDisabled('#multi-btn');
await pg.tap('[data-reveal="1"]'); await pg.waitForTimeout(300); await pg.screenshot({path:'look/j2.png'});
for (let i=0;i<60;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (n){ await n.evaluate(e=>e.click()); await pg.waitForTimeout(400);} }
await pg.waitForTimeout(6000); await pg.screenshot({path:'look/j3.png'});
R.winnerShown = await pg.textContent('.win-name');
await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="close"]', e=>e.click());
await pg.tap('#adm-fab'); await pg.tap('#mode-btn'); await pg.waitForTimeout(200);
R.viewerAfterReveal = await pg.$eval('[data-tot="g0"]', e=>e.textContent);
R.count = (await pg.textContent('#count')).replace(/\s+/g,' ');
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
