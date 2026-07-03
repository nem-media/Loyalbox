import { Logo } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-12">
      <Logo image="light" className="mb-8" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
