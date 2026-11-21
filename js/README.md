# js/ — la logica dell'app

Quattro file JavaScript, caricati in quest'ordine da `index.html`:

```
config.js  →  dati.js  →  db-online.js  →  app.js
```

Sono script "classici" (non moduli): ognuno mette le sue costanti nella pagina e quello dopo le usa.

## config.js

Dove sta il database.

| Costante | Cosa è |
|---|---|
| `SUPABASE_URL` | indirizzo del progetto Supabase |
| `SUPABASE_ANON_KEY` | la chiave **pubblica** (publishable). Può stare nel sito: sono le regole del database a decidere chi può scrivere |
| `PROVA_GENERALE_GIORNI`, `PROVA_GENERALE_MINUTI` | spostano in avanti l'orologio dell'app per la prova generale. Devono restare a **0** |

Se le prime due sono vuote, l'app lavora solo nel browser di questo dispositivo (utile per studiare e provare senza toccare il database vero).

## dati.js

I dati di partenza. I giocatori valgono solo la prima volta; **programma e bonus/malus** invece seguono sempre questo file: quando l'admin entra, `addMissingSeed()` in `app.js` aggiorna il database (aggiunge, cambia e toglie quello che non torna).

- `PLAYERS`: i 12 nomi. Ognuno diventa `g0`, `g1`, … `g11`, in quest'ordine.
- `ROLES`: chi è nel Direttivo (`g9` Presidente, `g10` Vicepresidente, `g2` e `g3` Assessori).
- `PCOLORS`: il colore di ogni giocatore.
- `SEED.activities`: il programma, con la funzione `A(giorno, ordine, titolo, dress code, note, regole)`.
- `SEED.presets`: i bonus e malus della settimana, ognuno con nome, titolo e descrizione (`once` = 1 volta al giorno, `auto` = automatico come il Malus Ele). L'app li riconosce dal nome (la parte prima di « · »), quindi i testi si possono cambiare senza perdere i punti già dati.
- `PHOTOS`: la foto di ogni giocatore. `PHOTOS_FUN`: le foto con lo sfondo colorato di Laura, Coronaus ed Ele, usate nella lista dei bonus e malus e nei ringraziamenti.

## db-online.js

Il collegamento a Supabase. Offre **la stessa interfaccia** dell'archivio locale che sta in `app.js`:

```js
db.collection("points").doc().set({...})
db.doc("points/abc").update({...})
db.doc("points/abc").delete()
db.collection("points").onSnapshot(fn)
```

Così il resto dell'app non sa se sta lavorando in locale o online.

- `loadAll()`: rilegge tutta la tabella `docs` (a pagine da 1000 righe).
- Canale `docs-live`: le modifiche fatte da altri telefoni arrivano in diretta.
- Canale `cerimonia`: i passi della cerimonia mandati dall'admin (`sendCeremony`, `onCeremony`).
- `auth`: accesso dell'admin con email e password, e `isAdmin()` che chiede al database se quell'email è nella lista.

## app.js

Tutto il resto, dentro una funzione che parte subito (`(function(){ ... })()`). È diviso in sezioni con un commento `/* ---------- nome ---------- */`:

| Sezione | Cosa c'è |
|---|---|
| orologio | `NOW()`: l'ora dell'app (con lo spostamento della prova generale) |
| calendario | `DAYS` (21–27), inizio e fine settimana (`START`, `END`), `PROGRAM_FROM` (1° dicembre: titoli del programma) e `POINTS_FROM` (21 alle 19: si aprono i punti) |
| archivio locale | lo stesso `db` di `db-online.js`, ma salvato in `localStorage` |
| stato | l'oggetto `S`: giocatori, punti, attività, scheda aperta, admin sì/no, prova in corso |
| serata in corso | `currentDay()` (la giornata cambia alle 6), `live()`, `pointsYet()` (sono già le 19 del 21?), `assignOpen()` (si possono dare punti?), `frozen()` (è tutto chiuso?), `hiddenDay()` (giornata coperta?), `allPoints()` (aggiunge i Malus Ele e i Jolly calcolati) |
| conto alla rovescia e chiusura | la testata, le palline delle giornate, il conto verso il 21 |
| modalità | cosa vede l'admin e cosa gli altri; l'Area admin |
| classifica | `ranked()`, podio, card, classifica per giornata, "Ieri in breve" |
| programma | le card delle attività e delle mini-sfide; `titlesOnly()` (dal 1° al 20 dicembre solo i titoli) e `rulesShown(giorno)` (i punti delle attività si vedono dal giorno stesso) |
| storico | filtri e voci raggruppate per giornata |
| regole | Direttivo, Jolly presidenziale, bonus e malus |
| pannelli | i fogli che si aprono dal basso: dare punti (`openMulti`), mini-sfide, prova di una giornata (`setTrial`) |
| certificati | consegna dei certificati e messaggio del Presidente |
| suoni | `sfx`: suoni generati con Web Audio (oscillatori e rumore filtrato); `keepAwake()` per lo schermo acceso |
| cerimonia | `openCeremony`, `renderCeremony` (l'elenco `pages` decide l'ordine delle pagine; `rankPages()` mette il podio: `podium` con i finalisti, `pod3`, la scena del vincitore e `podfinal`), il duello (`rivals`, la roulette sui battiti `DUEL_BEATS`), fuochi d'artificio, coriandoli |
| effetti | scintille quando si danno i punti, conferma con doppio tocco (`armOrRun`) |
| neve e lucine | la neve che cade |
| eventi | tutti i clic, gestiti da pochi ascoltatori sul documento; qui ci sono anche la settimana finta (`fillTrial`) e la conferma della cerimonia in diretta (`armLive`) |
| avvio | `phase()` e il controllo ogni 30 secondi: se è scattata una tappa (giornata, programma, punti, certificati, chiusura) ridisegna la pagina; `addMissingSeed()` allinea programma e bonus/malus a `dati.js`; sceglie archivio locale o online e disegna la pagina |

Due idee che tornano spesso:

- **Si ridisegna tutto da capo.** Quando cambia qualcosa, `render()` riscrive l'HTML delle schede partendo dallo stato `S`. Non si modificano i singoli elementi a mano.
- **Le tappe orarie stanno in `phase()`.** Se se ne aggiunge una nuova (un'ora in cui cambia cosa si vede o cosa si può fare), va aggiunta anche lì, altrimenti chi ha la pagina aperta non la vede finché non ricarica.
- **Un ascoltatore solo per tanti bottoni.** I bottoni hanno attributi come `data-tab`, `data-cer`, `data-trial`; un solo `document.addEventListener("click", …)` guarda quale è stato toccato con `e.target.closest(...)`.
