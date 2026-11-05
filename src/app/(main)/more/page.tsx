import Link from "next/link";
import { ChevronRight, DoorOpen, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { PushSettings } from "@/features/push/components/push-settings";
import { signOut } from "@/features/member/actions";

const LINKS = [
  { href: "/more/rooms", label: "호실", Icon: DoorOpen, adminOnly: false },
  { href: "/more/members", label: "계정", Icon: Users, adminOnly: true },
] as const;

export default async function MorePage() {
  const { me } = await getMemberOrRedirect();
  return (
    <>
      <PageHeader title="더보기" />
      <PageBody>
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {LINKS.filter((l) => me.isAdmin || !l.adminOnly).map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex h-14 items-center gap-3 px-4 text-base">
                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <PushSettings />

        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-medium break-all">{me.email}</p>
              <p className="text-sm text-muted-foreground">{me.isAdmin ? "관리자" : "회원"}</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="h-11 px-4 text-base">
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
