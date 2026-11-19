/* Collegamento al database online (Supabase).
   Lasciati vuoti, l'app salva i punti solo nel browser di questo dispositivo (come prima).
   Compilati, tutti vedono la stessa classifica in diretta e l'admin entra con email e password.

   Dove trovarli: Supabase → il progetto → Project Settings → API
   - SUPABASE_URL:      "Project URL", tipo https://abcdefgh.supabase.co
   - SUPABASE_ANON_KEY: la chiave "publishable" (o la vecchia "anon"). Può stare nel sito: le regole del database
                        decidono cosa si può leggere e scrivere.
   La chiave "service_role" NON va mai messa qui. */
const SUPABASE_URL = "https://kwuymiofmvrocllzvrtw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xeKoffa2WhRi81yKIzWqqQ_EOVUU0DS";
