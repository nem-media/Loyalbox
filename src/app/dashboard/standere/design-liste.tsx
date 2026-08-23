import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { designFrontfarve } from "@/lib/design";
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
  const { data: designs } = await createAdminClient()
    .from("designs")
    .select(
      "id, navn, stander_farve, front_type, front_hex, logo_url, frontfarve_betalt, created_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  // Uden design er beskeden ren oplysning — derfor et roligt kort og ikke en
  // fuld `EmptyState`. Siden har allerede en tom tilstand for standerne, og to
  // store tomme felter under hinanden får en ny konto til at se øde ud.
  if (!designs || designs.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-muted">
            Dit design bliver gemt automatisk, første gang du bestiller en
            stander med logo og farve. Bagefter kan du bestille flere af det
            uden at vælge forfra — og uden at betale for farven igen.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {designs.map((d) => {
        const front = designFrontfarve(d);
        return (
          <Card key={d.id}>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="box-shape grid h-24 w-20 shrink-0 place-items-center overflow-hidden border border-border p-2"
                  style={{ background: front.hex }}
                >
                  {d.logo_url ? (
                    // Vises præcis som det trykkes — også en hvid baggrund.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.logo_url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-center text-[10px] text-muted">
                      Uden logo
                    </span>
                  )}
                </div>

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

              <Link
                href={`/bestil?produkt=${EKSTRA_STANDER_SLUG}&design=${d.id}`}
                className="inline-block text-sm font-medium text-accent hover:underline"
              >
                Bestil flere af denne →
              </Link>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
