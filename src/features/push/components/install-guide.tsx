import { Share, SquarePlus } from "lucide-react";

// 아이폰 홈 화면 추가 안내 (R15)
export function InstallGuide() {
  return (
    <ol className="flex flex-col gap-3 text-base">
      <li className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">1</span>
        <span>
          사파리 아래쪽 <Share className="inline size-5 align-text-bottom" aria-label="공유" /> 공유 버튼을 눌러요.
        </span>
      </li>
      <li className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">2</span>
        <span>
          <SquarePlus className="inline size-5 align-text-bottom" aria-hidden /> 「홈 화면에 추가」를 누르고 [추가]를 눌러요.
        </span>
      </li>
      <li className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">3</span>
        <span>홈 화면의 「버섯재배관리」 아이콘으로 열고, 더보기 › 알림 켜기를 눌러요.</span>
      </li>
    </ol>
  );
}
