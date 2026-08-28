-- Knyt gamle ordrer uden konto til deres stander.
--
-- BAGGRUND: `/bestil/uden-konto` oprettede standeren med slug og destination,
-- men satte aldrig `orders.stand_id`. Uden den ved produktionen ikke, hvilken
-- QR-kode der skal trykkes, og trykfilen kom ud med skabelonens PLADSHOLDER.
-- Koden er rettet, men de ordrer, der allerede ligger, retter sig ikke selv.
--
-- KUN NÅR DER IKKE ER NOGET AT GÆTTE PÅ. Har virksomheden præcis ÉN stander,
-- er det den, ordren hører til — der er ingen anden mulighed. Har den flere,
-- rører vi ikke ordren: en forkert QR bliver trykt og opdaget af en kunde,
-- der står og scanner, og det er værre end en tom plads, admin selv kan se.
--
-- Idempotent: kun rækker, hvor `stand_id` stadig er null.

update public.orders o
set stand_id = s.id
from public.stands s
where o.stand_id is null
  and o.uden_konto = true
  and s.company_id = o.company_id
  and (
    select count(*) from public.stands x where x.company_id = o.company_id
  ) = 1;
