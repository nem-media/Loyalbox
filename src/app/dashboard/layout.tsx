import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

  const plan = (user.company?.plan ?? "basic") as Tier;

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Oversigt" },
    { href: "/dashboard/standere", label: "Standere" },
    { href: "/dashboard/loyalitet", label: "Stempelkort" },
    ...(tierCan(plan, "feedbackInbox")
      ? [{ href: "/dashboard/feedback", label: "Feedback" }]
      : []),
    { href: "/dashboard/profil", label: "Virksomhedsprofil" },
    { href: "/dashboard/abonnement", label: "Abonnement" },
  ];

  return (
    <DashboardShell nav={nav} email={user.email} roleLabel={TIER_LABELS[plan]}>
      {children}
    </DashboardShell>
  );
}
