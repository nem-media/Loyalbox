"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import { sendKundeMail } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import {
  BEKRAEFT_STI,
  bekraeftetMail,
  bestiltMail,
  navnPasser,
  nytToken,
  tokenPasser,
  udfoeresDen,
} from "@/lib/sletning";
import type { FormResult } from "@/app/dashboard/actions";

/**
 * Bestil sletning af alt.
 *
 * Her sættes kun bestillingen i gang. Selve datoen sættes først, når linket i
 * mailen bliver klikket — se BEKRAEFT_STI. Rækkefølgen er med vilje: uden
 * bekræftelsen findes der ingen dato, og så sletter oprydningen ingenting.
 *
 * Skrivningen sker med admin-klienten, fordi felterne ikke må kunne sættes af
 * en almindelig bruger gennem RLS. Ejerskabet er allerede afgjort ovenfor:
 * `getCurrentUser()` giver kun den virksomhed, brugeren selv ejer.
 */
export async function bestilSletning(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) return { error: "Ingen virksomhed fundet." };

  // Spærre 2: navnet skal skrives præcist. Et fejlklik skriver ikke.
  const skrevet = String(formData.get("firmanavn") ?? "");
  if (!navnPasser(skrevet, company.name)) {
    return {
      error: `Navnet passer ikke. Skriv virksomhedens navn præcis som det står: ${company.name}`,
    };
  }

  const modtager = company.contact_email ?? user!.email;
  if (!modtager) {
    return {
      error:
        "Der er ingen mailadresse på virksomheden, og bekræftelsen kan ikke sendes. Skriv til os, så klarer vi det.",
    };
  }

  const token = nytToken();
  const admin = createAdminClient();

  const { error } = await admin
    .from("companies")
    .update({
      sletning_bestilt_den: new Date().toISOString(),
      sletning_token: token,
      // Datoen sættes FØRST ved bekræftelsen. Stod den her, ville en
      // bestilling alene være nok til at slette.
      sletning_udfoeres_den: null,
    })
    .eq("id", company.id);

  if (error) {
    await noterFejl(
      "sletning",
      `Bestilling for virksomhed ${company.id} kunne ikke gemmes: ${error.message}`,
    );
    return { error: "Bestillingen kunne ikke gemmes. Prøv igen." };
  }

  const link = `${getSiteUrl()}${BEKRAEFT_STI}?token=${token}`;
  const mail = bestiltMail(company.name, link);
  const sendt = await sendKundeMail(modtager, mail.emne, mail.tekst);

  if (!sendt) {
    // Bestillingen ryddes igen. En halvfærdig sletning, kunden ikke kan
    // bekræfte OG ikke kan se, er værre end ingen bestilling: den ville ligge
    // og se ud som om noget var i gang.
    await admin
      .from("companies")
      .update({ sletning_bestilt_den: null, sletning_token: null })
      .eq("id", company.id);

    await noterFejl(
      "sletning",
      `Bekræftelsesmail til virksomhed ${company.id} kunne ikke sendes`,
    );
    return {
      error:
        "Bekræftelsen kunne ikke sendes til din mail. Prøv igen om lidt, eller skriv til os.",
    };
  }

  revalidatePath("/dashboard/abonnement/slet");
  return {
    ok: true,
    message: `Vi har sendt en bekræftelse til ${modtager}. Klik linket i mailen for at gå videre — der sker ingenting, før du gør.`,
  };
}

/**
 * Bekræft sletningen — spærre 3, og den der sætter datoen.
 *
 * HVORFOR DET KRÆVER ET KLIK PÅ EN KNAP OG IKKE BARE ET LINK: mailfiltre og
 * sikkerhedsscannere åbner links i indgående post for at tjekke dem. Et link,
 * der skrev i databasen bare ved at blive hentet, ville kunne udløses af en
 * scanner, ingen mennesker havde bedt om noget. Linket fører derfor til en
 * side, og siden har en knap.
 *
 * Tokenet sammenlignes i konstant tid og skal tilhøre den virksomhed, der er
 * logget ind. De to ting er uafhængige: hverken et lækket token eller en
 * glemt session rækker alene.
 */
export async function bekraeftSletning(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) return { error: "Ingen virksomhed fundet." };

  const token = String(formData.get("token") ?? "");
  if (!tokenPasser(token, company.sletning_token)) {
    return {
      error:
        "Linket passer ikke længere. Det sker, hvis sletningen er annulleret, eller hvis der er bestilt en ny. Start forfra herunder.",
    };
  }

  const udfoeres = udfoeresDen();
  const admin = createAdminClient();

  const { error } = await admin
    .from("companies")
    .update({
      sletning_udfoeres_den: udfoeres.toISOString(),
      // Tokenet er brugt og må ikke kunne bruges igen.
      sletning_token: null,
    })
    .eq("id", company.id);

  if (error) {
    await noterFejl(
      "sletning",
      `Bekræftelse for virksomhed ${company.id} kunne ikke gemmes: ${error.message}`,
    );
    return { error: "Bekræftelsen kunne ikke gemmes. Prøv igen." };
  }

  const modtager = company.contact_email ?? user!.email;
  if (modtager) {
    const mail = bekraeftetMail(
      company.name,
      udfoeres,
      `${getSiteUrl()}/dashboard/abonnement/slet`,
    );
    // Fejler mailen, står sletningen stadig — den er bekræftet. Kunden ser
    // datoen i panelet, og fejlen skal ses af os frem for at rulle en
    // beslutning tilbage, brugeren lige har truffet.
    const sendt = await sendKundeMail(modtager, mail.emne, mail.tekst);
    if (!sendt) {
      await noterFejl(
        "sletning",
        `Kvittering for bekræftet sletning (virksomhed ${company.id}) kunne ikke sendes`,
      );
    }
  }

  revalidatePath("/dashboard/abonnement/slet");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Annullér en bestilt eller bekræftet sletning.
 *
 * Virker i BEGGE tilstande og hele vejen frem til fristen udløber. Der er
 * ingen spærrer på at fortryde: en fejlagtig annullering koster et par klik,
 * en fejlagtig sletning koster butikkens kundeklub.
 */
export async function annullerSletning(): Promise<FormResult> {
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) return { error: "Ingen virksomhed fundet." };

  const { error } = await createAdminClient()
    .from("companies")
    .update({
      sletning_bestilt_den: null,
      sletning_token: null,
      sletning_udfoeres_den: null,
    })
    .eq("id", company.id);

  if (error) return { error: "Kunne ikke annulleres. Prøv igen." };

  revalidatePath("/dashboard/abonnement/slet");
  revalidatePath("/dashboard");
  return { ok: true, message: "Sletningen er annulleret. Alt bliver, hvor det er." };
}
