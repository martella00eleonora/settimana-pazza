import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
await pg.clock.install({time: new Date(2026,11,27,22,30)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
R.at2230 = {multi: !(await pg.isDisabled('#multi-btn')), cert: await pg.isVisible('#cert-btn')};
await pg.tap('.row[data-open="g0"]'); R.at2230.items = !!(await pg.$('[data-give]')); await pg.tap('#sh-close');
await pg.clock.setSystemTime(new Date(2026,11,27,23,5)); await pg.clock.runFor(31000); await pg.waitForTimeout(300);
R.at2305 = {multi: !(await pg.isDisabled('#multi-btn')), cert: await pg.isVisible('#cert-btn'), hint: await pg.textContent('#hint-board')};
await pg.tap('.row[data-open="g0"]'); R.at2305.items = !!(await pg.$('[data-give]')); R.at2305.note = await pg.textContent('.closed'); await pg.tap('#sh-close');
await pg.tap('#cert-btn'); await pg.fill('#ce-label','Re della pista'); await pg.tap('[data-csel="g0"]'); await pg.tap('#ce-go'); await pg.waitForTimeout(200);
R.at2305.certGiven = (await pg.textContent('#ce-list')).includes('Bardy'); await pg.tap('#sh-close');
await pg.tap('[data-tab="programma"]'); R.at2305.segna = !!(await pg.$('[data-mark]')); R.at2305.certInProg = await pg.isVisible('#dayview [data-cert]');
await pg.clock.setSystemTime(new Date(2026,11,28,0,1)); await pg.reload(); await pg.waitForTimeout(300);
R.at0001 = {cert: await pg.isVisible('#cert-btn'), reveal: await pg.isVisible('[data-reveal="1"]')};
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
