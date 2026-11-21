// Premio presidenziale automatico: scatta quando una persona prende tutti i bonus fissi nella stessa giornata.
// +2 se quel giorno non ha malus, altrimenti le toglie un malus (+1). E i malus delle attività non fanno scattare il Malus Ele.
import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
await pg.clock.install({time: new Date(2026,11,22,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
const tot = id => pg.$eval(`.row[data-open="${id}"] .tot`, e=>e.textContent);
// Bardy e Mary prendono tutti e 5 i bonus, dal pannello «Assegna a più persone»
await pg.tap('#multi-btn');
R.jollyNelPannello = await pg.$$eval('[data-pick="jolly"]', e=>e.length);   // il Jolly a mano non c'è più
const toasts = [];
for (const k of ['p0','p1','p2','p9','p10']){ await pg.tap(`[data-pick="p:${k}"]`); for (const g of ['g0','g5']) await pg.tap(`[data-sel="${g}"]`); await pg.tap('#mu-go'); await pg.waitForTimeout(150); toasts.push(await pg.textContent('.toast:last-child')); }
await pg.tap('#sh-close');
R.ultimoAvviso = toasts[toasts.length - 1];
R.bardyDopoBonus = await tot('g0'); R.maryDopoBonus = await tot('g5');   // 5 + 2 = 7
// poi Bardy prende un malus: il Jolly passa da +2 a «toglie un malus» (+1): 5 - 1 + 1 = 5
await pg.tap('.row[data-open="g0"]'); await pg.$eval('[data-give="p:p4"]', e=>e.click()); await pg.waitForTimeout(200); await pg.tap('#sh-close');
R.bardyDopoMalus = await tot('g0');
// due volte lo stesso malus d'attività (finti, scritti direttamente): niente Malus Ele; due volte lo stesso malus normale: Malus Ele
await pg.evaluate(k=>{ const d=JSON.parse(localStorage.getItem(k)); const at = new Date('2026-12-22T22:00').getTime();
  d.points.a1 = {playerId:'g7', delta:-1, reason:'Non sei in pigiama', activityId:'pigiama', day:'2026-12-22', at};
  d.points.a2 = {playerId:'g7', delta:-1, reason:'Non sei in pigiama', activityId:'pigiama', day:'2026-12-22', at:at+1};
  d.points.b1 = {playerId:'g8', delta:-1, reason:'Malus Mg · hai usato un inglesismo', activityId:'', day:'2026-12-22', at};
  d.points.b2 = {playerId:'g8', delta:-1, reason:'Malus Mg · hai usato un inglesismo', activityId:'', day:'2026-12-22', at:at+1};
  localStorage.setItem(k, JSON.stringify(d)); }, K);
await pg.reload(); await pg.waitForTimeout(400);
R.fedeAttivita = await tot('g7');   // -2, senza Malus Ele
R.andreaNormale = await tot('g8');  // -2: il secondo inglesismo vale come Malus Ele
await pg.tap('[data-tab="storico"]'); await pg.waitForTimeout(300);
R.storico = await pg.$$eval('.lev', els => els.map(e => e.querySelector('.lt')?.innerText.replace(/\s+/g,' ').trim()).filter(t => /Premio presidenziale|Malus Ele/.test(t)));
console.log(JSON.stringify(R, null, 1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
