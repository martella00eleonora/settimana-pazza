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
// novembre, prima della settimana: prova del 27 con punti e un certificato, poi cerimonia in diretta
const T = new Date(2026,10,20,21,0);
const admin = await phone(T); const amico = await phone(T);
await admin.tap('#adm-fab'); await admin.fill('#in-email','admin@settimana.it'); await admin.fill('#in-pin','segreta'); await admin.tap('#pin-go'); await admin.waitForTimeout(1500);
await admin.tap('#adm-fab'); await admin.tap('[data-trial="2026-12-27"]'); await admin.waitForTimeout(300);
for (const [g,p] of [['g0','p0'],['g2','p1'],['g2','p0'],['g5','p1']]){ await admin.tap(`.row[data-open="${g}"]`); await admin.$eval(`[data-give="${p}"]`.replace('="','="p:'), e=>e.click()); await admin.tap('#sh-close'); await admin.waitForTimeout(150); }
await admin.tap('#cert-btn'); await admin.fill('#ce-label','Miglior ballerino'); await admin.tap('[data-csel="g5"]'); await admin.tap('#ce-go'); await admin.waitForTimeout(200); await admin.tap('#sh-close');
// la prova normale non arriva all'amico
await admin.tap('#adm-fab'); await admin.tap('[data-trial="closing"]'); await admin.waitForTimeout(800);
R.amicoVedeProvaNormale = await amico.isVisible('#cer');
await admin.evaluate(()=>{ document.querySelector('#cer')?.remove(); }); await admin.reload(); await admin.waitForTimeout(1500);
// prova in diretta: serve il secondo tocco
await admin.tap('#adm-fab'); R.liveChip = await admin.isVisible('[data-trial="closing-live"]');
await admin.tap('[data-trial="closing-live"]'); await admin.waitForTimeout(300); R.dopoPrimoTocco = await amico.isVisible('#cer');
await admin.tap('[data-trial="closing-live"]'); await admin.waitForTimeout(800);
R.amicoCer = await amico.isVisible('#cer'); R.amicoAudio = await amico.textContent('#cer-audio'); R.amicoNota = await amico.textContent('.cer-trial').catch(()=>null);
await amico.waitForTimeout(3000); await amico.screenshot({path:'look/j-amico0.png'});
for (let i=0;i<60;i++){ const n = await admin.$('#cer:not(.winner) [data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await admin.waitForTimeout(350); }
await admin.waitForTimeout(6000);
R.amicoVincitore = await amico.textContent('.win-name').catch(()=>null); await admin.$eval('[data-cer="next"]', e=>e.click()); await admin.waitForTimeout(800); R.amicoGrazie = await amico.textContent('.ty-h').catch(()=>null); await amico.$eval('#cer-audio', e=>e.click()); await amico.waitForTimeout(300); R.amicoAudioDopo = await amico.textContent('#cer-audio');
await amico.screenshot({path:'look/j-amico-win.png'});
await admin.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await admin.waitForTimeout(300); await admin.$eval('[data-cer="close"]', e=>e.click()); await admin.waitForTimeout(600);
R.amicoChiusa = !(await amico.isVisible('#cer'));
R.rivelata = !!rows.get('settings|main')?.data?.revealed;
R.amicoClassifica = await amico.$$eval('.row .tot', e=>e.slice(0,3).map(x=>x.textContent));
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
