import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo image="dark" />
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">404</h1>
        <p className="mt-2 text-muted">Siden findes ikke.</p>
      </div>
      <ButtonLink href="/">Til forsiden</ButtonLink>
    </div>
  );
}
