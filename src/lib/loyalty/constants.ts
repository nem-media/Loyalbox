/**
 * LoyalBox Stempelkort — domæne-konstanter.
 * Enum-værdierne matcher migration 0004 præcist. Danske labels holdes ét sted,
 * så UI kan holdes fri for tekniske ord.
 */

export type ProgramStatus = "draft" | "active" | "paused" | "archived";
export type EarnModel =
  | "per_purchase"
  | "per_visit"
  | "per_amount"
  | "manual"
  | "campaign";
export type RewardType =
  | "free_product"
  | "amount_off"
  | "percent_off"
  | "service"
  | "gift"
  | "custom"
  | "none";
export type RewardStatus = "available" | "redeemed" | "expired" | "revoked";
export type TxnType =
  | "stamp_earned"
  | "stamp_manual"
  | "stamp_removed"
  | "bonus_stamp"
  | "adjustment"
  | "reward_earned"
  | "reward_redeemed"
  | "discount_granted"
  | "discount_redeemed"
  | "reversed"
  | "card_reset"
  | "stamp_expired";
export type TxnSource =
  | "staff"
  | "qr"
  | "nfc"
  | "import"
  | "system"
  | "feedback_recovery";
export type DiscountType =
  | "fixed_amount"
  | "percent"
  | "free_product"
  | "bxgy"
  | "special"
  | "birthday"
  | "welcome"
  | "comeback"
  | "compensation"
  | "vip";
export type MembershipStatus = "active" | "paused" | "blocked";
export type DiscountStatus = "draft" | "active" | "paused" | "archived";
export type CustomerDiscountStatus =
  | "available"
  | "redeemed"
  | "expired"
  | "revoked";

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  draft: "Kladde",
  active: "Aktiv",
  paused: "Pauset",
  archived: "Arkiveret",
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Kladde",
  active: "Aktivt",
  paused: "Pauset",
  archived: "Arkiveret",
};

/** Vist i wizardens trin 2 — "Hvordan optjenes stempler?". Enkle forklaringer. */
export const EARN_MODEL_LABELS: Record<EarnModel, string> = {
  per_purchase: "Pr. køb",
  per_visit: "Pr. besøg",
  per_amount: "Efter beløb",
  manual: "Manuel tildeling",
  campaign: "Kampagne",
};

export const EARN_MODEL_HELP: Record<EarnModel, string> = {
  per_purchase: "1 køb giver 1 stempel.",
  per_visit: "1 besøg giver 1 stempel.",
  per_amount: "1 stempel for hvert bestemt beløb, fx 100 kr.",
  manual: "Medarbejderen vælger selv antal stempler.",
  campaign: "Stempler efter en kampagne, fx dobbelt om tirsdagen.",
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  free_product: "Gratis produkt",
  amount_off: "Fast rabat i kroner",
  percent_off: "Rabat i procent",
  service: "Gratis behandling eller ydelse",
  gift: "Gave",
  custom: "Valgfri belønning",
  none: "Ingen automatisk belønning",
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  fixed_amount: "Fast beløb",
  percent: "Procent",
  free_product: "Gratis produkt",
  bxgy: "Køb X og få Y",
  special: "Specialtilbud",
  birthday: "Fødselsdagsrabat",
  welcome: "Velkomstrabat",
  comeback: "Kom-igen-rabat",
  compensation: "Kompensationsrabat",
  vip: "VIP-rabat",
};

/** Menneskelige labels til transaktionshistorikken. */
export const TXN_TYPE_LABELS: Record<TxnType, string> = {
  stamp_earned: "Stempel optjent",
  stamp_manual: "Stempel tilføjet manuelt",
  stamp_removed: "Stempel fjernet",
  bonus_stamp: "Bonusstempel",
  adjustment: "Justering",
  reward_earned: "Belønning optjent",
  reward_redeemed: "Belønning indløst",
  discount_granted: "Rabat givet",
  discount_redeemed: "Rabat indløst",
  reversed: "Transaktion tilbageført",
  card_reset: "Kort nulstillet",
  stamp_expired: "Stempel udløbet",
};

export const TXN_SOURCE_LABELS: Record<TxnSource, string> = {
  staff: "Medarbejder",
  qr: "QR-kode",
  nfc: "NFC",
  import: "Import",
  system: "System",
  feedback_recovery: "Feedback recovery",
};

/** Hovednavigation for stempelkort-området (jf. spec, tilpasset dashboardet). */
export const LOYALTY_NAV = [
  { href: "/dashboard/loyalitet", label: "Overblik" },
  { href: "/dashboard/loyalitet/programmer", label: "Programmer" },
  { href: "/dashboard/loyalitet/kunder", label: "Kunder" },
  { href: "/dashboard/loyalitet/transaktioner", label: "Stempler & transaktioner" },
  { href: "/dashboard/loyalitet/beloenninger", label: "Belønninger" },
  { href: "/dashboard/loyalitet/rabatter", label: "Rabatter" },
  { href: "/dashboard/loyalitet/kampagner", label: "Kampagner" },
  { href: "/dashboard/loyalitet/indstillinger", label: "Indstillinger" },
] as const;

/** Skabeloner til hurtig opstart (onboarding, wizard-forudfyldning). */
export interface ProgramTemplate {
  key: string;
  label: string;
  earnModel: EarnModel;
  requiredStamps: number;
  rewardName: string;
  rewardType: RewardType;
  rewardValue?: number;
  hint: string;
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    key: "cafe",
    label: "Café",
    earnModel: "per_purchase",
    requiredStamps: 10,
    rewardName: "Gratis kaffe",
    rewardType: "free_product",
    hint: "1 køb = 1 stempel · 10 stempler = gratis kaffe",
  },
  {
    key: "frisor",
    label: "Frisør",
    earnModel: "per_visit",
    requiredStamps: 6,
    rewardName: "20 % rabat",
    rewardType: "percent_off",
    rewardValue: 20,
    hint: "1 besøg = 1 stempel · 6 stempler = 20 % rabat",
  },
  {
    key: "klinik",
    label: "Klinik",
    earnModel: "per_visit",
    requiredStamps: 5,
    rewardName: "Valgfri bonus",
    rewardType: "custom",
    hint: "1 behandling = 1 stempel · 5 stempler = valgfri bonus",
  },
  {
    key: "restaurant",
    label: "Restaurant",
    earnModel: "per_visit",
    requiredStamps: 8,
    rewardName: "Gratis dessert",
    rewardType: "free_product",
    hint: "1 besøg = 1 stempel · 8 stempler = gratis dessert",
  },
];

/**
 * VIGTIGT (jf. spec): belønninger/rabatter/stempler må ALDRIG betinges af en
 * offentlig anmeldelse. Der findes derfor bevidst ingen earn-model eller
 * regel-felt, der kan knytte optjening til Google/Trustpilot/Tripadvisor.
 * Denne advarsel bruges i feedback recovery-UI'et.
 */
export const REVIEW_INDEPENDENCE_NOTICE =
  "Belønningen må ikke gives mod, at kunden ændrer, sletter eller skriver en offentlig anmeldelse.";
