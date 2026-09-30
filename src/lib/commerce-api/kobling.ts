import "server-only";
import { commerceDb, type CommerceDb } from "./db";
import { valider } from "./contract";
import { normaliserEmail } from "./customer";
import { goerKrav, kundeAfhaengigheder } from "./service";
import { nyKundeReference, nytBekraeftelsesToken, tokenHash } from "./secret";
import { sendKundeMail } from "@/lib/mail";
import { getSiteUrl } from "@/lib/site";
import type { Fejlkode } from "./errors";
import type { CustomerLinkRow, IntegrationRow } from "./rows";
import type { CommerceCustomer } from "./types";

/**
 * KUNDEKOBLINGEN — det, der skal til, før point må BRUGES i webshoppen.
 *
 * Webshoppens e-mail er ikke bekræftet af nogen: WooCommerce lader enhver
 * oprette en konto med enhver adresse. At adressen passer med et LoyalSum-kort
 * er derfor aldrig nok til at trække point. Kunden skal selv klikke på et link
 * i SIN indbakke; først da er koblingen `verified`.
 *
 *   POST /customers/link  →  202 + mail med et link  (første gang)
 *   kunden klikker        →  /webshop/bekraeft/<token> bekræfter
 *   POST /customers/link  →  200 + koblingen          (derefter)
 *
 * E-mailen står i KROPPEN og aldrig i en URL (kontrakten), og mailen sendes
 * højst hvert tiende minut pr. kobling, så endpointet ikke kan bruges til at
 * fylde en fremmed indbakke.
 *
 * INGEN MARKEDSFØRING. Koblingen giver ikke et samtykke, og mailen er en
 * servicebesked om en handling, kunden selv har sat i gang.
 */

export const BEKRAEFTELSE_TIMER = 24;
export const MAIL_DAEMPNING_MINUTTER = 10;

const KOLONNER =
  "id, company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verification_expires_at, verification_sent_at, verified_at";

