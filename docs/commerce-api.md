# LoyalSum Commerce API v1 — core

Kontrakten er `loyalsum-integrations` @ 9aa9906 og er kilden til sandheden;
en kopi ligger i `src/lib/commerce-api/contract/v1/`. Koden bor i
`src/lib/commerce-api/`, ruterne i `src/app/api/v1/commerce/`, skemaet i
`supabase/migrations/0049_commerce_api.sql`. Staging: se
[commerce-staging.md](commerce-staging.md).

## Krypteringsnøglen

Hver integration har sin egen signeringsnøgle. Serveren skal kunne genskabe
den (HMAC), så den ligger AES-256-GCM-krypteret i
`commerce_integrations.secret_ciphertext` som `<id>.<iv>.<tag>.<data>`.

| Variabel | Indhold |
|---|---|
| `LOYALSUM_COMMERCE_ENCRYPTION_KEY` | aktuel nøgle: 32 tilfældige bytes, base64 (44 tegn) — påkrævet for commerce |
| `LOYALSUM_COMMERCE_ENCRYPTION_KEY_ID` | dens id, standard `k1` |
| `LOYALSUM_COMMERCE_ENCRYPTION_KEYS_RETIRED` | tidligere nøgler, der stadig skal kunne læses: `k1:<base64>` (kommasepareret) |

- Nøglen er **uafhængig af `SUPABASE_SERVICE_ROLE_KEY`** — Supabase-nøglen kan
  roteres, uden at nogen butik skal parres igen.
- **Mangler eller er den ugyldig**, svarer parring og API
  `commerce_unavailable` (503, `retryable: true`), og dashboardet siger, at
  integrationen ikke er sat op. Resten af LoyalSum påvirkes ikke.
- **Rotation:** læg den nye nøgle ind som aktuel med id `k2`, flyt den gamle
  til `…_KEYS_RETIRED` som `k1:<base64>`. Hver integration krypteres om, næste
  gang den kalder. Når ingen række starter med `k1.`, fjernes den gamle.
  Ingen genparring, ingen skemaændring.

## Brugbar saldo — gælder AL pointforbrug

```
brugbar = saldo − aktive reservationer (status reserved, ikke udløbet)
```

Én definition i basen (`point_reserverede()` / `point_brugbar_saldo()`), brugt
af webshoppens reservation og commit OG af indløsningen ved disken
(`point_indloes()`, redefineret i 0049). Optjening påvirkes ikke. En rettelse
(manuel fradrag, annullering) er ikke forbrug; den kan gå ned i det reserverede,
og så afviser en senere commit med `insufficient_points`.

## Ventende webshopidentitet — 90 dage

En ordre uden kendt kunde gemmer kundens normaliserede e-mail, så optjeningen
kan kræves, når kunden bekræfter sin e-mail. Natkørslen (`commerce_oprydning`)
fjerner e-mailen **90 dage efter seneste aktivitet** for den e-mail i
butikken (platformens `updated_at` på en ventende ordre, eller seneste
bekræftelsesmail), sletter ubekræftede kundekoblinger med den, og markerer
ordren `expired` / bidraget `identity_expired`. Ordren og bidraget bevares
uden e-mail. En gensendelse af samme ordre genopliver den ikke; kun en ordre,
der faktisk er ændret på platformen, gør. Fristen står i `FRISTER` og vises i
`/privatliv`.

## Kendte V1-begrænsninger

- **Kun DKK.** Kontrakten kan bære enhver valuta; LoyalSum accepterer i V1
  kun `UNDERSTOETTEDE_VALUTAER` i `src/lib/commerce-api/valuta.ts`. En butik
  eller ordre i anden valuta afvises med `unsupported_currency`. Tabellerne
  bærer allerede valuta pr. række, så flere valutaer kræver ingen ny tabel.
- **Negative gebyrer** (nogle WooCommerce-rabatplugins) kan ikke udtrykkes i
  Commerce Contract v1 — beløb er aldrig negative. WooCommerce-adapteren skal
  klassificere en sådan ordre som **unsupported normalization**, logge den og
  vise den i admin, og **ikke sende** en ordre, der er regnet om for at passe.
  Core har ingen workaround og afviser en negativ værdi med `invalid_contract`.
- **`order_status` styrer aldrig loyalitet.** WooCommerce' `refunded`
  normaliseres til `order_status = cancelled` + `payment_status = refunded`;
  det er uden betydning for optjening, som kun læser `payment_status`.
- **Kun point kan bruges i webshoppen** (fast beløb eller procent af kurven).
  Stempelkortets belønninger og gratis vare er ikke med i V1.
