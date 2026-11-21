# Settimana Pazza · Winter Edition 2026 — il lavoro fatto

Il racconto di come è nato il segnapunti e di cosa fa, pezzo per pezzo, scritto per chi vuole studiarne il codice.
Il sito è online su <https://martella00eleonora.github.io/settimana-pazza/>; il codice è in questo repository.

- [1. L'idea](#1-lidea)
- [2. Come è fatto, in breve](#2-come-è-fatto-in-breve)
- [3. Le schede dell'app](#3-le-schede-dellapp)
- [4. Le regole del gioco che l'app applica da sola](#4-le-regole-del-gioco-che-lapp-applica-da-sola)
- [5. L'Area admin](#5-larea-admin)
- [6. La versione online](#6-la-versione-online)
- [7. La cerimonia di chiusura](#7-la-cerimonia-di-chiusura)
- [8. La prova generale](#8-la-prova-generale)
- [9. Come è stato provato](#9-come-è-stato-provato)
- [10. Problemi incontrati e come sono stati risolti](#10-problemi-incontrati-e-come-sono-stati-risolti)
- [11. Cronologia](#11-cronologia)
- [12. Cosa resta da fare prima del 21 dicembre](#12-cosa-resta-da-fare-prima-del-21-dicembre)
- [13. Come studiare il codice](#13-come-studiare-il-codice)

---

## 1. L'idea

Dodici amici, una settimana (lunedì 21 – domenica 27 dicembre 2026), una sfida a punti con bonus, malus, serate a tema e una premiazione finale.
Serviva qualcosa che:

- facesse segnare i punti a **una sola persona**, l'admin;
- facesse vedere a **tutti gli altri**, dal proprio telefono, classifica, programma, storico e regole;
- tenesse **la suspense**: dal 26 la classifica è coperta, e si scopre solo alla cerimonia del 28 a mezzanotte;
- avesse un'aria **festiva**: notte d'inverno blu, oro, rosso, neve, lucine.

Il Direttivo: **Giorgio** (Presidente), **Laura** (Vicepresidente), **Ele** e **Coronaus** (Assessori).
Gli appunti di partenza erano le foto di alcuni fogli scritti a mano con il programma e la lista dei bonus e malus.

## 2. Come è fatto, in breve

È un **sito statico**: solo HTML, CSS e JavaScript, senza framework e senza nessuna installazione.

| Pezzo | Cosa fa |
|---|---|
| `index.html` | lo scheletro della pagina: intestazione, quattro schede, barra in basso, Area admin |
| `css/style.css` | tutta la grafica e le animazioni |
| `js/dati.js` | i dati di partenza: giocatori, programma, bonus e malus, foto |
| `js/app.js` | tutta la logica: calendario, punti, regole, schermate, cerimonia, suoni |
| `js/db-online.js` | il collegamento al database online (Supabase) |
| `js/config.js` | l'indirizzo e la chiave pubblica del database |
| `supabase/schema.sql` | la tabella del database e le regole su chi legge e chi scrive |

Ogni cartella ha un suo `README.md` che spiega i file nel dettaglio. Le prove automatiche sono in `tests/`.

**Dove sta il sito.** GitHub Pages pubblica il ramo `main` di questo repository: ogni modifica caricata su GitHub arriva online in circa un minuto.

**Dove stanno i dati.** In un database **Supabase** (piano gratuito). Senza database (`js/config.js` vuoto) l'app funziona lo stesso, salvando tutto nel browser di un solo dispositivo: è il modo in cui si prova il codice sul proprio computer.

**Le scelte principali, e perché:**

- *Niente framework* (React, Vue…): una pagina sola, pochi file, si apre con un doppio clic e si capisce leggendo.
- *Un'unica tabella `docs`* nel database, con dentro documenti JSON divisi per "collezione" (`players`, `points`, …). È come un archivio a cartelle: semplice da leggere e da copiare in locale.
- *Le regole di sicurezza nel database*, non nell'app: anche chi smanetta col telefono non può scrivere punti né vedere quelli coperti.
- *I suoni generati dal browser* (Web Audio): nessun file audio da scaricare.

## 3. Le schede dell'app

**Testata.** Titolo, ghirlanda di abete con bacche e fiocchi, le sette giornate come palline appese a un filo dorato (oro = passata, rossa = oggi, blu = da venire), neve che cade e conto alla rovescia verso il 21.

**Classifica.**
- Podio con nomi e punti grandi, corona sul primo.
- Card di ogni giocatore con medaglia, freccia rispetto a ieri (salito/sceso), distanza dal primo e ruolo nel Direttivo.
- Toccando una persona si apre il suo pannello con tutti i bonus e malus presi.
- Due modi: **Settimana** e **Per giornata** (si sceglie il giorno con i bottoni; compaiono solo le giornate già iniziate).
- Dal 26: classifica coperta con "??" per chi non è admin.

**Programma.** Le giornate una per una, con le attività come card (titolo, dress code, note, regole a punti con chi le ha prese). Per l'admin c'è "Segna chi" su ogni regola. Le mini-sfide create al volo hanno la loro card.

**Storico.** In cima "Ieri in breve" (riepilogo della giornata prima, con Mostra/Nascondi). Sotto, filtri a bottoni per giornata e per persona, e le voci raggruppate per giornata in un unico riquadro.

**Regole.** Il Direttivo (Giorgio con la corona), il Jolly presidenziale spiegato, l'elenco dei bonus e malus con la foto di chi li "possiede".

## 4. Le regole del gioco che l'app applica da sola

- **La giornata cambia alle 6 del mattino**: alle 2 di notte si segna ancora sulla serata prima.
- **Programma a tappe**: per chi non è admin è coperto fino al 1° dicembre; dal 1° dicembre si vedono i giorni con i soli titoli delle attività; dal 21 a mezzanotte anche dress code, note e punti.
- **Punti dal 21 alle 19**: prima la settimana è partita ma non si segna niente (in modalità prova invece sì).
- **Bonus e malus** valgono "1 volta al giorno" oppure sono "cumulabili". Su uno da una volta, il secondo tentativo dà un avviso.
- **Malus Ele** (tenacia): se nella stessa giornata una persona prende **di nuovo lo stesso malus**, dalla seconda volta quel −1 vale come Malus Ele (es. inglesismo −1, bestemmia −1, bestemmia di nuovo: −1 di Malus Ele). È cumulabile: ogni ripetizione di ogni malus è un Malus Ele. I malus delle attività del programma e delle mini-sfide non contano. Ogni malus si assegna al massimo 2 volte al giorno (la seconda è il Malus Ele), il Malus Federica una sola volta. L'app lo riconosce da sola dai punti (funzione `allPoints` in `js/app.js`).
- **Bonus, malus e programma** stanno in `js/dati.js` e nell'app non si modificano: quando l'admin entra, l'app allinea il database a quel file (funzione `addMissingSeed`).
- **Jolly presidenziale**: si guadagna prendendo **tutti i bonus fissi** nella stessa giornata e scatta da solo, una volta al giorno. Si decide quando scatta: +2 se fino a quel momento non hai malus, altrimenti te ne toglie uno (+1). I malus che arrivano dopo valgono −1 come sempre. Non è salvato: l'app lo calcola dai punti.
- **Mini-sfide**: l'admin le crea al volo, valgono +1 o −1.
- **26 e 27**: classifica coperta per chi guarda.
- **Il 27 sera**: i punti si chiudono **alle 23 oppure al primo certificato consegnato**. Poi si consegnano solo i certificati (+1 ciascuno) e si scrive il messaggio del Presidente.
- **Il 28 a mezzanotte**: si chiude tutto. Dopo la cerimonia la classifica è scoperta per tutti e niente si può più modificare.

## 5. L'Area admin

Si apre dal pulsante con la chiave, in alto a destra.

- **Accesso**: online con email e password, in locale con un PIN.
- **Prova una giornata**: bottoni dal 21 al 27, più "Cerimonia" ed "Esci dalla prova". I punti di prova li vede solo l'admin e si cancellano uscendo.
- **Riempi con una settimana finta**: crea da sola una settimana di prova già giocata (bonus, malus, Jolly, mini-sfide, certificati, messaggio del Presidente) e porta la prova al 27. Ogni volta i dati sono diversi.
- **Cerimonia**: la prova della cerimonia, solo sul telefono dell'admin.
- **Cerimonia in diretta**: la stessa prova, ma la vedono anche gli amici con il sito aperto, con la scritta "Prova della cerimonia". Si conferma con un secondo tocco.
- **Cancella i dati della prova generale**: compare solo se nel database sono rimasti dati vecchi prima del 21.

## 6. La versione online

- Il sito parla con **Supabase** attraverso la libreria `supabase-js`.
- Tutti i dati stanno nella tabella **`docs`** (`col`, `id`, `data`). `js/db-online.js` imita l'archivio locale (`collection`, `doc`, `set`, `update`, `delete`, `onSnapshot`), così `app.js` funziona uguale in locale e online.
- Gli **aggiornamenti in diretta** usano Realtime: quando l'admin segna un punto, gli altri telefoni lo ricevono subito.
- La **cerimonia in diretta** usa un canale "broadcast": l'admin manda a ogni passo la pagina in cui si trova e la classifica già pronta; gli altri telefoni la seguono.
- Le **regole di sicurezza** (Row Level Security, in `supabase/schema.sql`):
  - scrive solo chi ha fatto l'accesso con un'email presente nella tabella `admins`;
  - chi non è admin non riceve i punti di prova;
  - chi non è admin non riceve punti, mini-sfide e certificati dal 26 in poi finché la cerimonia non è avvenuta. La copertura quindi non si aggira nemmeno guardando il codice della pagina.
- La chiave in `js/config.js` è quella **pubblica** ("publishable"): può stare nel sito, perché sono le regole del database a decidere cosa si può fare.

## 7. La cerimonia di chiusura

Il 28 a mezzanotte l'admin trova **Scopri il vincitore**. Ogni suo tocco porta avanti di una pagina **tutti** i telefoni collegati.

1. **3, 2, 1**: conto alla rovescia con una pallina e un anello dorato.
2. **Chiusura ufficiale**: il proclama del Presidente (foto con corona, testo nel carattere dei titoli, firma, sigillo di ceralacca) e il resto del Direttivo.
3. **La settimana in numeri**: sei palline appese a un filo con fiocchi e lucine, con dentro numeri che salgono da zero (bonus, malus, Malus Ele, Jolly, mini-sfide, certificati).
4. **Le sette giornate**: sette pacchi regalo incartati che si scartano uno alla volta; dentro c'è la data, gli eventi della giornata e quanti bonus e malus ci sono stati.
5. **Titoli speciali**, uno alla volta, calcolati sui conteggi e non sui punti: Re dei malus, Collezionista di bonus, Il più graziato dal Jolly, Campione delle mini-sfide, Bestemmiatore ufficiale, Tenacia di ferro, Ritardatario cronico (Malus Federica), Re del social (Malus Antonio). Compaiono solo quelli che qualcuno si è guadagnato; a pari merito vanno a tutti.
6. **I certificati**: una pagina di stacco rosso vino, poi un certificato alla volta con chi l'ha ricevuto.
7. **La classifica finale**: pagina d'attesa con la coppa, poi dall'ultimo posto al 4°, uno alla volta.
8. **Il podio**: tre gradini coperti dal "?". Si svelano 3° e 2° con un rullo di tamburi breve, poi il vincitore con il rullo lungo (3 secondi), il lampo, la corona, il nome dorato, coriandoli e fuochi d'artificio.
9. **Grazie a tutti!**: sfondo da tramonto estivo, le foto di tutti, e l'appuntamento alla **Summer Edition 2027**.
10. **Chiudi e mostra la classifica**.

Intorno alla cerimonia:

- **Suoni** generati con Web Audio: bip del conto alla rovescia, campanelli, pop delle palline e dei pacchi, timbro dei certificati, rullo di tamburi, piatti, fanfara, applausi e "Jingle Bells" finale. Il pulsante 🔊 in alto a destra li toglie e li rimette. Chi guarda deve toccare una volta "Attiva l'audio", perché i telefoni non fanno partire suoni da soli.
- **Schermo sempre acceso** (Wake Lock) durante la cerimonia e mentre si aspetta che inizi.
- **Brillantini dorati** al posto dei fuochi fino alla classifica; i fuochi partono con la classifica e sono al massimo sul vincitore.
- Prima della classifica l'admin manda ai telefoni anche i "dati extra" (numeri, giornate, titoli, messaggio), perché gli altri non hanno i punti del 26 e del 27.

## 8. La prova generale

Il 19 novembre la settimana è stata provata **a tappe** con le amiche e gli amici veri: un numero in `js/config.js` (`PROVA_GENERALE_GIORNI`, più `PROVA_GENERALE_MINUTI`) spostava in avanti il calendario dell'app, così il 19 novembre "valeva come" il 21, poi il 23, il 26, il 27 alle 23 e infine la mezzanotte del 28.
Finita la prova, i due numeri sono tornati a 0 e il database è stato ripulito.

## 9. Come è stato provato

Ogni modifica è stata provata con **Playwright** (un browser comandato da script) su un **iPhone 13 simulato**, sempre su una **copia** del progetto con `js/config.js` vuoto, per non scrivere nel database vero. Le prove principali:

- la settimana intera con un orologio finto, dal 21 al 28;
- quattro telefoni insieme;
- la versione online con **due telefoni** (admin e amico) e un finto Supabase che applica le stesse regole del database vero;
- la chiusura dei punti al primo certificato;
- la cerimonia completa, con le foto di ogni pagina, guardate prima di dire che andava bene;
- iPhone SE, iPhone 13, Pixel 7, iPad e computer: nessuna pagina più larga dello schermo.

Le prove sono nella cartella [`tests/`](tests/README.md), con un README che spiega come sono scritte e come lanciarle.

## 10. Problemi incontrati e come sono stati risolti

- **La fila di chip dello Storico allargava la pagina a 1272 px** su iPhone. Gli elementi di una CSS grid hanno `min-width:auto` e crescono fino al contenuto: serviva `min-width:0`.
- **Il carattere Cinzel ha solo lettere maiuscole**: togliere `text-transform:uppercase` non basta. Per avere il minuscolo negli eventi dei pacchi si usa il carattere del testo (Figtree).
- **I raggi dietro il vincitore erano più larghi dello schermo** e la pagina scorreva di lato: `overflow-x:hidden` sulla cerimonia.
- **Online, scrivere e cancellare tanti punti uno alla volta era lento**: con la settimana finta, se nel frattempo si usciva dalla prova, restavano dati nel database. Ora le scritture vanno a gruppi di 12 e, mentre l'app prepara la settimana, la prova è bloccata.
- **I suoni non partono da soli sui telefoni**: i browser li permettono solo dopo un tocco, per questo c'è "Attiva l'audio".
- **Copiare lo schema SQL dalla chat rovinava il testo** (errore di sintassi): si copia dal file su GitHub.

## 11. Cronologia

Tutto è stato costruito tra il **19 e il 20 novembre 2026**, una richiesta alla volta, guardando ogni volta le schermate.

| Quando | Cosa |
|---|---|
| 19/11 pomeriggio | Prima versione: classifica, programma, storico, regole, Jolly, Malus Ele, certificati, cerimonia; collegamento a Supabase |
| 19/11 sera | Regole e Direttivo ridisegnati, foto ritagliate, card della classifica con medaglie e frecce, Area admin in alto a destra |
| 19/11 sera | Prova generale a tappe (21, 23, 26, 27, 28) con gli amici |
| 19/11 sera | Ghirlanda, Storico per giornate e persone, palline appese al filo, Programma rifatto, podio più grande |
| 19/11 notte | Cerimonia dall'ultimo al primo, 3-2-1, certificati, messaggio del Presidente, numeri, giornate, titoli speciali |
| 19/11 notte | Punti chiusi al primo certificato; proclama del Presidente; calendario dell'Avvento; titoli e certificati uno alla volta |
| 20/11 notte | Pacchi regalo, pagina d'attesa della classifica, podio coperto dal 3° al 1° con rullo di tamburi |
| 20/11 notte | Cerimonia in diretta di prova, suoni, schermo acceso, pagina dei ringraziamenti, settimana finta, foto con lo sfondo colorato |
| 20/11 | Documentazione, pulizia del CSS (166 regole in meno, aspetto identico), prove automatiche pubblicate in `tests/` |
| 21/11 | Bonus e malus rivisti (Bonus Andrea, Bonus Mariangela, Bonus Laura «Entusiasmo», Malus Cristiana), Malus Ele sullo stesso malus ripetuto (la ripetizione vale come Malus Ele), Jolly presidenziale automatico, nomi e testi ufficiali dei bonus e malus, foto azzurre per Andrea e Mariangela |
| 21/11 sera | Programma aggiornato (pigiama e quiz party il 21, tradizioni al Capp e al Movida il 22, PowerPoint in costume il 23, shooting il 26, compleanno di Cri il 27), programma a tappe (titoli dal 1° dicembre, dettagli dal 21) e punti dal 21 alle 19 |

La lista completa delle modifiche è nella storia dei commit del repository.

## 12. Cosa resta da fare prima del 21 dicembre

- Togliere dall'Area admin **Prova una giornata**, **Riempi con una settimana finta** e **Cerimonia in diretta**.
- Controllare che nel database non siano rimasti dati di prova.

## 13. Come studiare il codice

Un ordine che funziona:

1. **`index.html`**: lo scheletro, per sapere quali `id` esistono (`board`, `log`, `adm-panel`…).
2. **`js/dati.js`**: i dati, così poi si riconoscono `g0…g11`, `presets`, `activities`.
3. **`js/app.js`**, una sezione alla volta (sono separate da commenti `/* ---------- nome ---------- */`): orologio e calendario → archivio locale → stato → regole della serata → classifica → programma → storico → regole → pannelli → certificati → cerimonia → eventi → avvio.
4. **`js/db-online.js`** e **`supabase/schema.sql`**, insieme: come parla con il database e cosa il database permette.
5. **`css/style.css`**: è cresciuto una richiesta alla volta, poi è stato ripulito (vedi il README della cartella). Qualche selettore compare ancora più di una volta: per capire l'aspetto finale di un elemento conviene cercare il suo nome e guardare l'**ultima** regola.
6. **`tests/`**: le prove automatiche, utili anche per vedere il sito "usato" da uno script.

Per provarlo sul proprio computer: scaricare il repository, svuotare `js/config.js` (così non tocca il database vero) e aprire `index.html` con il browser. Per l'Area admin si sceglie un PIN qualsiasi di almeno 4 cifre.
