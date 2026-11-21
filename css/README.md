# css/ — la grafica

Un solo file, `style.css`, con tutti i colori, i caratteri, l'impaginazione e le animazioni.

## Lo stile

- **Notte d'inverno**: blu scuro (`--night`, `--card`), oro (`--gold`), rosso (`--red`), verde abete (`--pine`), bianco neve (`--snow`).
- **Caratteri** (da Google Fonts): *Cinzel Decorative* e *Cinzel* per titoli e date, *Figtree* per il testo, *Pinyon Script*, un corsivo, per le firme ("Winter Edition", "Giorgio", "Summer Edition"), *DM Mono* per le etichette piccole.
- **Card scure con bordi dorati**, angoli arrotondati, ombre morbide.
- **Verde** per i bonus (`--bonus`), **rosso** per i malus (`--malus`).

Tutte le variabili di colore sono in cima al file, dentro `:root`.

## Come è organizzato

1. Variabili e regole di base.
2. Testata: neve, lucine, ghirlanda, palline delle giornate, conto alla rovescia.
3. Le quattro schede: classifica e podio, programma, storico, regole.
4. Barra in basso, pannelli che si aprono dal basso, Area admin.
5. La cerimonia, pagina per pagina: conto alla rovescia, proclama, numeri, pacchi regalo, titoli, certificati, classifica, podio con i finalisti, duello finale (`.duel`, `.wd-duel`), vincitore, ringraziamenti. Nel duello la scena del vincitore parte 4 secondi più tardi (regole `.cer.duel …`).
6. `html.cer-open`: mentre la cerimonia è aperta la pagina sotto è nascosta e bloccata, così sull'iPhone non se ne vede una striscia quando cambia la barra di Safari.

Ogni blocco ha un commento che dice cosa riguarda (`/* --- storico --- */`, `/* --- cerimonia: … --- */`).

## Da sapere per studiarlo

- **Il file è cresciuto una richiesta alla volta e poi è stato ripulito** (20 novembre 2026): da 1.193 a circa 1.010 righe (dopo il duello finale e le ultime aggiunte è a circa 1.060). Sono state unite le regole con lo stesso selettore, tolte le proprietà già sovrascritte, tolte le regole di elementi che non esistono più (vecchie porticine dell'Avvento, vecchio storico, striscia rossa…) e le animazioni mai usate.
- **Come si è controllato che non cambiasse niente**: prima e dopo la pulizia uno script ha aperto il sito in 48 schermate diverse (schede, pannelli, ogni pagina della cerimonia, telefono e computer) e ha salvato lo stile calcolato di ognuno dei circa 40.000 elementi. Confronto: zero differenze, con e senza animazioni.
- **Restano alcuni selettori ripetuti**, apposta: sono i casi in cui unirli cambierebbe l'aspetto, perché in mezzo c'è un'altra regola che li corregge. Per capire come appare davvero un elemento, cerca il suo nome nel file e guarda **l'ultima** regola che lo riguarda.
- **Le animazioni rispettano chi le vuole ridotte**: stanno dentro `@media (prefers-reduced-motion: no-preference)`, quindi chi nel telefono ha "riduci movimento" non le vede.
- **Le pause delle animazioni sono "a cascata"**: molti elementi hanno una variabile `--d` o `--i` (data dall'HTML) che sposta il loro inizio, così entrano uno dopo l'altro.
- **I disegni sono fatti in CSS o SVG**, senza immagini: ghirlanda, palline, pacchi con nastro e fiocco, sigilli, raggi del vincitore.
- **Il telefono prima di tutto**: tutto è pensato per uno schermo largo 320–430 px, e regge anche tablet e computer.
