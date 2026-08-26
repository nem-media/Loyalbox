import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Virksomhedsprofil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const company = user!.company;

  return (
    <>
      <PageHeader
        title="Virksomhedsprofil"
        description="Navn og logo møder dine kunder. Resten bruger vi til ordrer og faktura."
      />
      {company ? (
        <ProfileForm company={company} />
      ) : (
        <Card>
          <CardBody className="text-center text-muted">
            Ingen virksomhed fundet.
          </CardBody>
        </Card>
      )}
    </>
  );
}
