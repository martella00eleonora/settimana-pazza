/* Settimana Pazza · Winter Edition 2026 — logica dell'app (dati di partenza in js/dati.js) */
(function(){
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sign = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lsGet = k => { try { return localStorage.getItem(k); } catch(_){ return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(_){} };

  /* ---------- orologio ----------
     NOW() è l'ora dell'app: quella vera, spostata in avanti durante la prova generale (js/config.js). */
  const PG_MIN = typeof PROVA_GENERALE_MINUTI === "number" ? PROVA_GENERALE_MINUTI : 0;
  const SHIFT_PROVA = (typeof PROVA_GENERALE_GIORNI === "number" ? PROVA_GENERALE_GIORNI : 0) * 86400000 + PG_MIN * 60000;
  const NOW = () => Date.now() + SHIFT_PROVA;

  /* ---------- calendario ---------- */
  const DAYS = ["2026-12-21","2026-12-22","2026-12-23","2026-12-24","2026-12-25","2026-12-26","2026-12-27"];
  const DAYNAME = {"2026-12-21":"Si parte","2026-12-24":"Vigilia","2026-12-25":"Natale","2026-12-26":"Tutti in posa","2026-12-27":"Gran finale"};
  const START = new Date(2026, 11, 21, 0, 0, 0), END = new Date(2026, 11, 28, 0, 0, 0);
  /* il programma: coperto fino al 1° dicembre, poi solo i titoli, i dettagli dal 21 a mezzanotte (START).
     I punti si segnano dal 21 alle 19. */
  const PROGRAM_FROM = new Date(2026, 11, 1, 0, 0, 0), POINTS_FROM = new Date(2026, 11, 21, 19, 0, 0);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const dt = s => new Date(s + "T12:00:00");
  const wdShort = s => new Intl.DateTimeFormat("it-IT", {weekday:"short"}).format(dt(s)).replace(".", "");
  const wdLong = s => new Intl.DateTimeFormat("it-IT", {weekday:"long", day:"numeric", month:"long"}).format(dt(s));

  /* ---------- archivio locale (stesso dispositivo) ---------- */
  const KEY = "settimana-pazza-winter-26-27-v5";
  let storageOK = true;
  function localDB(){
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch(_){}
    if (!data) data = JSON.parse(JSON.stringify(SEED));
    // nomi aggiornati: Cristiana → Cri, MG → Mg (anche per i dati già salvati)
    const RENAME = {Cristiana:"Cri", MG:"Mg"};
    for (const pl of Object.values(data.players || {})) if (RENAME[pl.name]) pl.name = RENAME[pl.name];
    // il Direttivo
    for (const [id, r] of Object.entries(ROLES)) if (data.players?.[id] && !data.players[id].role) data.players[id].role = r;
    // il programma non si modifica nell'app: segue sempre js/dati.js
    data.activities = JSON.parse(JSON.stringify(SEED.activities));
    const subs = {};
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(_){ storageOK = false; } };
    save();
    const snap = c => ({docs: Object.entries(data[c] || {}).map(([id, v]) => ({id, data: () => v}))});
    const emit = c => (subs[c] || []).forEach(fn => fn(snap(c)));
    const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const ref = (c, id) => ({
      id,
      set: async v => { (data[c] = data[c] || {})[id] = v; save(); emit(c); },
      update: async v => { if (!data[c]?.[id]) throw new Error("missing"); data[c][id] = {...data[c][id], ...v}; save(); emit(c); },
      delete: async () => { if (data[c]) delete data[c][id]; save(); emit(c); }
    });
    window.addEventListener("storage", e => {
      if (e.key !== KEY) return;
      try { data = JSON.parse(e.newValue) || JSON.parse(JSON.stringify(SEED)); } catch(_){}
      Object.keys(subs).forEach(emit);
    });
    return {
      collection: c => ({ doc: id => ref(c, id || rid()), onSnapshot: fn => { (subs[c] = subs[c] || []).push(fn); fn(snap(c)); return () => {}; } }),
      doc: path => { const [c, id] = path.split("/"); return ref(c, id); }
    };
  }

  /* ---------- stato ---------- */
  const S = {online:false, stagger:true, players:[], points:[], activities:[], presets:[], extras:[], settings:[], boardMode:"week", boardDay:null, tab:"classifica", filter:"", admin: !(typeof SUPABASE_URL === "string" && SUPABASE_URL) && lsGet("sp-admin") === "1", day: null, trial: lsGet("sp-prova")};
  let db = null, pinOpen = false, prevTotals = {};

  /* ---------- serata in corso ----------
     La serata cambia alle 6 del mattino: alle 2 di notte di martedì si gioca ancora la serata di lunedì. */
  const SHIFT = 6 * 3600 * 1000;
  const serataOf = ts => iso(new Date(ts - SHIFT));
  const currentDay = () => (S.trial && DAYS.includes(S.trial)) ? S.trial : serataOf(NOW());
  /* in prova: dopo la classifica finale della cerimonia di prova la prova resta bloccata, come nella realtà */
  const trialDone = () => !!S.trial && lsGet("sp-prova-chiusa") === "1";
  const live = () => (S.trial && NOW() < END && !revealed() && !trialDone()) ? DAYS.includes(S.trial) : (!S.trial && DAYS.includes(currentDay()) && NOW() < END);
  /* Dal 26 (alle 6) la classifica è coperta per chi non è admin, fino a quando il Direttivo la svela */
  const COVER_FROM = new Date(2026, 11, 26, 6, 0, 0), CERT_DAY = "2026-12-27";
  const revealed = () => !!S.settings.find(x => x.id === "main")?.revealed;
  const covered = () => !revealed() && (S.trial ? S.trial >= "2026-12-26" : NOW() >= COVER_FROM.getTime());
  const hidden = () => covered() && !S.admin;
  const hiddenDay = d => hidden() && d >= "2026-12-26";
  /* Il 27: fino alle 23 si assegnano i punti, dalle 23 a mezzanotte solo i certificati.
     In modalità prova sul 27 sono aperti tutti e due, perché la prova non simula l'ora. */
  const CERT_FROM = new Date(2026, 11, 27, 23, 0, 0);
  const certHour = () => !S.trial && NOW() >= CERT_FROM.getTime();
  /* il 27 i punti si chiudono alle 23 oppure appena si consegna il primo certificato */
  const certsStarted = () => certsOf(CERT_DAY).some(c => !!c.trial === !!S.trial);
  /* prima delle 19 del 21 la settimana è partita ma i punti non si segnano ancora (in prova sì) */
  const pointsYet = () => !!S.trial || NOW() >= POINTS_FROM.getTime();
  const assignOpen = () => live() && pointsYet() && !certHour() && !(currentDay() === CERT_DAY && certsStarted());
  const frozen = () => revealed() || NOW() >= END.getTime() || trialDone();   // dopo mezzanotte, e dopo la cerimonia, si può solo guardare
  const certOpen = () => live() && currentDay() === CERT_DAY && (S.trial || certHour());
  const dayOf = e => e.day || serataOf(e.at || 0);
  const JOLLY = "Jolly presidenziale · ";
  const nameOf = label => String(label || "").split(" · ")[0];
  const baseReason = e => (e.reason || "").startsWith(JOLLY) ? e.reason.slice(JOLLY.length) : (e.reason || "");
  const dayLabel = d => `${wdLong(d).replace(/^./, c => c.toUpperCase())}`;

  const player = id => S.players.find(p => p.id === id);
  const colorOf = p => PCOLORS[(p?.color ?? 0) % PCOLORS.length];
  const initial = p => (p?.name || "?").trim().charAt(0).toUpperCase();
  const mineOf = pid => S.presets.find(x => x.owner === pid);
  const actsOf = day => S.activities.filter(a => a.day === day).sort((a,b) => (a.order ?? 99) - (b.order ?? 99));

  /* Malus Ele (tenacia): se nella stessa giornata una persona prende di nuovo lo stesso malus, dalla seconda volta
     quel −1 vale come Malus Ele (es. inglesismo −1, bestemmia −1, bestemmia di nuovo: −1 di Malus Ele). È cumulabile:
     ogni ripetizione di ogni malus è un Malus Ele. Contano i malus della lista; quelli delle attività e delle mini-sfide no.
     Jolly presidenziale: si guadagna prendendo tutti i bonus fissi nella stessa giornata (una volta al giorno).
     Si decide nel momento in cui scatta: se fino a lì hai preso malus te ne toglie uno (+1), altrimenti vale +2.
     I malus che arrivano dopo valgono −1 come sempre.
     Il Malus Ele già scattato resta. Né il Malus Ele né il Jolly sono salvati: l'app li calcola ogni volta dai punti. */
  const AUTO_REASON = "Malus Ele · tenacia";
  const isMalus = e => Number(e.delta) < 0 || (e.jolly === true && !e.plus2 && !e.derived);
  function allPoints(){
    const out = [...S.points];
    const malusLabels = S.presets.filter(p => Number(p.delta) < 0 && !p.auto).map(p => nameOf(p.label));
    const bonusLabels = S.presets.filter(p => Number(p.delta) > 0 && !p.auto).map(p => nameOf(p.label));
    const days = {};
    for (const e of S.points){ const k = e.playerId + "|" + dayOf(e); (days[k] = days[k] || []).push(e); }
    for (const [k, list] of Object.entries(days)){
      /* Malus Ele: le ripetizioni dello stesso malus nella giornata diventano Malus Ele */
      const byLabel = {};
      for (const e of list){ const n = nameOf(baseReason(e)); if (Number(e.delta) < 0 && malusLabels.includes(n)) (byLabel[n] = byLabel[n] || []).push(e); }
      for (const reps of Object.values(byLabel)){
        reps.sort((a,b) => (a.at||0) - (b.at||0));
        for (const e of reps.slice(1)){ const i = out.indexOf(e); out[i] = {...e, reason: `${AUTO_REASON} (2ª volta: ${baseReason(e).split(" · ")[0]})`, auto:true, stored:true}; }
      }
      /* Jolly presidenziale: scatta con l'ultimo bonus che mancava (per i cumulabili conta la prima volta) */
      if (!bonusLabels.length) continue;
      const got = list.filter(e => Number(e.delta) > 0 && bonusLabels.includes(nameOf(baseReason(e))));
      if (!bonusLabels.every(l => got.some(e => nameOf(baseReason(e)) === l))) continue;
      const firstOf = l => got.filter(e => nameOf(baseReason(e)) === l).sort((a,b) => (a.at||0) - (b.at||0))[0];
      const last = bonusLabels.map(firstOf).sort((a,b) => (b.at||0) - (a.at||0))[0];
      const anyMal = list.filter(x => Number(x.delta) < 0 && (x.at||0) <= (last.at||0)).sort((a,b) => (b.at||0) - (a.at||0));
      out.push({id:"jolly-" + k, playerId:last.playerId, delta: anyMal.length ? 1 : 2, activityId:"", day:dayOf(last), at:(last.at||0) + 2, jolly:true, derived:true, plus2:!anyMal.length, trial:last.trial,
        reason: JOLLY + (anyMal.length ? `tutti i bonus: toglie un malus (${baseReason(anyMal[0]).split(" · ")[0]})` : "tutti i bonus, nessun malus (+2)")});
    }
    return out;
  }
  const jollyTonight = pid => allPoints().some(e => e.derived && e.jolly && e.playerId === pid && dayOf(e) === currentDay());
  const eleTonight = pid => allPoints().filter(e => e.auto && e.playerId === pid && dayOf(e) === currentDay()).length;
  const timesTonight = (pid, label) => S.points.filter(e => e.playerId === pid && dayOf(e) === currentDay() && nameOf(baseReason(e)) === nameOf(label)).length;
  const takenTonight = (pid, label) => timesTonight(pid, label) > 0;
  /* quante volte al giorno: bonus e Malus Federica 1; gli altri malus della lista 2 (la seconda vale come Malus Ele) */
  const isPreset = it => (it.key || "").startsWith("p:");
  const maxTonight = it => it.once ? 1 : isPreset(it) && it.delta < 0 && !it.auto ? 2 : Infinity;
  const full = (pid, it) => timesTonight(pid, it.label) >= maxTonight(it);
  const showLabel = it => isPreset(it) ? nameOf(it.label) : it.label;

  /* Cosa si può assegnare stasera: le regole delle attività della serata e i bonus/malus della settimana */
  function itemsTonight(){
    const out = [];
    for (const a of actsOf(currentDay())) (a.rules || []).forEach((r, i) => out.push({key:`r:${a.id}:${i}`, label:r.label, delta:Number(r.delta), once:r.once !== false, activityId:a.id, group:"Regole di " + a.title}));
    for (const x of extrasOf(currentDay())) out.push({key:`x:${x.id}`, label:x.label, delta:Number(x.delta), once:!!x.once, activityId:"", group:"Mini-sfide di oggi"});
    for (const p of [...S.presets].sort((a,b) => (a.createdAt||0) - (b.createdAt||0)))
      out.push({key:`p:${p.id}`, label:p.label, delta:Number(p.delta), once:!!p.once, auto:!!p.auto, activityId:"", group:p.delta >= 0 ? "Bonus della settimana" : "Malus della settimana"});
    return out;
  }
  const certsOf = day => S.extras.filter(x => x.day === day && x.type === "cert").sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  const extrasOf = day => S.extras.filter(x => x.day === day && x.type !== "cert").sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  const itemByKey = k => itemsTonight().find(x => x.key === k);
  const takers = (aid, label, day) => { const ids = new Set(S.points.filter(e => e.activityId === aid && dayOf(e) === day && baseReason(e) === label).map(e => e.playerId)); return S.players.filter(p => ids.has(p.id)).sort((a,b) => a.name.localeCompare(b.name)); };

  function totals(){
    const t = {};
    for (const p of S.players) t[p.id] = {tot:0, bon:0, mal:0, n:0};
    for (const e of allPoints()){ const r = t[e.playerId]; if (!r) continue; const d = Number(e.delta)||0; r.tot += d; r.n++; if (d > 0) r.bon += d; else r.mal += d; }
    return t;
  }
  function ranked(){
    const t = totals();
    const list = [...S.players].sort((a,b) => t[b.id].tot - t[a.id].tot || a.name.localeCompare(b.name));
    let rank = 0, prev = null;
    return list.map((p,i) => { if (t[p.id].tot !== prev){ rank = i + 1; prev = t[p.id].tot; } return {p, r:t[p.id], rank}; });
  }

  async function write(fn){
    try { await fn(); if (!storageOK) toast("Questo browser non salva i dati: usa una finestra normale, non in incognito."); return true; }
    catch(_){ toast("Salvataggio non riuscito. Riprova."); return false; }
  }

  /* ---------- conto alla rovescia e chiusura ---------- */
  let lastCount = "";
  /* le 7 giornate come palline di Natale appese a un filo */
  /* le 7 giornate come palline appese a un filo vero: ogni gancio parte dal punto della curva */
  const ornaments = td => { const i = DAYS.indexOf(td), W = 360, y0 = 10, sag = 34;
    const yAt = x => { const t = x / W; return y0 + 4 * sag * t * (1 - t); };
    const balls = DAYS.map((d,k) => { const x = 30 + k * 50, yc = yAt(x), len = 10 + (k % 2) * 8, cy = yc + len + 18;
      const st = k < i ? "done" : k === i ? "now" : "next";
      return `<g class="ob ${st}" style="transform-origin:${x}px ${yc}px;--k:${k}">
        <line x1="${x}" y1="${yc}" x2="${x}" y2="${cy - 17}" class="hook"/>
        <rect x="${x - 4.5}" y="${cy - 20}" width="9" height="6" rx="1.5" class="cap"/>
        <circle cx="${x}" cy="${cy}" r="15" class="ball" fill="url(#og-${st})"/>
        <path d="M${x - 9} ${cy - 6} a12 12 0 0 1 8 -6" class="shine"/>
        <text x="${x}" y="${cy + 5}" class="num">${dt(d).getDate()}</text></g>`; }).join("");
    const lights = Array.from({length:13}, (_, k) => { const x = 5 + k * 27.5; return `<circle cx="${x}" cy="${yAt(x)}" r="2.2" class="bead" style="--k:${k}"/>`; }).join("");
    return `<div class="orn" role="img" aria-label="Giornata ${i + 1} di 7"><svg viewBox="0 0 ${W} 112" aria-hidden="true">
      <defs><radialGradient id="og-done" cx=".35" cy=".3"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#f0c14f"/><stop offset="1" stop-color="#a8781e"/></radialGradient>
        <radialGradient id="og-now" cx=".35" cy=".3"><stop offset="0" stop-color="#ffb3b8"/><stop offset=".45" stop-color="#e0404a"/><stop offset="1" stop-color="#8e1c26"/></radialGradient>
        <radialGradient id="og-next" cx=".35" cy=".3"><stop offset="0" stop-color="#5a7da6"/><stop offset=".5" stop-color="#2b4a70"/><stop offset="1" stop-color="#162a44"/></radialGradient></defs>
      <path d="M0 ${y0} Q${W / 2} ${y0 + 2 * sag} ${W} ${y0}" class="cord"/>${lights}${balls}</svg></div>`; };
  function renderCount(){
    const now = new Date(NOW());
    let html;
    if (S.trial){
      const a = actsOf(currentDay());
      html = `${ornaments(currentDay())}
        <p class="count-cap">Giornata di prova: <b>${esc(dayLabel(currentDay()))}</b>${a.length ? ` · ${a.map(x => esc(x.title)).join(" + ")}` : ""}${covered() ? " · classifica coperta" : ""}</p>`;
    } else if (now < new Date(START.getTime() + SHIFT)){
      let s = Math.max(0, Math.floor((START - now) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      const u = (n, l) => `<span class="u"><span class="n">${String(n).padStart(2,"0")}</span><span class="l">${l}</span></span>`;
      html = `<div class="count">${u(d,"giorni")}${u(h,"ore")}${u(m,"min")}${u(s,"sec")}</div><p class="count-cap">al via, lunedì 21 dicembre</p>`;
    } else if (live()){
      const td = currentDay(), a = actsOf(td);
      html = `${ornaments(td)}
        <p class="count-cap">Giornata <b>${DAYS.indexOf(td) + 1} di 7</b> · ${a.length ? `Oggi: <b>${a.map(x => esc(x.title)).join(" + ")}</b>` : "Oggi giornata libera"}${certHour() && live() ? "<br><b>Ora dei certificati</b> fino a mezzanotte" : covered() ? "<br>Classifica coperta fino alla chiusura del 28 a mezzanotte" : ""}</p>`;
    } else if (!revealed()){
      html = `<div class="closing"><div class="t2">Chiusura ufficiale</div>
        <p class="count-cap">${S.admin ? "È arrivata la mezzanotte: tocca al Direttivo svelare il vincitore." : "Il Direttivo sta per svelare il vincitore."}</p>
        ${S.admin ? `<button class="btn gold big" data-reveal="1" type="button">Scopri il vincitore</button>` : ""}</div>`;
    } else {
      const top = ranked()[0];
      html = `<p class="count-cap" style="font-size:16px">Edizione conclusa${top ? ` · vince <b>${esc(top.p.name)}</b> con ${top.r.tot} ${Math.abs(top.r.tot) === 1 ? "punto" : "punti"}` : ""}</p>
        <button class="btn ghost small" data-reveal="replay" type="button" style="margin-top:10px">Rivedi la cerimonia</button>`;
    }
    if (html !== lastCount){ $("count").innerHTML = html; lastCount = html; }
  }

  /* ---------- modalità ---------- */
  function renderMode(){
    document.body.classList.toggle("viewer", !S.admin);
    $("adm-fab").classList.toggle("on", S.admin);
    $("adm-fab-t").textContent = S.admin ? "Admin attivo" : "Admin";
    $("mode-label").textContent = S.admin ? "Sei dentro: puoi segnare punti, provare le giornate e, a fine settimana, svelare il vincitore."
      : S.online ? "Entra con email e password dell'admin. Chi guarda e basta non ha bisogno di entrare." : "Inserisci il PIN dell'admin. La prima volta lo scegli tu.";
    $("f-pin").hidden = S.admin; $("adm-tools").hidden = !S.admin;
    $("pg-bar").hidden = !SHIFT_PROVA;
    if (SHIFT_PROVA){
      const fmt = new Intl.DateTimeFormat("it-IT", {weekday:"long", day:"numeric", month:"long"});
      const avanti = PG_MIN ? ` (orologio avanti di ${Math.floor(PG_MIN / 60) ? Math.floor(PG_MIN / 60) + " h " : ""}${PG_MIN % 60 ? PG_MIN % 60 + " min" : ""})`.replace(" )", ")") : "";
      $("pg-txt").textContent = `oggi, ${fmt.format(new Date())}, nell'app vale come ${fmt.format(new Date(NOW()))}${avanti}`;
      $("pg-note").textContent = "Durante la prova generale i punti sono veri e li vedono tutti. Finita la prova, cancellali da qui prima del 21 dicembre.";
    }
    const pgLeft = !SHIFT_PROVA && NOW() < START.getTime() && (S.points.some(x => !x.trial) || S.extras.some(x => !x.trial) || S.settings.length > 0);
    if (pgLeft) $("pg-note").textContent = "Sono rimasti nel database i punti, i certificati e la cerimonia della prova generale, e chi apre il sito li vede. Cancellali prima del 21 dicembre.";
    $("pg-tools").hidden = !SHIFT_PROVA && !pgLeft;
    $("adm-fab").classList.toggle("warn", S.admin && pgLeft);
    $("adm-status").hidden = !S.admin;
    $("in-email").hidden = !S.online;
    $("in-pin").inputMode = S.online ? "text" : "numeric";
    $("in-pin").placeholder = S.online ? "Password" : lsGet("sp-pin") ? "PIN admin" : "Scegli un PIN";
    $("pin-go").textContent = S.online ? "Accedi" : lsGet("sp-pin") ? "Entra" : "Imposta";
    $("trial-chips").parentElement.hidden = frozen() && !trialDone();
    $("trial-chips").innerHTML = DAYS.map(d => `<button type="button" class="tchip ${d === S.trial ? "on" : ""}" data-trial="${d}"><span>${esc(wdShort(d))}</span><b>${dt(d).getDate()}</b></button>`).join("")
      + `<button type="button" class="tchip wide" data-trial="closing"><span>prova la</span><b>Cerimonia</b></button>`
      + (S.online ? `<button type="button" class="tchip wide live" data-trial="closing-live"><span>per tutti</span><b>Cerimonia in diretta</b></button>` : "")
      + (S.trial ? `<button type="button" class="tchip wide out" data-trial=""><span>finisci</span><b>Esci dalla prova</b></button>` : "");
    $("cert-btn").hidden = !certOpen();
    $("trial-bar").hidden = !S.trial;
    if (S.trial) $("trial-day").textContent = dayLabel(S.trial);
    $("multi-btn").disabled = !assignOpen();
    renderDirettivo();
    $("hint-board").textContent = !S.admin ? (beforeStart() ? "La Settimana Pazza si apre lunedì 21 dicembre: da lì parte la classifica." : hidden() ? "Tocca un nome per vedere i bonus e malus presi fino al 25." : "Tocca un nome per vedere i bonus e malus che ha preso.")
      : live() && !pointsYet() ? "La Settimana Pazza è partita: le assegnazioni si aprono stasera alle 19."
      : live() && !assignOpen() ? "Consegna dei certificati in corso: i punti sono chiusi. A mezzanotte la chiusura ufficiale."
      : live() ? `Giornata in corso: ${dayLabel(currentDay())}. Tocca un nome o assegna a più persone insieme.${covered() ? " La classifica è coperta: i punti li vedi solo tu." : ""}`
      : new Date(NOW()) < START ? "Le assegnazioni si aprono lunedì 21 dicembre alle 19." : "La settimana è finita: le assegnazioni sono chiuse.";
  }

  /* ---------- classifica ---------- */
  /* le foto dei profili sono in js/dati.js (PHOTOS); chi non ce l'ha mostra l'iniziale */
  const avatar = (p, cls = "") => PHOTOS[p?.id]
    ? `<span class="av photo ${cls}" style="--pc:${colorOf(p)}"><img src="${PHOTOS[p.id]}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="av ${cls}" style="--pc:${colorOf(p)}">${esc(initial(p))}</span>`;
  const funAvatar = (p, cls = "") => (typeof PHOTOS_FUN === "object" && PHOTOS_FUN[p?.id])
    ? `<span class="av photo ${cls}" style="--pc:${colorOf(p)}"><img src="${PHOTOS_FUN[p.id]}" alt="" loading="lazy" decoding="async"></span>` : avatar(p, cls);
  const roleTag = p => p.role ? `<span class="role">${esc(p.role)}</span>` : "";
  function mineTag(p){
    if (p.role === "Presidente") return `<span class="mine j">Jolly presidenziale</span>`;
    const m = mineOf(p.id);
    return m ? `<span class="mine ${m.delta>=0?"b":"m"}">${m.delta>=0?"Bonus":"Malus"}: ${esc(m.short || m.label)}</span>` : "";
  }
  /* una card della classifica: posizione (medaglia per i primi tre) e freccia da ieri, foto, nome, bonus/malus, totale */
  const rowHTML = (p, rank, tot, sline, cls, ex = {}) => `<li data-pid="${esc(p.id)}"><button class="row ${cls}" data-open="${esc(p.id)}" aria-label="${esc(p.name)}, ${esc(String(tot))} punti">
      <span class="rank">${typeof rank === "number" && rank <= 3 ? `<span class="medal-r m${rank}">${rank}</span>` : `<span class="rk">${rank}</span>`}${ex.move ? `<span class="mv ${ex.move > 0 ? "up" : "down"}">${ex.move > 0 ? "▲" : "▼"}${Math.abs(ex.move)}</span>` : ""}</span>${avatar(p)}
      <span class="who"><span class="n">${esc(p.name)}</span>${p.role ? `<span class="rl">${esc(p.role)}</span>` : ""}<span class="s">${sline}</span></span>
      <span class="tot-w"><span class="tot ${Number(tot) < 0 ? "neg" : ""}" data-tot="${esc(p.id)}">${tot}</span><span class="tot-l">${ex.lbl ?? "punti"}</span></span></button></li>`;
  /* posizioni contando solo alcuni punti (es. fino a ieri) */
  function rankAt(filter){
    const t = {}; for (const p of S.players) t[p.id] = 0;
    for (const e of allPoints()) if (t[e.playerId] != null && filter(e)) t[e.playerId] += Number(e.delta) || 0;
    const r = {}; let rank = 0, prev = null;
    Object.entries(t).sort((a,b) => b[1] - a[1]).forEach(([id, v], k) => { if (v !== prev){ rank = k + 1; prev = v; } r[id] = rank; });
    return r;
  }

  function renderPodium(list){
    if (list.length < 3 || !S.points.length){
      $("podium").innerHTML = `<p class="pod-note">${list.length ? "Il podio si accende col primo punto assegnato." : ""}</p>`;
      return;
    }
    const pod = (x, cls, place) => `<button class="pod ${cls}" data-open="${esc(x.p.id)}" style="background:none;border:0;padding:0">
      ${place === 1 ? CROWN : ""}${avatar(x.p)}<span class="nm">${esc(x.p.name)}</span><span class="pt ${x.r.tot<0?"neg":""}">${x.r.tot}</span>
      <span class="base">${x.rank}</span></button>`;
    $("podium").innerHTML = `<div class="podium">${pod(list[1],"second",2)}${pod(list[0],"first",1)}${pod(list[2],"third",3)}</div>`;
  }
  const CROWN = `<svg class="crown" viewBox="0 0 34 24" aria-hidden="true"><path d="M2 20 L5 5 L12 13 L17 2 L22 13 L29 5 L32 20 Z" fill="#f0c14f" stroke="#c8962a" stroke-width="1.5" stroke-linejoin="round"/><circle cx="17" cy="2.5" r="2" fill="#e0404a"/></svg>`;

  /* Riepilogo della giornata precedente */
  function recapHTML(){
    if (!live()) return "";
    const i = DAYS.indexOf(currentDay()); if (i < 1) return "";
    const y = DAYS[i-1];
    if (hiddenDay(y)) return "";
    const pts = allPoints().filter(e => dayOf(e) === y && player(e.playerId));
    if (!pts.length) return "";
    if (lsGet("sp-recap-" + y + (S.trial ? "-prova" : ""))) return `<button class="recap-min" data-recapx="${y}" data-show="1" type="button"><span class="lbl" style="margin:0">Ieri in breve</span><b>${esc(dayLabel(y))}</b><span class="rm-go">Mostra ▾</span></button>`;
    const sum = {}, mal = {};
    for (const e of pts){ sum[e.playerId] = (sum[e.playerId]||0) + (Number(e.delta)||0); if (Number(e.delta) < 0 && !e.auto) mal[e.playerId] = (mal[e.playerId]||0) + 1; }
    const top = Object.entries(sum).sort((a,b) => b[1]-a[1]).slice(0,3);
    const worst = Object.entries(mal).sort((a,b) => b[1]-a[1])[0];
    const ele = pts.filter(e => e.auto).length, jol = pts.filter(e => e.jolly).length;
    const before = rankAt(e => dayOf(e) < y), after = rankAt(e => dayOf(e) <= y);
    const climb = S.players.map(p => [p, before[p.id] - after[p.id]]).sort((a,b) => b[1]-a[1])[0];
    return `<div class="recap"><div class="rh"><div><div class="lbl" style="margin:0">Ieri in breve</div><b>${esc(dayLabel(y))}</b></div><button class="btn ghost small" data-recapx="${y}" type="button">Chiudi</button></div>
      <ol class="rtop3">${top.map(([id,v],k) => `<li><span class="medal m${k+1}">${k+1}</span>${avatar(player(id))}<span class="nm">${esc(player(id).name)}</span><span class="pill ${v>=0?"b":"m"}">${sign(v) || "0"}</span></li>`).join("")}</ol>
      <div class="rfacts">
        ${climb && climb[1] > 0 ? `<span><b>${esc(climb[0].name)}</b> sale di ${climb[1]} ${climb[1] === 1 ? "posto" : "posti"}</span>` : ""}
        ${worst ? `<span>Più malus: <b>${esc(player(worst[0]).name)}</b> (${worst[1]})</span>` : ""}
        <span>Malus Ele scattati: <b>${ele}</b></span><span>Jolly usati: <b>${jol}</b></span>
      </div>
      <div><div class="lbl">Bonus e malus di ieri</div>${dayBreakdownHTML(y)}</div></div>`;
  }
  /* bonus e malus presi in una giornata: quale, quante volte, a chi */
  function dayBreakdownHTML(day){
    const g = {};
    for (const e of allPoints()){
      if (dayOf(e) !== day || !player(e.playerId)) continue;
      const k = e.reason || (Number(e.delta) >= 0 ? "Bonus" : "Malus"), x = g[k] = g[k] || {tot:0, who:{}};
      x.tot += Number(e.delta) || 0; x.who[e.playerId] = (x.who[e.playerId] || 0) + 1;
    }
    const rows = Object.entries(g).sort((a,b) => b[1].tot - a[1].tot);
    if (!rows.length) return `<p class="none" style="margin:0">Nessun bonus o malus in questa giornata.</p>`;
    return `<ul class="dbreak">${rows.map(([k,x]) => `<li><span class="pill ${x.tot >= 0 ? "b" : "m"}">${sign(x.tot) || "0"}</span><span class="dk">${esc(k)}</span>
      <span class="rwho">${Object.entries(x.who).map(([id,n]) => `<span class="mini" style="--pc:${colorOf(player(id))}">${esc(player(id).name)}${n > 1 ? " ×" + n : ""}</span>`).join("")}</span></li>`).join("")}</ul>`;
  }

  function renderBoard(){
    $("recap").innerHTML = recapHTML();
    $("bmode").innerHTML = ["week","day"].map(m => `<button type="button" data-bmode="${m}" aria-pressed="${S.boardMode === m}">${m === "week" ? "Settimana" : "Per giornata"}</button>`).join("");
    $("day-break").innerHTML = "";
    if (S.boardMode === "day"){ renderDayBoard(); return; }
    if (hidden()){
      $("podium").innerHTML = `<div class="covered"><div class="q" aria-hidden="true">??</div><b>Classifica coperta</b><p>Dal 26 dicembre i punti li vede solo l'admin. Si scopre tutto il 28 a mezzanotte, con la chiusura ufficiale.</p></div>`;
      $("board").innerHTML = [...S.players].sort((a,b) => a.name.localeCompare(b.name)).map(p => rowHTML(p, "?", "??", "punti coperti", "", {lbl:"coperti"})).join("");
      return;
    }
    const list = ranked();
    renderPodium(list);
    if (!list.length){ $("board").innerHTML = `<li class="empty">${S.online ? "La classifica si prepara al primo accesso dell'admin. Torna a guardare tra poco." : "Nessun giocatore."}</li>`; return; }
    const before = {};
    if (!reduce) $("board").querySelectorAll("[data-pid]").forEach(el => before[el.dataset.pid] = el.getBoundingClientRect().top);
    const stag = S.stagger; S.stagger = false;
    const di = DAYS.indexOf(currentDay()), yRank = live() && di > 0 ? rankAt(e => dayOf(e) < currentDay()) : null;
    const top = list[0].r.tot;
    $("board").innerHTML = list.map(({p, r, rank}) => rowHTML(p, rank, r.tot,
      (r.bon || r.mal) ? `${r.bon ? `<span class="bp">${sign(r.bon)}</span>` : ""}${r.mal ? `<span class="mp">${sign(r.mal)}</span>` : ""}` : `<span class="nope">nessun punto</span>`,
      "r" + rank, {move: yRank ? yRank[p.id] - rank : 0, lbl: rank === 1 ? (top > 0 ? "in testa" : "punti") : `−${top - r.tot} dal 1°`})).join("");
    list.forEach(({p, r}, i) => {
      const el = $("board").querySelector(`[data-pid="${CSS.escape(p.id)}"]`);
      if (stag){ el.style.setProperty("--i", i); el.classList.add("stagger"); }
      if (before[p.id] != null){
        const dy = before[p.id] - el.getBoundingClientRect().top;
        if (dy) el.animate([{transform:`translateY(${dy}px)`},{transform:"none"}], {duration:450, easing:"cubic-bezier(.2,.8,.2,1)"});
      }
      if (prevTotals[p.id] != null && prevTotals[p.id] !== r.tot) el.querySelector(".tot").classList.add(r.tot > prevTotals[p.id] ? "bump" : "shake");
      prevTotals[p.id] = r.tot;
    });
  }
  function renderDayBoard(){
    const started = live() || NOW() >= END || trialDone();
    const days = started ? DAYS.filter(d => S.trial ? d <= S.trial : (!live() || d <= currentDay())) : [];
    if (!days.length){ $("podium").innerHTML = ""; $("board").innerHTML = `<li class="empty">La classifica di giornata parte lunedì 21.</li>`; return; }
    if (!days.includes(S.boardDay)) S.boardDay = days[days.length - 1];
    $("podium").innerHTML = `<div class="dchips">${days.map(d => `<button type="button" data-bday="${d}" aria-pressed="${d === S.boardDay}">${esc(wdShort(d))} ${dt(d).getDate()}</button>`).join("")}</div>`;
    if (hiddenDay(S.boardDay)){ $("board").innerHTML = `<li class="covered"><div class="q" aria-hidden="true">??</div><b>Giornata coperta</b><p>Si scopre il 28 a mezzanotte.</p></li>`; $("day-break").innerHTML = ""; return; }
    const t = {}, bon = {}, mal = {}; for (const p of S.players){ t[p.id] = 0; bon[p.id] = 0; mal[p.id] = 0; }
    for (const e of allPoints()) if (dayOf(e) === S.boardDay && t[e.playerId] != null){ const d = Number(e.delta)||0; t[e.playerId] += d; if (d > 0) bon[e.playerId] += d; else mal[e.playerId] += d; }
    $("day-break").innerHTML = `<div class="lbl">Bonus e malus della giornata</div>${dayBreakdownHTML(S.boardDay)}`;
    const list = [...S.players].sort((a,b) => t[b.id] - t[a.id] || a.name.localeCompare(b.name));
    let rank = 0, prev = null;
    $("board").innerHTML = list.map((p,i) => { if (t[p.id] !== prev){ rank = i + 1; prev = t[p.id]; }
      return rowHTML(p, rank, t[p.id] > 0 ? "+" + t[p.id] : t[p.id], (bon[p.id] || mal[p.id]) ? `${bon[p.id] ? `<span class="bp">${sign(bon[p.id])}</span>` : ""}${mal[p.id] ? `<span class="mp">${sign(mal[p.id])}</span>` : ""}` : `<span class="nope">nessun punto</span>`, "r" + rank, {lbl:"in giornata"}); }).join("");
  }

  /* ---------- programma ---------- */
  const ICONS = {apertura:"🥂", shooting:"📸", pigiama:"🧦", ppt:"📊", tradizioni:"🍻", ape:"⛸️", santa:"🎁", tombola:"🎲", festa:"🎂", premi:"🏆"};
  const whoList = (who, day) => hiddenDay(day) ? `<span class="none">?? · si scopre il 28</span>`
    : who.length ? who.map(p => `<span class="mini" style="--pc:${colorOf(p)}" title="${esc(p.name)}">${esc(p.name)}</span>`).join("") : `<span class="none">Ancora nessuno</span>`;
  const beforeStart = () => !S.trial && NOW() < START.getTime();
  /* per chi non è admin: programma coperto fino al 1° dicembre, poi solo i titoli fino al 21 */
  const titlesOnly = () => beforeStart() && !S.admin;
  /* i punti delle attività si scoprono giorno per giorno (dalle 6 della giornata); l'admin li vede sempre */
  const rulesShown = d => S.admin || d <= currentDay();
  function renderDays(){
    if (titlesOnly() && NOW() < PROGRAM_FROM.getTime()){
      $("days").innerHTML = "";
      $("dayview").innerHTML = `<div class="covered"><div class="q" aria-hidden="true">?</div><b>Il programma è una sorpresa</b><p>Si svela martedì 1° dicembre. I dettagli di ogni giornata arrivano lunedì 21.</p></div>`;
      return;
    }
    const cd = currentDay(), isLive = live();
    if (!S.day) S.day = DAYS.includes(cd) ? cd : DAYS[0];
    $("days").innerHTML = DAYS.map(d => `<button class="day ${isLive && d===cd ? "today" : ""} ${isLive && d < cd ? "past" : ""}" role="tab" data-day="${d}" aria-selected="${d===S.day}">
      <span class="wd">${esc(wdShort(d))}</span><span class="dn">${dt(d).getDate()}</span><span class="dots">${actsOf(d).map(() => "<i></i>").join("")}</span></button>`).join("");
    const acts = actsOf(S.day), isNow = assignOpen() && S.day === cd;
    const head = `<div class="dayhead"><span class="big">${dt(S.day).getDate()}</span><div><div class="t1">${esc(wdLong(S.day))}</div>${DAYNAME[S.day] ? `<div class="t2">${esc(DAYNAME[S.day])}</div>` : ""}</div></div>`;
    const lock = d => `<span class="locked admin-only">${isLive && d < cd ? "Giornata chiusa" : isLive && d === cd && !pointsYet() ? "Si segna dalle 19" : isLive && d === cd ? "Dalle 23 solo certificati" : "Si segna durante la giornata"}</span>`;
    const card = a => {
      if (titlesOnly()) return `<li class="act"><div class="act-h"><span class="act-ic" aria-hidden="true">${ICONS[a.id] || "✦"}</span><div class="act-ht"><h3>${esc(a.title)}</h3></div></div></li>`;
      const sums = {};
      for (const e of allPoints()) if (e.activityId === a.id && player(e.playerId)) sums[e.playerId] = (sums[e.playerId]||0) + (Number(e.delta)||0);
      const best = Object.entries(sums).sort((x,y) => y[1]-x[1])[0];
      const foot = hiddenDay(a.day) ? "Punti coperti fino alla chiusura"
        : best && best[1] > 0 ? `In testa qui: <b>${esc(player(best[0]).name)}</b> (${sign(best[1])})` : (Object.keys(sums).length ? "Per ora solo malus in questa attività" : "Ancora nessun punto in questa attività");
      return `<li class="act">
        <div class="act-h"><span class="act-ic" aria-hidden="true">${ICONS[a.id] || "✦"}</span><div class="act-ht"><h3>${esc(a.title)}</h3>${a.dress ? `<span class="tag dress">Dress code · ${esc(a.dress)}</span>` : ""}</div></div>
        ${(a.notes||[]).length ? `<ul class="notes">${a.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${(a.rules||[]).length && !rulesShown(a.day) ? `<p class="none rules-soon">I punti di questa attività si scoprono il giorno stesso.</p>` : ""}
        ${(a.rules||[]).length && rulesShown(a.day) ? `<div><div class="lbl">Punti della giornata</div><ul class="rlist">${a.rules.map((r,i) => `<li class="rrow ${r.delta>=0?"b":"m"}"><span class="lpt ${r.delta>=0?"b":"m"}">${sign(r.delta)}</span>
            <span class="rt"><b>${esc(r.label)}</b><span class="rwho">${whoList(takers(a.id, r.label, a.day), a.day)}</span></span>
            ${isNow ? `<button class="btn small gold admin-only" data-mark="r:${esc(a.id)}:${i}">Segna chi</button>` : lock(a.day)}</li>`).join("")}</ul></div>` : ""}
        ${a.id === "premi" ? `<div><div class="lbl">Certificati della serata</div>${certsHTML(a.day)}${certOpen() && S.day === cd ? `<button class="btn gold admin-only" data-cert="1" type="button" style="margin-top:8px">Consegna certificati</button>` : ""}</div>` : ""}
        ${rulesShown(a.day) ? `<div class="foot"><span>${foot}</span></div>` : ""}
      </li>`;
    };
    const soon = titlesOnly() && acts.length ? `<p class="closed">Dress code, regole e punti si scoprono lunedì 21 dicembre.</p>` : "";
    const body = acts.length ? `${soon}<ul class="acts">${acts.map(card).join("")}</ul>`
      : `<div class="free"><b>Giornata libera</b>Niente in programma, per ora.</div>`;
    const ex = extrasOf(S.day);
    const minis = ex.length ? `<div class="act minis"><div class="act-h"><span class="act-ic" aria-hidden="true">⚡</span><div class="act-ht"><h3>Mini-sfide</h3><span class="tag">create al volo durante la giornata</span></div></div><ul class="rlist">${ex.map(x => `<li class="rrow ${x.delta>=0?"b":"m"}"><span class="lpt ${x.delta>=0?"b":"m"}">${sign(x.delta)}</span>
        <span class="rt"><b>${esc(x.label)}</b><span class="rwho">${whoList(takers("", x.label, S.day), S.day)}</span></span>${isNow ? `<button class="btn small gold admin-only" data-mark="x:${esc(x.id)}">Segna chi</button>` : ""}</li>`).join("")}</ul></div>` : "";
    $("dayview").innerHTML = head + body + minis;
  }
  /* certificati consegnati in una giornata, con chi li ha ricevuti */
  function certsHTML(day, forceShow){
    const cs = certsOf(day);
    if (!cs.length) return `<p class="none" style="margin:0">Ancora nessun certificato consegnato.</p>`;
    if (hiddenDay(day) && !forceShow) return `<p class="none" style="margin:0">${cs.length} ${cs.length === 1 ? "certificato consegnato" : "certificati consegnati"} · chi li ha presi si scopre il 28</p>`;
    return `<ul class="certs">${cs.map(c => `<li><span class="seal" aria-hidden="true">★</span><span class="cn">${esc(c.label.replace(/^Certificato · /, ""))}</span><span class="rwho">${takers("premi", c.label, day).map(p => `<span class="mini" style="--pc:${colorOf(p)}">${esc(p.name)}</span>`).join("") || `<span class="none">nessuno</span>`}</span></li>`).join("")}</ul>`;
  }

  /* ---------- storico ---------- */
  /* Storico: filtri per giornata e per persona, voci raggruppate per giornata */
  function renderLog(){
    if (!player(S.filter)) S.filter = "";
    if (S.logDay && !DAYS.includes(S.logDay)) S.logDay = "";
    const fp = S.filter, fd = S.logDay;
    const all = [...allPoints().map(e => ({...e})),
      ...S.extras.filter(x => x.type !== "cert").map(x => ({id:x.id, extra:true, label:x.label, delta:Number(x.delta), day:x.day, at:x.createdAt, trial:x.trial}))];
    const visible = all.filter(e => !hiddenDay(dayOf(e)));
    const count = d => visible.filter(e => !e.extra && dayOf(e) === d && (!fp || e.playerId === fp)).length;
    $("log-days").innerHTML = `<button type="button" class="lchip" data-lday="" aria-pressed="${!fd}">Tutte</button>` + DAYS.map(d => {
      const n = count(d), cov = hiddenDay(d);
      return `<button type="button" class="lchip ${n || cov ? "" : "zero"}" data-lday="${d}" aria-pressed="${fd === d}"><span class="wd">${esc(wdShort(d))}</span><b>${dt(d).getDate()}</b>${cov ? `<span class="cnt">??</span>` : n ? `<span class="cnt">${n}</span>` : ""}</button>`;
    }).join("");
    $("log-people").innerHTML = `<button type="button" class="pchip all" data-lpl="" aria-pressed="${!fp}"><span class="av">★</span><span>Tutti</span></button>`
      + [...S.players].sort((a,b) => a.name.localeCompare(b.name)).map(p => `<button type="button" class="pchip" data-lpl="${esc(p.id)}" aria-pressed="${fp === p.id}">${avatar(p)}<span>${esc(p.name)}</span></button>`).join("");
    const hiddenSel = fd && hiddenDay(fd);
    let evs = visible.filter(e => (!fp || (!e.extra && e.playerId === fp)) && (!fd || dayOf(e) === fd));
    const nHidden = all.filter(e => hiddenDay(dayOf(e)) && (!fp || e.playerId === fp) && (!fd || dayOf(e) === fd)).length;
    const coveredBox = (hiddenSel || (!fd && (nHidden || (S.online && hidden())))) ? `<div class="lcover"><span class="q">??</span><div><b>${hiddenSel ? "Giornata coperta" : "Dal 26 dicembre lo storico è coperto"}</b><span>${nHidden ? `${nHidden} ${nHidden === 1 ? "voce si scopre" : "voci si scoprono"}` : "Le voci si scoprono"} il 28 a mezzanotte</span></div></div>` : "";
    if (!evs.length){
      $("log").innerHTML = coveredBox || `<div class="lempty"><span aria-hidden="true">❄</span><b>Niente da mostrare</b><p>${fd || fp ? "Nessun bonus o malus con questi filtri." : "Nessun punto assegnato finora."}</p></div>`;
      return;
    }
    const fmt = new Intl.DateTimeFormat("it-IT", {hour:"2-digit", minute:"2-digit"});
    const cd = currentDay();
    const isMini = e => !e.activityId && S.extras.some(x => x.type !== "cert" && x.day === dayOf(e) && x.label === baseReason(e));
    const groups = {};
    for (const e of evs) (groups[dayOf(e)] = groups[dayOf(e)] || []).push(e);
    const item = e => {
      const time = e.at ? esc(fmt.format(new Date(e.at))) : "";
      if (e.extra) return `<li class="lev mini"><span class="lic" aria-hidden="true">✦</span>
        <span class="lt"><b>Nuova mini-sfida</b><span class="lr">${esc(e.label)} · 1 al giorno${e.trial ? " · prova" : ""}</span></span>
        <span class="lside"><span class="lpt ${e.delta >= 0 ? "b" : "m"}">${sign(e.delta)}</span><span class="ltime">${time}</span></span>
        ${frozen() ? "" : `<span class="lact admin-only"><button class="btn danger small" data-del="extras/${esc(e.id)}">Elimina</button></span>`}</li>`;
      const p = player(e.playerId), a = S.activities.find(x => x.id === e.activityId), d = Number(e.delta) || 0, dd = dayOf(e);
      const reason = e.reason || (d >= 0 ? "Bonus" : "Malus"), [r1, ...rr] = reason.split(" · ");
      const tag = reason.startsWith("Certificato · ") ? "certificato" : e.auto ? "automatico" : e.jolly ? "jolly" : isMini(e) ? "mini-sfida" : a ? a.title : "";
      return `<li class="lev ${d >= 0 ? "b" : "m"}">${p ? avatar(p, "lav") : `<span class="av lav">?</span>`}
        <span class="lt"><b>${esc(p ? p.name : "Giocatore rimosso")}</b><span class="lr">${esc(r1)}${rr.length ? ` <span class="lr2">· ${esc(rr.join(" · "))}</span>` : ""}</span>${tag || e.trial ? `<span class="ltags">${tag ? `<span class="ltag">${esc(tag)}</span>` : ""}${e.trial ? `<span class="ltag pr">prova</span>` : ""}</span>` : ""}</span>
        <span class="lside"><span class="lpt ${d >= 0 ? "b" : "m"}">${sign(d)}</span><span class="ltime">${time}</span></span>
        ${frozen() || (e.auto && !e.stored) || e.derived ? "" : `<span class="lact admin-only"><button class="btn danger small" data-del="points/${esc(e.id)}">Elimina</button></span>`}</li>`;
    };
    $("log").innerHTML = coveredBox + Object.keys(groups).sort().reverse().map(day => {
      const list = groups[day].sort((a,b) => (b.at||0) - (a.at||0)), pts = list.filter(e => !e.extra);
      const bon = pts.reduce((s,e) => s + Math.max(0, Number(e.delta)||0), 0), mal = pts.reduce((s,e) => s + Math.min(0, Number(e.delta)||0), 0);
      const acts = actsOf(day).map(x => x.title).join(" + ");
      return `<section class="lday"><header class="ldh"><span class="ldn">${dt(day).getDate()}</span>
          <span class="ldt"><b>${esc(dayLabel(day).replace(/ \d+ dicembre$/, ""))}${day === cd && live() ? ` <span class="ltoday">oggi</span>` : ""}</b><span>${esc(acts || "Giornata libera")}</span></span>
          <span class="ldsum">${bon ? `<span class="bp">${sign(bon)}</span>` : ""}${mal ? `<span class="mp">${sign(mal)}</span>` : ""}</span></header>
        <ul class="lgroup">${list.map(item).join("")}</ul></section>`;
    }).join("");
  }

  /* ---------- regole ---------- */
  function renderPresets(){
    const kind = p => p.auto ? `<span class="ktag auto">automatico</span>` : Number(p.delta) < 0 && !p.once ? `<span class="ktag cum">max 2 al giorno: la 2ª è Malus Ele</span>` : p.once ? `<span class="ktag">1 volta al giorno</span>` : `<span class="ktag cum">cumulabile</span>`;
    const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    const row = p => { const o = player(p.owner), name = p.label.split(" · ")[0];
      return `<li class="bm ${p.delta >= 0 ? "b" : "m"}">
        ${o ? funAvatar(o, "bm-av") : `<span class="av bm-av" style="--pc:var(--card-2)">${p.delta >= 0 ? "+" : "−"}</span>`}
        <span class="bm-t"><span class="bm-k">${esc(name)}</span><b>${esc(cap(p.short || p.label))}</b>${p.desc ? `<span class="bm-d">${esc(p.desc)}</span>` : ""}${kind(p)}</span>
        <span class="bm-v">${sign(p.delta)}</span></li>`; };
    const sorted = [...S.presets].sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
    const b = sorted.filter(p => p.delta >= 0), m = sorted.filter(p => p.delta < 0);
    $("pl-b").innerHTML = b.length ? b.map(row).join("") : `<li class="empty">Nessun bonus.</li>`;
    $("pl-m").innerHTML = m.length ? m.map(row).join("") : `<li class="empty">Nessun malus.</li>`;
  }

  /* il Direttivo: il Presidente in evidenza, gli altri in fila */
  function renderDirettivo(){ $("dir-list").innerHTML = direttivoHTML(); }
  function direttivoHTML(){
    const order = ["Presidente","Vicepresidente","Assessore"];
    const dir = S.players.filter(p => p.role).sort((a,b) => order.indexOf(a.role) - order.indexOf(b.role));
    const pres = dir.find(p => p.role === "Presidente"), others = dir.filter(p => p !== pres);
    return (pres ? `<div class="dir-pres"><div class="dir-ph">${CROWN}${avatar(pres, "dir-av big")}</div>
        <div class="dir-tx"><span class="role">Presidente</span><b>${esc(pres.name)}</b><span class="dir-j"><span class="jbadge">J</span>Il Jolly presidenziale porta il suo nome</span></div></div>` : "")
      + `<div class="dir-grid">${others.map(p => `<div class="dir-c">${avatar(p, "dir-av")}<b>${esc(p.name)}</b><span class="role">${esc(p.role)}</span></div>`).join("")}</div>`;
  }
  function render(){ renderCount(); renderMode(); renderBoard(); renderDays(); renderLog(); renderPresets(); refreshSheet(); keepAwake(wantAwake()); }

  /* ---------- pannelli ---------- */
  let sheet = null;
  function summaryHTML(pid, onlyTonight){
    const g = {};
    for (const e of allPoints()) if (e.playerId === pid && (!onlyTonight || dayOf(e) === currentDay()) && !hiddenDay(dayOf(e))){ const d = Number(e.delta)||0, k = e.reason || (d >= 0 ? "Bonus" : "Malus"); (g[k] = g[k] || {n:0, tot:0}).n++; g[k].tot += d; }
    const rows = Object.entries(g).sort((a,b) => b[1].n - a[1].n || b[1].tot - a[1].tot);
    const note = hidden() && !onlyTonight ? `<p class="none" style="margin:6px 0 0">Dal 26 dicembre i punti sono coperti fino alla chiusura.</p>` : "";
    if (!rows.length) return `<p style="margin:0;color:var(--muted)">${onlyTonight ? "Niente, per ora." : "Ancora nessun bonus o malus."}</p>` + note;
    return note.replace("margin:6px 0 0", "margin:0 0 8px") + `<ul class="sum">${rows.map(([k,x]) => `<li><span class="pill ${x.tot>=0?"b":"m"}">${sign(x.tot) || "0"}</span><span>${esc(k)}</span><span class="x">×${x.n}</span></li>`).join("")}</ul>`;
  }
  const head = p => { const m = mineOf(p.id); return `<div class="grab" aria-hidden="true"></div><div class="sh-head">${avatar(p)}<div class="who"><span class="n" id="sh-name">${esc(p.name)}${roleTag(p)}</span><span class="s">punti totali</span></div><span class="tot" id="sh-tot"></span></div>
    ${p.role === "Presidente" ? `<div class="mine-card j"><span class="pill jp">J</span><span>Il Jolly presidenziale porta il suo nome</span></div>`
      : m ? `<div class="mine-card ${m.delta>=0?"b":"m"}"><span class="pill ${m.delta>=0?"b":"m"}">${sign(m.delta)}</span><span>Il suo ${m.delta>=0?"bonus":"malus"}: ${esc(m.label)}</span></div>` : ""}`; };
  const serataPill = () => `<div class="serata"><span class="dot"></span>Oggi · <b>${esc(dayLabel(currentDay()))}</b>${S.trial ? " · prova" : ""}</div>`;
  const closedNote = () => `<p class="closed">${new Date(NOW()) < START && !S.trial ? "Le assegnazioni si aprono lunedì 21 dicembre alle 19." : live() && !pointsYet() ? "Le assegnazioni si aprono stasera alle 19." : live() ? "Consegna dei certificati in corso: i punti sono chiusi, ora si consegnano solo i certificati (pulsante «Consegna certificati»)." : "Le assegnazioni sono chiuse."}</p>`;

  /* chip di un bonus/malus: disattivato se automatico o se è da 1 volta e la persona l'ha già preso stasera */
  function itemChip(it, attr, pid){
    if (it.auto) return `<span class="chip m auto" aria-disabled="true"><span class="v">${sign(it.delta)}</span>${esc(it.label.split(" · ")[0])} <em>(viene applicato in automatico)</em></span>`;
    const done = pid && full(pid, it), max = maxTonight(it);
    const note = max === 1 ? (done ? "✓ preso oggi" : "1 al giorno") : max === 2 ? (done ? "✓ già 2 volte" : pid && timesTonight(pid, it.label) ? "la prossima è Malus Ele" : "max 2 al giorno") : "";
    return `<button class="chip ${it.delta>=0?"b":"m"} ${done?"done":""}" ${attr} ${done ? 'aria-disabled="true"' : ""}><span class="v">${sign(it.delta)}</span><span class="lb">${esc(showLabel(it))}</span>${note ? `<span class="once">${note}</span>` : ""}</button>`;
  }
  function itemsBlocks(pid, attrOf){
    const its = itemsTonight(), groups = [];
    for (const it of its){ let g = groups.find(x => x.name === it.group); if (!g) groups.push(g = {name:it.group, items:[]}); g.items.push(it); }
    return groups.map(g => `<div><div class="lbl">${esc(g.name)}</div><div class="chips">${g.items.map(it => itemChip(it, attrOf(it), pid)).join("")}</div></div>`).join("");
  }

  function openSheet(pid){
    const p = player(pid); if (!p) return;
    if (!S.admin){
      sheet = {playerId:pid, view:true};
      $("sheet-root").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-name">${head(p)}
        <div><div class="lbl">Bonus e malus presi</div><div id="sh-sum"></div></div>
        <div class="sh-foot"><span></span><button class="btn ghost" id="sh-close">Chiudi</button></div></div></div>`;
      refreshSheet(); $("sh-close").focus({preventScroll:true}); return;
    }
    sheet = {playerId:pid};
    $("sheet-root").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-name">${head(p)}
      ${assignOpen() ? serataPill() + `<div id="sh-items" style="display:grid;gap:16px"></div>` : closedNote()}
      ${assignOpen() ? `<button class="btn ghost" data-quickfor="${esc(pid)}" type="button">+ Nuova mini-sfida per ${esc(p.name)}</button>` : ""}
      ${assignOpen() ? `<div><div class="lbl">Oggi</div><div id="sh-tonight"></div></div>` : ""}
      <div><div class="lbl">Tutta la settimana</div><div id="sh-sum"></div></div>
      <div class="sh-foot"><span></span>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="sh-close">Chiudi</button></div></div>
    </div></div>`;
    refreshSheet(); $("sh-close").focus({preventScroll:true});
  }

  /* Assegnazione multipla: scegli il bonus/malus, poi tocchi tutte le persone */
  function openMulti(key, pid, quick){
    if (!assignOpen()){ toast(live() ? "Dalle 23 si consegnano solo i certificati." : "Le assegnazioni si aprono durante la settimana.", null, true); return; }
    sheet = {multi:{key: key || "", sel:new Set(pid ? [pid] : []), qDelta:1}};
    $("sheet-root").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mu-t">
      <div class="grab" aria-hidden="true"></div>
      <div><h3 id="mu-t" style="margin:0;font-family:var(--f-display);font-size:22px">Assegna a più persone</h3>${serataPill()}</div>
      <div><div class="lbl">1 · Scegli un bonus o un malus</div>
        <details class="quick" id="mu-quick" ${quick ? "open" : ""}><summary>+ Nuova mini-sfida di oggi</summary>
          <form id="f-quick">
            <input type="text" id="q-label" placeholder="Es. Chi vince a braccio di ferro" maxlength="60" autocomplete="off" aria-label="Nome della mini-sfida">
            <div class="seg" data-seg="qDelta"><button type="button" data-v="1" aria-pressed="true" class="sb">+1 bonus</button><button type="button" data-v="-1" aria-pressed="false" class="sm">−1 malus</button></div>
            <button class="btn gold" type="submit">Crea e scegli</button>
          </form>
        </details>
        <div id="mu-items" style="display:grid;gap:14px;margin-top:14px"></div></div>
      <div><div class="lbl">2 · Tocca le persone</div><div class="pgrid" id="mu-grid"></div></div>
      <div class="sh-foot"><button class="btn ghost" id="sh-close">Chiudi</button><button class="btn gold" id="mu-go" disabled>Assegna</button></div>
    </div></div>`;
    refreshSheet();
  }
  function renderMulti(){
    const m = sheet.multi, it = m.key ? itemByKey(m.key) : null;
    if (m.key && !it){ m.key = ""; }
    const blocked = pid => !it ? false : full(pid, it);
    $("mu-items").innerHTML = itemsBlocks(null, x => `data-pick="${esc(x.key)}" aria-pressed="${x.key === m.key}"`);
    for (const pid of [...m.sel]) if (blocked(pid)) m.sel.delete(pid);
    $("mu-grid").innerHTML = [...S.players].sort((x,y) => x.name.localeCompare(y.name)).map(p => {
      const done = blocked(p.id);
      return `<button class="pbtn ${done?"done":""}" data-sel="${esc(p.id)}" aria-pressed="${m.sel.has(p.id)}" ${!it ? "disabled" : done ? 'aria-disabled="true"' : ""}>${avatar(p)}<span class="nm">${esc(p.name)}</span>${done ? `<span class="tagdone">già preso</span>` : ""}</button>`;
    }).join("");
    const go = $("mu-go"), n = m.sel.size;
    go.disabled = !it || !n;
    go.textContent = !it ? "Scegli prima un bonus o un malus" : !n ? "Tocca almeno una persona" : `Assegna ${sign(it.delta)} a ${n} ${n === 1 ? "persona" : "persone"}`;
  }

  function warnTaken(pid, key){
    const p = player(pid);
    const it = itemByKey(key);
    toast(it && maxTonight(it) === 2 ? `Attenzione: ${p.name} ha già preso «${showLabel(it)}» due volte oggi (la seconda era Malus Ele). Non lo assegno di nuovo.`
      : `Attenzione: ${p.name} ha già preso «${it ? showLabel(it) : "questo"}» oggi. Vale una volta al giorno, non lo assegno di nuovo.`, null, true);
  }
  function closeSheet(){ sheet = null; $("sheet-root").innerHTML = ""; }
  function refreshSheet(){
    if (!sheet) return;
    if (sheet.multi){ renderMulti(); return; }
    if (sheet.cert){ renderCert(); return; }
    if (!player(sheet.playerId)){ closeSheet(); return; }
    const t = totals()[sheet.playerId].tot, el = $("sh-tot");
    if (!hidden() && el.textContent !== "" && el.textContent !== "??" && Number(el.textContent) !== t){ el.classList.remove("bump","shake"); void el.offsetWidth; el.classList.add(t > Number(el.textContent) ? "bump" : "shake"); }
    if (hidden()){ el.textContent = "??"; el.classList.remove("neg"); }
    else { el.textContent = t; el.classList.toggle("neg", t < 0); }
    $("sh-sum").innerHTML = summaryHTML(sheet.playerId);
    if (sheet.view || !assignOpen()) return;
    $("sh-items").innerHTML = itemsBlocks(sheet.playerId, x => `data-give="${esc(x.key)}"`);
    $("sh-tonight").innerHTML = summaryHTML(sheet.playerId, true);
  }

  /* Salva i punti. Restituisce i riferimenti creati, per poter annullare. */
  async function savePoints(pids, it){
    const refs = [], eleFor = [], jollyFor = [];
    for (const pid of pids){
      if (full(pid, it)) continue;
      const eleBefore = eleTonight(pid), jollyBefore = it.delta > 0 && jollyTonight(pid);
      const ref = db.collection("points").doc();
      const ok = await write(() => ref.set({playerId:pid, delta:it.delta, reason:it.label, activityId:it.activityId || "", day:currentDay(), at:NOW(), ...(S.trial ? {trial:true} : {})}));
      if (!ok) break;
      refs.push(ref);
      if (it.delta < 0 && eleTonight(pid) > eleBefore) eleFor.push(player(pid).name);
      if (it.delta > 0 && !jollyBefore && jollyTonight(pid)) jollyFor.push(player(pid).name);
    }
    return {refs, eleFor, jollyFor};
  }
  async function giveOne(pid, it, srcEl){
    const {refs, eleFor, jollyFor} = await savePoints([pid], it);
    if (!refs.length) return;
    if (srcEl) burst(srcEl, it.delta > 0, jollyFor.length > 0);
    toast(`${sign(it.delta)} a ${player(pid).name} · ${showLabel(it)}${eleFor.length ? ". È la seconda volta: vale come Malus Ele" : ""}${jollyFor.length ? ". Tutti i bonus: scatta il Jolly presidenziale!" : ""}`, () => write(() => refs[0].delete()));
  }
  async function giveMany(srcEl){
    const m = sheet.multi;
    const it = itemByKey(m.key); if (!it || !m.sel.size) return;
    const {refs, eleFor, jollyFor} = await savePoints([...m.sel], it);
    if (!refs.length) return;
    burst(srcEl, it.delta > 0, jollyFor.length > 0);
    m.sel.clear(); refreshSheet();
    toast(`${sign(it.delta)} · ${showLabel(it)} a ${refs.length} ${refs.length === 1 ? "persona" : "persone"}${eleFor.length ? `. Malus Ele per ${eleFor.join(", ")}` : ""}${jollyFor.length ? `. Jolly presidenziale per ${jollyFor.join(", ")}` : ""}`,
      async () => { for (const r of refs) await write(() => r.delete()); });
  }
  async function setTrial(day){
    if (!day){
      const trialPts = S.points.filter(e => e.trial);
      if (trialPts.length > 20) toast("Cancello i dati della prova…");
      const paths = [...trialPts.map(e => "points/" + e.id), ...S.extras.filter(x => x.trial).map(x => "extras/" + x.id)];
      for (let i = 0; i < paths.length; i += 12) await Promise.all(paths.slice(i, i + 12).map(p => write(() => db.doc(p).delete())));
      if (S.settings.some(x => x.id === "messaggio-prova")) await write(() => db.doc("settings/messaggio-prova").delete());
      S.trial = null; lsSet("sp-prova", null); lsSet("sp-prova-chiusa", null);
      toast(trialPts.length ? `Prova finita: cancellati ${trialPts.length} punti di prova.` : "Prova finita.");
    } else { S.trial = day; lsSet("sp-prova", day); lsSet("sp-prova-chiusa", null); S.day = day; toast(`Prova della giornata di ${dayLabel(day)}. I punti di prova si cancellano quando esci.`); }
    closeSheet(); render();
  }

  /* ---------- certificati (sera del 27) ---------- */
  function openCert(){
    if (!certOpen()){ toast("I certificati si consegnano il 27 dalle 23 a mezzanotte.", null, true); return; }
    sheet = {cert:{sel:new Set()}};
    $("sheet-root").innerHTML = `<div class="scrim" id="scrim"><div class="sheet cert-sheet" role="dialog" aria-modal="true" aria-labelledby="ce-t">
      <div class="grab" aria-hidden="true"></div>
      <div class="ce-head"><span class="seal big" aria-hidden="true">★</span><div><h3 id="ce-t">Consegna dei certificati</h3><p>Ogni certificato vale <b>+1</b>. Scrivi il nome, tocca chi lo riceve e consegna.${certsStarted() ? "" : " <b>Con il primo certificato si chiudono i punti.</b>"}</p></div></div>
      <form id="f-cert" style="display:grid;gap:10px">
        <input type="text" id="ce-label" placeholder="Es. Miglior ballerino della settimana" maxlength="60" autocomplete="off" aria-label="Nome del certificato">
        <div class="pgrid" id="ce-grid"></div>
        <button class="btn gold" type="submit" id="ce-go">Consegna</button>
      </form>
      <div><div class="lbl">Consegnati stasera</div><div id="ce-list"></div></div>
      <form id="f-msg" class="msg-box">
        <div class="msg-h">${PHOTOS.g9 ? avatar(player("g9")) : ""}<div><div class="lbl" style="margin:0">Messaggio del Presidente</div><p>Lo leggono tutti all'apertura della chiusura ufficiale.</p></div></div>
        <textarea id="msg-text" rows="4" maxlength="600" placeholder="Il Direttivo dichiara chiusa la Settimana Pazza Winter Edition 2026…" aria-label="Messaggio del Presidente">${esc(presMsg())}</textarea>
        <button class="btn ghost" type="submit" id="msg-go">${presMsg() ? "Aggiorna il messaggio" : "Salva il messaggio"}</button>
      </form>
      <div class="sh-foot"><span></span><button class="btn ghost" id="sh-close">Chiudi</button></div>
    </div></div>`;
    refreshSheet();
  }
  function renderCert(){
    const c = sheet.cert;
    $("ce-grid").innerHTML = [...S.players].sort((x,y) => x.name.localeCompare(y.name)).map(p =>
      `<button type="button" class="pbtn" data-csel="${esc(p.id)}" aria-pressed="${c.sel.has(p.id)}">${avatar(p)}<span class="nm">${esc(p.name)}</span></button>`).join("");
    const n = c.sel.size;
    $("ce-go").textContent = n ? `Consegna +1 a ${n} ${n === 1 ? "persona" : "persone"}` : "Tocca chi riceve il certificato";
    $("ce-go").disabled = !n;
    $("ce-list").innerHTML = certsHTML(CERT_DAY, true);
  }
  /* il messaggio del Presidente: in prova va in un documento a parte, che si cancella uscendo dalla prova */
  const MSG_ID = () => S.trial ? "messaggio-prova" : "messaggio";
  const presMsg = () => (S.trial && S.settings.find(x => x.id === "messaggio-prova")?.text) || S.settings.find(x => x.id === "messaggio")?.text || "";
  async function savePresMsg(){
    const text = $("msg-text").value.trim();
    const ok = await write(() => text ? db.doc("settings/" + MSG_ID()).set({text, at:NOW(), ...(S.trial ? {trial:true} : {})}) : db.doc("settings/" + MSG_ID()).delete());
    if (ok){ $("msg-go").textContent = text ? "Aggiorna il messaggio" : "Salva il messaggio"; toast(text ? "Messaggio del Presidente salvato." : "Messaggio del Presidente tolto."); }
  }
  async function giveCert(){
    const c = sheet.cert, name = $("ce-label").value.trim();
    if (!name){ toast("Scrivi il nome del certificato.", null, true); return; }
    const label = "Certificato · " + name;
    if (certsOf(CERT_DAY).some(x => x.label.toLowerCase() === label.toLowerCase())){ toast("Esiste già un certificato con questo nome.", null, true); return; }
    const ref = db.collection("extras").doc();
    if (!(await write(() => ref.set({type:"cert", day:CERT_DAY, label, delta:1, once:true, createdAt:NOW(), ...(S.trial ? {trial:true} : {})})))) return;
    const {refs} = await savePoints([...c.sel], {label, delta:1, once:true, activityId:"premi"});
    burst($("ce-go"), true, true);
    const names = [...c.sel].map(id => player(id).name).join(", ");
    c.sel.clear(); $("ce-label").value = ""; refreshSheet();
    toast(`Certificato «${name}» a ${names}: +1`, async () => { for (const r of refs) await write(() => r.delete()); await write(() => ref.delete()); });
  }

  /* ---------- suoni della cerimonia (generati dal browser, niente file da scaricare) ---------- */
  const sfx = (() => {
    let ctx = null, master = null, noiseBuf = null;
    let on = lsGet("sp-audio") !== "0";
    const get = () => {
      if (!ctx){ const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
        ctx = new C(); master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      return ctx; };
    const ready = () => on && ctx && ctx.state === "running";
    const env = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
    const tone = (f, at, dur, type = "sine", vol = .3, f2) => { const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); env(g, t, .008, vol, dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05); };
    const noise = (at, dur, vol, ftype, freq, q = 1) => { const t = ctx.currentTime + at, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q; env(g, t, .004, vol, dur); n.connect(f).connect(g).connect(master); n.start(t, Math.random()); n.stop(t + dur + .05); };
    const S_ = {
      beep: (at = 0, hi) => tone(hi ? 1320 : 880, at, .22, "sine", .28),
      chime: (at = 0) => [1568, 2093, 2637].forEach((f, i) => tone(f, at + i * .07, 1.1, "sine", .12)),
      whoosh: (at = 0) => { noise(at, .45, .12, "bandpass", 900, .7); tone(220, at, .4, "sine", .05, 660); },
      pop: (at = 0) => { tone(420, at, .14, "sine", .22, 980); noise(at, .08, .06, "highpass", 3000); },
      sparkle: (at = 0) => [2637, 3136, 3520].forEach((f, i) => tone(f, at + i * .05, .35, "triangle", .06)),
      boom: (at = 0) => { tone(110, at, .9, "sine", .45, 38); noise(at, .25, .12, "lowpass", 400); },
      stamp: (at = 0) => { tone(150, at, .3, "sine", .4, 60); noise(at, .12, .2, "lowpass", 900); },
      crash: (at = 0) => { noise(at, 1.8, .32, "highpass", 5000, .5); noise(at, .6, .18, "bandpass", 2500, .8); tone(80, at, .8, "sine", .4, 40); },
      drumroll: (at, dur) => { let t = 0, gap = .09; while (t < dur){ const k = t / dur; noise(at + t, .06, .08 + .22 * k, "bandpass", 1800 + 600 * k, 1.2); t += gap; gap = Math.max(.032, gap * .965); } },
      heartbeat: (at = 0, v = 1) => { tone(62, at, .55, "sine", .9 * v, 42); tone(124, at, .16, "triangle", .14 * v); noise(at, .1, .2 * v, "lowpass", 300); },
      tension: (at, dur) => { tone(98, at, dur, "sawtooth", .03, 147); tone(196, at, dur, "triangle", .03, 294); tone(49, at, dur, "sine", .12, 55); },
      applause: (at, dur, vol = .5) => { for (let t = 0; t < dur; t += .012){ const k = t < .4 ? t / .4 : t > dur - 1 ? Math.max(0, dur - t) : 1; if (Math.random() < .55) noise(at + t + Math.random() * .01, .03 + Math.random() * .03, (.04 + Math.random() * .08) * k * vol, "bandpass", 1200 + Math.random() * 2400, 1.5); } },
      fanfare: (at = 0) => { [[523,0,.18],[659,.18,.18],[784,.36,.18],[1047,.54,.9]].forEach(([f, d, l]) => { tone(f, at + d, l, "sawtooth", .09); tone(f * 2, at + d, l, "triangle", .04); });
        [523, 659, 784].forEach(f => tone(f, at + .54, 1.2, "sawtooth", .05)); },
      jingle: (at = 0) => { const E = 659, G = 784, C = 523, D = 587, b = .2;
        [[E,0],[E,1],[E,2],[E,4],[E,5],[E,6],[E,8],[G,9],[C,10],[D,11],[E,12]].forEach(([f, k]) => { tone(f, at + k * b, k === 12 ? .9 : .3, "triangle", .14); tone(f * 2, at + k * b, .18, "sine", .04); });
        for (let k = 0; k < 13; k += 2) noise(at + k * b, .05, .05, "highpass", 6000); }
    };
    return {
      get on(){ return on; }, get ready(){ return ready(); },
      unlock(){ if (!on) return; const c = get(); if (c && c.state === "suspended") c.resume(); },
      toggle(){ on = !on; lsSet("sp-audio", on ? null : "0"); if (on) this.unlock(); else if (ctx) ctx.suspend(); return on; },
      play(name, ...a){ if (!ready()) return; try { S_[name](...a); } catch(_){} }
    };
  })();
  /* lo schermo resta acceso durante la cerimonia e mentre si aspetta che inizi */
  let wake = null;
  async function keepAwake(want){
    try {
      if (want && !wake && "wakeLock" in navigator && document.visibilityState === "visible"){ wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); }
      if (!want && wake){ const w = wake; wake = null; await w.release(); }
    } catch(_){}
  }
  const wantAwake = () => !!cer || (NOW() >= END.getTime() && !revealed());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) keepAwake(wantAwake()); });
  document.addEventListener("pointerdown", () => sfx.unlock(), {capture:true});
  /* suoni di ogni pagina, a tempo con le animazioni */
  function ceremonySound(page, info){
    const P = (n, ...a) => sfx.play(n, ...a);
    if (page === "intro"){ P("whoosh"); P("chime", .4); P("stamp", 2.2); }
    else if (page === "numbers"){ for (let i = 0; i < info.stats; i++) P("pop", i * .35 + .55); P("chime", info.stats * .35 + 1.4); }
    else if (page === "days"){ for (let i = 0; i < info.days; i++){ P("pop", .6 + i * .7 + .45); P("sparkle", .6 + i * .7 + .85); } }
    else if (page.startsWith("title")){ P("whoosh"); P("chime", .25); P("sparkle", .9); }
    else if (page === "cert-intro"){ P("boom"); P("chime", .5); }
    else if (page.startsWith("cert")){ P("whoosh"); P("stamp", .3); P("sparkle", .6); }
    else if (page === "rank-intro"){ P("boom"); P("chime", .7); }
    else if (page === "podium"){ P("boom"); P("drumroll", .2, .9); P("boom", 1.15); }
    else if (page === "podfinal"){ P("chime"); P("fanfare", .3); P("applause", .4, 2.5, .7); }
    else if (page.startsWith("pod")){ P("drumroll", 0, 1.75); P("crash", 1.75); P("applause", 1.9, 2.2, .6); }
    else if (page === "thanks"){ P("jingle", .3); P("applause", 0, 3.5, .5); }
    else if (info.winner && info.duel){ const b = DUEL_BEATS.map(x => x / 1000), end = DUEL_STOP / 1000;
      P("tension", 0, end); b.forEach((t, i) => P("heartbeat", t, .7 + .3 * i / b.length)); P("heartbeat", end, 1.25);
      P("crash", end + .45); P("fanfare", end + .65); P("applause", end + .65, 6, 1); }
    else if (info.winner){ P("drumroll", 0, 2.9); P("crash", 2.9); P("fanfare", 3.1); P("applause", 3.1, 6, 1); }
    else P("whoosh");
  }

  /* ---------- cerimonia di chiusura con fuochi d'artificio ---------- */
  let cer = null;
  /* live = prova della cerimonia mandata in diretta anche agli altri telefoni (solo online) */
  function openCeremony(isTrial, remote, live){
    const list = remote ? remoteList(remote) : ranked();
    if (!list.length) return;
    cer = {step: remote ? remote.step : 0, trial:isTrial, live:!!live, list, fw:null, remote, extra: remote ? (remote.extra || {}) : ceremonyExtra()};
    const root = document.createElement("div");
    root.id = "cer"; root.className = "cer"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Chiusura ufficiale");
    root.innerHTML = `<canvas id="fw" aria-hidden="true"></canvas><button class="cer-audio" id="cer-audio" type="button" data-audio="1"></button><div class="cer-in" id="cer-in"></div>`;
    document.body.appendChild(root);
    keepAwake(true); audioBtn();
    renderCeremony();
    if (cer.step > 0){ startFireworks(); return; }
    /* conto alla rovescia 3-2-1 prima di aprire la chiusura ufficiale */
    root.classList.add("counting");
    const cd = document.createElement("div"); cd.className = "cer-count"; root.appendChild(cd);
    const me = cer, seq = ["3", "2", "1"];
    const tick = i => {
      if (cer !== me) return;
      if (i >= seq.length){ cd.remove(); root.classList.remove("counting"); startFireworks(); return; }
      sfx.play("beep", 0, i === seq.length - 1);
      cd.innerHTML = `<div class="cc-eye">Settimana Pazza \u00b7 Winter Edition 2026</div>
        <div class="cc-ball"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="cc-track"/><circle cx="60" cy="60" r="54" class="cc-ring"/></svg><span>${seq[i]}</span></div>
        <div class="cc-t">La chiusura ufficiale sta per iniziare</div>`;
      setTimeout(() => tick(i + 1), reduce ? 700 : 1000);
    };
    tick(0);
  }
  function closeCeremony(){
    if (!cer) return;
    if (!cer.remote && (!cer.trial || cer.live) && S.online) db.sendCeremony({closed:true});
    cancelAnimationFrame(cer.fw); $("cer")?.remove(); cer = null; keepAwake(wantAwake()); render();
  }
  /* pulsante dell'audio: chi guarda dal proprio telefono deve toccarlo una volta per sentire i suoni */
  function audioBtn(){
    const b = $("cer-audio"); if (!b) return;
    const need = sfx.on && !sfx.ready;
    b.classList.toggle("need", need); b.classList.toggle("off", !sfx.on);
    b.innerHTML = !sfx.on ? `<span aria-hidden="true">\u{1F507}</span>` : need ? `<span aria-hidden="true">\u{1F50A}</span> Attiva l'audio` : `<span aria-hidden="true">\u{1F50A}</span>`;
    b.setAttribute("aria-label", !sfx.on ? "Attiva i suoni" : need ? "Attiva l'audio" : "Togli i suoni");
  }
  /* chi guarda dal proprio telefono riceve dall'admin la classifica già pronta, passo per passo */
  const remoteList = r => r.list.map(x => ({p:player(x.id), r:{tot:x.tot}, rank:x.rank})).filter(x => x.p);
  function ceremonyExtra(){
    const pts = allPoints().filter(e => player(e.playerId));
    const isCert = e => (e.reason || "").startsWith("Certificato · ");
    const isMiniPt = e => !e.activityId && S.extras.some(x => x.type !== "cert" && x.day === dayOf(e) && x.label === baseReason(e));
    const stats = [
      ["Bonus assegnati", pts.filter(e => Number(e.delta) > 0 && !e.jolly && !isCert(e)).length, "b"],
      ["Malus presi", pts.filter(e => Number(e.delta) < 0 && !e.auto).length, "m"],
      ["Malus Ele scattati", pts.filter(e => e.auto).length, "m"],
      ["Jolly del Presidente", pts.filter(e => e.jolly).length, "j"],
      ["Mini-sfide giocate", S.extras.filter(x => x.type !== "cert").length, "x"],
      ["Certificati consegnati", certsOf(CERT_DAY).length, "c"]];
    const days = DAYS.map(d => ({d, acts:actsOf(d).map(a => a.id), n:pts.filter(e => dayOf(e) === d && !e.auto).length}));
    const best = (filter) => { const c = {}; for (const e of pts) if (filter(e)) c[e.playerId] = (c[e.playerId] || 0) + 1;
      const top = Math.max(0, ...Object.values(c)); return top ? {n:top, ids:Object.keys(c).filter(id => c[id] === top)} : null; };
    const titles = [
      ["Re dei malus", "😈", best(e => Number(e.delta) < 0 && !e.auto), ["malus preso", "malus presi"]],
      ["Collezionista di bonus", "🌟", best(e => Number(e.delta) > 0 && !e.jolly && !isCert(e)), ["bonus preso", "bonus presi"]],
      ["Il più graziato dal Jolly", "🃏", best(e => e.jolly), ["Jolly ricevuto", "Jolly ricevuti"]],
      ["Campione delle mini-sfide", "⚡", best(e => isMiniPt(e) && Number(e.delta) > 0), ["mini-sfida vinta", "mini-sfide vinte"]],
      ["Bestemmiatore ufficiale", "🤬", best(e => baseReason(e).startsWith("Malus Jacopo")), ["volta", "volte"]],
      ["Tenacia di ferro", "🔥", best(e => e.auto), ["Malus Ele", "Malus Ele"]],
      ["Ritardatario cronico", "⏰", best(e => baseReason(e).startsWith("Malus Federica")), ["ritardo", "ritardi"]],
      ["Re del social", "📱", best(e => baseReason(e).startsWith("Malus Antonio")), ["volta col telefono in mano", "volte col telefono in mano"]]
    ].filter(t => t[2]).map(([name, ic, b, w]) => ({name, ic, n:b.n, ids:b.ids, what: b.n === 1 ? w[0] : w[1]}));
    return {stats, days, titles, msg:presMsg()};
  }
  function ceremonyPayload(){
    return {step:cer.step, trial:!!cer.trial, extra:cer.extra, list:cer.list.map(x => ({id:x.p.id, tot:x.r.tot, rank:x.rank})),
      certs:certsOf(CERT_DAY).map(c => ({label:c.label, ids:takers("premi", c.label, CERT_DAY).map(p => p.id)}))};
  }
  function onRemoteCeremony(pl){
    if (S.admin) return;
    if (pl.closed){ closeCeremony(); return; }
    if (!cer) openCeremony(false, pl);
    else { cer.remote = pl; cer.list = remoteList(pl); cer.step = pl.step; cer.extra = pl.extra || cer.extra; renderCeremony(); }
  }
  const remoteCertsHTML = certs => !certs.length ? `<p class="none" style="margin:0">Nessun certificato consegnato.</p>`
    : `<ul class="certs">${certs.map(c => `<li><span class="seal" aria-hidden="true">★</span><span class="cn">${esc(c.label.replace(/^Certificato · /, ""))}</span><span class="rwho">${c.ids.map(player).filter(Boolean).map(p => `<span class="mini" style="--pc:${colorOf(p)}">${esc(p.name)}</span>`).join("")}</span></li>`).join("")}</ul>`;
  const placeOf = r => cer.list.filter(x => x.rank === r);
  function renderCeremony(){
    const st = cer.step, el = $("cer-in");
    const dir = S.players.filter(p => p.role).sort((a,b) => ["Presidente","Vicepresidente","Assessore"].indexOf(a.role) - ["Presidente","Vicepresidente","Assessore"].indexOf(b.role));
    /* si svela dall'ultima posizione alla prima, un tocco alla volta; poi la scena del vincitore */
    const order = [...new Set(cer.list.map(x => x.rank))].sort((x,y) => y - x);
    const pts = n => `${n} ${Math.abs(n) === 1 ? "punto" : "punti"}`;
    const bigPlace = rank => { const ps = placeOf(rank);
      return `<div class="place now ${rank <= 3 ? "m" + rank : ""}" style="--d:0s"><div class="pl-n">${rank}° posto</div>
        <div class="pl-who">${ps.map(x => `<div class="pl-p">${avatar(x.p, "xl")}<b>${esc(x.p.name)}</b>${x.p.role ? `<span class="role">${esc(x.p.role)}</span>` : ""}</div>`).join("")}</div>
        <div class="pl-pt">${pts(ps[0].r.tot)}${ps.length > 1 ? " · pari merito" : ""}</div></div>`; };
    const doneList = ranks => ranks.length ? `<div class="revealed"><div class="lbl">Già svelati</div><ol>${ranks.map(r => placeOf(r).map(x =>
      `<li class="${r <= 3 ? "m" + r : ""}"><span class="rv-r">${r}°</span>${avatar(x.p)}<b>${esc(x.p.name)}</b><span class="rv-p">${x.r.tot}</span></li>`).join("")).join("")}</ol></div>` : "";
    const certList = cer.remote ? (cer.remote.certs || []) : certsOf(CERT_DAY).map(c => ({label:c.label, ids:takers("premi", c.label, CERT_DAY).map(p => p.id)}));
    const certCards = () => !certList.length ? `<div class="lempty"><span aria-hidden="true">★</span><b>Nessun certificato consegnato</b><p>Quest'anno niente attestati.</p></div>`
      : `<div class="cert-grid">${certList.map((c, i) => `<div class="cert-card" style="--d:${i * .15}s"><span class="seal big" aria-hidden="true">★</span>
          <div class="cc-name">${esc(c.label.replace(/^Certificato · /, ""))}</div>
          <div class="cc-who">${c.ids.map(player).filter(Boolean).map(p => `<span class="cc-p">${avatar(p)}<b>${esc(p.name)}</b></span>`).join("")}</div></div>`).join("")}</div>`;
    /* classifica: dall'ultimo al 4° una pagina a testa; poi il podio coperto con i tre finalisti, il 3°,
       il duello finale fra i due rimasti (vincitore e 2° si scoprono insieme) e il podio completo */
    const podR = order.filter(r => r <= 3 && r !== 1);
    function rankPages(){ const out = [];
      order.forEach((r, i) => { if (r <= 3 && podR.length && !out.includes("podium")) out.push("podium");
        if (r === 2) return;
        out.push(r === 3 ? "pod3" : "rank" + (i + 1)); });
      if (podR.length) out.push("podfinal");
      return out; }
    /* i finalisti (dal 1° al 3°) e i duellanti (1° e 2°), in ordine di nome per non tradire niente */
    const byName = list => [...list].sort((a, b) => a.p.name.localeCompare(b.p.name));
    const finalists = byName(cer.list.filter(x => x.rank <= 3)), rivals = byName(cer.list.filter(x => x.rank <= 2));
    const duelNames = rivals.map(x => esc(x.p.name)).reduce((t, n, i, a) => i === 0 ? n : t + (i === a.length - 1 ? " e " : ", ") + n, "");
    /* le pagine della cerimonia, in ordine: un tocco dell'admin = una pagina avanti per tutti */
    const X = cer.extra || {}, titles = X.titles || [];
    const pages = ["intro", "numbers", "days", ...(titles.length ? titles.map((_, i) => "title" + i) : ["title-none"]), ...(certList.length ? ["cert-intro", ...certList.map((_, i) => "cert" + i)] : ["cert-none"]), "rank-intro", ...rankPages(), "thanks"];
    const page = pages[Math.min(st, pages.length - 1)], nextPage = pages[Math.min(st, pages.length - 1) + 1] || "";
    /* pulsante verso la pagina successiva della classifica */
    const rankOf = pg => pg.startsWith("pod") && pg !== "podium" && pg !== "podfinal" ? Number(pg.slice(3)) : pg.startsWith("rank") && pg !== "rank-intro" ? order[Number(pg.slice(4)) - 1] : null;
    const goNext = () => { if (nextPage === "thanks") return goBtn("Un ultimo saluto", "Il Direttivo ha ancora una cosa da dirvi…");
      if (nextPage === "podfinal") return goBtn("Il podio completo", "Ecco il podio…");
      const r = rankOf(nextPage);
      const label = nextPage === "podium" ? "Il podio" : r === 1 ? "Svela il vincitore" : nextPage === "rank1" ? `Svela l'ultimo posto (${r}°)` : `Svela il ${r}° posto`;
      const wait = nextPage === "podium" ? "Sta per arrivare il podio…" : `Il Direttivo sta per svelare ${r === 1 ? "il vincitore" : "il " + r + "° posto"}…`;
      return cer.remote ? `<p class="count-cap">${wait}</p>` : `<button class="btn gold big ${r === 1 ? "drum" : ""}" data-cer="next" type="button">${label}</button>`; };
    const goBtn = (label, wait) => cer.remote ? `<p class="count-cap">${wait}</p>` : `<button class="btn gold big" data-cer="next" type="button">${label}</button>`;
    const pres = player("g9"), others = dir.filter(p => p !== pres);
    const msg = X.msg || "Il Direttivo della Settimana Pazza Winter Edition 2026 è riunito per la chiusura ufficiale.";
    fireworks.calm = (!page.startsWith("rank") || page === "rank-intro") && page !== "thanks";
    if (page === "thanks") fireworks.intense = false;
    let body;
    if (page === "intro") body = `<div class="cer-hero"><div class="eyebrow">28 dicembre 2026 · mezzanotte</div><h2>Chiusura ufficiale</h2><div class="script">Winter Edition</div></div>
      <figure class="proclama">
        <div class="pr-top">${pres ? `${CROWN}${avatar(pres, "pr-av")}` : ""}</div>
        <div class="pr-kicker">Messaggio del Presidente</div>
        <div class="pr-orn" aria-hidden="true">✦ ❄ ✦</div>
        <blockquote>${esc(msg).replace(/\n/g, "<br>")}</blockquote>
        <figcaption><span class="pr-name">${esc(pres ? pres.name : "Il Presidente")}</span><span class="pr-role">Presidente della Settimana Pazza</span></figcaption>
        <span class="pr-seal" aria-hidden="true">★</span>
      </figure>
      ${others.length ? `<div class="pr-dir"><div class="lbl">Con il Direttivo</div><div class="pr-row">${others.map(p => `<span class="pr-m">${avatar(p)}<b>${esc(p.name)}</b><span class="role">${esc(p.role)}</span></span>`).join("")}</div></div>` : ""}
      ${goBtn("La settimana in numeri", "Il Direttivo sta per aprire la chiusura ufficiale…")}`;
    else if (page === "numbers") body = `<div class="cer-hero"><div class="eyebrow">21 — 27 dicembre</div><h2>La settimana in numeri</h2></div>
      <div class="bb-wrap">${[0, 1].map(r => `<div class="bb-row"><svg class="bb-cord" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-6 6 Q150 54 306 6" class="c1"/><path d="M-6 6 Q150 54 306 6" class="c2"/>
          ${Array.from({length:11}, (_, j) => { const x = 15 + j * 27, t = (x + 6) / 312, y = 6 + 96 * t * (1 - t); return `<circle cx="${x}" cy="${y.toFixed(1)}" r="2.6" class="lt" style="--k:${j}"/>`; }).join("")}</svg>
          <span class="bb-bow l" aria-hidden="true"></span><span class="bb-bow r" aria-hidden="true"></span>
          ${(X.stats || []).slice(r * 3, r * 3 + 3).map(([l, n, k], i) => `<div class="bb ${k}" style="--d:${(r * 3 + i) * .35}s;--h:${[8, 16, 8][i]}px">
          <span class="bb-hook" aria-hidden="true"></span><span class="bb-cap" aria-hidden="true"></span><span class="bb-ball"><i class="bb-band" aria-hidden="true"></i><b class="stat-n" data-to="${n}" data-delay="${(r * 3 + i) * 350 + 500}">0</b></span><span class="bb-l">${esc(l)}</span></div>`).join("")}</div>`).join("")}</div>
      ${goBtn("Le sette giornate", "Si ripercorrono le giornate…")}`;
    else if (page === "days") body = `<div class="cer-hero sm"><div class="eyebrow">Sette regali da scartare</div><h2>Le sette giornate</h2></div>
      <div class="gifts">${(X.days || []).map((g, i) => { const acts = g.acts.map(id => S.activities.find(a => a.id === id)).filter(Boolean);
        return `<div class="gbox w${i % 4} ${i === 0 ? "wide" : ""}" style="--d:${.6 + i * .7}s"><span class="gb-bow" aria-hidden="true"></span>
          <div class="gb-in"><div class="gb-top"><span class="gb-date"><b>${dt(g.d).getDate()}</b>${esc(wdShort(g.d))}</span>${DAYNAME[g.d] ? `<span class="gb-name">${esc(DAYNAME[g.d])}</span>` : ""}</div>
            <ul class="gb-acts">${acts.length ? acts.map(a => `<li>${esc(a.title)}</li>`).join("") : `<li class="free">Giornata libera</li>`}</ul>
            <div class="gb-n">${g.n ? `<b>${g.n}</b> ${g.n === 1 ? "bonus o malus" : "bonus e malus"}` : "nessun punto"}</div></div>
          <div class="gb-lid" aria-hidden="true"><span class="gb-lnum">${dt(g.d).getDate()}</span></div></div>`; }).join("")}</div>
      ${goBtn("I titoli speciali", "Arrivano i titoli speciali…")}`;
    else if (page.startsWith("title")){
      const i = page === "title-none" ? -1 : Number(page.slice(5)), last = i === titles.length - 1 || i < 0;
      const t = titles[i];
      body = `<div class="cer-hero"><div class="eyebrow">Titolo speciale${titles.length ? ` · ${i + 1} di ${titles.length}` : ""}</div><h2>Titoli speciali</h2></div>
        ${t ? `<div class="tbig"><span class="tb-ic" aria-hidden="true">${t.ic}</span><div class="tb-name">${esc(t.name)}</div>
            <div class="tb-who">${t.ids.map(player).filter(Boolean).map(p => `<span class="tb-p">${avatar(p, "xl")}<b>${esc(p.name)}</b></span>`).join("")}</div>
            <span class="tb-n">${t.n} ${esc(t.what)}</span></div>`
          : `<div class="lempty"><span aria-hidden="true">❄</span><b>Nessun titolo</b><p>Settimana tranquilla, a quanto pare.</p></div>`}
        ${goBtn(last ? "I certificati" : "Prossimo titolo", last ? "Arrivano i certificati…" : "Il Direttivo sta per svelare il prossimo titolo…")}
        ${i > 0 ? `<div class="revealed"><div class="lbl">Già assegnati</div><ol>${titles.slice(0, i).reverse().map(x => `<li><span class="rv-r">${x.ic}</span>${avatar(player(x.ids[0]))}<b>${esc(x.name)}</b><span class="rv-p">${x.ids.map(player).filter(Boolean).map(p => esc(p.name)).join(", ")}</span></li>`).join("")}</ol></div>` : ""}`;
    }
    else if (page === "cert-intro") body = `<div class="ci-stage"><span class="seal xxl" aria-hidden="true">★</span>
        <div class="eyebrow">Domenica 27 dicembre · ore 23</div><h2>I certificati</h2><div class="script">consegnati dal Direttivo</div>
        <p class="ci-t">${certList.length} ${certList.length === 1 ? "certificato" : "certificati"} per chi ha lasciato il segno</p></div>
      ${goBtn("Il primo certificato", "Il Direttivo sta per consegnare il primo certificato…")}`;
    else if (page.startsWith("cert")){
      const i = page === "cert-none" ? -1 : Number(page.slice(4)), c = certList[i], last = i < 0 || i === certList.length - 1;
      const who = c ? c.ids.map(player).filter(Boolean) : [];
      body = `<div class="cer-hero"><div class="eyebrow">Certificato${certList.length ? ` · ${i + 1} di ${certList.length}` : ""}</div><h2>I certificati</h2><div class="script">consegnati dal Direttivo</div></div>
        ${c ? `<div class="tbig cbig"><span class="seal xl" aria-hidden="true">★</span><div class="cb-k">Il Direttivo conferisce il certificato</div>
            <div class="tb-name">${esc(c.label.replace(/^Certificato · /, ""))}</div><div class="cb-k">a</div>
            <div class="tb-who">${who.map(p => `<span class="tb-p">${avatar(p, "xl")}<b>${esc(p.name)}</b></span>`).join("")}</div></div>`
          : `<div class="lempty"><span aria-hidden="true">★</span><b>Nessun certificato consegnato</b><p>Quest'anno niente attestati.</p></div>`}
        ${last ? goBtn("La classifica finale", "Sta per arrivare la classifica finale…") : goBtn("Prossimo certificato", "Il Direttivo sta per consegnare il prossimo certificato…")}
        ${i > 0 ? `<div class="revealed"><div class="lbl">Già consegnati</div><ol>${certList.slice(0, i).reverse().map(x => { const ps = x.ids.map(player).filter(Boolean);
          return `<li><span class="rv-r">★</span>${ps[0] ? avatar(ps[0]) : ""}<b>${esc(x.label.replace(/^Certificato · /, ""))}</b><span class="rv-p">${ps.map(p => esc(p.name)).join(", ")}</span></li>`; }).join("")}</ol></div>` : ""}`;
    }
    else if (page === "thanks"){
      const nPts = (X.stats || []).slice(0, 3).reduce((a, x) => a + (Number(x[1]) || 0), 0), nCert = (X.stats || [])[5]?.[1] || 0;
      body = `<div class="ty-stage"><div class="eyebrow">Settimana Pazza · Winter Edition 2026</div>
          <h2 class="ty-h">Grazie a tutti!</h2><div class="script">per aver partecipato</div>
          <div class="ty-faces" aria-hidden="true">${cer.list.map((x, i) => `<span style="--i:${i}">${funAvatar(x.p)}</span>`).join("")}</div>
          <p class="ty-t">Sette giornate, ${nPts} tra bonus e malus${nCert ? `, ${nCert} ${nCert === 1 ? "certificato" : "certificati"}` : ""} e un numero imprecisato di risate.<br>È stata una settimana pazza davvero.</p>
          <div class="ty-card"><div class="ty-k">Il Direttivo vi dà appuntamento alla</div>
            <div class="ty-sun" aria-hidden="true">\u2600\uFE0F</div>
            <div class="ty-summer">Summer Edition</div><div class="ty-year">2027</div>
            <div class="ty-icons" aria-hidden="true">\u{1F334} \u{1F379} \u{1F3D6}\uFE0F \u{1F576}\uFE0F</div>
            <p class="ty-s">Stesso gruppo, stessa pazzia, solo un po' più caldo.<br>Portate la crema solare (e i malus).</p></div>
          <div class="ty-dir">${dir.map(p => avatar(p)).join("")}<span>Con affetto, il Direttivo</span></div></div>
        ${cer.remote ? `<p class="count-cap">Buone feste! Tra poco si chiude la cerimonia…</p>` : `<button class="btn gold big" data-cer="close" type="button">Chiudi e mostra la classifica</button>`}`;
    }
    else if (page === "rank-intro") body = `<div class="ri-stage"><div class="ri-trophy" aria-hidden="true"><span>\u{1F3C6}</span></div>
        <div class="eyebrow">28 dicembre 2026 · mezzanotte</div><h2>La classifica finale</h2><div class="script">dall'ultimo posto al primo</div>
        <p class="ri-t">${cer.list.length} giocatori, sette giornate, <b>un solo vincitore</b></p>
        <div class="ri-faces" aria-hidden="true">${cer.list.map((x, i) => `<span style="--i:${i}">${avatar(x.p)}</span>`).join("")}</div></div>
      ${goNext()}`;
    else if (page === "podium" || page === "podfinal" || (page.startsWith("pod") && rankOf(page))){
      const all = page === "podfinal", fresh = page === "pod3" ? 3 : null, shown = all ? podR : fresh ? [3] : [];
      const winOut = all;
      const duel = !all && rivals.length > 1 && (page === "pod3" || !order.includes(3));
      const step = r => `<span class="su-step">${r}°</span>`;
      const col = r => { if (r === 1 && winOut){ const ws = placeOf(1); return `<div class="su-first won">${CROWN}<div class="su-ps">${ws.map(x => avatar(x.p)).join("")}</div><b>${ws.map(x => esc(x.p.name)).join(", ")}</b><span class="su-pt">${pts(ws[0].r.tot)}</span>${step(1)}</div>`; }
        if (r === 1) return `<div class="su-first"><span class="su-spot" aria-hidden="true"></span>${CROWN}<span class="su-q">?</span>${step(1)}</div>`;
        if (!order.includes(r)) return `<div class="su-side"></div>`;
        const ps = placeOf(r);
        return shown.includes(r) ? `<div class="su-side m${r} ${r === fresh ? "fresh" : ""}"><div class="su-ps">${ps.map(x => avatar(x.p)).join("")}</div><b>${ps.map(x => esc(x.p.name)).join(", ")}</b><span class="su-pt">${pts(ps[0].r.tot)}</span>${step(r)}</div>`
          : `<div class="su-side m${r}"><span class="su-q sm">?</span><b>&nbsp;</b><span class="su-pt">&nbsp;</span>${step(r)}</div>`; };
      body = `${fresh ? `<div class="win-drum short" aria-hidden="true"><div class="wd-k">Il ${fresh}° posto va a…</div><div class="wd-ball"><span>?</span></div><div class="wd-dots"><i></i><i></i><i></i></div></div>` : ""}
        <div class="eyebrow">Classifica finale · il podio</div><h2 class="su-h">${duel ? "Il duello finale" : "Il podio"}</h2>
        <div class="su-pod">${col(2)}${col(1)}${col(3)}</div>
        ${duel ? `<div class="duel">${rivals.map((x, i) => `${i ? `<span class="vs" aria-hidden="true">VS</span>` : ""}<div class="dp">${avatar(x.p)}<b>${esc(x.p.name)}</b></div>`).join("")}</div>
          <p class="su-t">Chi vince tra <b>${duelNames}</b>?</p>`
        : all ? `<p class="su-t">Ecco il podio della Settimana Pazza Winter Edition 2026!</p>`
        : `<div class="su-fin"><div class="lbl">I finalisti</div><div class="su-faces">${finalists.map(x => avatar(x.p)).join("")}</div></div>
          <p class="su-t">Tre gradini, tre nomi: uno di loro vince la Settimana Pazza.</p>`}
        ${goNext()}`;
    }
    else {
      const k = Number(page.slice(4)), rank = order[k - 1], before = order.slice(0, k - 1).reverse();
      if (rank !== 1){
        body = `<div class="eyebrow">Classifica finale · ${k} di ${order.length}</div>${bigPlace(rank)}${goNext()}${doneList(before)}`;
        cer.winFx = false; fireworks.intense = false;
      } else {
        const ws = placeOf(1);
        const roulette = rivals.length > 1 && order.includes(2);
        body = `<div class="win-drum" aria-hidden="true"><div class="wd-k">E il vincitore della Settimana Pazza è…</div>${roulette
            ? `<div class="wd-duel">${rivals.map(x => avatar(x.p, x.rank === 1 ? "w" : "")).join("")}</div>` : `<div class="wd-ball"><span>?</span></div>`}<div class="wd-dots"><i></i><i></i><i></i></div></div>
          <div class="win-stage"><div class="rays" aria-hidden="true"></div>
            <div class="win-kicker">E il vincitore della Settimana Pazza è…</div>
            <div class="win-who">${ws.map(x => `<div class="win-p">${CROWN}${avatar(x.p, "xl win-av")}<b class="win-name">${esc(x.p.name)}</b></div>`).join("")}</div>
            <div class="win-pt">${pts(ws[0].r.tot)}${ws.length > 1 ? " · pari merito" : ""}</div></div>
          <div class="win-after">${doneList(before)}
          ${goNext()}</div>`;
        if (roulette && !reduce && cer.rlPage !== page){ cer.rlPage = page; const me = cer;
          /* le foto si accendono a turno a ogni battito e si fermano sul vincitore */
          const step = (k, t, last) => setTimeout(() => { if (cer !== me) return;
            const els = [...document.querySelectorAll("#cer .wd-duel .av")]; els.forEach((e, j) => e.classList.toggle("lit", last ? e.classList.contains("w") : j === k % els.length)); }, t);
          DUEL_BEATS.forEach((t, i) => step(i, t)); step(0, DUEL_STOP, true); }
        if (!cer.winFx){ const me = cer; setTimeout(() => { if (cer === me) fireworks.intense = true; }, reduce ? 0 : roulette ? DUEL_MS : DRUM_MS); }
        if (cer.trial) lsSet("sp-prova-chiusa", "1");
        else if (!cer.remote && !revealed()) write(() => db.doc("settings/main").set({revealed:true, revealedAt:NOW()}));
      }
    }
    if ((!cer.trial || cer.live) && !cer.remote && S.online && S.admin) db.sendCeremony(ceremonyPayload());
    const trialNote = cer.remote?.trial ? "Prova della cerimonia: la classifica non è quella vera"
      : cer.live ? "Prova in diretta: la vedono anche gli altri telefoni, ma la classifica non viene scoperta davvero"
      : cer.trial ? "Prova della cerimonia: la classifica non viene scoperta davvero" : "";
    el.innerHTML = `${trialNote ? `<div class="cer-trial">${trialNote}</div>` : ""}${body}`;
    $("cer").classList.toggle("certmode", page.startsWith("cert"));
    $("cer").classList.toggle("rankmode", page === "rank-intro" || page.startsWith("pod"));
    $("cer").classList.toggle("thanks", page === "thanks");
    $("cer").classList.toggle("winner", page === "rank" + order.length && order[order.length - 1] === 1);
    $("cer").classList.toggle("duel", page === "rank" + order.length && order[order.length - 1] === 1 && rivals.length > 1 && order.includes(2));
    $("cer").scrollTop = 0;
    if ($("cer").classList.contains("winner") && !cer.winFx){ cer.winFx = true; const me = cer; setTimeout(() => { if (cer === me) confetti(); }, reduce ? 0 : $("cer").classList.contains("duel") ? DUEL_MS : DRUM_MS); }
    countUp(); audioBtn();
    if (cer.sfxPage !== page){ cer.sfxPage = page; ceremonySound(page, {stats:(X.stats || []).length, days:(X.days || []).length, winner:$("cer").classList.contains("winner"), duel:$("cer").classList.contains("duel")}); }
  }
  /* i numeri della settimana salgono da zero, uno dopo l'altro */
  function countUp(){
    document.querySelectorAll("#cer .stat-n[data-to]").forEach((el, i) => {
      const to = Number(el.dataset.to) || 0; el.removeAttribute("data-to");
      if (reduce || !to){ el.textContent = to; return; }
      const wait = Number(el.dataset.delay) || i * 180, t0 = performance.now() + wait, dur = 1100;
      const step = t => { if (!el.isConnected) return; const k = Math.min(1, Math.max(0, (t - t0) / dur)); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { if (el.isConnected) el.textContent = to; }, wait + dur + 400);
    });
  }
  /* pioggia di coriandoli dorati sulla scena del vincitore */
  function confetti(){
    if (reduce) return;
    const root = $("cer"), cols = ["#f0c14f","#fff3c4","#e0404a","#5fd19a","#6fb3ff","#f3f6fb"];
    for (let i = 0; i < 90; i++){
      const c = document.createElement("i"); c.className = "conf";
      c.style.cssText = `left:${Math.random()*100}%;--c:${cols[i % cols.length]};--t:${2.4 + Math.random()*2.2}s;--dl:${Math.random()*1.8}s;--x:${(Math.random()-.5)*160}px;--r:${360 + Math.random()*720}deg;${i % 4 === 0 ? "border-radius:50%;width:8px;height:8px;" : ""}`;
      root.appendChild(c); setTimeout(() => c.remove(), 7000);
    }
  }
  const fireworks = {intense:false};
  const DRUM_MS = 3000;   // il rullo di tamburi prima del nome del vincitore
  /* duello finale, con il ritmo lento dei ballottaggi in TV: le foto si accendono a turno a ogni battito,
     sempre un po' più veloci, poi l'ultimo battito si ferma sul vincitore; lampo e scena 7 secondi dopo il tocco */
  const DUEL_BEATS = (() => { const out = []; let t = 500, gap = 1000; while (t < 5500){ out.push(Math.round(t)); t += gap; gap = Math.max(400, gap * .87); } return out; })();
  const DUEL_STOP = 6100, DUEL_MS = 7000;
  function startFireworks(){
    const c = $("fw"), ctx = c.getContext("2d"); let W, H; const parts = [];
    const size = () => { const dpr = Math.min(devicePixelRatio || 1, 2); W = c.offsetWidth; H = c.offsetHeight; c.width = W*dpr; c.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    size(); addEventListener("resize", size);
    const cols = ["#f0c14f","#e0404a","#5fd19a","#6fb3ff","#ff9a3d","#f3f6fb"];
    const boom = () => { const x = W*(.15 + Math.random()*.7), y = H*(.12 + Math.random()*.35), col = cols[Math.floor(Math.random()*cols.length)], n = 60 + Math.floor(Math.random()*40);
      for (let i = 0; i < n; i++){ const a = Math.random()*6.283, v = 1.5 + Math.random()*3.5; parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:1, col}); } };
    fireworks.intense = false;
    if (reduce){ for (let i = 0; i < 3; i++) boom(); ctx.globalCompositeOperation = "lighter"; for (const p of parts){ ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x + p.vx*20, p.y + p.vy*20, 2, 0, 6.283); ctx.fill(); } return; }
    let t = 0;
    const glitter = () => parts.push({x:Math.random()*W, y:-6, vx:(Math.random()-.5)*.3, vy:.35 + Math.random()*.55, life:1, col:Math.random() < .7 ? "#f0c14f" : "#f3f6fb", g:true, r:.8 + Math.random()*1.6, tw:Math.random()*6.28});
    const loop = () => {
      t++;
      if (fireworks.calm){ if (t % 11 === 0) glitter(); }
      else if (t % (fireworks.intense ? 14 : 55) === 0) boom();
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--){ const p = parts[i];
        if (p.g){ p.x += p.vx + Math.sin((t + p.tw * 40) / 40) * .25; p.y += p.vy; if (p.y > H + 10){ parts.splice(i,1); continue; }
          ctx.globalAlpha = .35 + .45 * Math.abs(Math.sin(t / 18 + p.tw)); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); continue; }
        p.x += p.vx; p.y += p.vy; p.vy += .045; p.vx *= .985; p.life -= .012;
        if (p.life <= 0){ parts.splice(i,1); continue; } ctx.globalAlpha = p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (cer) cer.fw = requestAnimationFrame(loop);
    };
    if (!fireworks.calm) boom(); cer.fw = requestAnimationFrame(loop);
  }

  /* ---------- effetti ---------- */
  function burst(el, good, jolly){
    if (reduce) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
    const cols = jolly ? ["#f0c14f","#fff3c4","#e0404a"] : good ? ["#f0c14f","#5fd19a","#f3f6fb","#e0404a"] : ["#ff6b74","#8a1f28","#3b4d63"];
    for (let i = 0; i < (good ? 26 : 14); i++){
      const s = document.createElement("span"), a = Math.random() * Math.PI * 2, d = 50 + Math.random() * (good ? 110 : 60);
      s.className = "spark";
      s.style.cssText = `left:${cx}px;top:${cy}px;--c:${cols[i % cols.length]};--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d + (good ? 0 : 40)}px;--r:${Math.random()*540}deg;${i%3===0?"border-radius:50%;":""}`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 950);
    }
  }
  function armOrRun(btn, run){
    if (btn.classList.contains("armed")){ btn.classList.remove("armed"); run(); return; }
    document.querySelectorAll(".armed").forEach(b => { b.classList.remove("armed"); if (b.dataset.orig) b.textContent = b.dataset.orig; });
    btn.dataset.orig = btn.textContent; btn.textContent = "Sicuro?"; btn.classList.add("armed");
    setTimeout(() => { if (btn.isConnected && btn.classList.contains("armed")){ btn.classList.remove("armed"); btn.textContent = btn.dataset.orig; } }, 3500);
  }
  let toastTimer = null;
  function toast(msg, undo, warn){
    clearTimeout(toastTimer);
    $("toast-root").innerHTML = `<div class="toast ${warn ? "warn" : ""}" role="${warn ? "alert" : "status"}">${warn ? `<span class="wi" aria-hidden="true">!</span>` : ""}<span>${esc(msg)}</span>${undo ? `<button id="t-undo">Annulla</button>` : ""}</div>`;
    if (undo) $("t-undo").onclick = () => { undo(); $("toast-root").innerHTML = ""; };
    toastTimer = setTimeout(() => { $("toast-root").innerHTML = ""; }, undo ? 6000 : 4500);
  }

  /* ---------- neve e lucine ---------- */
  (function lights(){
    const cols = ["#e0404a","#f0c14f","#5fd19a","#6fb3ff","#ff9a3d"];
    let h = "";
    for (let i = 0; i < 22; i++) h += `<span class="bulb" style="--c:${cols[i%cols.length]};--d:${(i*0.37)%2.4}s;--y:${8 + Math.round(7*Math.abs(Math.sin(i*0.72)))}px"></span>`;
    $("bulbs").innerHTML = h;
  })();
  (function snow(){
    const c = $("snow"), ctx = c.getContext("2d"); let W = 0, H = 0, flakes = [];
    function size(){
      const dpr = Math.min(devicePixelRatio || 1, 2); W = c.offsetWidth; H = c.offsetHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      const n = Math.round(W * H / 5200);
      flakes = Array.from({length:n}, (_, k) => { const big = k % 9 === 0;
        return {x:Math.random()*W, y:Math.random()*H, r: big ? 3 + Math.random()*2.2 : .6 + Math.random()*2, s: big ? 1 + Math.random()*.6 : .25 + Math.random()*.7, w:Math.random()*6.28, big}; });
    }
    function draw(move){
      ctx.clearRect(0,0,W,H); ctx.fillStyle = "rgba(243,246,251,.85)";
      for (const f of flakes){
        if (move){ f.y += f.s; f.w += .012; f.x += Math.sin(f.w) * .35; if (f.y > H + 4){ f.y = -4; f.x = Math.random()*W; } }
        ctx.globalAlpha = f.big ? .28 : .35 + f.r / 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    size(); addEventListener("resize", () => { size(); draw(false); });
    if (reduce){ draw(false); return; }
    (function loop(){ if (!document.hidden) draw(true); requestAnimationFrame(loop); })();
  })();

  /* ---------- eventi ---------- */
  function enter(el){ el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
  function setTab(t){
    S.tab = t;
    document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
    document.querySelectorAll("section.view").forEach(s => { s.hidden = s.id !== "v-" + t; if (!s.hidden) enter(s); });
    if (t === "classifica"){ S.stagger = true; renderBoard(); }
    lsSet("sp-tab", t);
  }
  document.addEventListener("click", e => {
    const tab = e.target.closest("[data-tab]");
    if (tab){ setTab(tab.dataset.tab); scrollTo({top: document.querySelector("main").offsetTop - 10, behavior: reduce ? "auto" : "smooth"}); return; }
    const day = e.target.closest("[data-day]");
    if (day){ S.day = day.dataset.day; renderDays(); enter($("dayview")); return; }
    if (e.target.closest("#multi-btn")){ openMulti(""); return; }
    const rv = e.target.closest("[data-reveal]");
    if (rv){ openCeremony(false); return; }
    if (e.target.closest("[data-audio]")){ const b = $("cer-audio");
      if (sfx.on && !sfx.ready) sfx.unlock(); else sfx.toggle();
      setTimeout(audioBtn, 150); if (b) b.blur(); return; }
    const cb = e.target.closest("[data-cer]");
    if (cb && cer){ if (cb.dataset.cer === "close") closeCeremony(); else { cer.step++; renderCeremony(); } return; }
    const bm = e.target.closest("[data-bmode]");
    if (bm){ S.boardMode = bm.dataset.bmode; renderBoard(); return; }
    const bd = e.target.closest("[data-bday]");
    if (bd){ S.boardDay = bd.dataset.bday; renderBoard(); return; }
    const rx = e.target.closest("[data-recapx]");
    if (rx){ lsSet("sp-recap-" + rx.dataset.recapx + (S.trial ? "-prova" : ""), rx.dataset.show ? null : "1"); renderBoard(); enter($("recap")); return; }
    if (e.target.closest("[data-cert]")){ openCert(); return; }
    const cs = e.target.closest("[data-csel]");
    if (cs && sheet?.cert){ const s = sheet.cert.sel, id = cs.dataset.csel; s.has(id) ? s.delete(id) : s.add(id); refreshSheet(); return; }
    const qf = e.target.closest("[data-quickfor]");
    if (qf){ openMulti("", qf.dataset.quickfor, true); setTimeout(() => $("q-label")?.focus(), 50); return; }
    const segb = e.target.closest(".seg button");
    if (segb && sheet?.multi){ const seg = segb.parentElement; sheet.multi[seg.dataset.seg] = Number(segb.dataset.v); seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === segb)); return; }
    if (e.target.closest("#trial-exit")){ setTrial(null); return; }
    const mk = e.target.closest("[data-mark]");
    if (mk){ openMulti(mk.dataset.mark); return; }
    const open = e.target.closest("[data-open]");
    if (open){ openSheet(open.dataset.open); return; }
    const del = e.target.closest("[data-del]");
    if (del){ armOrRun(del, () => write(() => db.doc(del.dataset.del).delete())); return; }
    if (!sheet) return;
    if (e.target.id === "scrim" || e.target.id === "sh-close"){ closeSheet(); return; }
    const pick = e.target.closest("[data-pick]");
    if (pick && sheet.multi){ sheet.multi.key = sheet.multi.key === pick.dataset.pick ? "" : pick.dataset.pick; refreshSheet(); return; }
    const sel = e.target.closest("[data-sel]");
    if (sel && sheet.multi && sel.classList.contains("done")){ warnTaken(sel.dataset.sel, sheet.multi.key); return; }
    if (sel && sheet.multi){ const s = sheet.multi.sel, id = sel.dataset.sel; s.has(id) ? s.delete(id) : s.add(id); refreshSheet(); return; }
    if (e.target.closest("#mu-go")){ giveMany(e.target.closest("#mu-go")); return; }
    const give = e.target.closest("[data-give]");
    if (give && give.classList.contains("done")){ warnTaken(sheet.playerId, give.dataset.give); return; }
    if (give){ const it = itemByKey(give.dataset.give); if (it) giveOne(sheet.playerId, it, give); return; }
  });
  document.addEventListener("change", e => {

  });
  document.addEventListener("submit", e => { if (e.target.id === "f-cert" && sheet?.cert){ e.preventDefault(); giveCert(); } if (e.target.id === "f-msg"){ e.preventDefault(); savePresMsg(); } });
  document.addEventListener("submit", async e => {
    if (e.target.id !== "f-quick" || !sheet?.multi) return;
    e.preventDefault();
    const label = $("q-label").value.trim(), m = sheet.multi;
    if (!label){ toast("Scrivi il nome della mini-sfida."); return; }
    if (itemsTonight().some(x => x.label.toLowerCase() === label.toLowerCase())){ toast("Esiste già una regola con questo nome oggi."); return; }
    const ref = db.collection("extras").doc();
    const ok = await write(() => ref.set({day:currentDay(), label, delta:m.qDelta, once:true, createdAt:NOW(), ...(S.trial ? {trial:true} : {})}));
    if (!ok) return;
    m.key = "x:" + ref.id; $("q-label").value = ""; $("mu-quick").open = false; refreshSheet();
    toast(`Mini-sfida creata: ${sign(m.qDelta)} · ${label}. Ora tocca le persone.`);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape"){ if (cer) closeCeremony(); else if (!$("adm-panel").hidden) closeAdm(); else if (sheet) closeSheet(); } });
  $("v-storico").addEventListener("click", e => {
    const d = e.target.closest("[data-lday]"); if (d){ S.logDay = d.dataset.lday; renderLog(); enter($("log")); return; }
    const p = e.target.closest("[data-lpl]"); if (p){ S.filter = p.dataset.lpl; renderLog(); enter($("log")); }
  });
  $("mode-btn").addEventListener("click", async () => {
    if (S.admin){
      if (S.trial) await setTrial(null);
      S.admin = false; lsSet("sp-admin", null); closeSheet();
      if (S.online) db.auth.signOut().then(() => db.loadAll()).catch(() => {});
      closeAdm(); render(); return;
    }
  });
  /* area admin: si apre dal pulsante in alto a destra */
  function openAdm(){ $("adm-panel").hidden = false; renderMode(); if (!S.admin){ $("in-pin").value = ""; setTimeout(() => (S.online ? $("in-email") : $("in-pin")).focus(), 50); } }
  function closeAdm(){ $("adm-panel").hidden = true; }
  $("adm-fab").addEventListener("click", openAdm);
  $("adm-close").addEventListener("click", closeAdm);
  $("trial-chips").addEventListener("click", e => {
    const b = e.target.closest("[data-trial]"); if (!b) return;
    if (filling){ toast("Aspetta: sto ancora preparando la settimana finta.", null, true); return; }
    const v = b.dataset.trial; closeAdm();
    if (v === "closing"){ openCeremony(true); return; }
    if (v === "closing-live"){ armLive(b); return; }
    if (!v){ if (S.trial) setTrial(null); return; }
    if (v !== S.trial) setTrial(v);
  });
  $("adm-panel").addEventListener("click", e => { if (e.target.id === "adm-panel") closeAdm(); });
  /* settimana finta: riempie la prova con dati di esempio di tutte le giornate, per provare la cerimonia */
  $("trial-fill").addEventListener("click", e => armOrRun(e.currentTarget, fillTrial));
  let filling = false;
  async function fillTrial(){
    closeAdm();
    if (filling) return;
    filling = true;
    try { await fillTrialNow(); } finally { filling = false; }
  }
  async function fillTrialNow(){
    if (S.trial) await setTrial(null);
    toast("Preparo la settimana finta, ci vuole qualche secondo…");
    const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)];
    const shuffle = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    const ids = S.players.map(p => p.id), at = (day, min) => new Date(day + "T21:00").getTime() + min * 60000;
    const pts = [];
    const add = (pid, delta, reason, day, min, extra = {}) => pts.push({playerId:pid, delta, reason, activityId:"", day, at:at(day, min), trial:true, ...extra});
    const presets = S.presets.filter(p => !p.auto);
    for (const day of DAYS.slice(0, 6)){
      for (const a of actsOf(day)) for (const r of a.rules || []) shuffle(ids).slice(0, 1 + rnd(3)).forEach(pid => add(pid, r.delta, r.label, day, 20 + rnd(150), {activityId:a.id}));
      const taken = new Set();
      const bon = presets.filter(p => p.delta > 0), mal = presets.filter(p => p.delta < 0);
      for (let k = 0, n = 6 + rnd(4); k < n; k++){ const p = pick(Math.random() < .55 && bon.length ? bon : mal), pid = pick(ids), key = pid + p.label;
        if (p.once && taken.has(key)) continue; taken.add(key); add(pid, p.delta, p.label, day, rnd(200)); }
    }
    /* due Jolly, che scattano da soli: una persona prende tutti i bonus il 24 senza malus, un'altra il 22 con un malus */
    const allBon = presets.filter(p => p.delta > 0), [j1, j2] = shuffle(ids);
    for (const [pid, day, withMalus] of [[j1, "2026-12-24", false], [j2, "2026-12-22", true]]){
      if (!withMalus) for (let i = pts.length - 1; i >= 0; i--) if (pts[i].playerId === pid && pts[i].day === day && pts[i].delta < 0) pts.splice(i, 1);
      for (const b of allBon) if (!pts.some(x => x.playerId === pid && x.day === day && x.reason === b.label)) add(pid, b.delta, b.label, day, 30 + rnd(150));
      if (withMalus && !pts.some(x => x.playerId === pid && x.day === day && x.delta < 0)){ const m = pick(presets.filter(p => p.delta < 0)); add(pid, m.delta, m.label, day, rnd(200)); }
    }
    /* due mini-sfide, con chi le ha vinte */
    const minis = [["2026-12-23", "Braccio di ferro", 1], ["2026-12-25", "Chi ride per primo perde", -1]];
    for (const [day, label, delta] of minis) shuffle(ids).slice(0, 1 + rnd(2)).forEach(pid => add(pid, delta, label, day, 100 + rnd(60)));
    /* il 27: qualche punto prima delle 23, poi i certificati */
    for (let k = 0; k < 4; k++){ const p = pick(presets); add(pick(ids), p.delta, p.label, CERT_DAY, rnd(110)); }
    const certs = [["Miglior ballerino", 1], ["Re del karaoke", 1], ["Premio simpatia", 2]];
    for (const [name, n] of certs) shuffle(ids).slice(0, n).forEach(pid => add(pid, 1, "Certificato · " + name, CERT_DAY, 125 + rnd(20), {activityId:"premi"}));
    /* si scrive a gruppi di 12, così online ci vogliono pochi secondi */
    const jobs = [...minis.map(([day, label, delta]) => () => db.collection("extras").doc().set({day, label, delta, once:true, createdAt:at(day, 90), trial:true})),
      ...certs.map(([name]) => () => db.collection("extras").doc().set({type:"cert", day:CERT_DAY, label:"Certificato · " + name, delta:1, once:true, createdAt:at(CERT_DAY, 120), trial:true})),
      ...pts.map(p => () => db.collection("points").doc().set(p))];
    let ok = true;
    for (let i = 0; i < jobs.length && ok; i += 12) ok = !(await Promise.all(jobs.slice(i, i + 12).map(f => write(f)))).includes(false);
    if (ok) ok = await write(() => db.doc("settings/messaggio-prova").set({trial:true, at:NOW(), text:"Il Direttivo dichiara chiusa la Settimana Pazza Winter Edition 2026.\nSette giornate di sfide, malus e pigiami: grazie a tutti, siete stati pazzi al punto giusto!"}));
    await setTrial(CERT_DAY);
    toast(ok ? `Settimana finta pronta: ${pts.length} punti, 2 mini-sfide, 3 certificati e il messaggio del Presidente. Ora apri «Cerimonia» o «Cerimonia in diretta».` : "Non sono riuscito a preparare tutta la settimana finta.", null, !ok);
  }
  /* la prova in diretta va sui telefoni di tutti: chiede conferma con un secondo tocco */
  function armLive(btn){
    if (btn.dataset.ok){ delete btn.dataset.ok; openCeremony(true, null, true); return; }
    $("adm-panel").hidden = false; btn.dataset.ok = "1"; btn.querySelector("b").textContent = "Tocca ancora per iniziare";
    toast("La prova in diretta compare a chi ha il sito aperto. Tocca ancora per iniziare.");
    setTimeout(() => { if (btn.isConnected && btn.dataset.ok){ delete btn.dataset.ok; btn.querySelector("b").textContent = "Cerimonia in diretta"; } }, 4000);
  }
  /* cancella punti, mini-sfide, certificati e cerimonia della prova generale */
  $("pg-clean").addEventListener("click", e => armOrRun(e.currentTarget, async () => {
    const all = [...S.points.map(x => "points/" + x.id), ...S.extras.map(x => "extras/" + x.id), ...S.settings.map(x => "settings/" + x.id)];
    for (const path of all) await write(() => db.doc(path).delete());
    closeAdm(); toast(`Prova generale cancellata: ${all.length} voci tolte.`);
  }));
  $("f-pin").addEventListener("submit", async e => {
    e.preventDefault();
    if (S.online){
      const email = $("in-email").value.trim(), pass = $("in-pin").value;
      if (!email || !pass){ toast("Scrivi email e password dell'admin.", null, true); return; }
      try { await db.auth.signIn(email, pass); }
      catch(_){ toast("Email o password sbagliate.", null, true); $("in-pin").value = ""; return; }
      if (!(await db.auth.isAdmin())){ await db.auth.signOut(); toast("Questo account non è tra gli admin.", null, true); return; }
      S.admin = true; pinOpen = false; $("in-pin").value = ""; closeAdm();
      await db.loadAll().catch(() => {});
      await seedIfEmpty(); await cleanTrial();
      render(); toast("Accesso admin fatto."); return;
    }
    const v = $("in-pin").value.trim(), saved = lsGet("sp-pin");
    if (v.length < 4){ toast("Il PIN deve avere almeno 4 cifre."); return; }
    if (saved && v !== saved){ toast("PIN sbagliato."); $("in-pin").value = ""; return; }
    if (!saved){ lsSet("sp-pin", v); toast("PIN impostato. Ricordatelo: serve per tornare admin."); }
    S.admin = true; lsSet("sp-admin", "1"); pinOpen = false; closeAdm(); render();
    await addMissingSeed();
  });

  /* il cambio di serata alle 6 del mattino aggiorna la pagina da solo */
  /* cambi di fase: nuova giornata alle 6, solo certificati alle 23 del 27, chiusura a mezzanotte */
  /* conta anche le tappe del programma (1° dicembre, 21 a mezzanotte) e l'apertura dei punti alle 19 del 21 */
  const phase = () => [currentDay(), certHour(), NOW() >= END.getTime(), NOW() >= PROGRAM_FROM.getTime(), NOW() >= START.getTime(), pointsYet()].join("|");
  let lastPhase = phase(), lastDay = currentDay();
  /* se a mezzanotte era rimasta attiva la prova, la chiude e cancella i punti di prova */
  const endTrialIfClosed = () => { if (db && S.trial && (NOW() >= END.getTime() || revealed())) setTrial(null); };
  setTimeout(endTrialIfClosed, 0);
  setInterval(() => { endTrialIfClosed(); const ph = phase(); if (ph !== lastPhase){ lastPhase = ph; if (currentDay() !== lastDay){ lastDay = currentDay(); S.day = null; } closeSheet(); render(); } }, 30000);

  /* ---------- avvio ---------- */
  const savedTab = lsGet("sp-tab"); if (savedTab && document.querySelector(`[data-tab="${savedTab}"]`)) setTab(savedTab);
  /* dati di partenza nel database online: li carica l'admin al primo accesso, se il database è vuoto */
  /* punti di prova rimasti nel database senza una prova in corso: li toglie l'admin quando entra */
  async function cleanTrial(){
    if (!S.admin || S.trial) return;
    for (const e of S.points.filter(x => x.trial)) await write(() => db.doc("points/" + e.id).delete());
    for (const x of S.extras.filter(x => x.trial)) await write(() => db.doc("extras/" + x.id).delete());
  }
  /* programma e bonus/malus: l'admin, quando entra, allinea il database a js/dati.js */
  async function addMissingSeed(){
    if (!S.admin || !S.activities.length) return;
    /* il programma nell'app non si modifica: il database segue sempre js/dati.js (le attività tolte solo se nessun punto le usa) */
    /* il database online può riordinare i campi delle regole: si confrontano solo i valori */
    const actKey = a => JSON.stringify([a.day, a.order, a.title, a.dress || "", a.notes || [], (a.rules || []).map(r => [r.label, Number(r.delta)])]);
    const sameAct = (a, b) => actKey(a) === actKey(b);
    for (const [id, v] of Object.entries(SEED.activities)){ const cur = S.activities.find(a => a.id === id); if (!cur || !sameAct(cur, v)) await write(() => db.doc("activities/" + id).set(v)); }
    for (const a of S.activities) if (!SEED.activities[a.id] && !S.points.some(e => e.activityId === a.id)) await write(() => db.doc("activities/" + a.id).delete());
    /* bonus e malus: nell'app non si modificano, quindi il database segue sempre js/dati.js */
    const same = (a, b) => ["label","short","desc","delta","owner","once","auto"].every(k => (a[k] ?? null) === (b[k] ?? null));
    for (const [id, v] of Object.entries(SEED.presets)){ const cur = S.presets.find(p => p.id === id); if (!cur || !same(cur, v)) await write(() => db.doc("presets/" + id).set(v)); }
    for (const p of S.presets) if (!SEED.presets[p.id]) await write(() => db.doc("presets/" + p.id).delete());
  }
  async function seedIfEmpty(){
    await addMissingSeed();
    if (!S.online || !S.admin || S.players.length) return;
    for (const [c, docs] of Object.entries(SEED)) for (const [id, v] of Object.entries(docs)) await write(() => db.doc(c + "/" + id).set(v));
    toast("Database online preparato con giocatori, programma e bonus/malus.");
  }
  const loadScript = src => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js";
  async function start(){
    renderMode();
    if (typeof SUPABASE_URL === "string" && SUPABASE_URL && SUPABASE_ANON_KEY){
      try {
        if (!window.supabase) await loadScript(SUPABASE_JS);
        db = await onlineDB(); S.online = true;
        S.admin = !!(await db.auth.session()) && await db.auth.isAdmin();
        if (S.admin) await db.loadAll();
        if (!S.admin && S.trial){ S.trial = null; lsSet("sp-prova", null); }
        db.onCeremony(onRemoteCeremony);
      } catch(_){
        db = localDB(); S.online = false; S.admin = lsGet("sp-admin") === "1";
        toast("Non riesco a collegarmi al database online: uso i dati di questo dispositivo.", null, true);
      }
    } else { db = localDB(); if (!S.admin && S.trial){ S.trial = null; lsSet("sp-prova", null); } }
    for (const c of ["players","points","activities","presets","extras","settings"]) db.collection(c).onSnapshot(snap => { S[c] = snap.docs.map(d => ({id:d.id, ...d.data()})); render(); });
    await seedIfEmpty();
    setInterval(renderCount, 1000);
  }
  start();
})();
