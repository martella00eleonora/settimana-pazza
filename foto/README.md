# foto/ — le foto dei profili

## profili/

Le foto usate dall'app, già ritagliate quadrate (224 × 224 pixel) e leggere, per caricarsi in fretta anche col telefono.
Nell'app diventano cerchi, con un bordo del colore del giocatore.

Sono collegate ai giocatori in `js/dati.js`:

- `PHOTOS`: la foto di ognuno. Per il Direttivo (Laura, Ele, Coronaus) sono le foto ufficiali, con fascia e bandiere (`laura-3.jpg`, `ele-3.jpg`, `coronaus-3.jpg`).
- `PHOTOS_FUN`: le foto con lo sfondo colorato di Laura, Ele e Coronaus (`laura-blu.jpg`, `ele-rossa.jpg`, `coronaus-blu.jpg`), uguali a quelle degli altri. Si usano nella lista dei bonus e malus e nella fila di volti dei ringraziamenti.

Giorgio ha una foto sola (`giorgio.jpg`).

**Lo sfondo ha un significato**: azzurro per chi "possiede" un bonus, rosso per chi ha un malus. Quando Andrea e Mariangela sono passati ai bonus, lo sfondo rosso delle loro foto è stato ricolorato di azzurro (`andrea-blu.jpg`, `mary-blu.jpg`); Ele, che ha un malus, ha lo sfondo rosso (`ele-rossa.jpg`). Si è ricolorato solo lo sfondo.

**Per cambiare una foto**: metti il nuovo file quadrato in `profili/` e cambia il nome nella riga del giocatore in `js/dati.js`.

## originali/ (non su GitHub)

Sul computer di lavoro c'è anche `originali/`, con le foto intere ricevute. Non è pubblicata su GitHub (vedi `.gitignore`): al sito non serve, e così le foto intere non stanno su un repository pubblico.
