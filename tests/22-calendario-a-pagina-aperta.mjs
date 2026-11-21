import { chromium, devices } from 'playwright';
/* Tutto il calendario con la pagina SEMPRE APERTA (mai ricaricata), su due telefoni: admin e amico.
   A ogni tappa l'orologio salta all'ora giusta e passano 31 secondi, come nella realtà (l'app ricontrolla ogni 30 s). */
const b = await chromium.launch(); const errs=[]; const bad=[]; const R=[];
const url = 'file://'+process.cwd()+'/local-test/index.html';
const apri = async () => { const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on('pageerror',e=>errs.push(e.message));
  await pg.clock.install({time: new Date(2026,10,30,23,59,0)}); await pg.goto(url); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300); return pg; };
const adm = await apri(), ami = await apri();
await adm.tap('#adm-fab'); await adm.fill('#in-pin','1234'); await adm.tap('#pin-go'); await adm.waitForTimeout(200);
await ami.tap('[data-tab="programma"]');

const vai = async (t) => { for (const pg of [adm, ami]){ await pg.clock.setSystemTime(t); await pg.clock.fastForward(31000); await pg.waitForTimeout(150); } };
const stato = async () => ({
  oggi: await adm.$eval('#days .day.today', e=>e.dataset.day).catch(()=>null),
  puntiAperti: !(await adm.isDisabled('#multi-btn')),
  certificati: !!(await adm.$('#dayview [data-cert="1"]')),
  vincitore: !!(await adm.$('[data-reveal="1"]')),
  amico: await ami.$eval('#dayview', e=>e.querySelector('.covered') ? 'coperto' : e.querySelector('.notes') ? 'dettagli' : e.querySelector('.act') ? 'titoli' : 'altro'),
});
const tappa = async (nome, t, atteso, prima) => {
  await vai(t); if (prima) await prima();
  /* l'orologio finto a volte salta il controllo dei 30 secondi: se serve, passano altri 31 secondi (al massimo 2 volte) */
  const diverso = s => Object.entries(atteso).filter(([k, v]) => s[k] !== v);
  let s = await stato(), salti = 1;
  while (diverso(s).length && salti < 3){ for (const pg of [adm, ami]){ await pg.clock.fastForward(31000); await pg.waitForTimeout(150); } s = await stato(); salti++; }
  R.push({tappa:nome, salti, ...s}); console.error(nome, salti, JSON.stringify(s));
  for (const [k, v] of diverso(s)) bad.push(`${nome}: ${k} = ${s[k]} invece di ${v}`);
};
const dai = async (pid) => { await adm.tap(`.row[data-open="${pid}"]`); await adm.tap('[data-give="p:p0"]'); await adm.tap('#sh-close'); await adm.waitForTimeout(150); };
await adm.tap('[data-tab="programma"]');

await tappa('30/11 23:59', new Date(2026,10,30,23,59,0), {amico:'coperto', puntiAperti:false});
await tappa('1/12 00:01', new Date(2026,11,1,0,1,0), {amico:'titoli', puntiAperti:false});
await tappa('20/12 23:59', new Date(2026,11,20,23,59,0), {amico:'titoli', puntiAperti:false});
await tappa('21/12 00:01', new Date(2026,11,21,0,1,0), {amico:'dettagli', puntiAperti:false});
await tappa('21/12 06:01', new Date(2026,11,21,6,1,0), {oggi:'2026-12-21', amico:'dettagli', puntiAperti:false});
await tappa('21/12 18:59', new Date(2026,11,21,18,59,0), {oggi:'2026-12-21', puntiAperti:false});
await tappa('21/12 19:01', new Date(2026,11,21,19,1,0), {oggi:'2026-12-21', puntiAperti:true});
await adm.tap('[data-tab="classifica"]'); await dai('g5'); await adm.tap('[data-tab="programma"]');
await tappa('22/12 02:00 (ancora la serata del 21)', new Date(2026,11,22,2,0,0), {oggi:'2026-12-21', puntiAperti:true});
await tappa('22/12 06:01', new Date(2026,11,22,6,1,0), {oggi:'2026-12-22', puntiAperti:true});
for (const d of [23,24,25]) await tappa(`${d}/12 21:00`, new Date(2026,11,d,21,0,0), {oggi:`2026-12-${d}`, puntiAperti:true});
await tappa('26/12 06:01', new Date(2026,11,26,6,1,0), {oggi:'2026-12-26', puntiAperti:true});
const cop = await ami.$eval('#count', e=>e.textContent.replace(/\s+/g,' ').trim()); R.push({amico26: cop});
if (!/coperta/i.test(cop)) bad.push('26/12: per l\'amico la classifica non risulta coperta');
await tappa('27/12 22:59', new Date(2026,11,27,22,59,0), {oggi:'2026-12-27', puntiAperti:true, certificati:false});
await tappa('27/12 23:01', new Date(2026,11,27,23,1,0), {oggi:'2026-12-27', puntiAperti:false, certificati:true});
await tappa('28/12 00:01', new Date(2026,11,28,0,1,0), {puntiAperti:false, vincitore:true});

console.table(R); console.log(errs, bad.length ? 'NON VA:\n'+bad.join('\n') : 'tutto ok'); await b.close();
if (errs.length || bad.length) process.exitCode = 1;
