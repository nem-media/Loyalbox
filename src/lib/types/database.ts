/**
 * Hand-written types mirroring supabase/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript` once the CLI is wired up.
 */

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
    };
  };
}
