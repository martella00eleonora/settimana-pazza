-- Settimana Pazza · Winter Edition 2026 — database su Supabase
-- Da incollare una volta sola in: Supabase → SQL Editor → New query → Run.
-- Prima di eseguirlo, in fondo metti le email degli admin.

-- Tutti i dati dell'app: giocatori, programma, bonus/malus, punti, mini-sfide, certificati, impostazioni.
create table if not exists public.docs (
  col        text not null,          -- players, activities, presets, points, extras, settings
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

-- Chi può modificare (l'admin entra nell'app con questa email e la sua password).
create table if not exists public.admins (
  email text primary key
);

alter table public.docs   enable row level security;
alter table public.admins enable row level security;   -- nessuna regola: la lista admin non si legge dall'app

-- È admin chi ha fatto l'accesso con un'email presente nella tabella admins.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- La cerimonia del 28 è già avvenuta?
create or replace function public.revealed() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (data ->> 'revealed')::boolean from public.docs where col = 'settings' and id = 'main'), false);
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.revealed() to anon, authenticated;

-- LETTURA
-- L'admin legge tutto. Gli altri leggono tutto tranne:
--   - i punti di prova (modalità prova dell'admin);
--   - dal 26 dicembre, punti, mini-sfide e certificati, finché il Direttivo non fa la cerimonia.
-- Così la classifica coperta è coperta davvero: quei dati non arrivano proprio sui telefoni.
drop policy if exists "lettura" on public.docs;
create policy "lettura" on public.docs for select to anon, authenticated using (
  public.is_admin()
  or (
    coalesce((data ->> 'trial')::boolean, false) = false
    and (
      public.revealed()
      or col not in ('points', 'extras')
      or coalesce(data ->> 'day', '') < '2026-12-26'
    )
  )
);

-- SCRITTURA: solo l'admin.
drop policy if exists "inserimento admin" on public.docs;
drop policy if exists "modifica admin"    on public.docs;
drop policy if exists "cancellazione admin" on public.docs;
create policy "inserimento admin"   on public.docs for insert to authenticated with check (public.is_admin());
create policy "modifica admin"      on public.docs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cancellazione admin" on public.docs for delete to authenticated using (public.is_admin());

-- Aggiornamenti in diretta sui telefoni.
alter publication supabase_realtime add table public.docs;

-- ADMIN: metti qui le email (una riga per persona) e crea gli stessi utenti in
-- Authentication → Users → Add user (con password, "Auto Confirm User" attivo).
insert into public.admins (email) values
  ('EMAIL-ADMIN@esempio.it')
on conflict do nothing;
