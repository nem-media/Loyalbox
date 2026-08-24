-- 0022 — hvilken stander skal ordren trykkes med?
--
-- HVORFOR: en ordre vidste indtil nu, hvilket DESIGN den skulle trykkes efter
-- (farve, front, logo — kolonnen `design_id` fra 0018), men ikke hvilken
-- QR-ADRESSE der skulle stå på skiltet. Har butikken to standere — "Disken" og
-- "Bordene" — kunne admin ikke se, hvilken af dem der skulle trykkes, og måtte
-- gætte eller spørge. Med én stander var det usynligt; med to var det en fejl,
-- der først ville blive opdaget, når skiltet stod hos kunden med det forkerte
-- link.
--
-- `on delete set null` og ikke `cascade`: sletter butikken standeren bagefter,
-- skal ORDREN blive stående. Den er et regnskabsbilag og skal kunne findes i
-- fem år efter bogføringsloven — samme begrundelse som `design_id` i 0018.

alter table public.orders
  add column if not exists stand_id uuid
  references public.stands (id) on delete set null;

comment on column public.orders.stand_id is
  'Standeren hvis QR-adresse skal trykkes paa skiltet (0022). Null paa aeldre '
  'ordrer og paa bestillinger uden konto, hvor der endnu ikke findes en stander.';

-- Admin slår op pr. stander, når en ordre skal produceres.
create index if not exists orders_stand_id_idx
  on public.orders (stand_id)
  where stand_id is not null;
