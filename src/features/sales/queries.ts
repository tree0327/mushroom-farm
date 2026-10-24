import "server-only";
import type { MemberContext } from "@/shared/lib/member";
import type { SalesRecord } from "@/features/sales/totals";

// 전부 읽어 화면(휴대폰 시간대)에서 묶는다. 옛 앱도 전부 읽었다.
// ponytail: 수천 행이 넘으면 느려진다. 그때는 이번 달만 읽고 월별 합계는 DB 함수로 옮긴다.
export async function getSalesRecords({ supabase }: MemberContext): Promise<SalesRecord[]> {
  const { data, error } = await supabase
    .from("sales_record")
    .select("id, sold_at, pay_type, amount, final_amount, name")
    .order("sold_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.pay_type,
    original: r.amount,
    final: r.final_amount,
    name: r.name,
    date: r.sold_at,
  }));
}
