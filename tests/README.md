# tests/ — le prove automatiche

Queste sono le prove usate durante lo sviluppo per controllare il sito dopo ogni modifica.
Ogni prova apre il sito in un **browser comandato da uno script** (Playwright), su un iPhone 13 simulato, fa quello che farebbe una persona (tocca, scrive, aspetta) e scrive cosa ha visto.

## Come si lanciano

Serve [Node.js](https://nodejs.org) (versione 18 o più recente). Dentro questa cartella:

```bash
npm install                     # scarica Playwright (una volta sola)
npx playwright install chromium # scarica il browser (una volta sola)
npm run prove                   # tutte le prove, una dopo l'altra (qualche minuto)
node esegui.mjs 09 14           # solo le prove 09 e 14
```

Per ogni prova esce `OK` o `FALLITA`. Quello che ogni prova ha scritto, e le foto delle schermate, finiscono in `tests/.tmp/look/`.

**Le prove non toccano mai il database vero.** `esegui.mjs` prepara due copie del sito in `.tmp/`:

- `local-test/`: `js/config.js` vuoto, quindi tutto resta nel browser;
- `online-test/`: un indirizzo finto. Al posto di Supabase risponde `mock-supabase.js`, un piccolo database finto che applica le stesse regole di quello vero: scrive solo l'admin, dal 26 i punti non arrivano a chi guarda, i dati di prova li vede solo l'admin.

## Le prove

| Prova | Cosa controlla |
|---|---|
| 01 settimana completa | la settimana dal 21 al 28 con un orologio finto: punti, Malus Ele, Jolly presidenziale, copertura, certificati, cerimonia, cosa vede chi guarda |
| 02 quattro telefoni e cambio giornata | quattro modelli di telefono; alle 5:58 è ancora la serata prima, alle 6 cambia |
| 03 sera del 27 | alle 22:30 si danno punti, alle 23:05 solo certificati, alle 00:01 è tutto chiuso |
| 04 copertura del 26 e 27 | chi guarda vede "??", l'admin i numeri; la prova di una giornata si cancella uscendo |
| 05 Jolly presidenziale | con tutti i bonus fissi scatta il Jolly (+2, oppure toglie un malus già preso; i malus dopo valgono −1); i malus delle attività non fanno scattare il Malus Ele |
| 06 online, due telefoni | admin e amico con il database finto: accesso, punti in diretta, copertura, cerimonia vista dall'amico |
| 07 Ieri in breve e dati di prova | Mostra/Nascondi del riepilogo e la pulizia dei dati della prova generale |
| 08 cerimonia dall'ultimo al primo | i passi della classifica, il vincitore, i coriandoli, la chiusura |
| 09 cerimonia completa | messaggio del Presidente, numeri, giornate, titoli, certificati uno alla volta |
| 10 punti chiusi al primo certificato | dopo il primo certificato niente più punti; dopo la cerimonia di prova tutto bloccato |
| 11 classifica per giornata dopo la prova | dopo la cerimonia di prova si vedono ancora tutte le giornate |
| 12 schermi diversi | iPhone SE, iPhone 13, Pixel 7, iPad e computer: nessuna pagina più larga dello schermo |
| 13 podio coperto | dopo il 4° posto il podio coperto, poi 3°, 2° e vincitore, con i pulsanti giusti |
| 14 cerimonia in diretta | la prova normale l'amico non la vede, quella in diretta sì; audio da attivare; ringraziamenti; niente scoperto davvero |
| 15 suoni e schermo acceso | i suoni partono, lo schermo resta acceso durante la cerimonia, il pulsante 🔊 si ricorda la scelta |
| 16 settimana finta | il pulsante crea i dati, la cerimonia ha titoli e certificati, uscendo dalla prova non resta niente |
| 17 settimana finta online | lo stesso online: velocità, prova bloccata mentre prepara, database pulito dopo |
| 18 foto con sfondo colorato | quali foto compaiono in Regole, nel Direttivo e nei ringraziamenti |
| 19 bonus e malus nuovi e Malus Ele | entrando da admin i bonus e malus del database diventano quelli di `js/dati.js`; lo stesso malus ripetuto vale come Malus Ele; dopo 2 volte (Federica dopo 1) il malus non si assegna più |
| 20 Jolly presidenziale online | con il database finto: l'avviso del Jolly compare e conta anche un bonus salvato con il testo vecchio |

## Come sono scritte

Ogni file è uno script a sé, letto dall'alto in basso. Lo schema è quasi sempre questo:

```js
import { chromium, devices } from 'playwright';
const b = await chromium.launch();                                   // apre il browser
const ctx = await b.newContext({...devices['iPhone 13']});            // finge di essere un iPhone 13
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));      // raccoglie gli errori JavaScript della pagina
const R = {};                                                        // qui finisce quello che la prova "vede"

await pg.clock.install({time: new Date(2026, 11, 24, 21, 0)});       // orologio finto: il 24 dicembre alle 21
await pg.goto('file://' + process.cwd() + '/local-test/index.html'); // apre la copia del sito
await pg.tap('#adm-fab'); await pg.fill('#in-pin', '1234'); await pg.tap('#pin-go');   // entra come admin
R.bottone = await pg.isVisible('#cert-btn');                         // guarda se un bottone c'è
console.log(R, errs);
```

Alcuni strumenti che tornano spesso:

- **`pg.clock.install` e `pg.clock.setSystemTime`**: l'orologio finto. È il modo per provare il 27 alle 23 o la mezzanotte del 28 senza aspettare dicembre.
- **`localStorage`**: in locale i dati stanno lì. Molte prove li scrivono direttamente (`pg.evaluate(...)`) per partire da una classifica già pronta.
- **`e => e.click()`** invece di `pg.tap(...)`: i pulsanti che pulsano o si muovono (come "Svela il vincitore") per Playwright non sono mai "fermi", quindi si cliccano dall'interno della pagina.
- **`#cer:not(.winner) [data-cer="next"]`**: va avanti nella cerimonia fermandosi sulla scena del vincitore, per poterla controllare.
- **Il database finto** (prove 06, 14, 17): ogni telefono ha la sua pagina; `mock-supabase.js` sostituisce la libreria di Supabase e passa ogni richiesta allo script, che tiene i dati in memoria e applica le regole.

**Cosa conta come fallita**: la prova si blocca (un bottone che non compare, un passo che non si riesce a fare) oppure nella pagina c'è un errore JavaScript. Il resto, cioè i valori in `R`, va letto: le prove sono nate per essere guardate insieme alle foto, non per dare solo un sì o un no.

## Da sapere

- Sono state scritte per il calendario reale del 2026: provano date di novembre e dicembre 2026 con l'orologio finto.
- Le prove della **modalità prova** (04, 07, 10, 11, 14, 16, 17) smetteranno di servire quando prima del 21 dicembre si toglieranno dall'Area admin "Prova una giornata", "Settimana finta" e "Cerimonia in diretta".
- Qualche prova a volte si ferma per lentezza del computer (un'animazione non ancora finita): rilanciandola da sola di solito passa.