export function koblingsKrop(integration: IntegrationRow, l: CustomerLinkRow) {
  return {
    provider: integration.provider,
    external_store_id: integration.external_store_id,
    external_customer_id: l.external_customer_id,
    loyalsum_customer_ref: l.customer_ref,
    link_method: l.link_method ?? "verified_email",
    linked_at: new Date(l.verified_at!).toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
}

export type KoblingUdfald =
  | { ok: true; http: 200; krop: ReturnType<typeof koblingsKrop> }
  | { ok: true; http: 202; krop: { status: "pending_verification"; loyalsum_customer_ref: string } }
  | { ok: false; kode: Fejlkode; besked: string; detaljer?: string[] };

async function findKobling(db: CommerceDb, integrationId: string, ext: string | null, email: string) {
  let q = db
    .from("commerce_customer_links")
    .select(KOLONNER)
    .eq("integration_id", integrationId)
    .eq("email_norm", email);
  q = ext === null ? q.is("external_customer_id", null) : q.eq("external_customer_id", ext);
  const { data } = await q.maybeSingle();
  return (data as CustomerLinkRow | null) ?? null;
}

export async function anmodKobling(
  integration: IntegrationRow,
  krop: unknown,
  db: CommerceDb = commerceDb(),
): Promise<KoblingUdfald> {
  const v = valider("customer", krop);
  if (!v.ok) return { ok: false, kode: "invalid_contract", besked: "Kunden følger ikke CommerceCustomer v1.", detaljer: v.fejl };
  const kunde = krop as CommerceCustomer;
  const email = normaliserEmail(kunde.email);

  let link = await findKobling(db, integration.id, kunde.external_customer_id, email);
  if (link?.status === "verified" && link.member_id) {
    return { ok: true, http: 200, krop: koblingsKrop(integration, link) };
  }

  if (!link) {
    const { error } = await db.from("commerce_customer_links").insert({
      company_id: integration.company_id,
      integration_id: integration.id,
      external_customer_id: kunde.external_customer_id,
      email_norm: email,
      customer_ref: nyKundeReference(),
    });
    if (error && error.code !== "23505") throw new Error(`kobling: ${error.message}`);
    link = await findKobling(db, integration.id, kunde.external_customer_id, email);
    if (!link) throw new Error("kobling: kunne ikke læses efter oprettelse");
  }

  // Et nyt link højst hvert tiende minut — BETINGET i basen, så to samtidige
  // kald ikke begge sender.
  const token = nytBekraeftelsesToken();
  const graense = new Date(Date.now() - MAIL_DAEMPNING_MINUTTER * 60_000).toISOString();
  const { data: sendes } = await db
    .from("commerce_customer_links")
    .update({
      status: "pending",
      verification_token_hash: tokenHash(token),
      verification_expires_at: new Date(Date.now() + BEKRAEFTELSE_TIMER * 3_600_000).toISOString(),
      verification_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id)
    .neq("status", "verified")
    .or(`verification_sent_at.is.null,verification_sent_at.lt.${graense}`)
    .select("id");

  if (sendes?.length) {
    const { data: firma } = await db
      .from("companies")
      .select("name")
      .eq("id", integration.company_id)
      .maybeSingle();
    const butik = (firma?.name as string | undefined) || integration.store_name || "butikken";
    const adresse = `${getSiteUrl()}/webshop/bekraeft/${token}`;
    await sendKundeMail(
      email,
      `Bekræft din e-mail hos ${butik}`,
      [
        `Hej`,
        ``,
        `Du har bedt om at bruge dine fordele fra ${butik} i webshoppen.`,
        `Bekræft, at det er din e-mail, ved at åbne linket herunder:`,
        ``,
        `  ${adresse}`,
        ``,
        `Linket virker i ${BEKRAEFTELSE_TIMER} timer. Har du ikke bedt om det, kan du se bort fra denne mail — der sker ingenting.`,
        ``,
        `Mailen er en servicebesked. Du er ikke tilmeldt nyhedsbreve eller markedsføring.`,
      ].join("\n"),
    );
  }

  return { ok: true, http: 202, krop: { status: "pending_verification", loyalsum_customer_ref: link.customer_ref } };
}

/**
 * Hvad siden skal vise, FØR kunden trykker: er linket gyldigt, hvilken butik
 * er det, og findes kunden i forvejen (så skal der ikke spørges om vilkår)?
 * Læser kun — et link i en mail åbnes ofte af en scanner, og en GET må aldrig
 * bekræfte noget.
 */
export async function forhaandsvisKobling(
  token: string,
  db: CommerceDb = commerceDb(),
): Promise<{ gyldig: false } | { gyldig: true; butik: string; nyKunde: boolean }> {
  if (!token || token.length > 128) return { gyldig: false };
  const { data } = await db
    .from("commerce_customer_links")
    .select(KOLONNER)
    .eq("verification_token_hash", tokenHash(token))
    .maybeSingle();
  const link = data as CustomerLinkRow | null;
  if (
    !link ||
    link.status !== "pending" ||
    !link.verification_expires_at ||
    new Date(link.verification_expires_at) < new Date()
  ) {
    return { gyldig: false };
  }
  const { data: firma } = await db.from("companies").select("name").eq("id", link.company_id).maybeSingle();
  const fundne = await kundeAfhaengigheder(db).medlemmerMedEmail(link.company_id, link.email_norm);
  return { gyldig: true, butik: (firma?.name as string | undefined) ?? "butikken", nyKunde: fundne.length === 0 };
}

export type BekraeftUdfald =
  | { ok: true; butik: string; ordrer: number }
  | { ok: false; fejl: string };

/**
 * KUNDEN KLIKKEDE PÅ LINKET: bekræft koblingen, find eller opret kunden i
 * butikken, og gør krav på den optjening, der har ventet på hende.
 *
 * Der oprettes kun et medlem HER — efter at kunden har bevist, at hun ejer
 * adressen, og selv har accepteret vilkårene. En webshopordre alene opretter
 * aldrig en kunde. Findes der to medlemmer med adressen, gættes der ikke.
 */
export async function bekraeftKobling(
  token: string,
  vilkaarAccepteret: boolean,
  db: CommerceDb = commerceDb(),
): Promise<BekraeftUdfald> {
  const { data } = await db
    .from("commerce_customer_links")
    .select(KOLONNER)
    .eq("verification_token_hash", tokenHash(token))
    .maybeSingle();
  const link = data as CustomerLinkRow | null;
  if (!link || link.status !== "pending") {
    return { ok: false, fejl: "Linket er allerede brugt eller findes ikke. Bed om et nyt fra webshoppen." };
  }
  if (!link.verification_expires_at || new Date(link.verification_expires_at) < new Date()) {
    return { ok: false, fejl: "Linket er udløbet. Bed om et nyt fra webshoppen." };
  }

  const { data: firma } = await db
    .from("companies")
    .select("name")
    .eq("id", link.company_id)
    .maybeSingle();
  const butik = (firma?.name as string | undefined) ?? "butikken";

  const kunder = kundeAfhaengigheder(db);
  const fundne = await kunder.medlemmerMedEmail(link.company_id, link.email_norm);
  if (fundne.length > 1) {
    return {
      ok: false,
      fejl: `Din e-mail står på mere end ét kort hos ${butik}. Kontakt butikken, så de kan lægge dem sammen.`,
    };
  }

  let memberId: string | null = fundne[0] ?? null;
  if (!memberId) {
    if (!vilkaarAccepteret) {
      return { ok: false, fejl: "Du skal acceptere vilkårene for kundeprogrammet for at fortsætte." };
    }
    const { data: ny, error } = await db
      .from("loyalty_members")
      .insert({ company_id: link.company_id, email: link.email_norm })
      .select("id")
      .maybeSingle();
    if (error && error.code !== "23505") throw new Error(`medlem: ${error.message}`);
    memberId = (ny?.id as string | undefined) ?? null;
    if (!memberId) {
      // En anden anmodning oprettede kunden først: brug den.
      memberId = (await kunder.medlemmerMedEmail(link.company_id, link.email_norm))[0] ?? null;
    } else {
      // VILKÅR — aldrig markedsføring. Samme registrering som en tilmelding
      // ved standeren, uden IP (den er ikke nødvendig her).
      await db.from("consent_records").insert({
        company_id: link.company_id,
        member_id: memberId,
        type: "terms",
        granted: true,
        channel: "webshop",
        source: `commerce:${link.integration_id}`,
      });
    }
  }
  if (!memberId) return { ok: false, fejl: "Kortet kunne ikke oprettes. Prøv igen." };

  const { data: bekraeftet } = await db
    .from("commerce_customer_links")
    .update({
      status: "verified",
      member_id: memberId,
      link_method: "verified_email",
      verified_at: new Date().toISOString(),
      verification_token_hash: null,
      verification_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id)
    .eq("status", "pending")
    .select("id");
  if (!bekraeftet?.length) {
    return { ok: false, fejl: "Linket er allerede brugt. Bed om et nyt fra webshoppen." };
  }

  const { ordrer } = await goerKrav(link.company_id, memberId, link.email_norm, db);
  return { ok: true, butik, ordrer };
}
