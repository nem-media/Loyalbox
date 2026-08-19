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

**Status: der findes ingen brugbar serverpark-vært lige nu.** Verificeret
2026-08-19.

`m736761.serverpark.dk` (= `server7216`) er kontoens egen maskine. Login og
afsenderadresse virker dér — men den udleverer kun sit eget certifikat uden
Let's Encrypts mellemcertifikat, og Go (som Supabase er skrevet i) afviser den
med `x509: certificate signed by unknown authority`. Supabase har ingen
mulighed for at springe den kontrol over.

`mail.serverpark.dk` (= `server1133`) udleverer den fulde kæde og verificerer
fint — men det er en ANDEN maskine med sin egen brugerdatabase. Samme login
afvises dér med `535 authentication failed`. Et gyldigt certifikat gør altså
ikke en vært brugbar; postkassen skal ligge på den.

| Vært | Certifikatkæde | Login for vores postkasse |
|---|---|---|
| `m736761` / `server7216` | 1 cert — afvises af Go | virker |
| `mail.serverpark.dk` / `server1133` | 3 certs — ok | 535 afvist |

**Vejen frem:** serverpark skal installere den fulde kæde (`fullchain.pem`) på
server7216. Det er en lille rettelse i deres ende. Indtil da må mailen sendes
gennem en anden udbyder — Brevo har spærret kontoen, så i praksis en ny
(Resend, Postmark, SendGrid, Mailgun, SES).

Tjek altid BEGGE dele, for kæden alene er ikke nok:

```sh
echo | openssl s_client -starttls smtp -connect <vært>:587 -showcerts   | grep -E "^ *[0-9] s:|Verify return code"
```

3 certifikater + `code: 0` = kæden er i orden. Derefter skal det bekræftes, at
postkassen faktisk kan logge ind netop dér.

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
