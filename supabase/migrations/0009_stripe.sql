-- ---------------------------------------------------------------------------
-- 0009 — Stripe: kunde, abonnement og fakturamail
--
-- `stripe_customer_id` gemmes, så den samme virksomhed genbruger sin
-- Stripe-kunde ved næste køb i stedet for at få en ny hver gang — ellers
-- splittes deres betalingshistorik, og kundecentret viser kun det seneste køb.
--
-- `stripe_subscription_id` bruges til at knytte webhook-hændelser til den
-- rigtige virksomhed, når et abonnement fornys, fejler eller opsiges.
--
-- `billing_email` er adressen til bogholderiet. Den er adskilt fra
-- `contact_email`, fordi den, der driver butikken, sjældent er den, der
-- bogfører — kvitteringer skal kunne sendes et andet sted hen end
-- driftsbeskeder. Er den tom, bruges contact_email.
--
-- Ordrer får `stripe_payment_intent` og `product_slug`, så en ordre kan spores
-- tilbage til betalingen og til hvad der faktisk blev købt.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_email text;

comment on column public.companies.billing_email is
  'Fakturamail til bogholderiet. Falder tilbage til contact_email, hvis tom.';

create unique index if not exists companies_stripe_customer_idx
  on public.companies(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists companies_stripe_subscription_idx
  on public.companies(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.orders
  add column if not exists stripe_payment_intent text,
  add column if not exists product_slug text;

-- Samme checkout-session må kun give én ordre. Webhooks kan leveres flere
-- gange for samme hændelse — uden denne begrænsning ville et gentaget kald
-- oprette en dublet-ordre.
create unique index if not exists orders_stripe_session_idx
  on public.orders(stripe_session_id)
  where stripe_session_id is not null;
