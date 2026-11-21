/* Settimana Pazza · Winter Edition 2026 — dati di partenza
   Giocatori, attività del programma, bonus e malus della settimana, foto dei profili.
   Questi dati servono solo alla prima apertura: dopo, l'app usa quelli salvati
   (nel browser, o nel database online se è collegato: lì li carica l'admin al primo accesso). */

/* ---------- dati iniziali ---------- */
const PLAYERS = ["Bardy","Mg","Ele","Coronaus","Cri","Mary","Antonio","Fede","Andrea","Giorgio","Laura","Jacopo"];
/* il Direttivo */
const ROLES = {g9:"Presidente", g10:"Vicepresidente", g2:"Assessore", g3:"Assessore"};
const PCOLORS = ["#e0404a","#2f8463","#c8962a","#3c6fd1","#9b4fc0","#e07a2e","#169c9c","#c2457a","#6f8f22","#6a5be0","#b5523a","#2b8fd6"];
const A = (day, order, title, dress, notes, rules) => ({day, order, title, dress, notes, rules: rules.map(([label, delta]) => ({label, delta})), createdAt: order});
const SEED = {
  players: Object.fromEntries(PLAYERS.map((n, i) => ["g" + i, {name:n, color:i, createdAt:i, ...(ROLES["g" + i] ? {role:ROLES["g" + i]} : {})}])),
  activities: {
    apertura: A("2026-12-21", -1, "Apertura · Serata d'inaugurazione", "", ["Si apre ufficialmente la Settimana Pazza Winter Edition 2026.", "Si scopre il mese di ognuno per lo shooting di sabato 26."], []),
    pigiama: A("2026-12-21", 0, "Serata pigiama e quiz party", "Pigiama e pantofole", [
      "Tutti i giochi si fanno a squadre, scelte a caso.",
      "Quizzone: 10 domande di cultura generale, in busta chiusa.",
      "Foto bendata: sei tu a essere bendato, e hai 1 minuto per fotografare più persone possibile della squadra avversaria.",
      "Gioco del bicchiere.",
      "Mimo.",
      "Indovina la parola, con musica e cuffie."
    ], [["Non sei in pigiama", -1], ["Pigiama e pantofole", 1]]),
    tradizioni: A("2026-12-22", 1, "Le tradizioni vanno rispettate", "", ["Ci vediamo al Capp e al Movida."], []),
    ppt: A("2026-12-23", 2, "PowerPoint in costume", "Costume, a libera interpretazione", [
      "Tema libero: 5 minuti di presentazione e 5 di dibattito.",
      "Votazione anonima: in palio 1+1 malus o 2 bonus."
    ], [["Vieni in costume", 1], ["Miglior PowerPoint (voto anonimo)", 2], ["Peggior PowerPoint (voto anonimo)", -2]]),
    ape: A("2026-12-24", 3, "Ape + Pattinaggio", "", ["Aperitivo tutti insieme, poi sul ghiaccio."], [["Non pattini", -1], ["Pattini senza mai cadere", 1]]),
    santa: A("2026-12-25", 4, "Secret Santa", "", ["Ognuno fa un regalo a un amico estratto a sorte."], []),
    tombola: A("2026-12-25", 5, "Tombolone", "", ["Massimo 3 partite.", "Premi casuali: un regalo a testa, portato o fatto a mano."], [["Tombola", 1]]),
    shooting: A("2026-12-26", 6, "Giornata shooting", "A tema con il tuo mese: outfit e oggettistica varia", ["Una persona per ogni mese: il mese si scopre all'inaugurazione."], [["Non sei vestito a tema", -1]]),
    festa: A("2026-12-27", 7, "Festa nazionale: si torna nel 2008", "", ["Auguri Cristiana per i tuoi 8 anni!"], []),
    premi: A("2026-12-27", 8, "Premiazione finale", "", ["Chi è in testa alla classifica vince la Settimana Pazza Winter 26/27."], [])
  },
  presets: Object.fromEntries([
    // [nome, titolo, descrizione, punti, di chi è, quante volte a serata: "once" = 1 volta, "cum" = si può ripetere (per i malus la ripetizione vale come Malus Ele), "auto" = automatico]
    ["Bonus Bardahan", "Alcolico", "Bevi un alcolico.", 1, "g0", "once"],
    ["Bonus Coronaus", "Oggi guidi tu!", "Valido anche per chi prende la macchina e la lascia a casa di qualcuno.", 1, "g3", "once"],
    ["Bonus Laura", "Entusiasmo", "Ti sei fatto notare! Punto dato a maggioranza.", 1, "g10", "cum"],
    ["Malus Ele", "Tenacia", "Hai preso per la seconda volta lo stesso malus nella stessa giornata. Scatta da solo ed è cumulabile: vale per ogni malus ripetuto.", -1, "g2", "auto"],
    ["Malus Jacopo", "Bestemmia", "Non cumulabile: dalla seconda nella stessa giornata vale come Malus Ele.", -1, "g11", "cum"],
    ["Malus Federica", "Ritardo", "Fai un ritardo superiore ai 20 minuti.", -1, "g7", "once"],
    ["Malus Mg", "Inglesismo", "Hai usato un inglesismo.", -1, "g1", "cum"],
    ["Malus Antonio", "Social", "Sei stato beccato a scrollare i social (WhatsApp non conta).", -1, "g6", "cum"],
    ["Malus Cristiana", "Non rispondi", "Non rispondi ai messaggi durante l'organizzazione delle attività. Vale se vieni richiamato a rispondere due volte.", -1, "g4", "cum"],
    ["Bonus Mariangela", "Ore piccole", "Hai partecipato a una serata e sei rimasto fino alla fine. Valido solo se rientri dopo l'una di notte.", 1, "g5", "once"],
    ["Bonus Andrea", "Questo giro lo offro io!", "Offri da bere (alcolici e non) o altro. Il giro va offerto ad almeno tre persone, te compreso.", 1, "g8", "cum"]
  ].map(([name, short, desc, delta, owner, kind], i) => ["p" + i, {label: name + " · " + short, short, desc, delta, owner, once: kind === "once", auto: kind === "auto", createdAt:i}])),
  points: {}
};

/* foto dei profili (224×224, ritagliate a cerchio dagli originali in foto/originali) */
const PHOTOS = {
  "g0": "foto/profili/bardy.jpg",
  "g1": "foto/profili/mg.jpg",
  "g2": "foto/profili/ele-3.jpg",
  "g3": "foto/profili/coronaus-3.jpg",
  "g4": "foto/profili/cri.jpg",
  "g5": "foto/profili/mary-blu.jpg",
  "g6": "foto/profili/antonio.jpg",
  "g7": "foto/profili/fede.jpg",
  "g8": "foto/profili/andrea-blu.jpg",
  "g10": "foto/profili/laura-3.jpg",
  "g11": "foto/profili/jacopo.jpg",
  "g9": "foto/profili/giorgio.jpg"
};
/* foto "come tutti gli altri" (sfondo colorato) per chi nel Direttivo ha la foto ufficiale:
   si usano nella scheda dei bonus e malus e nella fila di volti dei ringraziamenti */
const PHOTOS_FUN = {
  "g2": "foto/profili/ele-rossa.jpg",
  "g3": "foto/profili/coronaus-blu.jpg",
  "g10": "foto/profili/laura-blu.jpg"
};
