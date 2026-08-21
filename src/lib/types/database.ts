/**
 * Hand-written types mirroring supabase/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript` once the CLI is wired up.
 */

import type {
  ProgramStatus,
  EarnModel,
  RewardType,
  RewardStatus,
  TxnType,
  TxnSource,
  MembershipStatus,
  DiscountType,
  DiscountStatus,
  CustomerDiscountStatus,
} from "@/lib/loyalty/constants";

export type ConsentType = "terms" | "marketing";

export type UserRole = "admin" | "customer";
export type CompanyPlan = "basic" | "premium" | "pro";
export type DestinationType = "google" | "trustpilot" | "facebook" | "custom";
export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type OrderStatus =
  | "new"
  | "needs_onboarding"
  | "ready_for_production"
  | "shipped"
  | "cancelled";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          plan: CompanyPlan;
          /** Slug fra PRODUCTS. Styrer adgang til stempelkort (migration 0008). */
          product_slug: string | null;
          /** Stripe-kunde, så historik og kundecenter hænger sammen (0009). */
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          /** Fakturamail til bogholderiet. Tom = brug contact_email (0009). */
          billing_email: string | null;
          /** Accept af databehandleraftalen (0010). Null = ikke accepteret. */
          dpa_accepted_at: string | null;
          dpa_version: string | null;
          /**
           * Suspension og ophør (0014). Se src/lib/abonnement.ts — manglende
           * betaling er suspension, ikke ophør, og der slettes intet før
           * `ophoert_den` plus 30 dage.
           */
          stripe_status: string | null;
          suspenderet_siden: string | null;
          ophoert_den: string | null;
          /** Selvbetjent sletning (0014): bestilt, bekræftet, udføres. */
          sletning_bestilt_den: string | null;
          sletning_token: string | null;
          sletning_udfoeres_den: string | null;
          /** Sat når data FAKTISK er slettet. Rækken bliver liggende til bogføringen. */
          slettet_den: string | null;
          /**
           * Frist for et leverandørskifte (0017). Er den sat og ikke passeret,
           * slettes der INTET for virksomheden — dataforordningens artikel 25
           * giver kunden tid til at hente sine data. Se src/lib/abonnement.ts.
           */
          dataudtraek_frist: string | null;
          /**
           * CVR-nummer, otte cifre uden mellemrum (0015). Frivilligt i
           * databasen af hensyn til de konti, der blev oprettet før kravet —
           * håndhæves ved oprettelse og ved køb. Se src/lib/cvr.ts.
           */
          cvr: string | null;
          /** Accept af handelsbetingelserne, med version (0015). */
          terms_accepted_at: string | null;
          terms_version: string | null;
          logo_url: string | null;
          contact_email: string | null;
          phone: string | null;
          address: string | null;
          stand_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          plan?: CompanyPlan;
          product_slug?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          billing_email?: string | null;
          dpa_accepted_at?: string | null;
          dpa_version?: string | null;
          stripe_status?: string | null;
          suspenderet_siden?: string | null;
          ophoert_den?: string | null;
          sletning_bestilt_den?: string | null;
          sletning_token?: string | null;
          sletning_udfoeres_den?: string | null;
          slettet_den?: string | null;
          dataudtraek_frist?: string | null;
          cvr?: string | null;
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          address?: string | null;
          stand_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Trykvalg en butik har gemt (0018). Se src/lib/design.ts. */
      designs: {
        Row: {
          id: string;
          company_id: string;
          navn: string;
          stander_farve: "sort" | "hvid";
          front_type: "matcher" | "egen";
          /** Normaliseret hex med havelåge. Kun sat når front_type = "egen". */
          front_hex: string | null;
          logo_url: string | null;
          logo_filnavn: string | null;
          logo_mime: string | null;
          logo_bytes: number | null;
          logo_bredde: number | null;
          logo_hoejde: number | null;
          logo_transparent: boolean | null;
          print_skabelon: string;
          /** Er tillægget for egen frontfarve betalt for DETTE design? */
          frontfarve_betalt: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          navn: string;
          stander_farve?: "sort" | "hvid";
          front_type?: "matcher" | "egen";
          front_hex?: string | null;
          logo_url?: string | null;
          logo_filnavn?: string | null;
          logo_mime?: string | null;
          logo_bytes?: number | null;
          logo_bredde?: number | null;
          logo_hoejde?: number | null;
          logo_transparent?: boolean | null;
          print_skabelon?: string;
          frontfarve_betalt?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["designs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "designs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stands: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          slug: string;
          destination_type: DestinationType;
          google_review_url: string | null;
          trustpilot_url: string | null;
          facebook_url: string | null;
          custom_url: string | null;
          custom_label: string | null;
          is_active: boolean;
          /**
           * Sandt = /r/<slug> viderestiller uden at vise en side og uden at
           * indsamle feedback (0019). Saettes ved bestilling uden konto.
           */
          kun_viderestilling: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          slug: string;
          destination_type?: DestinationType;
          google_review_url?: string | null;
          trustpilot_url?: string | null;
          facebook_url?: string | null;
          custom_url?: string | null;
          custom_label?: string | null;
          is_active?: boolean;
          kun_viderestilling?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stands"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stands_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      scans: {
        Row: {
          id: string;
          stand_id: string;
          company_id: string;
          device_type: DeviceType;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stand_id: string;
          company_id: string;
          device_type?: DeviceType;
          source?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "scans_stand_id_fkey";
            columns: ["stand_id"];
            isOneToOne: false;
            referencedRelation: "stands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scans_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          id: string;
          stand_id: string;
          company_id: string;
          rating: number;
          comment: string | null;
          customer_name: string | null;
          customer_email: string | null;
          is_public_review_clicked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          stand_id: string;
          company_id: string;
          rating: number;
          comment?: string | null;
          customer_name?: string | null;
          customer_email?: string | null;
          is_public_review_clicked?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feedback_stand_id_fkey";
            columns: ["stand_id"];
            isOneToOne: false;
            referencedRelation: "stands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      /**
       * Cookiesamtykker fra hjemmesidens besøgende (0011). Ingen
       * personoplysninger. IKKE det samme som `consent_records`, der handler om
       * butikkens egne kunders samtykke til markedsføring fra butikken.
       */
      consent_log: {
        Row: {
          id: string;
          consent_id: string;
          version: number;
          statistics: boolean;
          marketing: boolean;
          decided_at: string;
          path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          consent_id: string;
          version: number;
          statistics: boolean;
          marketing: boolean;
          decided_at: string;
          path?: string | null;
          created_at?: string;
        };
        Update: {
          path?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          company_id: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          product_slug: string | null;
          product_name: string;
          quantity: number;
          status: OrderStatus;
          total_amount: number;
          /** Designet ordren blev trykt efter (0018). Null hvis det er slettet. */
          design_id: string | null;
          /** Kontaktmail paa en ordre uden konto (0019). */
          kontakt_email: string | null;
          /**
           * Leveringsadressen som Stripe gav den (0020). Saettes af webhooken,
           * saa ordren kan ekspederes uden at slaa op i Stripe.
           */
          leveringsadresse: Record<string, string | null> | null;
          /** Kom ordren fra bestillingen uden konto? (0019) */
          uden_konto: boolean;
          /** Tillaeg for egen frontfarve paa netop denne ordre (0018). */
          frontfarve_beloeb: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          stripe_session_id?: string | null;
          stripe_payment_intent?: string | null;
          product_slug?: string | null;
          product_name: string;
          quantity?: number;
          status?: OrderStatus;
          total_amount?: number;
          design_id?: string | null;
          kontakt_email?: string | null;
          leveringsadresse?: Record<string, string | null> | null;
          uden_konto?: boolean;
          frontfarve_beloeb?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            // Uden denne kan den typede klient ikke oploese
            // `design:designs(*)` og svarer med en SelectQueryError.
            foreignKeyName: "orders_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          stripe_subscription_id: string | null;
          plan: string;
          status: SubscriptionStatus;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          stripe_subscription_id?: string | null;
          plan: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          name: string;
          email: string | null;
          is_active: boolean;
          can_stamp: boolean;
          can_discount: boolean;
          can_redeem: boolean;
          can_manage: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string | null;
          name: string;
          email?: string | null;
          is_active?: boolean;
          can_stamp?: boolean;
          can_discount?: boolean;
          can_redeem?: boolean;
          can_manage?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
        Relationships: [];
      };
      loyalty_programs: {
        Row: {
          id: string;
          company_id: string;
          location_id: string | null;
          name: string;
          internal_name: string | null;
          description: string | null;
          status: ProgramStatus;
          earn_model: EarnModel;
          stamps_per_earn: number;
          amount_per_stamp: number | null;
          start_date: string | null;
          end_date: string | null;
          reset_on_redeem: boolean;
          keep_overflow: boolean;
          color: string | null;
          background: string | null;
          icon: string | null;
          card_text: string | null;
          logo_url: string | null;
          max_stamps_per_txn: number;
          max_stamps_per_day: number | null;
          min_minutes_between: number;
          require_staff_confirm: boolean;
          require_presence: boolean;
          require_pin: boolean;
          require_member_qr: boolean;
          require_location: boolean;
          stamps_expire: boolean;
          stamp_expiry_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          location_id?: string | null;
          name: string;
          internal_name?: string | null;
          description?: string | null;
          status?: ProgramStatus;
          earn_model?: EarnModel;
          stamps_per_earn?: number;
          amount_per_stamp?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          reset_on_redeem?: boolean;
          keep_overflow?: boolean;
          color?: string | null;
          background?: string | null;
          icon?: string | null;
          card_text?: string | null;
          logo_url?: string | null;
          max_stamps_per_txn?: number;
          max_stamps_per_day?: number | null;
          min_minutes_between?: number;
          require_staff_confirm?: boolean;
          require_presence?: boolean;
          require_pin?: boolean;
          require_member_qr?: boolean;
          require_location?: boolean;
          stamps_expire?: boolean;
          stamp_expiry_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_programs"]["Insert"]
        >;
        Relationships: [];
      };
      loyalty_rewards: {
        Row: {
          id: string;
          company_id: string;
          program_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          type: RewardType;
          value: number | null;
          required_stamps: number;
          validity_days: number | null;
          is_primary: boolean;
          is_campaign: boolean;
          terms: string | null;
          status: ProgramStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          program_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          type?: RewardType;
          value?: number | null;
          required_stamps?: number;
          validity_days?: number | null;
          is_primary?: boolean;
          is_campaign?: boolean;
          terms?: string | null;
          status?: ProgramStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_rewards"]["Insert"]
        >;
        Relationships: [];
      };
      loyalty_members: {
        Row: {
          id: string;
          company_id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          customer_number: string | null;
          public_token: string;
          user_id: string | null;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          customer_number?: string | null;
          public_token?: string;
          user_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_members"]["Insert"]
        >;
        Relationships: [];
      };
      loyalty_memberships: {
        Row: {
          id: string;
          company_id: string;
          program_id: string;
          member_id: string;
          status: MembershipStatus;
          balance_cache: number;
          enrolled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          program_id: string;
          member_id: string;
          status?: MembershipStatus;
          balance_cache?: number;
          enrolled_at?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_memberships"]["Insert"]
        >;
        Relationships: [];
      };
      loyalty_transactions: {
        Row: {
          id: string;
          company_id: string;
          location_id: string | null;
          program_id: string;
          membership_id: string | null;
          member_id: string | null;
          employee_id: string | null;
          type: TxnType;
          stamps: number;
          amount: number | null;
          currency: string;
          source: TxnSource;
          reference: string | null;
          device: string | null;
          note: string | null;
          reason: string | null;
          reversal_of: string | null;
          reward_id: string | null;
          discount_id: string | null;
          feedback_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          location_id?: string | null;
          program_id: string;
          membership_id?: string | null;
          member_id?: string | null;
          employee_id?: string | null;
          type: TxnType;
          stamps?: number;
          amount?: number | null;
          currency?: string;
          source?: TxnSource;
          reference?: string | null;
          device?: string | null;
          note?: string | null;
          reason?: string | null;
          reversal_of?: string | null;
          reward_id?: string | null;
          discount_id?: string | null;
          feedback_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_transactions"]["Insert"]
        >;
        Relationships: [];
      };
      customer_rewards: {
        Row: {
          id: string;
          company_id: string;
          program_id: string;
          membership_id: string;
          member_id: string;
          reward_id: string;
          status: RewardStatus;
          earned_at: string;
          expires_at: string | null;
          redeemed_at: string | null;
          redeemed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          program_id: string;
          membership_id: string;
          member_id: string;
          reward_id: string;
          status?: RewardStatus;
          earned_at?: string;
          expires_at?: string | null;
          redeemed_at?: string | null;
          redeemed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_rewards"]["Insert"]
        >;
        Relationships: [];
      };
      loyalty_audit_log: {
        Row: {
          id: string;
          company_id: string;
          actor_user_id: string | null;
          actor_employee_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          meta: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          actor_user_id?: string | null;
          actor_employee_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          meta?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_audit_log"]["Insert"]
        >;
        Relationships: [];
      };
      consent_records: {
        Row: {
          id: string;
          company_id: string;
          member_id: string;
          type: ConsentType;
          text_version: string | null;
          granted: boolean;
          channel: string | null;
          source: string | null;
          ip: string | null;
          meta: Record<string, unknown>;
          granted_at: string;
          withdrawn_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          member_id: string;
          type: ConsentType;
          text_version?: string | null;
          granted?: boolean;
          channel?: string | null;
          source?: string | null;
          ip?: string | null;
          meta?: Record<string, unknown>;
          granted_at?: string;
          withdrawn_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["consent_records"]["Insert"]
        >;
        Relationships: [];
      };
      discounts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          type: DiscountType;
          value: number;
          start_date: string | null;
          end_date: string | null;
          weekdays: number[] | null;
          time_start: string | null;
          time_end: string | null;
          min_purchase: number | null;
          max_discount: number | null;
          per_customer_limit: number | null;
          total_limit: number | null;
          combinable: boolean;
          requires_approval: boolean;
          status: DiscountStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          type?: DiscountType;
          value?: number;
          start_date?: string | null;
          end_date?: string | null;
          weekdays?: number[] | null;
          time_start?: string | null;
          time_end?: string | null;
          min_purchase?: number | null;
          max_discount?: number | null;
          per_customer_limit?: number | null;
          total_limit?: number | null;
          combinable?: boolean;
          requires_approval?: boolean;
          status?: DiscountStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["discounts"]["Insert"]>;
        Relationships: [];
      };
      customer_discounts: {
        Row: {
          id: string;
          company_id: string;
          member_id: string;
          discount_id: string;
          status: CustomerDiscountStatus;
          granted_at: string;
          granted_by: string | null;
          expires_at: string | null;
          redeemed_at: string | null;
          feedback_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          member_id: string;
          discount_id: string;
          status?: CustomerDiscountStatus;
          granted_at?: string;
          granted_by?: string | null;
          expires_at?: string | null;
          redeemed_at?: string | null;
          feedback_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_discounts"]["Insert"]
        >;
        Relationships: [];
      };
      /** Se supabase/migrations/0013_drift_log.sql. Kun service-role. */
      drift_log: {
        Row: {
          id: string;
          opgave: string;
          ok: boolean;
          resultat: Record<string, unknown> | null;
          besked: string | null;
          alarmeret: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          opgave: string;
          ok: boolean;
          resultat?: Record<string, unknown> | null;
          besked?: string | null;
          alarmeret?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["drift_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** Se supabase/migrations/0012_opbevaring.sql. Kun service-role. */
      ryd_op_efter_frister: {
        Args: { p_toerloeb: boolean };
        Returns: {
          toerloeb: boolean;
          feedback_navn: number;
          feedback_kommentar: number;
          medlemmer: number;
          samtykkelog: number;
          revisionslog: number;
        };
      };
      /** Se supabase/migrations/0014_suspension_og_ophoer.sql. Kun service-role. */
      afslut_ophoerte_aftaler: {
        Args: { p_toerloeb: boolean };
        Returns: {
          toerloeb: boolean;
          /** Suspensioner der løb ud, og hvor aftalen dermed ophørte. */
          ophoert: number;
          /** Virksomheder hvis data blev slettet i denne kørsel. */
          slettet: number;
          /** Holdt tilbage, fordi et leverandørskifte er i gang (0017). */
          afventer_skifte: number;
          /** Deres id'er, så logins og logoer kan ryddes bagefter. */
          virksomheder: string[];
        };
      };
      /** Se supabase/migrations/0014_suspension_og_ophoer.sql. Kun service-role. */
      slet_virksomhedens_data: {
        Args: { p_company_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      company_plan: CompanyPlan;
      destination_type: DestinationType;
      device_type: DeviceType;
      order_status: OrderStatus;
      subscription_status: SubscriptionStatus;
      loyalty_program_status: ProgramStatus;
      loyalty_earn_model: EarnModel;
      loyalty_reward_type: RewardType;
      loyalty_reward_status: RewardStatus;
      loyalty_txn_type: TxnType;
      loyalty_txn_source: TxnSource;
      membership_status: MembershipStatus;
      consent_type: ConsentType;
      discount_type: DiscountType;
      discount_status: DiscountStatus;
      customer_discount_status: CustomerDiscountStatus;
    };
  };
}
