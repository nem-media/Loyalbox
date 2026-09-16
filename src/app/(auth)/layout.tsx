import { Logo } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-12">
      <Logo image="light" className="mb-8" />
      {/* `<main>` og ikke en div: indholdet her ER sidens indhold, og
          springlinket skal have et sted at lande. Alle fem auth-sider
          (login, signup, opret-konto, glemt/nulstil adgangskode) deles om
          dette layout, så det er ét sted for dem alle. */}
      <main id="indhold" className="w-full max-w-sm">
        {children}
      </main>
    </div>
  );
}
