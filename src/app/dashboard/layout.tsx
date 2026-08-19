import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { TIER_LABELS, tierCan, type Tier } from "@/lib/constants";

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

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Oversigt" },
    { href: "/dashboard/standere", label: "Standere" },
    { href: "/dashboard/loyalitet", label: "Stempelkort" },
    { href: "/dashboard/opslag", label: "Opslag" },
    ...(tierCan(plan, "feedbackInbox")
      ? [{ href: "/dashboard/feedback", label: "Feedback" }]
      : []),
    { href: "/dashboard/personale", label: "Personale" },
    { href: "/dashboard/profil", label: "Virksomhedsprofil" },
    { href: "/dashboard/abonnement", label: "Abonnement" },
    { href: "/dashboard/hjaelp", label: "Hjælp" },
  ];

  return (
    <DashboardShell nav={nav} email={user.email} roleLabel={TIER_LABELS[plan]}>
      {children}
    </DashboardShell>
  );
}
