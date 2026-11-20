export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTier = "free" | "pro";
export type SnipeStatus = "active" | "triggered" | "paused";
export type ParserType = "json_ld" | "shopify" | "affiliate_feed" | "custom";

export interface Database {
  public: {
    Tables: {
      retailers: {
        Row: {
          id: string;
          name: string;
          domain: string;
          category: string;
          logo_url: string | null;
          parser_type: ParserType;
          affiliate_template: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain: string;
          category?: string;
          logo_url?: string | null;
          parser_type?: ParserType;
          affiliate_template?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["retailers"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          retailer_id: string;
          normalized_url: string;
          gtin_ean: string | null;
          title: string;
          category: string;
          image_url: string | null;
          current_price: number | null;
          previous_price: number | null;
          lowest_ever_price: number | null;
          discount_pct: number;
          currency: string;
          in_stock: boolean;
          watcher_count: number;
          check_priority: number;
          last_checked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          retailer_id: string;
          normalized_url: string;
          gtin_ean?: string | null;
          title: string;
          category?: string;
          image_url?: string | null;
          current_price?: number | null;
          previous_price?: number | null;
          lowest_ever_price?: number | null;
          discount_pct?: number;
          currency?: string;
          in_stock?: boolean;
          watcher_count?: number;
          check_priority?: number;
          last_checked_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "products_retailer_id_fkey";
            columns: ["retailer_id"];
            isOneToOne: false;
            referencedRelation: "retailers";
            referencedColumns: ["id"];
          },
        ];
      };
      price_history: {
        Row: {
          id: string;
          product_id: string;
          price: number | null;
          in_stock: boolean;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          price?: number | null;
          in_stock: boolean;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_history"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          plan: PlanTier;
          stripe_customer_id: string | null;
          push_subscription: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan?: PlanTier;
          stripe_customer_id?: string | null;
          push_subscription?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      snipes: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          target_price: number | null;
          alert_on_restock: boolean;
          variant_label: string | null;
          status: SnipeStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          target_price?: number | null;
          alert_on_restock?: boolean;
          variant_label?: string | null;
          status?: SnipeStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["snipes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "snipes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "snipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      plan_tier: PlanTier;
      snipe_status: SnipeStatus;
      parser_type: ParserType;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Retailer = Database["public"]["Tables"]["retailers"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type PriceHistoryPoint = Database["public"]["Tables"]["price_history"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Snipe = Database["public"]["Tables"]["snipes"]["Row"];

export type ProductWithRetailer = Product & { retailers: Retailer };
export type SnipeWithProduct = Snipe & { products: ProductWithRetailer };

export interface Deal extends ProductWithRetailer {
  cheapest_price: number | null;
  cheapest_retailer: string | null;
  is_live: boolean;
  accessible: boolean;
}
