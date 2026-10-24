// DB 타입. 운영 DB 에 연결되면 `npm run db:types` 로 다시 만들어 이 파일을 덮어쓴다.
// 그 전까지는 supabase/migrations/20261023132506_couple_app_core.sql 을 보고 손으로 맞춘 것이다(생성기와 같은 모양).

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
      member: Table<
        { id: number; user_id: string; role: "husband" | "wife"; display_name: string; is_admin: boolean },
        "user_id" | "role" | "display_name",
        "is_admin"
      >;
      app_setting: Table<{ id: number; is_weekend_rest: boolean }, never, "id" | "is_weekend_rest">;
      rest_day: Table<{ id: number; rest_date: string; memo: string }, "rest_date", "memo">;
      diary_entry: Table<{ id: number; entry_date: string; member_id: number; body: string }, "entry_date" | "member_id" | "body">;
      diary_reply: Table<
        { id: number; diary_entry_id: number; member_id: number; body: string },
        "diary_entry_id" | "member_id" | "body"
      >;
      if_push_subscription: Table<
        { id: number; member_id: number; raw_json: Json; loaded_at: string | null },
        "member_id" | "raw_json",
        "loaded_at"
      >;
      push_subscription: Table<
        { id: number; endpoint: string; member_id: number; p256dh: string; auth_key: string; is_active: boolean },
        "endpoint" | "member_id" | "p256dh" | "auth_key",
        "is_active"
      >;
      push_log: Table<
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
      sales_record: Table<
        { id: number; sold_at: string; pay_type: "현금" | "카드"; amount: number; final_amount: number; name: string },
        "sold_at" | "pay_type" | "amount" | "final_amount",
        "name"
      >;
      answer_phrase: Table<{ id: number; body: string; is_default: boolean }, "body", "is_default">;
      answer_draw: Table<
        { id: number; member_id: number; phrase_id: number; worry: string; is_shared: boolean },
        "member_id" | "phrase_id",
        "worry" | "is_shared"
      >;
      wish_coupon: Table<
        {
          id: number;
          giver_id: number;
          receiver_id: number;
          title: string;
          body: string;
          expires_on: string | null;
          status: "issued" | "used" | "done";
          used_at: string | null;
          done_at: string | null;
        },
        "giver_id" | "receiver_id" | "title",
        "body" | "expires_on" | "status"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      app_today: { Args: Record<string, never>; Returns: { today: string; is_rest: boolean; is_weekend_rest: boolean }[] };
      diary_flags: {
        Args: { p_entry_date: string };
        Returns: { is_rest: boolean; can_write: boolean; is_revealed: boolean; can_reply: boolean }[];
      };
      diary_writers: { Args: { p_entry_date: string }; Returns: { member_id: number }[] };
      draw_answer: {
        Args: { p_worry: string };
        Returns: { draw_id: number; phrase_id: number; body: string; is_default: boolean; author_id: string | null }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type PushKind =
  | "diary_written"
  | "reply_written"
  | "evening_reminder"
  | "morning_reply"
  | "coupon_issued"
  | "coupon_used"
  | "coupon_done"
  | "test";

export type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
