// finto client Supabase: tutte le operazioni passano da window.__sb (gestito dal test in Node)
const __chans = [];
window.supabase = { createClient(){
  const chans = __chans;
  window.__sbEvent = (kind, payload) => { for (const ch of chans) for (const h of ch.h) if (h.type === kind && (kind !== "broadcast" || h.f.event === payload.event)) h.cb(kind === "broadcast" ? {payload: payload.payload} : payload); };
  const q = (op, args) => window.__sb(op, args);
  return {
    from(){ return {
      select(){ return { range: (a,b) => q("select", {a,b}) }; },
      upsert(row){ return q("upsert", row); },
      delete(){ const f = {}; const o = { eq(k,v){ f[k]=v; return o; }, select(){ return q("delete", f); } }; return o; }
    }; },
    channel(name){ const ch = {name, h:[], on(type, f, cb){ ch.h.push({type, f, cb}); return ch; }, subscribe(cb){ chans.push(ch); cb && cb("SUBSCRIBED"); return ch; }, send(m){ q("broadcast", {from:name, event:m.event, payload:m.payload}); }}; return ch; },
    rpc(fn){ return q("rpc", {fn}); },
    auth: { getSession: () => q("getSession", {}), signInWithPassword: (c) => q("signIn", c), signOut: () => q("signOut", {}) }
  };
}};
