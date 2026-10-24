"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, BookOpen, Ellipsis, Ticket } from "lucide-react";
import { cn } from "cn";

const TABS = [
  { href: "/diary", label: "일기", Icon: BookHeart },
  { href: "/answer", label: "해답의 책", Icon: BookOpen },
  { href: "/coupon", label: "쿠폰", Icon: Ticket },
  { href: "/more", label: "더보기", Icon: Ellipsis },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="아래 탭"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                  active ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
