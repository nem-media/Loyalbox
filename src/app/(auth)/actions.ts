"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Udfyld e-mail og adgangskode." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // MIDLERTIDIG DEBUG — viser den rigtige Supabase-fejl. Skal fjernes igen.
    return { error: `DEBUG: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect(next || "/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!email || !password || !companyName) {
    return { error: "Udfyld alle felter." };
  }
  if (password.length < 6) {
    return { error: "Adgangskoden skal være mindst 6 tegn." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: "customer" } },
  });

  if (error) {
    return { error: error.message };
  }

  // Create the company immediately so onboarding has something to attach to.
  if (data.user) {
    await supabase.from("companies").insert({
      user_id: data.user.id,
      name: companyName,
      contact_email: email,
    });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
