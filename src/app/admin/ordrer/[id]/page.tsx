import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusSelect } from "../order-status";
import { getProduct, harFysiskSkilt } from "@/lib/constants";
import { designFrontfarve } from "@/lib/design";
import { SKILT_BREDDE, SKILT_HOEJDE } from "@/lib/skilt-format";
import { STANDARD_ACCENT, STANDER_FARVER } from "@/lib/stander-tilvalg";

/**
 * Adressen på trykfilen for et design.
 *
 * Bygger den samme adresse, som bestillingens preview bruger, så filen her
 * ikke kan vise noget andet end det, kunden godkendte. Logoet sendes med:
 * ruten henter det og bager det ind, så SVG'en er selvbærende og kan åbnes i
 * et trykprogram uden at afhænge af, at vores lager svarer.
 */
function skiltAdresse(
  d: {
    stander_farve: string;
    front_type: string;
    front_hex: string | null;
    accent_hex: string | null;
    logo_url: string | null;
  },
  standSlug?: string | null,
): string {
  const q = new URLSearchParams({
    farve: STANDER_FARVER.some((f) => f.vaerdi === d.stander_farve)
      ? d.stander_farve
      : "sort",
    accent: d.accent_hex ?? STANDARD_ACCENT,
  });
  if (d.front_type === "egen" && d.front_hex) q.set("bg", d.front_hex);
  if (d.logo_url) q.set("logo", d.logo_url);
  /*
   * KUN NÅR ORDREN VED HVILKEN STANDER DET ER. Uden slug bliver
   * pladsholderen stående, og admin skal spørge kunden — præcis som med
   * destinationen på ældre ordrer. Et skilt med en FORKERT QR er værre end
   * et med en tom: den forkerte bliver trykt og opdaget af en kunde, der
   * står og scanner.
   */
  if (standSlug) q.set("stand", standSlug);
  return `/api/skilt?${q.toString()}`;
}
import { standerFarveNavn } from "@/lib/stander-tilvalg";
import { SkiltPreview } from "@/components/skilt-preview";
import { qrAdresseFor, type StandDestination } from "@/lib/qr-adresse";
import { Leveringsadresse } from "@/components/leveringsadresse";
import { modtagerNavn } from "@/lib/adresse";
import { visCvr } from "@/lib/cvr";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

export const metadata = { title: "Admin — Ordre" };

