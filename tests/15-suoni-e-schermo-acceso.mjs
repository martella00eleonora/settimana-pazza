import { chromium, devices } from 'playwright';
const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
// conta i suoni: intercetta gli oscillatori e i rumori creati
await pg.addInitScript(()=>{ window.__snd=0; const C = window.AudioContext; if (C){ const o = C.prototype.createOscillator, n = C.prototype.createBufferSource; C.prototype.createOscillator = function(){ window.__snd++; return o.call(this); }; C.prototype.createBufferSource = function(){ window.__snd++; return n.call(this); }; }
  window.__wake = 0; Object.defineProperty(navigator, 'wakeLock', {value:{request: async ()=>{ window.__wake++; return {release: async ()=>{ window.__wake--; }, addEventListener(){} }; }}}); });
const K='settimana-pazza-winter-26-27-v5';
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); let n=0; const sc={g0:5,g1:3,g2:7,g3:2,g4:1,g5:6,g6:0,g7:-1,g8:-2,g9:4,g10:1,g11:-3};
 for (const [pid,v] of Object.entries(sc)) d.points['x'+(n++)]={playerId:pid,delta:v,reason:'Prova',activityId:'',day:'2026-12-22',at:1}; localStorage.setItem(k,JSON.stringify(d));},K); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.waitForTimeout(300); await pg.tap('[data-trial="closing"]'); await pg.waitForTimeout(3600);
R.wakeOn = await pg.evaluate(()=>window.__wake); R.audioBtn = await pg.textContent('#cer-audio');
const s0 = await pg.evaluate(()=>window.__snd);
for (let i=0;i<60 && !(await pg.$('.ty-stage'));i++){ const n = await pg.$('[data-cer="next"]'); if (!n) break; await n.evaluate(e=>e.click()); await pg.waitForTimeout(150); }
R.sounds = (await pg.evaluate(()=>window.__snd)) - s0;
await pg.waitForTimeout(3800); await pg.screenshot({path:'look/k-thanks.png'});
await pg.evaluate(()=>document.querySelector('#cer').scrollTo(0,9999)); await pg.waitForTimeout(300); await pg.screenshot({path:'look/k-thanks2.png'});
await pg.tap('#cer-audio'); await pg.waitForTimeout(200); R.muted = await pg.evaluate(()=>localStorage.getItem('sp-audio'));
await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="next"]', e=>e.click()).catch(()=>{}); await pg.waitForTimeout(300); await pg.$eval('[data-cer="close"]', e=>e.click()); await pg.waitForTimeout(300); R.closed = !(await pg.$('#cer')); R.wakeOff = await pg.evaluate(()=>window.__wake);
console.log(JSON.stringify(R), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
