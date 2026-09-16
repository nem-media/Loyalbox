-- ---------------------------------------------------------------------------
-- 0041 — TRE KAPLØB MERE I LEDGEREN: tilbageførsel og rabatter
--
-- Samme mønster som 0038 (én udestående belønning): et OPSLAG efterfulgt af en
-- skrivning er ikke en regel. De tre funktioner her blev ikke gennemgået, da
-- stempling og indløsning blev rettet — de var uden for det, der blev kigget
-- på, og de var også helt uden prøver.
--
-- MÅLT PÅ DEMODATA 2026-09-16, alle tre:
--
--  1. `reverseStamp()` slår op, om transaktionen allerede er tilbageført. To
--     samtidige tilbageførsler af samme stempel gav **to** negative rækker, og
--     saldoen endte på **-5** i stedet for 0. Kunden mister stempler, hun har
--     optjent — og hun kan ikke se hvorfor.
--
--  2. `grantDiscount()` tæller mod `total_limit` og `per_customer_limit` og
--     indsætter bagefter. Med en samlet grænse på ÉN blev der udstedt **tre**
--     rabatter. Det er en kampagnes budget: hver overskridelse er en vare
--     givet væk, butikken ikke havde regnet med.
--
--  3. `redeemDiscount()` læser status og skriver UBETINGET. To samtidige
--     indløsninger fik **begge** grønt lys — to ekspedienter ved hver sin kasse
--     giver samme rabat to gange.
--
-- TO FORSKELLIGE KURE, FORDI DE TO PROBLEMER ER FORSKELLIGE.
--
-- Tilbageførslen er en ENTYDIGHED: der må findes højst én tilbageførsel pr.
-- transaktion. Det er præcis, hvad et partielt unikt indeks siger, og så gælder
-- det uanset hvilken vej der skrives ad.
--
-- Grænserne er en TÆLLING, og en tælling kan intet indeks udtrykke. Derfor en
-- funktion, der låser rabatrækken (`for update`), tæller og indsætter i samme
-- transaktion — samme greb som `juster_lager()`. Låsen står kun om ÉN
-- rabatrække, så to forskellige kampagner aldrig venter på hinanden.
--
-- Indløsningen har ingen migration: dér er kuren en betinget opdatering i
-- koden, nøjagtig som ved belønningen.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------- 1) højst én tilbageførsel
-- `where reversal_of is not null` er nødvendigt: næsten alle transaktioner er
-- IKKE tilbageførsler, og uden filteret ville indekset kræve, at der kun fandtes
-- én sådan række i hele tabellen.
create unique index if not exists loyalty_txn_en_tilbagefoersel_idx
  on public.loyalty_transactions (reversal_of)
  where reversal_of is not null;

-- ------------------------------------------------------- 2) rabattens grænser
/**
 * Giv en kunde en rabat — hvis grænserne tillader det.
 *
 * Svarer med en GRUND og ikke bare sandt/falsk, af samme årsag som
 * `koebSpaerre()`: "kunden har fået den før" og "kampagnen er brugt op" er to
 * forskellige beskeder til personalet ved disken.
 *
 * `for update` på rabatrækken er hele pointen. Uden den kan to samtidige kald
 * begge tælle "der er plads" og begge indsætte. Låsen holdes til
 * transaktionen slutter, altså til indsættelsen er sket.
 */
create or replace function public.giv_rabat(
  p_company_id  uuid,
  p_member_id   uuid,
  p_discount_id uuid,
  p_granted_by  uuid default null,
  p_note        text default null,
  p_feedback_id uuid default null
)
returns text
language plpgsql
as $$
declare
  r          public.discounts%rowtype;
  pr_kunde   int;
  i_alt      int;
begin
  -- Låser rækken. Andre kald for SAMME rabat venter her, til vi er færdige.
  select * into r
    from public.discounts
   where id = p_discount_id
     and company_id = p_company_id
   for update;

  if not found then return 'ikke-fundet'; end if;
  if r.status <> 'active' then return 'ikke-aktiv'; end if;

  if r.per_customer_limit is not null then
    select count(*) into pr_kunde
      from public.customer_discounts
     where member_id = p_member_id and discount_id = p_discount_id;
    if pr_kunde >= r.per_customer_limit then return 'kunde-graense'; end if;
  end if;

  if r.total_limit is not null then
    select count(*) into i_alt
      from public.customer_discounts
     where discount_id = p_discount_id;
    if i_alt >= r.total_limit then return 'samlet-graense'; end if;
  end if;

  insert into public.customer_discounts
    (company_id, member_id, discount_id, status, granted_by, note, feedback_id)
  values
    (p_company_id, p_member_id, p_discount_id, 'available', p_granted_by,
     p_note, p_feedback_id);

  return 'ok';
end;
$$;
