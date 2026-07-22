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
      orders: {
        Row: {
          id: string;
          company_id: string | null;
          stripe_session_id: string | null;
          product_name: string;
          quantity: number;
          status: OrderStatus;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          stripe_session_id?: string | null;
          product_name: string;
          quantity?: number;
          status?: OrderStatus;
          total_amount?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
