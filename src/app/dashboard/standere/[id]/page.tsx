import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { qrDataUrl } from "@/lib/qr";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { CopyButton } from "@/components/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { tierCan, type Tier } from "@/lib/constants";
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
                download={`reviewstand-${stand.slug}.png`}
                className="text-center text-xs text-accent"
              >
                Download QR (PNG)
              </a>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
