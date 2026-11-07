// DB 타입. 운영 DB 에 연결되면 `npm run db:types` 로 다시 만들어 이 파일을 덮어쓴다.
// 그 전까지는 supabase/migrations/20261105100000_mushroom_core.sql·20261107120000_mf_prefix.sql을 보고 손으로 맞춘 것이다(생성기와 같은 모양).

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
      mf_daily_log: Table<
        {
          id: number;
          log_date: string;
          bottled_count: number | null;
          inoculated_count: number | null;
          contaminated_count: number | null;
          memo: string;
        },
        "log_date",
        "bottled_count" | "inoculated_count" | "contaminated_count" | "memo"
      >;
      mf_room_log: Table<
        {
          id: number;
          log_date: string;
          room_id: number;
          good_kg: number | null;
          defect_kg: number | null;
          temperature_c: number | null;
          humidity_pct: number | null;
        },
        "log_date" | "room_id",
        "good_kg" | "defect_kg" | "temperature_c" | "humidity_pct"
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
        Args: {
          p_log_date: string;
          p_bottled_count: number | null;
          p_inoculated_count: number | null;
          p_contaminated_count: number | null;
          p_memo: string;
          p_rooms: Json;
        };
        Returns: undefined;
      };
      mf_delete_day: { Args: { p_log_date: string }; Returns: undefined };
      mf_farm_days: {
        Args: { p_from: string; p_to: string };
        Returns: {
          log_date: string;
          bottled_count: number | null;
          inoculated_count: number | null;
          contaminated_count: number | null;
          good_kg: number | null;
          defect_kg: number | null;
          has_memo: boolean;
        }[];
      };
      mf_room_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { room_id: number; name: string; is_active: boolean; good_kg: number | null; defect_kg: number | null }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// 붙일 기능이 정해지면 여기와 mf_push_log_kind_ck 에 종류를 더한다.
export type PushKind = "test";
