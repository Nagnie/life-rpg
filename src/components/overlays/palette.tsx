"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/primitives";

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const close = useUi((s) => s.closePalette);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => [
      { icon: "◈", label: "Go to Dashboard", kbd: "G D", run: () => router.push("/") },
      { icon: "◆", label: "Go to Quests", kbd: "G Q", run: () => router.push("/quests") },
      { icon: "◎", label: "Go to Goals", kbd: "G G", run: () => router.push("/goals") },
      { icon: "★", label: "Go to Rewards", kbd: "G R", run: () => router.push("/rewards") },
      { icon: "◉", label: "Go to Profile", kbd: "G P", run: () => router.push("/profile") },
      { icon: "＋", label: "New quest", kbd: "N", run: () => useUi.getState().openQuestForm() },
      { icon: "★", label: "New reward", kbd: "R", run: () => useUi.getState().openRewardForm() },
      { icon: "◎", label: "New goal", kbd: "", run: () => useUi.getState().openGoalForm() },
      { icon: "◐", label: "Toggle dark mode", kbd: "", run: () => useUi.getState().toggleTheme() },
    ],
    [router],
  );

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;

  return (
    <Backdrop
      testId="command-palette"
      onClose={close}
      className="z-98 grid place-items-start justify-center bg-[oklch(0.15_0.02_285/.5)] pt-[14vh] backdrop-blur-[3px]"
    >
      <div className="animate-pop-in w-[540px] max-w-[94vw] overflow-hidden rounded-2xl border border-line bg-surface shadow-e3">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <span className="text-sm text-ink-3">⌘</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) {
                close();
                shown[0].run();
              }
            }}
            placeholder="Jump to, complete a quest, create…"
            data-testid="palette-input"
            className="flex-1 bg-transparent text-[14.5px] font-semibold text-ink outline-none placeholder:text-ink-3"
          />
          <Kbd>ESC</Kbd>
        </div>
        <div className="p-2">
          {shown.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-ink-3">Không có kết quả.</div>
          )}
          {shown.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                close();
                item.run();
              }}
              data-testid="palette-item"
              className={cn(
                "flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-ink transition-colors hover:bg-surface-2",
                i === 0 && "bg-surface-2",
              )}
            >
              <span className="w-4.5 text-center text-sm">{item.icon}</span>
              <span className="flex-1 text-[13.5px] font-semibold">{item.label}</span>
              {item.kbd && <Kbd>{item.kbd}</Kbd>}
            </button>
          ))}
        </div>
      </div>
    </Backdrop>
  );
}
