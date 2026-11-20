import { chromium, devices } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 13']}); const pg = await ctx.newPage(); pg.setDefaultTimeout(8000);
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const R={};
const K='settimana-pazza-winter-26-27-v5';
await pg.clock.install({time: new Date(2026,11,27,23,15)});
await pg.goto('file://'+process.cwd()+'/local-test/index.html'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
await pg.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)); let n=0; const add=(pid,v,r,day,extra={})=>d.points['x'+(n++)]={playerId:pid,delta:v,reason:r,activityId:'',day,at:new Date(day+'T22:00').getTime()+n,...extra};
 add('g11',-1,'Malus Jacopo · bestemmi','2026-12-21'); add('g11',-1,'Malus Jacopo · bestemmi','2026-12-22'); add('g0',-1,'Malus Jacopo · bestemmi','2026-12-22');
 add('g5',1,'Bonus Bardahan · alcolico','2026-12-21'); add('g5',1,'Bonus Bardahan · alcolico','2026-12-23'); add('g3',1,'Bonus Coronaus · oggi guidi tu','2026-12-24');
 add('g2',1,'Jolly presidenziale · Malus Mary · hai sonno, chiudi gli occhi','2026-12-25',{jolly:true}); add('g6',-1,'Malus Antonio · scrolli i social','2026-12-26');
 d.extras={m1:{day:'2026-12-23',label:'Braccio di ferro',delta:1,once:true,createdAt:1}}; add('g1',1,'Braccio di ferro','2026-12-23');
 localStorage.setItem(k,JSON.stringify(d));},K); await pg.reload(); await pg.waitForTimeout(300);
await pg.tap('#adm-fab'); await pg.fill('#in-pin','1234'); await pg.tap('#pin-go'); await pg.waitForTimeout(300);
await pg.tap('#cert-btn'); await pg.waitForTimeout(300);
await pg.fill('#ce-label','Miglior ballerino'); await pg.tap('[data-csel="g5"]'); await pg.tap('#ce-go'); await pg.waitForTimeout(200); await pg.fill('#ce-label','Re del karaoke'); await pg.tap('[data-csel="g0"]'); await pg.tap('[data-csel="g2"]'); await pg.tap('#ce-go'); await pg.waitForTimeout(200);
await pg.fill('#msg-text','Il Direttivo dichiara chiusa la Settimana Pazza Winter Edition 2026.\nGrazie a tutti, siete stati pazzi al punto giusto!');
await pg.tap('#msg-go'); await pg.waitForTimeout(200); R.toast = await pg.textContent('.toast'); R.btn = await pg.textContent('#msg-go');
await pg.evaluate(()=>document.querySelector('#f-msg').scrollIntoView()); await pg.screenshot({path:'look/f-msg.png'});
await pg.tap('#sh-close');
await pg.clock.setSystemTime(new Date(2026,11,28,0,5)); await pg.reload(); await pg.waitForTimeout(400);
await pg.tap('[data-reveal="1"]'); await pg.waitForTimeout(3600);
R.msgShown = (await pg.textContent('.pres-msg blockquote').catch(()=>null));
await pg.waitForTimeout(2500); await pg.screenshot({path:'look/f-0.png'}); await pg.evaluate(()=>document.querySelector('.pr-dir').scrollIntoView({block:'center'})); await pg.waitForTimeout(300); await pg.screenshot({path:'look/f-0c.png'}); await pg.evaluate(()=>document.querySelector('#cer').scrollTo(0,0)); await pg.evaluate(()=>document.querySelector('#cer').scrollTo(0,9999)); await pg.waitForTimeout(300); await pg.screenshot({path:'look/f-0b.png'});
const next = async () => { await pg.$eval('[data-cer="next"]', e=>e.click()); await pg.waitForTimeout(2200); };
await next(); await pg.waitForTimeout(1800); R.stats = await pg.$$eval('.stat', e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim())); await pg.screenshot({path:'look/f-1.png'});
await next(); await pg.waitForTimeout(2600); R.days = await pg.$$eval('.door', e=>e.length); await pg.screenshot({path:'look/f-2.png'});
R.titles=[]; await next(); for (let i=0;i<10 && await pg.$('.tbig:not(.cbig)');i++){ R.titles.push((await pg.textContent('.tb-name'))); if(i===2) await pg.screenshot({path:'look/f-3.png'}); if(i===6){ await pg.waitForTimeout(1200); await pg.screenshot({path:'look/f-4.png'}); } await next(); }
R.ci = !!(await pg.$('.ci-stage')); await pg.waitForTimeout(1500); await pg.screenshot({path:'look/f-5.png'}); await next(); R.certs=[]; for (let i=0;i<5 && await pg.$('.cbig');i++){ R.certs.push(await pg.textContent('.cbig .tb-name')); if(i===1) await pg.screenshot({path:'look/f-4.png'}); await next(); } R.nextLabel = await pg.textContent('[data-cer="next"]');
for (let i=0;i<20;i++){ const n = await pg.$('#cer:not(.winner) [data-cer="next"]'); if (n){ await n.evaluate(e=>e.click()); await pg.waitForTimeout(150);} }
R.winner = await pg.textContent('.win-name');
console.log(JSON.stringify(R,null,1), errs); await b.close();
if (errs.length) process.exitCode = 1;   // errori JavaScript nella pagina = prova fallita
