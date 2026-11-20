/* Prepara le copie del sito e lancia le prove una dopo l'altra.
   Uso:  node esegui.mjs            tutte le prove
         node esegui.mjs 09 14      solo quelle che iniziano con 09 e 14

   Le prove non toccano mai il database vero: lavorano su due copie del sito in .tmp/
   - local-test/   con js/config.js vuoto (tutto nel browser)
   - online-test/  con un indirizzo finto: al posto di Supabase risponde mock-supabase.js */
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const qui = path.dirname(fileURLToPath(import.meta.url)), sito = path.resolve(qui, '..'), tmp = path.join(qui, '.tmp');
fs.rmSync(tmp, {recursive: true, force: true}); fs.mkdirSync(path.join(tmp, 'look'), {recursive: true});
for (const [nome, config] of [['local-test', 'const SUPABASE_URL = "";\nconst SUPABASE_ANON_KEY = "";\n'],
                              ['online-test', 'const SUPABASE_URL = "https://finto.supabase.co";\nconst SUPABASE_ANON_KEY = "chiave-finta";\n']]){
  const dst = path.join(tmp, nome);
  for (const f of ['index.html', 'css', 'js', 'foto/profili']) fs.cpSync(path.join(sito, f), path.join(dst, f), {recursive: true});
  fs.writeFileSync(path.join(dst, 'js/config.js'), config);
}
const filtro = process.argv.slice(2);
const prove = fs.readdirSync(qui).filter(f => /^\d\d-.*\.mjs$/.test(f) && (!filtro.length || filtro.some(x => f.startsWith(x)))).sort();
let ok = 0;
for (const f of prove){
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(qui, f)], {cwd: tmp, encoding: 'utf8', timeout: 300000});
  const passata = r.status === 0;
  if (passata) ok++;
  console.log(`${passata ? 'OK      ' : 'FALLITA '} ${f.padEnd(48)} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  fs.writeFileSync(path.join(tmp, 'look', f.replace('.mjs', '.txt')), (r.stdout || '') + (r.stderr || ''));
}
console.log(`\n${ok} su ${prove.length} passate. Risultati e foto in tests/.tmp/look/`);
process.exitCode = ok === prove.length ? 0 : 1;
