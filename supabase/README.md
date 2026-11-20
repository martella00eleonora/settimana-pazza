# supabase/ — il database online

Un solo file, `schema.sql`, da incollare in **Supabase → SQL Editor → New query → Run**.
Si può rieseguire quante volte si vuole senza errori.

## Le tabelle

| Tabella | Cosa contiene |
|---|---|
| `docs` | tutti i dati dell'app, come documenti JSON. Colonne: `col` (la "collezione": `players`, `activities`, `presets`, `points`, `extras`, `settings`), `id`, `data` |
| `admins` | le email di chi può modificare |

## Le regole di sicurezza (Row Level Security)

Il database decide da solo chi legge e chi scrive, qualunque cosa faccia l'app:

- **Scrive solo l'admin**: chi ha fatto l'accesso con un'email presente in `admins` (funzione `is_admin()`).
- **L'admin legge tutto.**
- **Gli altri leggono tutto tranne**:
  - i dati di prova (`trial = true`);
  - dal 26 dicembre, punti, mini-sfide e certificati, finché la cerimonia non è avvenuta (funzione `revealed()`, che guarda `settings/main`).

Per questo la classifica coperta è coperta davvero: quei dati non arrivano proprio sui telefoni degli altri.

In fondo al file la tabella `docs` viene aggiunta a **Realtime**, così le modifiche arrivano in diretta.

## Come si prepara un database nuovo

1. Su <https://supabase.com> crea un progetto (basta il piano gratuito).
2. In fondo a `schema.sql` metti le email degli admin, al posto di `EMAIL-ADMIN@esempio.it`.
3. Esegui il file nel SQL Editor. Copialo dal file su GitHub e non da una chat: copiato dalla chat a volte si rovina.
4. In **Authentication → Users → Add user** crea gli stessi admin con una password e "Auto Confirm User" attivo.
5. In **Project Settings → API** copia "Project URL" e la chiave **publishable** in `js/config.js`. La chiave `service_role` non va mai nel sito.
6. Apri l'app ed entra come admin: il database si riempie da solo con giocatori, programma e bonus e malus.
