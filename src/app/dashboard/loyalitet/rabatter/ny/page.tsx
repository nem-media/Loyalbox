import Link from "next/link";
import { PageHeader } from "@/components/dashboard-shell";
import { DiscountForm } from "./discount-form";

export const metadata = { title: "Ny rabat" };

export default function NewDiscountPage() {
  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/loyalitet/rabatter" className="text-sm text-accent">
          ← Alle rabatter
        </Link>
      </div>
      <PageHeader title="Opret rabat" description="En rabat du kan give til kunder." />
      <DiscountForm />
    </>
  );
}
