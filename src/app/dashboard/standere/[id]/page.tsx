import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { qrDataUrl } from "@/lib/qr";
import { PageHeader } from "@/components/dashboard-shell";
import { BestilTilStander } from "@/components/bestil-til-stander";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { CopyButton } from "@/components/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { tierCan, hasLoyaltyAccess, type Tier } from "@/lib/constants";
import { EditStand } from "./edit-stand";

export const metadata = { title: "Stander" };

export default async function StandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const company = user!.company;
  if (!company) notFound();

  const supabase = await createClient();
  const { data: stand } = await supabase
    .from("stands")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (!stand) notFound();

  const canDynamicLinks = tierCan(
    (company.plan ?? "basic") as Tier,
    "dynamicLinks",
  );

  /*
   * MANGLER DER ET STEMPELKORT?
   *
   * Knappen "Åbn dit stempelkort" på `/r/<slug>` vises KUN, hvis butikken har
   * et `loyalty_programs` med status `active` — og har de hverken program
   * eller ekstra link, springes hele valgskærmen over, så kunden går direkte
   * i anmeldelsesflowet. En frisk Komplet-kunde har altså betalt for
   * stempelkortet uden at deres kunder kan se det, og INTET siger fra: siden
   * ser rigtig ud, og der er ingen fejl at opdage.
   *
   * SPØRG OM PRODUKTET OG IKKE OM `plan`. Både Reviewstander Pro og LoyalSum
   * Komplet er niveau `pro`; forskellen ER stempelkortet. Spurgte vi planen,
   * ville en Pro-kunde få at vide, at de mangler noget, de ikke har købt.
   */
  const harKomplet = hasLoyaltyAccess(company.product_slug);
  let manglerStempelkort = false;
  if (harKomplet) {
    const { data: program } = await supabase
      .from("loyalty_programs")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    manglerStempelkort = !program;
  }

  const [{ count: scans }, { count: clicks }] = await Promise.all([
    supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("stand_id", stand.id),
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("stand_id", stand.id)
      .eq("is_public_review_clicked", true),
  ]);

  const url = reviewUrl(stand.slug);
  const qr = await qrDataUrl(url);

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/standere" className="text-sm text-accent">
          ← Alle standere
        </Link>
      </div>
      <PageHeader title={stand.name} description={`Slug: /r/${stand.slug}`} />

      {/*
        ØVERST OG IKKE NEDERST. Det er en ting, kunden HAR betalt for og ikke
        får glæde af — ikke et tilbud. Står den under redigeringen, læses den
        som en fodnote, og så er den lige så god som ingenting.

        INGEN ADVARSELSFARVE: der er intet i stykker, og et rødt felt på en
        stander, der virker, ville lære folk at overse dem.
      */}
      {manglerStempelkort ? (
        <div className="box-shape mb-6 border border-accent/30 bg-accent/5 p-5">
          <p className="font-medium">Dit stempelkort er ikke oprettet endnu</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Standeren virker — men dine kunder får kun valget “Del din
            oplevelse”. Knappen til stempelkortet dukker først op, når du har
            oprettet et kort og gjort det aktivt. Det tager et par minutter.
          </p>
          <ButtonLink
            href="/dashboard/loyalitet/programmer"
            size="sm"
            className="mt-3"
          >
            Opret stempelkort
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Scanninger" value={scans ?? 0} />
            <Stat label="Klik til anmeldelse" value={clicks ?? 0} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Links & destination</CardTitle>
            </CardHeader>
            <CardBody>
              <EditStand stand={stand} canDynamicLinks={canDynamicLinks} />
            </CardBody>
          </Card>
        </div>

        {/* QR + link */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>QR / NFC-link</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="box-shape border border-border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR-kode" className="mx-auto h-auto w-full" />
            </div>
            <p className="break-all text-center text-xs text-muted">{url}</p>
            <div className="flex flex-col gap-2">
              <CopyButton value={url} />
              <ButtonLink
                href={url}
                variant="ghost"
                size="sm"
                target="_blank"
                rel="noreferrer"
              >
                Åbn anmeldelsesside
              </ButtonLink>
              <a
                href={qr}
                download={`loyalsum-${stand.slug}.png`}
                className="text-center text-xs text-accent"
              >
                Download QR (PNG)
              </a>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Vejen fra en QR-adresse til det skilt, den skal sidde på.
          `BestilTilStander` og ikke den generelle boks: herfra følger
          standeren med hele vejen til ordren, så skiltet trykkes med DENNE
          QR-kode og ikke bare "en" af butikkens. */}
      <BestilTilStander
        standId={stand.id}
        standNavn={stand.name}
        className="mt-6"
      />
    </>
  );
}
