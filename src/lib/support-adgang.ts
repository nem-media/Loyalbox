import "server-only";
import { cookies } from "next/headers";

/**
 * Supportadgang: admin ser og retter en kundes dashboard SOM ADMIN.
 *
 * HVORFOR IKKE "LOG IND SOM KUNDEN". Det havde været færre linjer: hent en
 * session for ejeren, og alt virker af sig selv. Men så er admin ikke længere
 * til at skelne fra kunden — hver handling ser ud, som om butikken selv gjorde
 * den, og admins eget spor forsvinder. Præcis dét er grunden til, at
 * `admin_log` overhovedet findes (migration 0025): de manuelle ændringer
 * afgør kundens adgang og var de eneste, der ikke efterlod et spor.
 *
 * DERFOR ER DET KUN ET VALG AF VIRKSOMHED. Cookien siger, HVILKEN virksomhed
 * der ses på. Den siger ikke, at man må — det gør `role === "admin"`, som
 * slås op på serveren ved hver eneste forespørgsel. En cookie sat i hånden af
 * en almindelig bruger giver derfor ingenting; det er værd at holde fast i,
 * hvis nogen senere fristes til at lægge mere i den end et id.
 *
 * Og fordi actor'en forbliver admin, skriver `logAudit()` allerede admins
 * bruger-id på de loyalitetshandlinger, der bliver udført. Der er intet at
 * ændre dér — det er hele pointen med at lade være med at skifte identitet.
 */

/** Navnet er med vilje kedeligt: en cookie, der ikke ligner en adgangsnøgle. */
export const SUPPORT_COOKIE = "loyalsum-support";

/**
 * Hvilken virksomhed ser admin på lige nu?
 *
 * Returnerer null, når der ikke er valgt nogen. Kalderen SKAL selv have slået
 * fast, at brugeren er admin — funktionen her kender ikke rollen og må aldrig
 * blive den, der afgør adgangen.
 */
export async function valgtSupportVirksomhed(): Promise<string | null> {
  const c = await cookies();
  const v = c.get(SUPPORT_COOKIE)?.value?.trim();
  return v ? v : null;
}
