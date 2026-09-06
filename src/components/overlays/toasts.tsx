"use client";

import { useUi } from "@/lib/store";
import { cn } from "@/lib/utils";

/** +XP bay lên rồi tan. Neo cố định ở góc để mắt biết chỗ mà nhìn. */
export function Floaters() {
  const floaters = useUi((s) => s.floaters);
  return (
    <div className="pointer-events-none fixed right-10 bottom-30 z-80 flex flex-col items-end gap-1">
      {floaters.map((f) => (
        <div
          key={f.id}
          className="animate-float-up rounded-full bg-accent px-4 py-1.5 font-display text-[26px] font-bold tracking-[-0.02em] text-[oklch(0.42_0.12_68)] shadow-[0_8px_24px_oklch(0.74_0.16_78/.5)]"
        >
          +{f.gain} XP
        </div>
      ))}
    </div>
  );
}

/** Hàng đợi toast — nhiều sự kiện cùng lúc thì xếp chồng chứ không đè nhau. */
export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="fixed right-6 bottom-6 z-70 flex flex-col items-end gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid="toast"
          className={cn(
            "animate-toast-in flex min-w-[280px] items-center gap-3 rounded-[13px] border bg-surface px-4 py-3.5 shadow-e3",
            t.kind === "xp" ? "border-accent" : "border-line",
          )}
        >
          <div
            className={cn(
              "grid size-8.5 place-items-center rounded-[10px] text-[17px]",
              t.kind === "xp" ? "bg-accent-soft" : "bg-surface-2",
            )}
          >
            {t.icon}
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-bold tracking-[-0.01em]">{t.title}</div>
            <div className="text-xs text-ink-3">{t.body}</div>
          </div>
          {t.right && (
            <div className="font-display text-sm font-bold text-accent-ink tnum">{t.right}</div>
          )}
        </div>
      ))}
    </div>
  );
}
