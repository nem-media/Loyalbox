-- 0022 — hvad skal skiltet pege på, og hvilken QR skal trykkes?
--
-- TO HULLER, DER HÆNGER SAMMEN.
--
-- 1. `stand_id`: en ordre vidste hvilket DESIGN den skulle trykkes efter
--    (farve, front, logo — kolonnen `design_id` fra 0018), men ikke hvilken
--    QR-ADRESSE der skulle stå på skiltet. Har butikken to standere —
--    "Disken" og "Bordene" — kunne admin ikke se, hvilken af dem der skulle
--    trykkes, og måtte gætte eller spørge. Med én stander var det
--    usynligt; med to er det en fejl, der først opdages, når skiltet står
--    hos kunden med det forkerte link.
--
-- 2. `destination_type` / `destination_url`: et skilt UDEN abonnement kan ikke
--    omdirigeres bagefter — kunden har ingen dynamiske links. Alligevel kunne
--    man bestille et sådant skilt uden at oplyse, hvad det skulle pege på.
--    Resultatet ville være et trykt skilt, der fører ingen steder hen, og
--    som ikke kan rettes uden et nyt tryk. Med abonnement er det harmløst:
--    dér kan destinationen sættes bagefter i dashboardet.
--
-- Bemærk at `/bestil/uden-konto` altid har spurgt om destinationen (0019).
-- Hullet var i bestillingen MED konto.
--
-- `on delete set null` og ikke `cascade`: sletter butikken standeren bagefter,
-- skal ORDREN blive stående. Den er et regnskabsbilag og skal kunne findes i
-- fem år efter bogføringsloven — samme begrundelse som `design_id` i 0018.

alter table public.orders
  add column if not exists stand_id uuid
    references public.stands (id) on delete set null,
  add column if not exists destination_type text,
  add column if not exists destination_url text;

comment on column public.orders.stand_id is
  'Standeren hvis QR-adresse skal trykkes på skiltet (0022). Null på ældre '
  'ordrer og på bestillinger uden konto, hvor standeren oprettes for sig.';

comment on column public.orders.destination_url is
  'Hvad skiltet skal pege på (0022). Kræves ved køb UDEN abonnement, hvor '
  'destinationen ikke kan ændres bagefter. Null når købet har abonnement.';

-- Admin slår op pr. stander, når en ordre skal produceres.
create index if not exists orders_stand_id_idx
  on public.orders (stand_id)
  where stand_id is not null;
