import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell, type NavSection } from "@/components/dashboard-shell";

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Oversigt", icon: "overview" },
      { href: "/admin/virksomheder", label: "Virksomheder", icon: "store" },
      {
        href: "/admin/abonnenter",
        label: "Abonnenter",
        icon: "subscription",
      },
      { href: "/admin/ordrer", label: "Ordrer", icon: "billing" },
      { href: "/admin/feedback", label: "Feedback", icon: "feedback" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <DashboardShell sections={SECTIONS} email={user.email} roleLabel="Admin">
      {children}
    </DashboardShell>
  );
}
