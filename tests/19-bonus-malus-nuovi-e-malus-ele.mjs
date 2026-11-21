// Bonus e malus aggiornati da js/dati.js quando entra l'admin, e la regola del Malus Ele:
// se lo stesso malus si ripete nella giornata, dalla seconda volta vale come Malus Ele (cumulabile).
import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
await pg.clock.install({time: new Date(2026,11,22,21,0)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
// finge un database con i bonus e malus vecchi (come quello online prima dell'aggiornamento)
await pg.evaluate(k=>{ const d=JSON.parse(localStorage.getItem(k));
  d.presets.p9 = {label:'Malus Mary · hai sonno, chiudi gli occhi', short:'hai sonno, chiudi gli occhi', delta:-1, owner:'g5', once:false, auto:false, createdAt:9};
  d.presets.p99 = {label:'Malus Vecchio · non esiste più', short:'non esiste più', delta:-1, owner:'g0', once:false, auto:false, createdAt:99};
  localStorage.setItem(k, JSON.stringify(d)); }, K);
await pg.reload(); await pg.waitForTimeout(300);
R.primaDellAdmin = await pg.evaluate(k=>Object.values(JSON.parse(localStorage.getItem(k)).presets).map(p=>p.label.split(' · ')[0]).sort().join(', '), K);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(500);
R.dopoLAdmin = await pg.evaluate(k=>Object.values(JSON.parse(localStorage.getItem(k)).presets).map(p=>p.label.split(' · ')[0]).sort().join(', '), K);
// Malus Ele: Jacopo prende un inglesismo (−1), una bestemmia (−1), bestemmia di nuovo (−1 di Malus Ele), poi un altro inglesismo (altro Malus Ele)
const give = async (pid, preset) => { await pg.tap(`.row[data-open="${pid}"]`); await pg.$eval(`[data-give="p:${preset}"]`, e=>e.click()); await pg.waitForTimeout(250); const t = await pg.textContent('.toast:last-child').catch(()=>''); await pg.tap('#sh-close'); return t; };
const ele = () => pg.evaluate(() => [...document.querySelectorAll('.row')].find(r => r.dataset.open === 'g11')?.querySelector('.tot')?.textContent);
R.dopoInglesismo = [await give('g11', 'p6'), await ele()];
R.dopoBestemmia1 = [await give('g11', 'p4'), await ele()];
R.dopoBestemmia2 = [await give('g11', 'p4'), await ele()];
R.dopoInglesismo2 = [await give('g11', 'p6'), await ele()];
// Jolly automatico: Mary prende tutti e 5 i bonus senza malus (+2); Bardy li prende tutti ma ha un malus (gliene toglie uno: +1)
const tot = pid => pg.evaluate(id => document.querySelector(`.row[data-open="${id}"] .tot`)?.textContent, pid);
R.jollyMary = []; for (const p of ['p0','p1','p2','p9','p10']) R.jollyMary.push(await give('g5', p)); R.totMary = await tot('g5');
R.jollyBardy = [await give('g0', 'p5')]; for (const p of ['p0','p1','p2','p9','p10']) R.jollyBardy.push(await give('g0', p)); R.totBardy = await tot('g0');
await pg.tap('[data-tab="storico"]'); await pg.waitForTimeout(300);
R.storicoJacopo = await pg.$$eval('.lev', els => els.map(e => e.querySelector('.lt')?.innerText.replace(/\s+/g,' ').trim()).filter(t => t.startsWith('Jacopo')));
R.storicoJolly = await pg.$$eval('.lev', els => els.map(e => e.innerText.replace(/\s+/g,' ').trim()).filter(t => t.includes('Premio presidenziale')));
await pg.tap('[data-tab="regole"]'); await pg.waitForTimeout(400);
R.regole = await pg.$$eval('.bm-av', els => els.map(e => e.closest('[class]')?.parentElement?.innerText.replace(/\s+/g,' ').trim().slice(0, 70)));
await pg.waitForTimeout(4500);   // aspetta che sparisca l'avviso
await pg.evaluate(() => [...document.querySelectorAll('.bm-av')][3].scrollIntoView({block:'start'})); await pg.evaluate(() => scrollBy(0, -60)); await pg.waitForTimeout(400); await pg.screenshot({path:'look/19-regole.png'});
console.log(JSON.stringify(R, null, 1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
