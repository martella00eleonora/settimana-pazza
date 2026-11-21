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
// Jolly presidenziale sul sito online (con il database finto): l'admin, in prova il 22, dà a Mary tutti i bonus dal suo pannello.
// Deve comparire l'avviso, e il Jolly deve contare anche con un bonus salvato con il testo vecchio.
const T = new Date(2026,10,21,21,0);
const admin = await phone(T);
await admin.tap('#adm-fab'); await admin.fill('#in-email','admin@settimana.it'); await admin.fill('#in-pin','segreta'); await admin.tap('#pin-go'); await admin.waitForTimeout(1500);
await admin.tap('#adm-fab'); await admin.tap('[data-trial="2026-12-22"]'); await admin.waitForTimeout(400);
// un bonus dato prima del cambio dei testi (testo vecchio, stesso nome)
rows.set('points|vecchio', {col:'points', id:'vecchio', data:{playerId:'g5', delta:1, reason:'Bonus Bardahan · bevi un alcolico', activityId:'', day:'2026-12-22', at:new Date('2026-12-22T21:30').getTime(), trial:true}});
await admin.reload(); await admin.waitForTimeout(1500);
R.avvisi = [];
for (const k of ['p1','p2','p9','p10']){ await admin.tap('.row[data-open="g5"]'); await admin.$eval(`[data-give="p:${k}"]`, e=>e.click()); await admin.waitForTimeout(500); R.avvisi.push(await admin.textContent('.toast:last-child').catch(()=>null)); await admin.tap('#sh-close'); }
R.totMary = await admin.$eval('.row[data-open="g5"] .tot', e=>e.textContent);
await admin.tap('[data-tab="storico"]'); await admin.waitForTimeout(400);
R.storico = await admin.$$eval('.lev', els => els.map(e => e.innerText.replace(/\s+/g,' ').trim()).filter(t => t.includes('Jolly')));
console.log(JSON.stringify(R, null, 1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
