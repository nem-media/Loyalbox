import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { designFrontfarve } from "@/lib/design";
import { DesignPreview } from "@/components/design-preview";
import { EGEN_FRONTFARVE_PRIS, standerFarveNavn } from "@/lib/stander-tilvalg";
import { formatDate } from "@/lib/utils";
import { EKSTRA_STANDER_SLUG } from "@/components/bestil-stander";

/**
 * Butikkens gemte designs.
 *
 * ET DESIGN ER IKKE EN STANDER. Standeren er QR-adressen og siden bag den;
 * designet er de trykvalg, der er lavet én gang — farve, front og logo. Samme
 * design kan trykkes på flere standere.
 *
 * LISTEN FINDES FOR GENBESTILLINGEN. Har butikken betalt for en egen
 * frontfarve, skal de kunne bestille flere uden at betale for opsætningen
 * igen, og uden at skulle finde logoet og farvekoden frem en gang til.
 *
 * HVORFOR HER OG IKKE PÅ EN EGEN SIDE: designet giver kun mening sammen med
 * standeren, det trykkes på. Som selvstændigt menupunkt stod det ved siden af
 * "Standere" med SAMME IKON — menuen sagde altså selv, at de hørte sammen, og
 * tvang alligevel kunden til at vælge mellem to punkter for én ting.
 */
export async function DesignListe({ companyId }: { companyId: string }) {
  const admin = createAdminClient();
  const [{ data: designs }, { data: adresser }] = await Promise.all([
    admin
      .from("designs")
      .select(
        "id, navn, stander_farve, front_type, front_hex, accent_hex, logo_url, frontfarve_betalt, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    /*
     * HVOR MANGE QR-ADRESSER HAR BUTIKKEN?
     *
     * "Bestil flere af denne" sender til /bestil UDEN en `?stand=`, og
     * `enesteAdresseFor()` gætter så adressen — men kun når der er præcis
     * ÉN. Har butikken to, får ordren ingen stander, og produktionen må
     * ringe og spørge, hvilken kode der skal trykkes. Det var harmløst,
     * dengang én adresse var alt, man kunne have; efter at en butik mere kan
     * KØBES (se `adresseSpaerre()`), er det en fælde, der venter på den
     * første kæde.
     *
     * To rækker er nok til at kende forskel på "én" og "flere".
     */
    admin.from("stands").select("id, name").eq("company_id", companyId).limit(2),
  ]);

  // `>= 2` og ikke `!== 1`: uden adresser er der heller ikke noget at vælge
  // imellem, og så skal linket opføre sig som før.
  const flereAdresser = (adresser ?? []).length >= 2;

  // Uden design er beskeden ren oplysning — derfor et roligt kort og ikke en
  // fuld `EmptyState`. Siden har allerede en tom tilstand for standerne, og to
  // store tomme felter under hinanden får en ny konto til at se øde ud.
  if (!designs || designs.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="max-w-2xl text-sm text-muted">
            Dit design bliver gemt automatisk, første gang du bestiller en
            stander med logo og farve. Bagefter kan du bestille flere af det
            uden at vælge forfra — og uden at betale for farven igen.
          </p>
        </CardBody>
      </Card>
    );
  }

  /*
   * `grid-cols-1`: se kommentaren i standere/page.tsx. Designkortet har en
   * truncate-overskrift og en fast forhåndsvisning, og uden et klemt spor kan
   * det ikke skrumpe ned i en telefons bredde.
   */
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {designs.map((d) => {
        const front = designFrontfarve(d);
        return (
          <Card key={d.id}>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-4">
                {/* HELE SKILTET og ikke en farveprøve. To designs i samme
                    farve kunne ikke skelnes fra hinanden, når kun fronten og
                    logoet blev vist — og det er netop dét, listen skal bruges
                    til at gøre. */}
                <DesignPreview design={d} className="w-24 shrink-0" />

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{d.navn}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Stander: {standerFarveNavn(d.stander_farve)}
                    <br />
                    Front: {front.beskrivelse}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Lavet {formatDate(d.created_at)}
                  </p>
                </div>
              </div>

              {front.egen ? (
                <Badge tone={d.frontfarve_betalt ? "success" : "neutral"}>
                  {d.frontfarve_betalt
                    ? "Egen farve — betalt"
                    : `Egen farve — ${EGEN_FRONTFARVE_PRIS} kr. ved første bestilling`}
                </Badge>
              ) : null}

              {/*
                MED FLERE ADRESSER SKAL KUNDEN VÆLGE, HVILKEN KODE DER TRYKKES.
                Linket her bærer ingen `?stand=`, og med to adresser kan
                /bestil ikke gætte — ordren ville få `stand_id: null`, og et
                skilt uden en kode er ingenting. Så hellere sige det og sende
                kunden hen til standeren, hvor bestillingen kender svaret.
              */}
              {flereAdresser ? (
                <p className="text-sm text-muted">
                  Du har flere QR-adresser — åbn den, skiltet skal pege på, og
                  bestil derfra, så trykkes den rigtige kode.
                </p>
              ) : (
                <Link
                  href={`/bestil?produkt=${EKSTRA_STANDER_SLUG}&design=${d.id}`}
                  className="inline-block text-sm font-medium text-accent hover:underline"
                >
                  Bestil flere af denne →
                </Link>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
