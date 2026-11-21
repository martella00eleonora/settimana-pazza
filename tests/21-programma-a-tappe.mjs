import { chromium, devices } from 'playwright';
/* Programma a tappe: coperto fino al 1° dicembre, poi solo i titoli, i dettagli dal 21 a mezzanotte.
   I punti si segnano dal 21 alle 19. */
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={}; const bad=[];
const check = (nome, cond) => { if (!cond) bad.push(nome); };
const url = 'file://'+process.cwd()+'/local-test/index.html', look = process.cwd()+'/look/21-';
const at = async d => { await pg.clock.setSystemTime(d); await pg.reload(); await pg.waitForTimeout(300); };
const day = async d => { await pg.tap(`#days [data-day="${d}"]`); await pg.waitForTimeout(150); };
const vista = () => pg.$eval('#dayview', e => ({titoli:[...e.querySelectorAll('.act h3')].map(x=>x.textContent), note:e.querySelectorAll('.notes li').length, punti:e.querySelectorAll('.rrow').length, dress:e.querySelectorAll('.dress').length, coperto:!!e.querySelector('.covered'), testo:e.textContent.replace(/\s+/g,' ').trim()}));

await pg.clock.install({time: new Date(2026,10,25,12,0)});
await pg.goto(url); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('[data-tab="programma"]');

// 25 novembre: coperto
R.nov = await vista(); check('coperto a novembre', R.nov.coperto && R.nov.titoli.length === 0 && /1° dicembre/.test(R.nov.testo));
await pg.screenshot({path: look+'novembre.png'});

// 5 dicembre: solo i titoli
await at(new Date(2026,11,5,12,0));
await day('2026-12-21'); R.dic21 = await vista();
check('titoli del 21', JSON.stringify(R.dic21.titoli) === JSON.stringify(["Apertura · Serata d'inaugurazione", "Serata pigiama e quiz party"]));
check('niente dettagli a dicembre', R.dic21.note === 0 && R.dic21.punti === 0 && R.dic21.dress === 0 && /lunedì 21/.test(R.dic21.testo));
await pg.screenshot({path: look+'dicembre-21.png'});
const titoli = {};
for (const d of ["2026-12-22","2026-12-23","2026-12-24","2026-12-25","2026-12-26","2026-12-27"]){ await day(d); const v = await vista(); titoli[d] = v.titoli; check('niente dettagli il '+d, v.note === 0 && v.punti === 0 && v.dress === 0); }
R.titoli = titoli;
check('titoli della settimana', JSON.stringify(titoli) === JSON.stringify({
  "2026-12-22":["Le tradizioni vanno rispettate"], "2026-12-23":["PowerPoint in costume"], "2026-12-24":["Ape + Pattinaggio"],
  "2026-12-25":["Secret Santa","Tombolone"], "2026-12-26":["Giornata shooting"], "2026-12-27":["Festa nazionale: si torna nel 2008","Premiazione finale"]}));
await day('2026-12-27'); await pg.screenshot({path: look+'dicembre-27.png'});

// 21 dicembre all'una di notte: i dettagli ci sono
await at(new Date(2026,11,21,1,0));
await day('2026-12-21'); R.notte21 = await vista();
// all'una di notte del 21 è ancora la serata del 20: descrizioni e dress code sì, punti delle attività no
check('dettagli del 21', R.notte21.note >= 7 && R.notte21.punti === 0 && R.notte21.dress === 1 && /si scoprono il giorno stesso/.test(R.notte21.testo));
await day('2026-12-23'); R.ppt23 = await vista(); check('PowerPoint senza punti la notte del 21', R.ppt23.note === 2 && R.ppt23.punti === 0 && R.ppt23.dress === 1);
// 23 dicembre alle 7: i punti del 23 ci sono, quelli del 26 ancora no
await at(new Date(2026,11,23,7,0));
await day('2026-12-21'); R.p21 = (await vista()).punti; check('punti del 21 il 23', R.p21 === 2);
await day('2026-12-23'); R.ppt = await pg.$$eval('#dayview .rrow b', e=>e.map(x=>x.textContent));
check('punti del PowerPoint', JSON.stringify(R.ppt) === JSON.stringify(["Vieni in costume","Miglior PowerPoint (voto anonimo)","Peggior PowerPoint (voto anonimo)"]));
await pg.screenshot({path: look+'23-punti.png', fullPage: true});
await day('2026-12-26'); R.shoot23 = await vista(); check('shooting senza punti il 23', R.shoot23.punti === 0 && R.shoot23.dress === 1);
await pg.screenshot({path: look+'26-visto-il-23.png'});
await at(new Date(2026,11,26,7,0));
await day('2026-12-26'); R.shoot = await pg.$$eval('#dayview .rrow b', e=>e.map(x=>x.textContent));
check('punti dello shooting', JSON.stringify(R.shoot) === JSON.stringify(["Non sei vestito a tema"]));

// 21 dicembre alle 10, da admin: punti ancora chiusi
await at(new Date(2026,11,21,10,0));
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(200);
R.multi10 = await pg.isDisabled('#multi-btn'); check('punti chiusi alle 10', R.multi10);
R.hint10 = await pg.textContent('#hint-board'); check('avviso alle 10', /alle 19/.test(R.hint10));
await pg.tap('[data-tab="programma"]'); await day('2026-12-21');
R.lock10 = await pg.$$eval('#dayview .locked', e=>e.map(x=>x.textContent)); check('programma alle 10', R.lock10.length === 2 && R.lock10.every(t => t === 'Si segna dalle 19'));
await pg.tap('[data-tab="classifica"]'); await pg.tap('.row[data-open="g5"]'); await pg.waitForTimeout(200);
R.sheet10 = (await pg.textContent('#sheet-root')).replace(/\s+/g,' '); check('scheda alle 10', /stasera alle 19/.test(R.sheet10) && !(await pg.$('[data-give="p:p0"]:not([disabled])')));
await pg.screenshot({path: look+'21-ore10.png'});
await pg.tap('#sh-close');

// 21 dicembre alle 19:05: si segna
await at(new Date(2026,11,21,19,5));
R.multi19 = await pg.isDisabled('#multi-btn'); check('punti aperti alle 19', !R.multi19);
await pg.tap('.row[data-open="g5"]'); await pg.tap('[data-give="p:p0"]'); await pg.tap('#sh-close'); await pg.waitForTimeout(200);
R.mary = await pg.$eval('[data-tot="g5"]', e=>e.textContent); check('punto dato alle 19', /1/.test(R.mary));
await pg.tap('[data-tab="programma"]'); await day('2026-12-21');
R.segna19 = await pg.$$eval('#dayview [data-mark]', e=>e.length); check('Segna chi alle 19', R.segna19 === 2);

console.log(JSON.stringify(R,null,1), errs, bad.length ? 'NON VA: '+bad.join(', ') : 'tutto ok'); await b.close();
if (errs.length || bad.length) process.exitCode = 1;
