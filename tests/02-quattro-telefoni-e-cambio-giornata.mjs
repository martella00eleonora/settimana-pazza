import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const out = {};
// 1) giornata automatica + cambio alle 6 a pagina aperta
{
  const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.clock.install({time: new Date(2026,11,22,5,58,0)});   // martedì 22, 5:58 di notte
  await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go');
  out.ore558 = await pg.textContent('#hint-board');
  await pg.tap('#multi-btn'); await pg.waitForTimeout(200);
  out.regole558 = await pg.$$eval('#mu-items .lbl', e=>e.map(x=>x.textContent).filter(t=>t.startsWith('Regole')));
  await pg.tap('#sh-close');
  await pg.clock.fastForward('03:00');                            // diventano le 6:01
  await pg.clock.runFor(31000);
  out.ore601 = await pg.textContent('#hint-board');
  await pg.tap('[data-tab="programma"]'); await pg.waitForTimeout(200);
  out.giornoEvidenziato = await pg.$eval('.day.today', e=>e.dataset.day);
  out.passati = await pg.$$eval('.day.past', e=>e.map(x=>x.dataset.day));
  out.errs1 = errs; await ctx.close();
}
// 2) mobile: niente scroll orizzontale a varie larghezze, tocchi funzionanti
for (const dev of ['iPhone SE','iPhone 13','Pixel 7','Galaxy S9+']) {
  const ctx = await b.newContext({...devices[dev]}); const pg = await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.clock.install({time: new Date(2026,11,24,21,0,0)});
  await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.waitForTimeout(300);
  const res = {};
  for (const t of ['classifica','programma','storico','regole']) {
    await pg.tap(`[data-tab="${t}"]`); await pg.waitForTimeout(150);
    res[t] = await pg.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth);
  }
  await pg.tap('[data-tab="classifica"]'); await pg.tap('.row[data-open="g0"]'); await pg.waitForTimeout(200);
  res.sheetFits = await pg.evaluate(()=>{const s=document.querySelector('.sheet').getBoundingClientRect();return s.width<=innerWidth && s.height<=innerHeight;});
  if (dev==='iPhone SE') await pg.screenshot({path:'look/m1.png'});
  out[dev] = {...res, w: pg.viewportSize().width, errs};
  await ctx.close();
}
console.log(JSON.stringify(out,null,1)); await b.close();
if ((out.errs1 || []).length || Object.values(out).some(o => (o?.errs || []).length)) process.exitCode = 1;   // errori JavaScript in una pagina = prova fallita