/**
 * ALT DER SKAL BRUGES FOR AT LAVE OG SENDE SKILTET, på én side.
 *
 * Listen viste hvad der var solgt; den viste ikke hvad der skulle TRYKKES.
 * Farven, logoet og adressen lå henholdsvis i en anden tabel, i lageret og
 * hos Stripe, så den, der skulle pakke ordren, måtte lede tre steder — eller
 * i sin indbakke.
 *
 * SIDEN ER SKREVET TIL DEN, DER STÅR MED OPGAVEN. Derfor står trykvalgene
 * øverst og betalingsdetaljerne nederst: beløbet kan slås op, men "hvilken
 * farve" kan ikke gættes.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `*, company:companies(name, cvr, contact_email, phone, kontaktperson), design:designs(*),
         stand:stands(id, name, slug, kun_viderestilling, destination_type,
                      google_review_url, trustpilot_url, facebook_url, custom_url)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const o = order as Database["public"]["Tables"]["orders"]["Row"] & {
    company: {
      name: string;
      cvr: string | null;
      contact_email: string | null;
      phone: string | null;
      kontaktperson: string | null;
    } | null;
    design: Database["public"]["Tables"]["designs"]["Row"] | null;
    stand:
      | (StandDestination & {
          id: string;
          name: string;
          slug: string;
          kun_viderestilling: boolean;
        })
      | null;
  };
  const firma = o.company;
  const design = o.design;
  const stand = o.stand;
  const front = design ? designFrontfarve(design) : null;
  /*
   * HVAD DER FAKTISK KOMMER TIL AT STÅ I KODEN — ikke hvad man skulle tro.
   * Siden skrev før `/r/<slug>` for hver eneste ordre. Uden abonnement peger
   * koden DIREKTE på butikkens eget link (se `qrAdresseFor`), så admin læste
   * en adresse, der ikke blev trykt, og som for et engangskøb slet ikke
   * findes hos os. Nu spørges den samme funktion, som tegner filen.
   */
  const qrAdresse = stand ? qrAdresseFor(stand) : null;
  /*
   * DIGITAL ELLER FYSISK afgøres af VAREN og ikke af, om der er et design.
   * Et manglende design kan også være en fysisk ordre, hvor kunden aldrig
   * nåede at vælge farver — og de to skal ikke ligne hinanden i admin.
   */
  const vare = getProduct(o.product_slug ?? "");
  const erDigital = vare ? !harFysiskSkilt(vare) : false;
  const adresse = o.leveringsadresse as Record<string, string | null> | null;

  return (
    <>
      <PageHeader
        title={`${o.product_name} × ${o.quantity}`}
        description={`Bestilt ${formatDate(o.created_at)}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrderStatusSelect orderId={o.id} status={o.status} />
        {o.uden_konto ? <Badge tone="neutral">Uden konto</Badge> : null}
        {/*
          DER SKAL IKKE PAKKES NOGET. Mærket står ved siden af statussen, fordi
          det er dét, der afgør, om ordren overhovedet skal gennem
          produktionen — og fordi en digital ordre ellers ligner en fysisk, der
          mangler både design og adresse.
        */}
        <Badge tone={erDigital ? "accent" : "neutral"}>
          {erDigital ? "Digital levering" : "Fysisk levering"}
        </Badge>
      </div>

      {erDigital ? (
        <p className="box-shape mb-6 border border-accent/25 bg-card p-4 text-sm shadow-[var(--hoejde-1)]">
          <strong>Digital vare.</strong> Der skal hverken trykkes, pakkes eller
          sendes noget. Kunden har fået adgang til platformen og bruger sit
          eget LoyalSum-link og sin QR-kode fra dashboardet.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------------------------------------- hvad der trykkes */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-bold tracking-tight">Sådan skal den trykkes</h2>

            {/* HVILKEN QR-KODE. Designet siger, hvordan skiltet ser ud;
                standeren siger, hvad der skal stå på det. Har butikken to
                standere, måtte produktionen før gætte eller spørge — og en
                forkert QR opdages først, når skiltet står hos kunden.
                `stand_id` kom med migration 0022; ældre ordrer har den ikke. */}
            <div className="box-shape border border-border bg-muted-bg/50 p-3">
              <p className="etiket">QR-adresse der skal trykkes</p>
              {qrAdresse ? (
                <>
                  <p className="mt-1 break-all font-mono text-sm font-medium">
                    {qrAdresse}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Standeren hedder “{stand!.name}” hos kunden.{" "}
                    {stand!.kun_viderestilling
                      ? "Uden abonnement: koden peger direkte på butikkens eget link og kan ikke ændres efter tryk."
                      : "Med abonnement: koden peger på vores side, så linket kan ændres uden nyt tryk."}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  {stand
                    ? "Standeren har ingen destination udfyldt."
                    : "Ordren peger ikke på en stander."}{" "}
                  Find den under virksomheden, eller{" "}
                  <strong>spørg kunden</strong>, hvor skiltet skal føre hen.
                  Indtil da bliver skabelonens pladsholder stående i QR-feltet.
                </p>
              )}
            </div>

            {design && front ? (
              <>
                <div className="flex items-start gap-4">
                  {/*
                    SELVE SKILTET, tegnet af den samme rute som trykfilen.
                    Her stod før en firkant i frontfarven med logoet lagt
                    ovenpå — en hjemmelavet efterligning, der ikke fulgte med,
                    da designet blev lavet om. Den viste altså en stander, vi
                    ikke trykker mere.

                    `standSlug` sendes med, så QR-koden er den RIGTIGE: admin
                    skal kunne se, at koden er der, uden at åbne filen.
                  */}
                  <SkiltPreview
                    standerFarve={
                      design.stander_farve === "hvid" ? "hvid" : "sort"
                    }
                    baggrund={front.egen ? front.hex : null}
                    accent={design.accent_hex}
                    logoUrl={design.logo_url}
                    standSlug={stand?.slug}
                    className="w-24 shrink-0"
                  />

                  <dl className="space-y-1.5 text-sm">
                    <div>
                      <dt className="text-muted">Stander</dt>
                      <dd className="font-medium">
                        {standerFarveNavn(design.stander_farve)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Front</dt>
                      <dd className="font-medium">
                        {front.egen ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="inline-block h-4 w-4 rounded-sm border border-border align-middle"
                              style={{ background: front.hex }}
                            />
                            <code>{front.hex}</code>
                          </span>
                        ) : (
                          front.beskrivelse
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Skabelon</dt>
                      <dd className="font-medium">{design.print_skabelon}</dd>
                    </div>
                  </dl>
                </div>

                {/* TRYKFILEN, med kundens valg, logo OG QR-kode bagt ind.
                    Samme funktion som previewet i bestillingen, så det, der
                    hentes her, er dét kunden godkendte. QR-koden tegnes med,
                    når ordren ved hvilken stander det er — se skiltAdresse(). */}
                <div className="border-t border-border pt-3 text-sm">
                  <p className="font-medium">Trykfil</p>
                  <p className="mt-1 text-muted">
                    SVG i {SKILT_BREDDE}×{SKILT_HOEJDE} enheder — hele arket,
                    også de nederste centimeter, der sidder i foden.{" "}
                    {qrAdresse
                      ? "QR-koden er tegnet i filen."
                      : "QR-feltet står med pladsholderen, indtil adressen er kendt."}
                  </p>
                  <a
                    href={skiltAdresse(design, o.stand?.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-medium text-accent hover:underline"
                  >
                    Åbn trykfilen →
                  </a>
                </div>

                {design.logo_url ? (
                  <div className="border-t border-border pt-3 text-sm">
                    <p className="font-medium">Logofilen</p>
                    <p className="mt-1 text-muted">
                      {design.logo_filnavn ?? "uden navn"}
                      {design.logo_bredde
                        ? ` · ${design.logo_bredde}×${design.logo_hoejde} px`
                        : ""}
                      {design.logo_bytes
                        ? ` · ${Math.round(Number(design.logo_bytes) / 1024)} kB`
                        : ""}
                    </p>
                    <p className="mt-1">
                      {design.logo_transparent === true ? (
                        <span className="text-accent">
                          Transparent baggrund
                        </span>
                      ) : design.logo_transparent === false ? (
                        <span className="text-secondary-fg">
                          Fast baggrund — kontrollér før tryk
                        </span>
                      ) : (
                        <span className="text-muted">
                          Baggrund ukendt (ikke en PNG)
                        </span>
                      )}
                    </p>
                    <a
                      href={design.logo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-medium text-accent hover:underline"
                    >
                      Hent originalfilen →
                    </a>
                  </div>
                ) : null}
              </>
            ) : (
              /* TEKSTEN MÅ IKKE PÅSTÅ EN ÅRSAG, DEN IKKE KENDER. Der stod
                 før kun "den er lagt, før designs blev gemt", og det var
                 forkert på en ordre fra 31. august: designet var ryddet af
                 den natlige oprydning, mens ordren endnu stod som ubetalt
                 (se migration 0037). Admin læste en forklaring, der sagde
                 "gammel ordre, ikke noget at gøre ved", om et BETALT køb,
                 hvor kunden skulle have været ringet op. En betalt ordre
                 uden trykvalg er altid noget, der kræver en handling. */
              <p className="text-sm text-muted">
                {o.status === "new"
                  ? "Ingen trykvalg. Ordren er ikke betalt, og kladden med logo og farve ryddes igen efter en uge."
                  : "Ingen trykvalg på denne ordre — enten er den lagt før 21. august, hvor designs blev gemt, eller også er kladden ryddet, før betalingen nåede at blive registreret. Logofilen kan ikke hentes frem igen; kontakt kunden for logo og farve."}
              </p>
            )}
          </CardBody>
        </Card>

        {/* ---------------------------------------------------- hvor den sendes */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-bold tracking-tight">Hvor den skal sendes</h2>

            {/* ORDRENS EGET NAVN VINDER. Det er dét, kunden bekræftede ved
                betalingen; profilens kontaktperson kan være ændret siden, og
                pakkelabelen skal vise det godkendte. Ordrer fra før 0030 har
                intet navn og falder tilbage på firmaet. */}
            {adresse ? (
              <Leveringsadresse
                navn={
                  o.leveringsnavn ??
                  modtagerNavn(firma?.name ?? "", firma?.kontaktperson)
                }
                adresse={adresse}
              />
            ) : (
              /* EN UBETALT ORDRE HAR INGEN. Stripe indsamler først adressen i
                 betalingsvinduet, så en ordre, kunden gik fra, kan ikke have
                 en — og det er ikke en fejl, der skal jages. Teksten sagde før
                 kun noget om gamle ordrer og fik en tom ny til at ligne et
                 hul i systemet. */
              <p className="text-sm text-muted">
                {o.status === "new"
                  ? "Ingen adresse endnu — ordren er ikke betalt, og Stripe spørger først om den i betalingsvinduet."
                  : "Ingen leveringsadresse gemt. Adressen skrives af webhooken, når betalingen går igennem — er status sat i hånden, eller er ordren fra før 21. august, findes den kun hos Stripe. Slå den op på betalingen nedenfor."}
              </p>
            )}

            <div className="border-t border-border pt-3">
              <h3 className="text-sm font-medium">Kunden</h3>
              <dl className="mt-1 space-y-1 text-sm text-muted">
                <div>{firma?.name ?? "—"}</div>
                {firma?.cvr ? <div>{visCvr(firma.cvr)}</div> : null}
                <div>{o.kontakt_email ?? firma?.contact_email ?? "—"}</div>
                {firma?.phone ? <div>{firma.phone}</div> : null}
              </dl>
            </div>
          </CardBody>
        </Card>

        {/* ------------------------------------------------------------ betaling */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="font-bold tracking-tight">Betaling</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Standere</dt>
                <dd className="font-medium">
                  {formatCurrency(
                    Number(o.total_amount) - Number(o.frontfarve_beloeb ?? 0),
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Egen frontfarve</dt>
                <dd className="font-medium">
                  {Number(o.frontfarve_beloeb) > 0
                    ? formatCurrency(Number(o.frontfarve_beloeb))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">I alt ex moms</dt>
                <dd className="font-medium">
                  {formatCurrency(Number(o.total_amount))}
                </dd>
              </div>
            </dl>

            {/* Et Stripe-id er langt nok til at skubbe siden sideværts på en
                telefon. `break-all` holder det inde i kortet. */}
            {o.stripe_session_id ? (
              <p className="mt-4 break-all border-t border-border pt-3 text-xs text-muted">
                Stripe: <code>{o.stripe_session_id}</code>
                {o.stripe_payment_intent ? (
                  <>
                    {" · "}
                    <code>{o.stripe_payment_intent}</code>
                  </>
                ) : null}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <p className="mt-6">
        <Link
          href="/admin/ordrer"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Alle ordrer
        </Link>
      </p>
    </>
  );
}
