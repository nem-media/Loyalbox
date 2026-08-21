import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { GenoptagKnap } from "@/components/genoptag-knap";
import { COMPANY } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  abonnementTilstand,
  betalingManglerBroedtekst,
  dageTil,
  genoptagVej,
  sletningSker,
  BETALING_MANGLER_OVERSKRIFT,
  type AbonnementFelter,
} from "@/lib/abonnement";

interface Props extends AbonnementFelter {
  id: string;
  product_slug: string | null;
}

/**
 * Beskeden om manglende betaling — vist øverst i HELE dashboardet.
 *
 * HVORFOR ØVERST OG IKKE PÅ ABONNEMENTSSIDEN: en butiksejer, hvis kort er
 * udløbet, går ikke ind under Abonnement. De går ind på Oversigt, undrer sig
 * over at statistikken er væk, og tror at der er noget i stykker. Beskeden
 * skal møde dem dér, hvor de opdager det.
 *
 * DEN SIGER TRE TING, I DEN RÆKKEFØLGE: hvad der er sket, hvad der IKKE er
 * sket (kunderne og stemplerne er urørte), og hvad der skal til. Den
 * rækkefølge er ikke tilfældig — den midterste er den, der fjerner panikken.
 */
export async function BetalingMangler(firma: Props) {
  const tilstand = abonnementTilstand(firma);
  if (tilstand === "aktiv") return null;

  const dage = dageTil(sletningSker(firma));
  const vej = genoptagVej(firma);
  const ubesvarede = await ubesvaredeSiden(firma.id, firma.suspenderet_siden);
  const ophoert = tilstand === "ophoert";

  return (
    <div
      role="status"
      className={`box-shape mb-6 border p-5 ${
        ophoert
          ? "border-danger/40 bg-danger/5"
          : "border-secondary/50 bg-secondary/10"
      }`}
    >
      <p className="text-base font-semibold">
        {ophoert ? "Din aftale er ophørt" : BETALING_MANGLER_OVERSKRIFT}
      </p>

      <p className="mt-1.5 text-sm leading-relaxed">
        {ophoert
          ? "De seks måneder er gået, og aftalen er ophørt. Dine data slettes " +
            "endeligt, når fristen udløber — indtil da kan alt komme tilbage, " +
            "hvis du genoptager abonnementet."
          : betalingManglerBroedtekst(dage)}
      </p>

      {/* Det, der IKKE er sket. Står som sin egen linje, fordi det er den
          eneste sætning, der beroliger — og den drukner i et afsnit. */}
      {!ophoert ? (
        <p className="mt-3 text-sm text-muted">
          Dine kunder mærker ingenting: de kan stadig få stempler, personalet
          kan stadig give og indløse dem, og standeren sender som altid.
        </p>
      ) : null}

      {ubesvarede > 0 ? (
        <p className="mt-3 text-sm">
          <strong>
            {ubesvarede === 1
              ? "Én kunde har skrevet til dig"
              : `${ubesvarede} kunder har skrevet til dig`}
            , siden betalingen stoppede.
          </strong>{" "}
          Beskederne ligger og venter i din feedback-indbakke.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {vej ? <GenoptagKnap vej={vej} slug={firma.product_slug} /> : null}
        <Link
          href="/dashboard/abonnement"
          className="text-sm font-medium text-accent hover:underline"
        >
          Se hvad der sker med dine data
        </Link>
      </div>

      {dage !== null ? (
        <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">
          Sletning sker {formatDate(sletningSker(firma)!.toISOString())} — om{" "}
          {dage} {dage === 1 ? "dag" : "dage"}. Skal det gå hurtigere eller
          langsommere, så skriv til {COMPANY.email}.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Hvor mange kunder har skrevet, siden indbakken lukkede?
 *
 * Der findes ikke et "læst"-flag på feedback, og der skal ikke opfindes et til
 * lejligheden. Til gengæld er "kommet ind efter at adgangen lukkede" præcis
 * lige så sandt — og det er det tal, der betyder noget: beskeder butikken ikke
 * har kunnet se.
 *
 * Kun dem med en kommentar tælles. En bedømmelse uden ord er ikke nogen, der
 * venter på svar, og et pustet tal ville være en salgstrick frem for en
 * oplysning.
 */
async function ubesvaredeSiden(
  companyId: string,
  siden: string | null,
): Promise<number> {
  if (!siden) return 0;

  const { count, error } = await createAdminClient()
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", siden)
    .not("comment", "is", null);

  // Tallet er en tilføjelse, ikke selve beskeden. Fejler opslaget, vises
  // beskeden uden det frem for at vælte hele dashboardet.
  if (error) return 0;
  return count ?? 0;
}
