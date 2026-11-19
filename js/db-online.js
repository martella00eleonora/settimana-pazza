/* Settimana Pazza — archivio online su Supabase.
   Offre la stessa interfaccia dell'archivio locale (collection/doc/set/update/delete/onSnapshot),
   così il resto dell'app non cambia. Tutti i documenti stanno nella tabella "docs" (col, id, data),
   e le regole di sicurezza del database (supabase/schema.sql) decidono chi legge e chi scrive. */

async function onlineDB(){
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const data = {}, subs = {};
  const snap = c => ({docs: Object.entries(data[c] || {}).map(([id, v]) => ({id, data: () => v}))});
  const emit = c => (subs[c] || []).forEach(fn => fn(snap(c)));

  /* rilegge tutto: all'avvio, dopo il login o il logout, alla cerimonia e quando si torna sulla pagina */
  async function loadAll(){
    const fresh = {};
    for (let from = 0; ; from += 1000){
      const {data: rows, error} = await sb.from("docs").select("col,id,data").range(from, from + 999);
      if (error) throw error;
      for (const r of rows) (fresh[r.col] = fresh[r.col] || {})[r.id] = r.data;
      if (rows.length < 1000) break;
    }
    for (const c of new Set([...Object.keys(data), ...Object.keys(fresh)])){ data[c] = fresh[c] || {}; emit(c); }
  }
  await loadAll();

  /* modifiche in diretta fatte da altri telefoni */
  sb.channel("docs-live")
    .on("postgres_changes", {event: "*", schema: "public", table: "docs"}, p => {
      const row = p.eventType === "DELETE" ? p.old : p.new;
      if (!row || !row.col) return;
      if (p.eventType === "DELETE"){ if (data[row.col]) delete data[row.col][row.id]; }
      else (data[row.col] = data[row.col] || {})[row.id] = row.data;
      emit(row.col);
      if (row.col === "settings") loadAll().catch(() => {});   // dopo la cerimonia arrivano anche i punti del 26 e del 27
    })
    .subscribe(status => { if (status === "SUBSCRIBED") loadAll().catch(() => {}); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadAll().catch(() => {}); });

  /* cerimonia in diretta: l'admin manda i passi, gli altri telefoni li seguono */
  const ceremonyFns = [];
  const ceremony = sb.channel("cerimonia", {config: {broadcast: {self: false}}})
    .on("broadcast", {event: "passo"}, ({payload}) => ceremonyFns.forEach(fn => fn(payload)))
    .subscribe();

  const restore = (c, id, prev) => { data[c] = data[c] || {}; if (prev === undefined) delete data[c][id]; else data[c][id] = prev; emit(c); };
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ref = (c, id) => ({
    id,
    set: async v => {
      const prev = data[c]?.[id];
      (data[c] = data[c] || {})[id] = v; emit(c);
      const {error} = await sb.from("docs").upsert({col: c, id, data: v});
      if (error){ restore(c, id, prev); throw error; }
    },
    update: async v => {
      const cur = data[c]?.[id];
      if (!cur) throw new Error("missing");
      return ref(c, id).set({...cur, ...v});
    },
    delete: async () => {
      const prev = data[c]?.[id];
      if (data[c]) delete data[c][id]; emit(c);
      const {data: gone, error} = await sb.from("docs").delete().eq("col", c).eq("id", id).select("id");
      if (error || (prev !== undefined && !gone?.length)){ restore(c, id, prev); throw error || new Error("non autorizzato"); }
    }
  });

  return {
    online: true,
    collection: c => ({ doc: id => ref(c, id || rid()), onSnapshot: fn => { (subs[c] = subs[c] || []).push(fn); fn(snap(c)); return () => {}; } }),
    doc: path => { const [c, id] = path.split("/"); return ref(c, id); },
    loadAll,
    auth: {
      session: async () => (await sb.auth.getSession()).data.session,
      signIn: async (email, password) => { const {error} = await sb.auth.signInWithPassword({email, password}); if (error) throw error; },
      signOut: () => sb.auth.signOut(),
      isAdmin: async () => { const {data: ok, error} = await sb.rpc("is_admin"); return !error && ok === true; }
    },
    sendCeremony: payload => ceremony.send({type: "broadcast", event: "passo", payload}),
    onCeremony: fn => ceremonyFns.push(fn)
  };
}
