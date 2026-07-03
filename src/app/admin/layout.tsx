import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Oversigt" },
  { href: "/admin/virksomheder", label: "Virksomheder" },
  { href: "/admin/ordrer", label: "Ordrer" },
  { href: "/admin/feedback", label: "Feedback" },
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
    <DashboardShell nav={NAV} email={user.email} roleLabel="Admin">
      {children}
    </DashboardShell>
  );
}
