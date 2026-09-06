"use client";

import { usePathname } from "next/navigation";
import { useUi } from "@/lib/store";
import { SCREEN_META } from "./nav-items";

export function Header() {
  const pathname = usePathname();
  const openQuestForm = useUi((s) => s.openQuestForm);
  const meta = SCREEN_META[pathname] ?? SCREEN_META["/"];

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-line bg-surface/95 px-7 py-3.5 backdrop-blur-lg">
      <div className="min-w-0">
        <div className="text-[16.5px] font-extrabold tracking-[-0.015em]">{meta.title}</div>
        <div className="text-xs text-ink-3">{meta.sub}</div>
      </div>
      <div className="flex-1" />
      <button
        onClick={openQuestForm}
        data-testid="new-quest-button"
        className="flex items-center gap-2 rounded-[9px] bg-primary px-3.5 py-2 text-[13px] font-bold text-primary-ink shadow-e1 transition-colors hover:bg-primary-hi"
      >
        New Quest
        <span className="rounded border border-current px-1 font-mono text-[10px] opacity-70">N</span>
      </button>
    </header>
  );
}
