import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyAccess } from "@/lib/loyalty/access";
import {
  DashboardShell,
  type NavItem,
  type NavSection,
} from "@/components/dashboard-shell";
import {
  TIER_LABELS,
  tierCan,
  hasLoyaltyAccess,
  type Tier,
} from "@/lib/constants";
import { abonnementTilstand } from "@/lib/abonnement";
import { BetalingMangler } from "@/components/betaling-mangler";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "admin") redirect("/admin");

  // Dashboardet er ejer-only. Alle andre uden virksomhed skal videre — ellers
  // lander de på "Du har endnu ingen virksomhed. Kontakt support", som er en
  // blindgyde for både personale og slutkunder.
  if (!user.company) {
    const access = await getCompanyAccess();

    // Medarbejder: har adgang via en employees-række, men intet dashboard.
    // Personalesiden er deres arbejdsflade.
    if (access) redirect("/personale");

    // Slutkunde: hører hjemme ved sine stempelkort. Har de ingen endnu, er
    // /mine-kort stadig det rigtige sted — siden forklarer selv, hvordan man
    // får sit første kort, i stedet for at bede folk kontakte supporten.
    redirect("/mine-kort");
  }

  const plan = (user.company?.plan ?? "basic") as Tier;

  /**
   * Under en suspension lukkes dashboardets stempelkort-afsnit sammen med
   * resten af indsigten. Bemærk at det KUN er panelet: kortene selv, personalets
   * scanning og kundernes stempler kører videre — se src/lib/abonnement.ts.
   *
   * Adgangen hænger på tilstanden og ikke på `product_slug`, som bevidst bliver
   * stående. Slug'en er kvitteringen for, hvad kunden købte, og uden den kan et
   * abonnement ikke genoptages.
   */
  const harStempelkort =
    hasLoyaltyAccess(user.company?.product_slug) &&
    abonnementTilstand(user.company) === "aktiv";

  /**
   * Menuen er delt i to, fordi punkterne bruges vidt forskelligt: Standere og
   * Stempelkort røres hver uge, Abonnement to gange om året. Stod de i én
   * flad liste, skulle øjet lede efter det daglige hver gang.
   */
  const sections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Oversigt", icon: "overview" },
        { href: "/dashboard/standere", label: "Standere", icon: "stand" },
        {
          href: "/dashboard/loyalitet",
          label: "Stempelkort",
          icon: "stampcard",
        },
        { href: "/dashboard/opslag", label: "Opslag", icon: "post" },
        ...(tierCan(plan, "feedbackInbox")
          ? ([
              {
                href: "/dashboard/feedback",
                label: "Feedback",
                icon: "feedback",
              },
            ] satisfies NavItem[])
          : []),
      ],
    },
    {
      title: "Indstillinger",
      items: [
        { href: "/dashboard/personale", label: "Personale", icon: "staff" },
        {
          href: "/dashboard/profil",
          label: "Virksomhedsprofil",
          icon: "store",
        },
        {
          href: "/dashboard/abonnement",
          label: "Abonnement",
          icon: "billing",
        },
        { href: "/dashboard/hjaelp", label: "Hjælp", icon: "help" },
      ],
    },
  ];

  return (
    <DashboardShell
      sections={sections}
      email={user.email}
      roleLabel={TIER_LABELS[plan]}
      companyName={user.company?.name}
      // Genvejen vises kun, hvis der ER kunder at finde. Ellers ville den
      // føre til en side, virksomheden ikke har adgang til.
      quickAction={
        harStempelkort
          ? { href: "/dashboard/loyalitet/kunder", label: "Find kunde" }
          : undefined
      }
    >
      {/* Beskeden om manglende betaling står øverst i HELE panelet, ikke kun
          under Abonnement — se komponentens egen kommentar for hvorfor. */}
      <BetalingMangler {...user.company} />
      {children}
    </DashboardShell>
  );
}
