// DB 타입. 운영 DB 에 연결되면 `npm run db:types` 로 다시 만들어 이 파일을 덮어쓴다.
// 그 전까지는 supabase/migrations/20261105100000_mushroom_core.sql·20261107120000_mf_prefix.sql·20261107130000_mf_fields.sql 을 보고 손으로 맞춘 것이다(생성기와 같은 모양).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Audit = {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};
type AuditInsert = Partial<Audit>;

type Table<Row, Required extends keyof Row, Optional extends keyof Row = never> = {
  Row: Audit & Row;
  Insert: AuditInsert & Pick<Row, Required> & Partial<Pick<Row, Optional>> & { id?: number };
  Update: AuditInsert & Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      mf_member: Table<{ id: number; email: string; is_admin: boolean }, "email", "is_admin">;
      mf_room: Table<{ id: number; name: string; sort_order: number; is_active: boolean }, "name", "sort_order" | "is_active">;
      mf_farm_setting: Table<
        {
          id: number;
          farm_name: string;
          crop: string;
          default_period: "1w" | "1m" | "3m" | "6m" | "1y";
          target_daily_kg: number | null;
          defect_rate_warn_pct: number | null;
          contamination_rate_warn_pct: number | null;
        },
        never,
        "farm_name" | "crop" | "default_period" | "target_daily_kg" | "defect_rate_warn_pct" | "contamination_rate_warn_pct"
      >;
      mf_field: Table<
        {
          id: number;
          scope: "farm" | "room";
          role: "bottled" | "inoculated" | "contaminated" | "good" | "defect" | "temperature" | "humidity" | null;
          name: string;
          value_type: "int" | "decimal" | "choice" | "text";
          unit: string;
          min_value: number | null;
          max_value: number | null;
          warn_min: number | null;
          warn_max: number | null;
          summary: "sum" | "avg" | "none";
          sort_order: number;
          is_active: boolean;
        },
        "scope" | "name" | "value_type",
        "role" | "unit" | "min_value" | "max_value" | "warn_min" | "warn_max" | "summary" | "sort_order" | "is_active"
      >;
      mf_field_option: Table<
        { id: number; field_id: number; label: string; sort_order: number; is_active: boolean },
        "field_id" | "label",
        "sort_order" | "is_active"
      >;
      mf_day: Table<{ id: number; log_date: string; memo: string }, "log_date" | "memo">;
      mf_value: Table<
        {
          id: number;
          log_date: string;
          field_id: number;
          room_id: number | null;
          option_id: number | null;
          num_value: number | null;
          text_value: string | null;
        },
        "log_date" | "field_id",
        "room_id" | "option_id" | "num_value" | "text_value"
      >;
      mf_if_push_subscription: Table<
        { id: number; member_id: number; raw_json: Json; loaded_at: string | null },
        "member_id" | "raw_json",
        "loaded_at"
      >;
      mf_push_subscription: Table<
        { id: number; endpoint: string; member_id: number; p256dh: string; auth_key: string; is_active: boolean },
        "endpoint" | "member_id" | "p256dh" | "auth_key",
        "is_active"
      >;
      mf_push_log: Table<
        {
          id: number;
          kind: PushKind;
          ref_date: string;
          recipient_id: number;
          ref_id: number | null;
          result: "pending" | "sent" | "failed" | "no_subscription";
          sent_count: number;
        },
        "kind" | "ref_date" | "recipient_id",
        "ref_id" | "result" | "sent_count"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      mf_save_day: {
        Args: { p_log_date: string; p_memo: string; p_values: Json };
        Returns: undefined;
      };
      mf_delete_day: { Args: { p_log_date: string }; Returns: undefined };
      mf_farm_days: {
        Args: { p_from: string; p_to: string };
        Returns: { log_date: string; has_memo: boolean; totals: Json }[];
      };
      mf_room_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { room_id: number; field_id: number; sum_value: number; value_count: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// 붙일 기능이 정해지면 여기와 mf_push_log_kind_ck 에 종류를 더한다.
export type PushKind = "test";
