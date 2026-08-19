# Auth-mails

Skabelonerne indsættes MANUELT i Supabase → Authentication → Emails. De kan
ikke deployes fra repoet — de ligger her, så de ikke går tabt, og så en ændring
kan ses i git.

| Fil | Supabase-skabelon | Emnelinje |
|---|---|---|
| `bekraeft-email.html` | Confirm signup | Bekræft din e-mail hos LoyalSum |
| `nulstil-adgangskode.html` | Reset password | Nulstil din adgangskode hos LoyalSum |

Øvrige skabeloner (Magic Link, Invite, Change Email) bruges ikke af appen og
står på Supabases standard.

`{{ .ConfirmationURL }}` udfyldes af Supabase og peger på `/auth/callback`,
som veksler koden til en session. Ændres den rute, skal `emailRedirectTo` i
`src/app/(auth)/actions.ts` følge med.

## SMTP

Supabase → Project Settings → Authentication → SMTP Settings.

**Kendt problem:** `m736761.serverpark.dk` og `server7216.serverpark.dk`
udleverer kun deres eget certifikat uden Let's Encrypts mellemcertifikat. Go
(som Supabase er skrevet i) afviser dem med
`x509: certificate signed by unknown authority`.

**Brug i stedet `mail.serverpark.dk:587`** — samme platform, men den udleverer
den fulde kæde (leaf → Let's Encrypt YR2 → ISRG Root YR, `Verify return code: 0`)
og tilbyder `AUTH PLAIN LOGIN` efter STARTTLS. Port 465 er lukket hos dem.

Tjek en vært før den tages i brug:

```sh
echo | openssl s_client -starttls smtp -connect mail.serverpark.dk:587 -showcerts \
  | grep -E "^ *[0-9] s:|Verify return code"
```

Tre certifikater og `code: 0` = brugbar. Ét certifikat og `code: 21` = Supabase
vil afvise den.

## Test at det virker

```sh
curl -i -X POST "$SUPABASE_URL/auth/v1/recover?redirect_to=https://loyalsum.dk/auth/callback" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"din@adresse.dk"}'
```

- **HTTP 500** = Supabase kan ikke aflevere til SMTP. Den rå fejl står i
  Supabase → Logs → Auth.
- **HTTP 200** = afleveret til udbyderen. Det beviser IKKE levering — tjek
  udbyderens egen log, og at mailen faktisk lander.

**Rækkefølgen må ikke byttes om:** SMTP virker → test én rigtig mail hele vejen
(link → `/auth/callback` → ny adgangskode) → FØRST derefter må "Confirm email"
slås til under Sign In / Providers → Email. Slås den til før, kan nye brugere
ikke komme ind.
