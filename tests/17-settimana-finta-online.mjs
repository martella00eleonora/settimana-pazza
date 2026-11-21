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
const T = new Date(2026,10,20,21,0);
const admin = await phone(T); const amico = await phone(T);
await admin.tap('#adm-fab'); await admin.fill('#in-email','admin@settimana.it'); await admin.fill('#in-pin','segreta'); await admin.tap('#pin-go'); await admin.waitForTimeout(1500);
await admin.tap('#adm-fab'); await admin.tap('#trial-fill'); await admin.$eval('#trial-fill', e=>e.click()); await admin.waitForTimeout(400); await admin.$eval('[data-trial="closing-live"]', e=>e.click()); R.bloccato = await admin.textContent('.toast');  const t0 = Date.now(); while (!((await admin.textContent('.toast').catch(()=>'')) || '').includes('pronta') && Date.now() - t0 < 30000) await admin.waitForTimeout(200); R.secondi = Math.round((Date.now() - t0) / 100) / 10;
R.toast = await admin.textContent('.toast').catch(()=>null);
R.inDb = [...rows.values()].filter(r => r.data.trial).length;
R.amicoVedeProva = await amico.evaluate(()=>document.body.innerText.includes('Settimana finta') || document.querySelectorAll('.row .tot').length && [...document.querySelectorAll('.row .tot')].some(e=>e.textContent!=='0'));
await admin.tap('#adm-fab'); await admin.tap('[data-trial="closing-live"]'); await admin.tap('[data-trial="closing-live"]'); await admin.waitForTimeout(3800);
for (let i=0;i<60;i++){ const n = await admin.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await admin.waitForTimeout(300); }
await admin.waitForTimeout(5000);
R.adminWin = await admin.textContent('.win-name'); R.amicoWin = await amico.textContent('.win-name').catch(()=>null);
// avanti fino a «Chiudi» (dopo il vincitore: podio completo e ringraziamenti)
for (let i=0;i<5 && !(await admin.$('[data-cer="close"]'));i++){ await admin.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await admin.waitForTimeout(400); } await admin.$eval('[data-cer="close"]', e=>e.click()); await admin.waitForTimeout(500);
await admin.tap('#adm-fab'); await admin.tap('[data-trial=""]'); const t1 = Date.now(); while (!((await admin.textContent('.toast:last-child').catch(()=>'')) || '').includes('Prova finita') && Date.now() - t1 < 30000) await admin.waitForTimeout(200); R.secondiUscita = Math.round((Date.now() - t1) / 100) / 10; await admin.waitForTimeout(300);
R.inDbDopo = [...rows.values()].filter(r => r.data.trial).length;
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
