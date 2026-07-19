import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { ProgramWizard } from "../program-wizard";

export const metadata = { title: "Nyt stempelkort" };

export default async function NewProgramPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader
        title="Opret stempelkort"
        description="Følg de seks trin. Du kan altid ændre det bagefter."
      />
      <ProgramWizard companyName={user?.company?.name ?? null} />
    </>
  );
}
