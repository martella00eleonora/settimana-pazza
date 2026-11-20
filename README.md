# Settimana Pazza · Winter Edition 2026

Segnapunti della settimana pazza (21–27 dicembre 2026): classifica, programma per giornata, bonus e malus, Jolly presidenziale, mini-sfide, certificati e cerimonia di chiusura con i fuochi d'artificio.

Online su <https://martella00eleonora.github.io/settimana-pazza/>.

- **[LAVORO_FATTO.md](LAVORO_FATTO.md)**: il racconto completo di cosa è stato fatto, come e perché, e da dove partire per studiare il codice.
- Ogni cartella ha il suo README: [js/](js/README.md), [css/](css/README.md), [supabase/](supabase/README.md), [foto/](foto/README.md), [tests/](tests/README.md).

## Cosa c'è nella cartella

```
settimana-pazza/
├── index.html          struttura della pagina (intestazione, schede, barra in basso)
├── css/style.css       tutta la grafica: colori, font, animazioni
├── js/config.js        collegamento a Supabase (vuoto = solo questo dispositivo)
├── js/dati.js          dati di partenza: giocatori, programma, bonus/malus, foto dei profili
├── js/db-online.js     archivio online su Supabase, con aggiornamenti in diretta
├── js/app.js           la logica: giornate, punti, Malus Ele, Jolly, copertura, cerimonia
├── supabase/schema.sql tabelle e regole di sicurezza del database online
├── tests/              le prove automatiche con Playwright (vedi tests/README.md)
├── foto/profili/       le foto dei profili già ritagliate (224×224) usate dall'app
├── foto/originali/     le foto originali ricevute (solo sul computer, non su GitHub)
└── appunti/            le foto dei fogli con idee e programma (solo sul computer, non su GitHub)
```

Per cambiare un giocatore, un'attività o un bonus/malus si tocca `js/dati.js`. I dati di partenza valgono solo alla prima apertura: dopo, l'app usa quelli salvati nel browser.

## Come farla girare

Apri `index.html` con il browser: doppio clic sul file. Non serve installare niente.

Serve internet solo per i **font** (Google Fonts). Senza internet compare un font di riserva.

Se preferisci aprirla come un sito, dentro la cartella lancia:

```bash
python3 -m http.server 8000
```

e vai su <http://localhost:8000/>.

## Dove finiscono i punti

I punti si salvano **nel browser** in cui apri il file, non nel file. Quindi:

- l'admin usa sempre **lo stesso dispositivo e lo stesso browser**, mai in incognito;
- copiare una versione nuova del file nello stesso posto **non cancella** i punti;
- un altro telefono vede una classifica sua, vuota. Per condividerla serve la versione online (vedi in fondo).

## Admin

- **Area admin**: il pulsante con la chiave, in alto a destra. Online si entra con email e password; in locale, la prima volta, si sceglie un PIN di almeno 4 cifre.
- **Prova una giornata**: bottoni dal 21 al 27. I punti di prova li vede solo l'admin e si cancellano con *Esci dalla prova*.
- **Riempi con una settimana finta**: prepara da sola una settimana di prova già giocata e porta la prova al 27.
- **Cerimonia**: prova la cerimonia solo sul telefono dell'admin. **Cerimonia in diretta**: la stessa prova, vista anche dagli altri telefoni.
- Queste tre prove vanno tolte prima del 21 dicembre.

## Regole che l'app applica da sola

- **La giornata cambia alle 6 del mattino**: alle 2 di notte si segna ancora sulla giornata precedente.
- **Bonus e malus**: alcuni valgono 1 volta al giorno, altri sono cumulabili. Il secondo tentativo su uno da 1 volta mostra un avviso.
- **Malus Ele**: scatta da solo al 2° malus della giornata, una volta per giornata. Il Jolly non lo cancella.
- **Jolly presidenziale** (Giorgio, il Presidente): una volta al giorno per persona. Trasforma l'ultimo malus della giornata in +1; a chi quel giorno non ha malus dà +2.
- **Mini-sfide**: create al volo durante la giornata, +1 o −1, una volta al giorno per persona.
- **26 e 27**: la classifica è coperta (??) per chi non è admin.
- **27 sera**: i punti si chiudono alle 23 oppure al primo **certificato** consegnato; poi solo certificati (+1) e messaggio del Presidente.
- **28 a mezzanotte**: si chiude tutto e l'admin trova **Scopri il vincitore**. Dopo la cerimonia la classifica è scoperta per tutti e non si può più modificare niente.

## Il Direttivo

Giorgio · Presidente — Laura · Vicepresidente — Ele e Coronaus · Assessori.

## Versione online (classifica in diretta su tutti i telefoni)

Con `js/config.js` vuoto l'app lavora solo sul dispositivo dell'admin. Collegata a Supabase:

- tutti aprono lo stesso link e vedono la classifica in diretta;
- **solo l'admin scrive**: entra con email e password, e il database rifiuta le modifiche di chiunque altro;
- il 26 e il 27 i punti **non arrivano proprio** sui telefoni degli altri fino alla cerimonia, quindi la copertura non si aggira;
- i punti della modalità prova li vede solo l'admin;
- la **cerimonia** del 28 si vede in diretta su ogni telefono, passo per passo.

### Come collegarla

1. Su <https://supabase.com> crea un progetto (piano gratuito).
2. Apri `supabase/schema.sql`, metti in fondo le email degli admin, poi incolla tutto in **SQL Editor → New query → Run**.
3. In **Authentication → Users → Add user** crea gli stessi admin con una password, e attiva "Auto Confirm User".
4. In **Project Settings → API** copia "Project URL" e la chiave **anon/public** dentro `js/config.js`. La chiave `service_role` non va mai nel sito.
5. Apri l'app ed entra come admin: al primo accesso il database si riempie da solo con giocatori, programma e bonus/malus.

I punti segnati prima in locale, nel browser, non vengono copiati online: il database online parte pulito.
