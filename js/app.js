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
  const DAYNAME = {"2026-12-21":"Si parte","2026-12-24":"Vigilia","2026-12-25":"Natale","2026-12-26":"Festa nazionale","2026-12-27":"Gran finale"};
  const START = new Date(2026, 11, 21, 0, 0, 0), END = new Date(2026, 11, 28, 0, 0, 0);
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
    if (data.activities?.festa) data.activities.festa = {...data.activities.festa, title:SEED.activities.festa.title, notes:SEED.activities.festa.notes};
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
  const live = () => (S.trial && NOW() < END && !revealed()) ? DAYS.includes(S.trial) : (DAYS.includes(currentDay()) && NOW() < END);
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
  const assignOpen = () => live() && !certHour();
  const frozen = () => revealed() || NOW() >= END.getTime();   // dopo mezzanotte, e dopo la cerimonia, si può solo guardare
  const certOpen = () => live() && currentDay() === CERT_DAY && (S.trial || certHour());
  const dayOf = e => e.day || serataOf(e.at || 0);
  const JOLLY = "Jolly presidenziale · ";
  const baseReason = e => (e.reason || "").startsWith(JOLLY) ? e.reason.slice(JOLLY.length) : (e.reason || "");
  const dayLabel = d => `${wdLong(d).replace(/^./, c => c.toUpperCase())}`;

  const player = id => S.players.find(p => p.id === id);
  const colorOf = p => PCOLORS[(p?.color ?? 0) % PCOLORS.length];
  const initial = p => (p?.name || "?").trim().charAt(0).toUpperCase();
  const mineOf = pid => S.presets.find(x => x.owner === pid);
  const actsOf = day => S.activities.filter(a => a.day === day).sort((a,b) => (a.order ?? 99) - (b.order ?? 99));

  /* Malus Ele: vale per serata. Al 2° malus della stessa serata scatta da solo, una volta per serata.
     Un malus salvato dal Jolly conta ancora, così il Malus Ele già scattato resta. */
  const AUTO_REASON = "Malus Ele · tenacia (2 malus nella giornata)";
  const isMalus = e => Number(e.delta) < 0 || (e.jolly === true && !e.plus2);   // il Jolly da +2 (senza malus) non conta come malus
  function allPoints(){
    const out = [...S.points], by = {};
    for (const e of S.points) if (isMalus(e)){ const k = e.playerId + "|" + dayOf(e); (by[k] = by[k] || []).push(e); }
    for (const k in by){
      const list = by[k].sort((a,b) => (a.at||0) - (b.at||0));
      if (list.length >= 2){ const e = list[1]; out.push({id:"auto-" + e.id, playerId:e.playerId, delta:-1, reason:AUTO_REASON, activityId:e.activityId || "", day:dayOf(e), at:(e.at||0) + 1, auto:true, trial:e.trial}); }
    }
    return out;
  }
  const malusTonight = pid => S.points.filter(e => e.playerId === pid && dayOf(e) === currentDay() && isMalus(e)).length;
  const jollyToday = pid => S.points.some(e => e.playerId === pid && e.jolly && dayOf(e) === currentDay());
  const takenTonight = (pid, label) => S.points.some(e => e.playerId === pid && dayOf(e) === currentDay() && baseReason(e) === label);

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
    $("trial-chips").parentElement.hidden = frozen();
    $("trial-chips").innerHTML = DAYS.map(d => `<button type="button" class="tchip ${d === S.trial ? "on" : ""}" data-trial="${d}"><span>${esc(wdShort(d))}</span><b>${dt(d).getDate()}</b></button>`).join("")
      + `<button type="button" class="tchip wide" data-trial="closing"><span>prova la</span><b>Cerimonia</b></button>`
      + (S.trial ? `<button type="button" class="tchip wide out" data-trial=""><span>finisci</span><b>Esci dalla prova</b></button>` : "");
    $("cert-btn").hidden = !certOpen();
    $("trial-bar").hidden = !S.trial;
    if (S.trial) $("trial-day").textContent = dayLabel(S.trial);
    $("multi-btn").disabled = !assignOpen();
    renderDirettivo();
    $("hint-board").textContent = !S.admin ? (beforeStart() ? "La Settimana Pazza si apre lunedì 21 dicembre: da lì parte la classifica." : hidden() ? "Tocca un nome per vedere i bonus e malus presi fino al 25." : "Tocca un nome per vedere i bonus e malus che ha preso.")
      : live() && !assignOpen() ? "Sono le 23: ora si consegnano solo i certificati. A mezzanotte la chiusura ufficiale."
      : live() ? `Giornata in corso: ${dayLabel(currentDay())}. Tocca un nome o assegna a più persone insieme.${covered() ? " La classifica è coperta: i punti li vedi solo tu." : ""}`
      : new Date(NOW()) < START ? "Le assegnazioni si aprono lunedì 21 dicembre." : "La settimana è finita: le assegnazioni sono chiuse.";
  }

  /* ---------- classifica ---------- */
  /* le foto dei profili sono in js/dati.js (PHOTOS); chi non ce l'ha mostra l'iniziale */
  const avatar = (p, cls = "") => PHOTOS[p?.id]
    ? `<span class="av photo ${cls}" style="--pc:${colorOf(p)}"><img src="${PHOTOS[p.id]}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="av ${cls}" style="--pc:${colorOf(p)}">${esc(initial(p))}</span>`;
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
    const started = live() || NOW() >= END;
    const days = started ? DAYS.filter(d => !live() || d <= currentDay()) : [];
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
  const ICONS = {apertura:"🥂", shooting:"📸", pigiama:"🧦", ppt:"📊", ape:"⛸️", santa:"🎁", tombola:"🎲", festa:"🎂", premi:"🏆"};
  const whoList = (who, day) => hiddenDay(day) ? `<span class="none">?? · si scopre il 28</span>`
    : who.length ? who.map(p => `<span class="mini" style="--pc:${colorOf(p)}" title="${esc(p.name)}">${esc(p.name)}</span>`).join("") : `<span class="none">Ancora nessuno</span>`;
  const beforeStart = () => !S.trial && NOW() < START.getTime();
  function renderDays(){
    if (beforeStart() && !S.admin){
      $("days").innerHTML = "";
      $("dayview").innerHTML = `<div class="covered"><div class="q" aria-hidden="true">?</div><b>Il programma è una sorpresa</b><p>Si svela lunedì 21 dicembre, quando si apre la Settimana Pazza.</p></div>`;
      return;
    }
    const cd = currentDay(), isLive = live();
    if (!S.day) S.day = DAYS.includes(cd) ? cd : DAYS[0];
    $("days").innerHTML = DAYS.map(d => `<button class="day ${isLive && d===cd ? "today" : ""} ${isLive && d < cd ? "past" : ""}" role="tab" data-day="${d}" aria-selected="${d===S.day}">
      <span class="wd">${esc(wdShort(d))}</span><span class="dn">${dt(d).getDate()}</span><span class="dots">${actsOf(d).map(() => "<i></i>").join("")}</span></button>`).join("");
    const acts = actsOf(S.day), isNow = assignOpen() && S.day === cd;
    const head = `<div class="dayhead"><span class="big">${dt(S.day).getDate()}</span><div><div class="t1">${esc(wdLong(S.day))}</div>${DAYNAME[S.day] ? `<div class="t2">${esc(DAYNAME[S.day])}</div>` : ""}</div></div>`;
    const lock = d => `<span class="locked admin-only">${isLive && d < cd ? "Giornata chiusa" : isLive && d === cd ? "Dalle 23 solo certificati" : "Si segna durante la giornata"}</span>`;
    const card = a => {
      const sums = {};
      for (const e of allPoints()) if (e.activityId === a.id && player(e.playerId)) sums[e.playerId] = (sums[e.playerId]||0) + (Number(e.delta)||0);
      const best = Object.entries(sums).sort((x,y) => y[1]-x[1])[0];
      const foot = hiddenDay(a.day) ? "Punti coperti fino alla chiusura"
        : best && best[1] > 0 ? `In testa qui: <b>${esc(player(best[0]).name)}</b> (${sign(best[1])})` : (Object.keys(sums).length ? "Per ora solo malus in questa attività" : "Ancora nessun punto in questa attività");
      return `<li class="act">
        <div class="act-h"><span class="act-ic" aria-hidden="true">${ICONS[a.id] || "✦"}</span><div class="act-ht"><h3>${esc(a.title)}</h3>${a.dress ? `<span class="tag dress">Dress code · ${esc(a.dress)}</span>` : ""}</div></div>
        ${(a.notes||[]).length ? `<ul class="notes">${a.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${(a.rules||[]).length ? `<div><div class="lbl">Punti della giornata</div><ul class="rlist">${a.rules.map((r,i) => `<li class="rrow ${r.delta>=0?"b":"m"}"><span class="lpt ${r.delta>=0?"b":"m"}">${sign(r.delta)}</span>
            <span class="rt"><b>${esc(r.label)}</b><span class="rwho">${whoList(takers(a.id, r.label, a.day), a.day)}</span></span>
            ${isNow ? `<button class="btn small gold admin-only" data-mark="r:${esc(a.id)}:${i}">Segna chi</button>` : lock(a.day)}</li>`).join("")}</ul></div>` : ""}
        ${a.id === "premi" ? `<div><div class="lbl">Certificati della serata</div>${certsHTML(a.day)}${certOpen() && S.day === cd ? `<button class="btn gold admin-only" data-cert="1" type="button" style="margin-top:8px">Consegna certificati</button>` : ""}</div>` : ""}
        <div class="foot"><span>${foot}</span></div>
      </li>`;
    };
    const body = acts.length ? `<ul class="acts">${acts.map(card).join("")}</ul>`
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
      const canJolly = assignOpen() && dd === cd && d < 0 && !e.auto && !jollyToday(e.playerId);
      const reason = e.reason || (d >= 0 ? "Bonus" : "Malus"), [r1, ...rr] = reason.split(" · ");
      const tag = reason.startsWith("Certificato · ") ? "certificato" : e.auto ? "automatico" : e.jolly ? "jolly" : isMini(e) ? "mini-sfida" : a ? a.title : "";
      return `<li class="lev ${d >= 0 ? "b" : "m"}">${p ? avatar(p, "lav") : `<span class="av lav">?</span>`}
        <span class="lt"><b>${esc(p ? p.name : "Giocatore rimosso")}</b><span class="lr">${esc(r1)}${rr.length ? ` <span class="lr2">· ${esc(rr.join(" · "))}</span>` : ""}</span>${tag || e.trial ? `<span class="ltags">${tag ? `<span class="ltag">${esc(tag)}</span>` : ""}${e.trial ? `<span class="ltag pr">prova</span>` : ""}</span>` : ""}</span>
        <span class="lside"><span class="lpt ${d >= 0 ? "b" : "m"}">${sign(d)}</span><span class="ltime">${time}</span></span>
        ${frozen() || e.auto ? "" : `<span class="lact admin-only">${canJolly ? `<button class="btn jolly small" data-jolly="${esc(e.id)}">Jolly</button>` : ""}<button class="btn danger small" data-del="points/${esc(e.id)}">Elimina</button></span>`}</li>`;
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
    const kind = p => p.auto ? `<span class="ktag auto">automatico</span>` : p.once ? `<span class="ktag">1 volta al giorno</span>` : `<span class="ktag cum">cumulabile</span>`;
    const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    const row = p => { const o = player(p.owner), name = p.label.split(" · ")[0];
      return `<li class="bm ${p.delta >= 0 ? "b" : "m"}">
        ${o ? avatar(o, "bm-av") : `<span class="av bm-av" style="--pc:var(--card-2)">${p.delta >= 0 ? "+" : "−"}</span>`}
        <span class="bm-t"><span class="bm-k">${esc(name)}</span><b>${esc(cap(p.short || p.label))}</b>${kind(p)}</span>
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
        <div class="dir-tx"><span class="role">Presidente</span><b>${esc(pres.name)}</b><span class="dir-j"><span class="jbadge">J</span>È il Jolly presidenziale</span></div></div>` : "")
      + `<div class="dir-grid">${others.map(p => `<div class="dir-c">${avatar(p, "dir-av")}<b>${esc(p.name)}</b><span class="role">${esc(p.role)}</span></div>`).join("")}</div>`;
  }
  function render(){ renderCount(); renderMode(); renderBoard(); renderDays(); renderLog(); renderPresets(); refreshSheet(); }

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
    ${p.role === "Presidente" ? `<div class="mine-card j"><span class="pill jp">J</span><span>È lui il Jolly presidenziale</span></div>`
      : m ? `<div class="mine-card ${m.delta>=0?"b":"m"}"><span class="pill ${m.delta>=0?"b":"m"}">${sign(m.delta)}</span><span>Il suo ${m.delta>=0?"bonus":"malus"}: ${esc(m.label)}</span></div>` : ""}`; };
  const serataPill = () => `<div class="serata"><span class="dot"></span>Oggi · <b>${esc(dayLabel(currentDay()))}</b>${S.trial ? " · prova" : ""}</div>`;
  const closedNote = () => `<p class="closed">${new Date(NOW()) < START && !S.trial ? "Le assegnazioni si aprono lunedì 21 dicembre." : live() ? "Sono le 23: i punti sono chiusi, ora si consegnano solo i certificati (pulsante «Consegna certificati»)." : "Le assegnazioni sono chiuse."}</p>`;

  /* chip di un bonus/malus: disattivato se automatico o se è da 1 volta e la persona l'ha già preso stasera */
  function itemChip(it, attr, pid){
    if (it.auto) return `<span class="chip m auto" aria-disabled="true"><span class="v">${sign(it.delta)}</span>${esc(it.label.split(" · ")[0])} <em>(viene applicato in automatico)</em></span>`;
    const done = pid && it.once && takenTonight(pid, it.label);
    return `<button class="chip ${it.delta>=0?"b":"m"} ${done?"done":""}" ${attr} ${done ? 'aria-disabled="true"' : ""}><span class="v">${sign(it.delta)}</span><span class="lb">${esc(it.label)}</span>${it.once ? `<span class="once">${done ? "✓ preso oggi" : "1 al giorno"}</span>` : ""}</button>`;
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
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="sh-close">Chiudi</button>${assignOpen() ? `<button class="btn jolly" id="sh-jolly">Assegna Jolly</button>` : ""}</div></div>
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
      <div><div class="lbl">1 · Scegli il Jolly, un bonus o un malus</div>
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
    const m = sheet.multi, it = m.key === "jolly" ? {jolly:true} : m.key ? itemByKey(m.key) : null;
    if (m.key && !it){ m.key = ""; }
    const blocked = pid => !it ? false : it.jolly ? jollyToday(pid) : (it.once && takenTonight(pid, it.label));
    $("mu-items").innerHTML = `<div><div class="lbl">Jolly presidenziale</div><div class="chips"><button class="chip jolly-chip" data-pick="jolly" aria-pressed="${m.key === "jolly"}"><span class="v">J</span><span class="lb">Jolly · l'ultimo malus di oggi diventa +1, senza malus vale +2</span></button></div></div>`
      + itemsBlocks(null, x => `data-pick="${esc(x.key)}" aria-pressed="${x.key === m.key}"`);
    for (const pid of [...m.sel]) if (blocked(pid)) m.sel.delete(pid);
    $("mu-grid").innerHTML = [...S.players].sort((x,y) => x.name.localeCompare(y.name)).map(p => {
      const done = blocked(p.id);
      return `<button class="pbtn ${done?"done":""}" data-sel="${esc(p.id)}" aria-pressed="${m.sel.has(p.id)}" ${!it ? "disabled" : done ? 'aria-disabled="true"' : ""}>${avatar(p)}<span class="nm">${esc(p.name)}</span>${done ? `<span class="tagdone">${it.jolly ? "Jolly già usato" : "già preso"}</span>` : it?.jolly ? `<span class="tagdone j2">${lastMalusTonight(p.id) ? "malus → +1" : "vale +2"}</span>` : ""}</button>`;
    }).join("");
    const go = $("mu-go"), n = m.sel.size;
    go.disabled = !it || !n;
    go.textContent = !it ? "Scegli prima un bonus, un malus o il Jolly" : !n ? "Tocca almeno una persona" : it.jolly ? `Assegna Jolly a ${n} ${n === 1 ? "persona" : "persone"}` : `Assegna ${sign(it.delta)} a ${n} ${n === 1 ? "persona" : "persone"}`;
  }

  function warnTaken(pid, key){
    const p = player(pid);
    if (key === "jolly"){ toast(`Attenzione: ${p.name} ha già avuto il Jolly oggi. Vale una volta al giorno.`, null, true); return; }
    const it = itemByKey(key);
    toast(`Attenzione: ${p.name} ha già preso «${it ? it.label : "questo"}» oggi. Vale una volta al giorno, non lo assegno di nuovo.`, null, true);
  }
  function closeSheet(){ sheet = null; $("sheet-root").innerHTML = ""; }
  const lastMalusTonight = pid => S.points.filter(e => e.playerId === pid && Number(e.delta) < 0 && dayOf(e) === currentDay()).sort((a,b) => (b.at||0) - (a.at||0))[0];
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
    const last = lastMalusTonight(sheet.playerId), j = $("sh-jolly"), used = jollyToday(sheet.playerId);
    j.dataset.state = used ? "used" : last ? "ok" : "plus2";
    j.classList.toggle("done", used);
    if (!j.classList.contains("armed")) j.textContent = used ? "Jolly già usato oggi" : last ? `Assegna Jolly · ${last.reason.split(" · ")[0]} diventa +1` : "Assegna Jolly · +2 (nessun malus oggi)";
  }

  /* Salva i punti. Restituisce i riferimenti creati, per poter annullare. */
  async function savePoints(pids, it){
    const refs = [], eleFor = [];
    for (const pid of pids){
      if (it.once && takenTonight(pid, it.label)) continue;
      const ref = db.collection("points").doc();
      const ok = await write(() => ref.set({playerId:pid, delta:it.delta, reason:it.label, activityId:it.activityId || "", day:currentDay(), at:NOW(), ...(S.trial ? {trial:true} : {})}));
      if (!ok) break;
      refs.push(ref);
      if (it.delta < 0 && malusTonight(pid) === 2) eleFor.push(player(pid).name);
    }
    return {refs, eleFor};
  }
  async function giveOne(pid, it, srcEl){
    const {refs, eleFor} = await savePoints([pid], it);
    if (!refs.length) return;
    if (srcEl) burst(srcEl, it.delta > 0);
    toast(`${sign(it.delta)} a ${player(pid).name} · ${it.label}${eleFor.length ? ". Scatta il Malus Ele: −1 automatico" : ""}`, () => write(() => refs[0].delete()));
  }
  async function giveMany(srcEl){
    const m = sheet.multi;
    if (m.key === "jolly"){ await jollyMany([...m.sel], srcEl); m.sel.clear(); refreshSheet(); return; }
    const it = itemByKey(m.key); if (!it || !m.sel.size) return;
    const {refs, eleFor} = await savePoints([...m.sel], it);
    if (!refs.length) return;
    burst(srcEl, it.delta > 0);
    m.sel.clear(); refreshSheet();
    toast(`${sign(it.delta)} · ${it.label} a ${refs.length} ${refs.length === 1 ? "persona" : "persone"}${eleFor.length ? `. Malus Ele per ${eleFor.join(", ")}` : ""}`,
      async () => { for (const r of refs) await write(() => r.delete()); });
  }
  /* Jolly: trasforma l'ultimo malus della giornata in +1; chi oggi non ha malus prende +2 */
  async function jollyMany(pids, srcEl){
    const done = [];
    for (const pid of pids){
      if (jollyToday(pid)) continue;
      const ev = lastMalusTonight(pid), name = player(pid).name;
      if (ev){
        const before = {delta:ev.delta, reason:ev.reason, jolly:false};
        if (!(await write(() => db.doc("points/" + ev.id).update({delta:1, reason:JOLLY + (ev.reason || "malus"), jolly:true})))) break;
        done.push({name, txt:"+1", undo: () => write(() => db.doc("points/" + ev.id).update(before))});
      } else {
        const ref = db.collection("points").doc();
        if (!(await write(() => ref.set({playerId:pid, delta:2, reason:JOLLY + "nessun malus (+2)", jolly:true, plus2:true, activityId:"", day:currentDay(), at:NOW(), ...(S.trial ? {trial:true} : {})})))) break;
        done.push({name, txt:"+2", undo: () => write(() => ref.delete())});
      }
    }
    if (!done.length) return;
    burst(srcEl, true, true);
    toast(`Jolly · ${done.map(d => `${d.name} ${d.txt}`).join(", ")}`, async () => { for (const d of done) await d.undo(); });
  }
  function useJolly(ev, srcEl){
    const p = player(ev.playerId), before = {delta:ev.delta, reason:ev.reason, jolly:false};
    write(() => db.doc("points/" + ev.id).update({delta:1, reason:JOLLY + (ev.reason || "malus"), jolly:true})).then(ok => {
      if (!ok) return;
      if (srcEl) burst(srcEl, true, true);
      toast(`Jolly per ${p ? p.name : "il giocatore"}: malus trasformato in +1`, () => write(() => db.doc("points/" + ev.id).update(before)));
    });
  }
  async function setTrial(day){
    if (!day){
      const trialPts = S.points.filter(e => e.trial);
      for (const e of trialPts) await write(() => db.doc("points/" + e.id).delete());
      for (const x of S.extras.filter(x => x.trial)) await write(() => db.doc("extras/" + x.id).delete());
      if (S.settings.some(x => x.id === "messaggio-prova")) await write(() => db.doc("settings/messaggio-prova").delete());
      S.trial = null; lsSet("sp-prova", null);
      toast(trialPts.length ? `Prova finita: cancellati ${trialPts.length} punti di prova.` : "Prova finita.");
    } else { S.trial = day; lsSet("sp-prova", day); S.day = day; toast(`Prova della giornata di ${dayLabel(day)}. I punti di prova si cancellano quando esci.`); }
    closeSheet(); render();
  }

  /* ---------- certificati (sera del 27) ---------- */
  function openCert(){
    if (!certOpen()){ toast("I certificati si consegnano il 27 dalle 23 a mezzanotte.", null, true); return; }
    sheet = {cert:{sel:new Set()}};
    $("sheet-root").innerHTML = `<div class="scrim" id="scrim"><div class="sheet cert-sheet" role="dialog" aria-modal="true" aria-labelledby="ce-t">
      <div class="grab" aria-hidden="true"></div>
      <div class="ce-head"><span class="seal big" aria-hidden="true">★</span><div><h3 id="ce-t">Consegna dei certificati</h3><p>Ogni certificato vale <b>+1</b>. Scrivi il nome, tocca chi lo riceve e consegna.</p></div></div>
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

  /* ---------- cerimonia di chiusura con fuochi d'artificio ---------- */
  let cer = null;
  function openCeremony(isTrial, remote){
    const list = remote ? remoteList(remote) : ranked();
    if (!list.length) return;
    cer = {step: remote ? remote.step : 0, trial:isTrial, list, fw:null, remote, extra: remote ? (remote.extra || {}) : ceremonyExtra()};
    const root = document.createElement("div");
    root.id = "cer"; root.className = "cer"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Chiusura ufficiale");
    root.innerHTML = `<canvas id="fw" aria-hidden="true"></canvas><div class="cer-in" id="cer-in"></div>`;
    document.body.appendChild(root);
    renderCeremony();
    if (cer.step > 0){ startFireworks(); return; }
    /* conto alla rovescia 3-2-1 prima di aprire la chiusura ufficiale */
    root.classList.add("counting");
    const cd = document.createElement("div"); cd.className = "cer-count"; root.appendChild(cd);
    const me = cer, seq = ["3", "2", "1"];
    const tick = i => {
      if (cer !== me) return;
      if (i >= seq.length){ cd.remove(); root.classList.remove("counting"); startFireworks(); return; }
      cd.innerHTML = `<div class="cc-eye">Settimana Pazza \u00b7 Winter Edition 2026</div>
        <div class="cc-ball"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="cc-track"/><circle cx="60" cy="60" r="54" class="cc-ring"/></svg><span>${seq[i]}</span></div>
        <div class="cc-t">La chiusura ufficiale sta per iniziare</div>`;
      setTimeout(() => tick(i + 1), reduce ? 700 : 1000);
    };
    tick(0);
  }
  function closeCeremony(){
    if (!cer) return;
    if (!cer.remote && !cer.trial && S.online) db.sendCeremony({closed:true});
    cancelAnimationFrame(cer.fw); $("cer")?.remove(); cer = null; render();
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
      ["Tenacia di ferro", "🔥", best(e => e.auto), ["Malus Ele", "Malus Ele"]]
    ].filter(t => t[2]).map(([name, ic, b, w]) => ({name, ic, n:b.n, ids:b.ids, what: b.n === 1 ? w[0] : w[1]}));
    return {stats, days, titles, msg:presMsg()};
  }
  function ceremonyPayload(){
    return {step:cer.step, extra:cer.extra, list:cer.list.map(x => ({id:x.p.id, tot:x.r.tot, rank:x.rank})),
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
    const nextLabel = k => k >= order.length ? "" : order[k] === 1 ? "Svela il vincitore" : k === 0 ? `Svela l'ultimo posto (${order[0]}°)` : `Svela il ${order[k]}° posto`;
    const nextBtn = k => cer.remote ? `<p class="count-cap">Il Direttivo sta per svelare ${order[k] === 1 ? "il vincitore" : "il " + order[k] + "° posto"}…</p>`
      : `<button class="btn gold big ${order[k] === 1 ? "drum" : ""}" data-cer="next" type="button">${nextLabel(k)}</button>`;
    const bigPlace = rank => { const ps = placeOf(rank);
      return `<div class="place now ${rank <= 3 ? "m" + rank : ""}" style="--d:0s"><div class="pl-n">${rank}° posto</div>
        <div class="pl-who">${ps.map(x => `<div class="pl-p">${avatar(x.p, "xl")}<b>${esc(x.p.name)}</b>${x.p.role ? `<span class="role">${esc(x.p.role)}</span>` : ""}</div>`).join("")}</div>
        <div class="pl-pt">${pts(ps[0].r.tot)}${ps.length > 1 ? " · pari merito" : ""}</div></div>`; };
    const doneList = ranks => ranks.length ? `<div class="revealed"><div class="lbl">Già svelati</div><ol>${ranks.map(r => placeOf(r).map(x =>
      `<li class="${r <= 3 ? "m" + r : ""}"><span class="rv-r">${r}°</span>${avatar(x.p)}<b>${esc(x.p.name)}</b><span class="rv-p">${x.r.tot}</span></li>`).join("")).join("")}</ol></div>` : "";
    /* passi: 0 apertura, 1 certificati, poi le posizioni dall'ultima alla prima */
    const certList = cer.remote ? (cer.remote.certs || []) : certsOf(CERT_DAY).map(c => ({label:c.label, ids:takers("premi", c.label, CERT_DAY).map(p => p.id)}));
    const certCards = () => !certList.length ? `<div class="lempty"><span aria-hidden="true">★</span><b>Nessun certificato consegnato</b><p>Quest'anno niente attestati.</p></div>`
      : `<div class="cert-grid">${certList.map((c, i) => `<div class="cert-card" style="--d:${i * .15}s"><span class="seal big" aria-hidden="true">★</span>
          <div class="cc-name">${esc(c.label.replace(/^Certificato · /, ""))}</div>
          <div class="cc-who">${c.ids.map(player).filter(Boolean).map(p => `<span class="cc-p">${avatar(p)}<b>${esc(p.name)}</b></span>`).join("")}</div></div>`).join("")}</div>`;
    const X = cer.extra || {}, PRE = 5;   // passi prima della classifica: apertura, numeri, giornate, titoli, certificati
    const goBtn = (label, wait) => cer.remote ? `<p class="count-cap">${wait}</p>` : `<button class="btn gold big" data-cer="next" type="button">${label}</button>`;
    const pres = player("g9");
    let body;
    if (st === 0) body = `<div class="cer-hero"><div class="eyebrow">28 dicembre 2026 · mezzanotte</div><h2>Chiusura ufficiale</h2><div class="script">Winter Edition</div></div>
      <div class="garland cer-garland" aria-hidden="true"></div>
      <div class="dir-card cer-dir"><div class="lbl">Il Direttivo</div><div class="dir-list">${direttivoHTML()}</div></div>
      ${X.msg ? `<figure class="pres-msg"><span class="pm-q" aria-hidden="true">“</span><blockquote>${esc(X.msg).replace(/\n/g, "<br>")}</blockquote>
        <figcaption>${pres ? avatar(pres) : ""}<span><b>${esc(pres ? pres.name : "Il Presidente")}</b><span class="role">Presidente</span></span></figcaption></figure>` : ""}
      ${goBtn("La settimana in numeri", "Il Direttivo sta per aprire la chiusura ufficiale…")}`;
    else if (st === 1) body = `<div class="cer-hero"><div class="eyebrow">21 — 27 dicembre</div><h2>La settimana in numeri</h2><div class="script">quanto ne abbiamo combinate</div></div>
      <div class="stat-grid">${(X.stats || []).map(([l, n, k], i) => `<div class="stat ${k}" style="--d:${i * .18}s"><b class="stat-n" data-to="${n}">0</b><span>${esc(l)}</span></div>`).join("")}</div>
      ${goBtn("Le sette giornate", "Si ripercorrono le giornate…")}`;
    else if (st === 2) body = `<div class="cer-hero"><div class="eyebrow">Il nostro viaggio</div><h2>Le sette giornate</h2></div>
      <ol class="journey">${(X.days || []).map((g, i) => { const acts = g.acts.map(id => S.activities.find(a => a.id === id)).filter(Boolean);
        return `<li style="--d:${i * .22}s"><span class="jb"><span>${dt(g.d).getDate()}</span></span>
          <div class="jt"><span class="jd">${esc(wdLong(g.d).replace(/ \d+ dicembre$/, ""))}${DAYNAME[g.d] ? ` · ${esc(DAYNAME[g.d])}` : ""}</span>
          <b>${acts.length ? acts.map(a => `${ICONS[a.id] || "✦"} ${esc(a.title)}`).join("<br>") : "Giornata libera"}</b>
          <span class="jn">${g.n ? `${g.n} ${g.n === 1 ? "bonus o malus" : "bonus e malus"}` : "nessun punto"}</span></div></li>`; }).join("")}</ol>
      ${goBtn("I titoli speciali", "Arrivano i titoli speciali…")}`;
    else if (st === 3) body = `<div class="cer-hero"><div class="eyebrow">Assegnati dal Direttivo</div><h2>Titoli speciali</h2><div class="script">senza guardare i punti</div></div>
      ${(X.titles || []).length ? `<div class="title-grid">${X.titles.map((t, i) => `<div class="tcard" style="--d:${i * .2}s"><span class="t-ic" aria-hidden="true">${t.ic}</span>
          <div class="t-name">${esc(t.name)}</div>
          <div class="t-who">${t.ids.map(player).filter(Boolean).map(p => `<span class="cc-p">${avatar(p)}<b>${esc(p.name)}</b></span>`).join("")}</div>
          <span class="t-n">${t.n} ${esc(t.what)}</span></div>`).join("")}</div>`
        : `<div class="lempty"><span aria-hidden="true">❄</span><b>Nessun titolo</b><p>Settimana tranquilla, a quanto pare.</p></div>`}
      ${goBtn("I certificati", "Arrivano i certificati…")}`;
    else if (st === 4) body = `<div class="cer-hero"><div class="eyebrow">Domenica 27 dicembre</div><h2>I certificati</h2><div class="script">consegnati dal Direttivo</div></div>
      ${certCards()}${nextBtn(0)}`;
    else {
      const k = Math.min(st - PRE + 1, order.length), rank = order[k - 1], before = order.slice(0, k - 1).reverse();
      if (rank !== 1){
        body = `<div class="eyebrow">Classifica finale · ${k} di ${order.length}</div>${bigPlace(rank)}${nextBtn(k)}${doneList(before)}`;
        cer.winFx = false;
      } else {
        const ws = placeOf(1);
        body = `<div class="win-stage"><div class="rays" aria-hidden="true"></div>
            <div class="win-kicker">E il vincitore della Settimana Pazza è…</div>
            <div class="win-who">${ws.map(x => `<div class="win-p">${CROWN}${avatar(x.p, "xl win-av")}<b class="win-name">${esc(x.p.name)}</b></div>`).join("")}</div>
            <div class="win-pt">${pts(ws[0].r.tot)}${ws.length > 1 ? " · pari merito" : ""}</div></div>
          <div class="win-after">${doneList(before)}
          <button class="btn gold big" data-cer="close" type="button">Chiudi e mostra la classifica</button></div>`;
        fireworks.intense = true;
        if (!cer.trial && !cer.remote && !revealed()) write(() => db.doc("settings/main").set({revealed:true, revealedAt:NOW()}));
      }
    }
    if (!cer.trial && !cer.remote && S.online && S.admin) db.sendCeremony(ceremonyPayload());
    el.innerHTML = `${cer.trial ? `<div class="cer-trial">Prova della cerimonia: la classifica non viene scoperta davvero</div>` : ""}${body}`;
    $("cer").classList.toggle("winner", st >= PRE && order[Math.min(st - PRE + 1, order.length) - 1] === 1);
    $("cer").scrollTop = 0;
    if ($("cer").classList.contains("winner") && !cer.winFx){ cer.winFx = true; confetti(); }
    countUp();
  }
  /* i numeri della settimana salgono da zero, uno dopo l'altro */
  function countUp(){
    document.querySelectorAll("#cer .stat-n[data-to]").forEach((el, i) => {
      const to = Number(el.dataset.to) || 0; el.removeAttribute("data-to");
      if (reduce || !to){ el.textContent = to; return; }
      const t0 = performance.now() + i * 180, dur = 1100;
      const step = t => { if (!el.isConnected) return; const k = Math.min(1, Math.max(0, (t - t0) / dur)); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { if (el.isConnected) el.textContent = to; }, i * 180 + dur + 400);
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
    const loop = () => {
      t++;
      if (t % (fireworks.intense ? 14 : 55) === 0) boom();
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--){ const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += .045; p.vx *= .985; p.life -= .012;
        if (p.life <= 0){ parts.splice(i,1); continue; } ctx.globalAlpha = p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (cer) cer.fw = requestAnimationFrame(loop);
    };
    boom(); cer.fw = requestAnimationFrame(loop);
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
    const jb = e.target.closest("[data-jolly]");
    if (jb){ const ev = S.points.find(x => x.id === jb.dataset.jolly); if (ev) armOrRun(jb, () => useJolly(ev, jb)); return; }
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
    const jo = e.target.closest("#sh-jolly");
    if (jo){ if (jo.dataset.state === "used"){ warnTaken(sheet.playerId, "jolly"); return; } const pid = sheet.playerId; armOrRun(jo, () => jollyMany([pid], jo)); return; }
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
    const v = b.dataset.trial; closeAdm();
    if (v === "closing"){ openCeremony(true); return; }
    if (!v){ if (S.trial) setTrial(null); return; }
    if (v !== S.trial) setTrial(v);
  });
  $("adm-panel").addEventListener("click", e => { if (e.target.id === "adm-panel") closeAdm(); });
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
  });

  /* il cambio di serata alle 6 del mattino aggiorna la pagina da solo */
  /* cambi di fase: nuova giornata alle 6, solo certificati alle 23 del 27, chiusura a mezzanotte */
  const phase = () => [currentDay(), certHour(), NOW() >= END.getTime()].join("|");
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
  /* attività aggiunte ai dati di partenza dopo il primo caricamento: l'admin le porta nel database */
  async function addMissingSeed(){
    if (!S.admin || !S.activities.length) return;
    for (const [id, v] of Object.entries(SEED.activities)) if (!S.activities.some(a => a.id === id)) await write(() => db.doc("activities/" + id).set(v));
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
