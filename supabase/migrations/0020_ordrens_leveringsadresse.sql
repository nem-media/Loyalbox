-- ---------------------------------------------------------------------------
-- 0020 — Leveringsadressen på ordren
--
-- HVORFOR: ordren kunne ses i admin, men ikke ekspederes derfra. Adressen fandtes
-- kun to steder — i varselsmailen og hos Stripe — så den, der skal pakke et
-- skilt, skulle enten lede i sin indbakke eller logge ind i Stripe for at
-- finde ud af, hvor det skulle sendes hen.
--
-- Den gemmes som jsonb og ikke i seks kolonner, fordi den kommer fra Stripe i
-- den form, og fordi vi ikke skal søge i den. Skal den vises, læses den som
-- den er.
--
-- Adressen ER personoplysninger, men den er nødvendig for at opfylde aftalen,
-- og den følger ordren — som bogføringsloven i forvejen kræver gemt i fem år.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists leveringsadresse jsonb;

comment on column public.orders.leveringsadresse is
  'Leveringsadressen som Stripe gav den ved betalingen. Sat af webhooken, så ordren kan ekspederes uden at slå op i Stripe.';
