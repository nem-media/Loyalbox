import { LoyaltySubnav } from "./subnav";

export default function LoyaltyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoyaltySubnav />
      {children}
    </>
  );
}
