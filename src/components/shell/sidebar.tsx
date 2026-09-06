"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/primitives";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const player = trpc.player.state.useQuery();
  const { theme, toggleTheme, openPalette } = useUi();

  const p = player.data;

  return (
    <aside className="sticky top-0 flex h-screen w-[244px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2.5 px-4.5 pt-5 pb-3.5">
        <div className="grid size-[30px] place-items-center rounded-[9px] bg-primary font-display text-[15px] font-bold text-primary-ink shadow-e1">
          L
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-[-0.01em]">Life RPG</div>
          <div className="text-[11px] tracking-[0.04em] text-ink-3">REAL REWARDS</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2.5 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid="nav-link"
              data-nav={item.label}
              data-active={active}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[13.5px] transition-colors",
                active
                  ? "bg-primary-soft font-bold text-primary"
                  : "font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span className={cn("w-4.5 text-center text-sm", active ? "opacity-100" : "opacity-65")}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              <span
                className={cn(
                  "rounded border border-line px-1 py-px font-mono text-[10px] text-ink-3",
                  active ? "opacity-90" : "opacity-45",
                )}
              >
                {item.kbd}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mx-3 mb-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-baseline gap-[3px] rounded-[7px] bg-primary px-2 py-[3px] font-display font-bold tracking-[-0.02em] text-primary-ink">
            <span className="text-[10px] opacity-75">Lv.</span>
            <span className="text-[15px] tnum">{p?.level ?? "—"}</span>
          </div>
          <div className="flex items-center gap-[3px] font-display text-[13px] font-bold text-flame">
            <span className="animate-flame inline-block">🔥</span>
            <span className="tnum">{p?.streak.current ?? 0}</span>
          </div>
        </div>
        <ProgressBar ratio={p?.xpRatio ?? 0} className="h-1.5" />
        <div className="mt-1.5 font-display text-[11px] text-ink-3 tnum">
          {(p?.xpIntoLevel ?? 0).toLocaleString()} / {(p?.xpForNextLevel ?? 0).toLocaleString()} XP
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-4">
        <button
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="flex-1 rounded-lg border border-line bg-surface-2 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
        </button>
        <button
          onClick={openPalette}
          aria-label="Command palette"
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] text-ink-3 transition-colors hover:text-ink"
        >
          ⌘K
        </button>
      </div>
    </aside>
  );
}
