import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
await pg.tap('[data-tab="regole"]'); await pg.waitForTimeout(400);
R.bmFoto = await pg.$$eval('.bm-av img', e=>e.map(x=>x.getAttribute('src').split('/').pop()));
R.dirFoto = await pg.$$eval('#dir-list img', e=>e.map(x=>x.getAttribute('src').split('/').pop()));
const el = await pg.$('.bm-av'); await el.scrollIntoViewIfNeeded(); await pg.evaluate(()=>scrollBy(0,-120)); await pg.waitForTimeout(300); await pg.screenshot({path:'look/m-bm.png'});
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.tap('#trial-fill'); await pg.tap('#trial-fill'); await pg.waitForTimeout(1500);
await pg.tap('#adm-fab'); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
for (let i=0;i<60 && !(await pg.$('.ty-stage'));i++){ const n = await pg.$('[data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await pg.waitForTimeout(120); }
await pg.waitForTimeout(3500);
R.tyFoto = await pg.$$eval('.ty-faces img', e=>e.map(x=>x.getAttribute('src').split('/').pop()));
R.tyDir = await pg.$$eval('.ty-dir img', e=>e.map(x=>x.getAttribute('src').split('/').pop()));
await pg.screenshot({path:'look/m-ty.png'});
console.log(JSON.stringify(R), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
