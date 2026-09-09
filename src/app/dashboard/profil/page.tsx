import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { adresseFraOrdre, harKompletAdresse } from "@/lib/adresse";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Virksomhedsprofil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const company = user!.company;

  /**
   * FORUDFYLD FRA SENESTE ORDRE, når kunden ikke selv har skrevet en adresse.
   *
   * Adressefelterne kom først med migration 0029, så enhver kunde, der har
   * bestilt før, ville møde tre tomme felter og skulle skrive en adresse, vi
   * i forvejen har fået af dem ved betalingen. Det er ikke et gæt: det er
   * netop dén adresse, deres seneste skilt blev sendt til.
   *
   * KUN NÅR PROFILEN ER TOM. Har kunden selv rettet adressen — fx fordi de er
   * flyttet — er deres egen nyere end ordrens, og at overskrive den ville
   * gøre selve pointen med feltet umulig.
   *
   * Service-role: ordren tilhører virksomheden, og vi har allerede bekræftet,
   * at brugeren ejer den. Kun adressefeltet hentes.
   */
  let fraOrdre = null;
  if (company && !harKompletAdresse(company)) {
    const { data } = await createAdminClient()
      .from("orders")
      .select("leveringsadresse")
      .eq("company_id", company.id)
      .not("leveringsadresse", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    fraOrdre = adresseFraOrdre(
      data?.leveringsadresse as Record<string, string | null> | null,
    );
  }

  return (
    <>
      <PageHeader
        title="Virksomhedsprofil"
        description="Navn og logo møder dine kunder. Resten bruger vi til ordrer og faktura."
      />
      {company ? (
        <ProfileForm company={company} adresseFraOrdre={fraOrdre} />
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
