-- "FIND MIT KORT" — dæmpningen mod en mailbombe.
--
-- HVORFOR KOLONNEN FINDES. Siden `/kort/find` sender en mail på baggrund af
-- en e-mailadresse, som hvem som helst kan taste. Uden en grænse er det en
-- knap, en fremmed kan trykke på i det uendelige, og kundens indbakke er den,
-- der betaler. Det er samme fælde som alarmerne i driftsloggen: alarmér
-- aldrig fra en sti, en udefrakommende kan udløse frit.
--
-- DÆMPNINGEN LIGGER I DATABASEN OG IKKE I EN VARIABEL. En serverfunktion
-- kører i mange eksemplarer, og hver af dem ville have sin egen tæller — to
-- samtidige forsøg ville begge slippe igennem. Kolonnen skrives med en
-- BETINGET opdatering, så det er databasen, der afgør, hvem der vandt.
--
-- DEN ER IKKE EN PERSONOPLYSNING UD OVER DEN, RÆKKEN ALLEREDE BÆRER: et
-- tidsstempel på et medlem, der i forvejen har navn og e-mail. Den slettes
-- med resten af medlemmet efter `frist_medlem_inaktiv` (0012) og skal derfor
-- ikke have sin egen frist.
--
-- Køres MANUELT i Supabase → SQL Editor. Idempotent.

alter table public.loyalty_members
  add column if not exists kort_link_sendt_den timestamptz;

comment on column public.loyalty_members.kort_link_sendt_den is
  'Sidst vi mailede et link til dette kort via "Find mit kort". Bruges KUN '
  'til at dæmpe gentagne forsøg — se src/lib/loyalty/kort-link.ts.';
