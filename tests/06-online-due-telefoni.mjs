import { chromium, devices } from 'playwright';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const rows = new Map(); const ADMINS = ['admin@settimana.it']; const pages = [];
const revealed = () => !!rows.get('settings|main')?.data?.revealed;
const canSee = (pg, r) => pg.sess === 'admin@settimana.it' || (!r.data.trial && (revealed() || !['points','extras'].includes(r.col) || (r.data.day||'') < '2026-12-26'));
async function push(r, type){ for (const pg of pages){ if (type === 'DELETE' || canSee(pg, r)) await pg.page.evaluate(([t, row]) => window.__sbEvent('postgres_changes', {eventType:t, new: t==='DELETE'?{}:row, old:{col:row.col,id:row.id}}), [type, r]).catch(()=>{}); } }
async function handler(pg, op, args){
  const isAdmin = ADMINS.includes(pg.sess);
  if (op === 'select') return {data:[...rows.values()].filter(r => canSee(pg, r)).map(r => ({col:r.col,id:r.id,data:r.data})), error:null};
  if (op === 'upsert'){ if (!isAdmin) return {error:{code:'42501', message:'RLS'}}; const k = args.col+'|'+args.id, t = rows.has(k)?'UPDATE':'INSERT'; rows.set(k, args); setTimeout(()=>push(args,t), 20); return {error:null}; }
  if (op === 'delete'){ if (!isAdmin) return {data:[], error:null}; const k = args.col+'|'+args.id; const r = rows.get(k); if (!r) return {data:[],error:null}; rows.delete(k); setTimeout(()=>push(r,'DELETE'),20); return {data:[{id:args.id}], error:null}; }
  if (op === 'rpc') return {data: isAdmin, error:null};
  if (op === 'getSession') return {data:{session: pg.sess ? {user:{email:pg.sess}} : null}};
  if (op === 'signIn'){ if (args.password !== 'segreta') return {error:{message:'bad'}}; pg.sess = args.email; return {error:null}; }
  if (op === 'signOut'){ pg.sess = null; return {error:null}; }
  if (op === 'broadcast'){ for (const o of pages) if (o !== pg) await o.page.evaluate(m => window.__sbEvent('broadcast', m), args).catch(()=>{}); return {}; }
}
const b = await chromium.launch(); const R = {}; const errs = [];
async function phone(time){
  const ctx = await b.newContext({...devices['iPhone 13']}); const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  page.on('pageerror', e => errs.push(e.message));
  const pg = {page, sess:null}; pages.push(pg);
  await page.exposeFunction('__sb', (op, args) => handler(pg, op, args));
  await page.addInitScript(mock);
  await page.clock.install({time});
  await page.goto('file://' + process.cwd() + '/online-test/index.html'); await page.waitForTimeout(500);
  return page;
}
const setTime = async (t) => { for (const {page} of pages){ await page.clock.setSystemTime(t); await page.clock.runFor(31000); } };
const admin = await phone(new Date(2026,11,24,21,0)); const amico = await phone(new Date(2026,11,24,21,0));
R.amicoPrimaDelSeed = await amico.$$eval('.row', e=>e.length);
// login admin
await admin.tap('#adm-fab'); await admin.fill('#in-email','admin@settimana.it'); await admin.fill('#in-pin','sbagliata'); await admin.tap('#pin-go'); await admin.waitForTimeout(200);
R.passwordSbagliata = await admin.textContent('.toast');
await admin.fill('#in-pin','segreta'); await admin.tap('#pin-go'); await admin.waitForTimeout(1500);
R.adminRighe = await admin.$$eval('.row', e=>e.length); R.amicoRighe = await amico.$$eval('.row', e=>e.length);
// punto il 24
await admin.tap('.row[data-open="g5"]'); await admin.tap('[data-give="p:p0"]'); await admin.tap('#sh-close'); await admin.waitForTimeout(300);
R.amicoMary24 = await amico.$eval('[data-tot="g5"]', e=>e.textContent);
// l'amico prova a scrivere da solo
R.amicoScrive = await amico.evaluate(async () => (await window.supabase.createClient().from('docs').upsert({col:'points',id:'x',data:{playerId:'g0',delta:99}})).error?.code);
// il 26
await setTime(new Date(2026,11,26,21,0)); await admin.waitForTimeout(300);
await admin.tap('.row[data-open="g5"]'); await admin.tap('[data-give="p:p1"]'); await admin.tap('#sh-close'); await admin.waitForTimeout(400);
R.admin26 = await admin.$eval('[data-tot="g5"]', e=>e.textContent);
R.amico26 = await amico.$eval('[data-tot="g5"]', e=>e.textContent);
await amico.tap('[data-tab="storico"]'); R.amicoStorico26 = await amico.$$eval('.lev .lt', e=>e.map(x=>x.textContent)); await amico.tap('[data-tab="classifica"]');
// prova dell'admin: l'amico non deve vederla
await admin.tap('#adm-fab'); await admin.tap('[data-trial="2026-12-26"]'); await admin.tap('.row[data-open="g0"]'); await admin.tap('[data-give="p:p0"]'); await admin.tap('#sh-close'); await admin.waitForTimeout(300);
R.amicoVedeProva = await amico.evaluate(()=>document.body.innerText.includes('prova'));
await admin.tap('#trial-exit'); await admin.waitForTimeout(400);
// cerimonia
await setTime(new Date(2026,11,28,0,10)); await admin.waitForTimeout(500);
await admin.tap('[data-reveal="1"]'); await admin.waitForTimeout(500);
R.amicoCerimonia = await amico.isVisible('#cer');
for (let i=0;i<40;i++){ const n = await admin.$('#cer:not(.winner) [data-cer="next"]'); if (n){ await n.evaluate(e=>e.click()); await admin.waitForTimeout(400);} }
await admin.waitForTimeout(800);
R.amicoVincitore = await amico.$eval('.win-stage', e=>e.textContent.replace(/\s+/g,' ').trim()).catch(()=>null);
await amico.screenshot({path:'look/9-amico-cerimonia.png'});
await admin.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await admin.waitForTimeout(300); await admin.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await admin.waitForTimeout(300); await admin.$eval('[data-cer="close"]', e=>e.click()); await admin.waitForTimeout(500);
R.amicoCerimoniaChiusa = !(await amico.isVisible('#cer'));
R.amicoMaryDopo = await amico.$eval('[data-tot="g5"]', e=>e.textContent);
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
