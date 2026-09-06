"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/domain/types";

/* ── phím tắt ─────────────────────────────────────────────────────────── */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded border border-line px-1.5 py-px font-mono text-[10.5px] text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── thanh tiến độ ────────────────────────────────────────────────────── */

export function ProgressBar({
  ratio,
  className,
  barClassName,
  glow = false,
}: {
  ratio: number;
  className?: string;
  barClassName?: string;
  glow?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
          barClassName ?? "bg-gradient-to-r from-accent-2 to-accent",
        )}
        style={{
          width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
          boxShadow: glow ? "var(--glow-xp)" : undefined,
        }}
      />
    </div>
  );
}

/* ── vòng tròn level ──────────────────────────────────────────────────── */

export function LevelRing({
  level,
  ratio,
  size,
  label = "LVL",
  color = "var(--accent)",
  testId,
}: {
  level: number;
  ratio: number;
  size: number;
  label?: string;
  color?: string;
  testId?: string;
}) {
  const inset = Math.round(size * 0.083);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full transition-[background] duration-700"
        style={{
          background: `conic-gradient(${color} ${Math.round(ratio * 360)}deg, var(--surface-3) 0deg)`,
        }}
      />
      <div
        className="absolute grid place-items-center rounded-full bg-surface"
        style={{ inset }}
      >
        <div className="text-center font-display tracking-[-0.03em]">
          <div className="text-[10px] font-semibold text-ink-3">{label}</div>
          <div
            data-testid={testId}
            className="font-bold leading-none tnum"
            style={{ fontSize: Math.round(size * 0.31) }}
          >
            {level}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── nhãn difficulty ──────────────────────────────────────────────────── */

const DIFF_CLASS: Record<Difficulty, string> = {
  EASY: "bg-easy-bg text-easy-fg",
  MEDIUM: "bg-medium-bg text-medium-fg",
  HARD: "bg-hard-bg text-hard-fg",
  EPIC: "bg-epic-bg text-epic-fg shadow-epic",
};

export function DiffBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold tracking-[0.04em]",
        DIFF_CLASS[difficulty],
      )}
    >
      {difficulty}
    </span>
  );
}

export { DIFF_CLASS };

/* ── tiêu đề mục ──────────────────────────────────────────────────────── */

export function SectionHeader({
  title,
  badge,
  hint,
  action,
}: {
  title: string;
  badge?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className="text-[11.5px] font-extrabold tracking-[0.1em] text-ink-3">{title}</div>
      {badge !== undefined && badge !== null && (
        <div className="rounded-full bg-surface-3 px-1.5 py-px font-display text-[11.5px] font-bold text-ink-2">
          {badge}
        </div>
      )}
      <div className="h-px flex-1 bg-line" />
      {hint && <div className="text-[11.5px] text-ink-3">{hint}</div>}
      {action}
    </div>
  );
}

/* ── trạng thái rỗng ──────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  body,
  children,
  testId,
}: {
  icon: string;
  title: string;
  body: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="animate-rise rounded-2xl border border-dashed border-line-2 bg-surface px-8 py-14 text-center"
    >
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-2xl text-primary">
        {icon}
      </div>
      <div className="text-[19px] font-extrabold tracking-[-0.015em]">{title}</div>
      <p className="mx-auto mt-2 mb-5 max-w-[430px] text-[13.5px] leading-relaxed text-pretty text-ink-2">
        {body}
      </p>
      {children && <div className="flex justify-center gap-2.5">{children}</div>}
    </div>
  );
}

/* ── nút ──────────────────────────────────────────────────────────────── */

export const btn = {
  primary:
    "rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-bold text-primary-ink shadow-e1 transition-colors hover:bg-primary-hi disabled:opacity-40",
  subtle:
    "rounded-[10px] border border-line bg-surface-2 px-4 py-2.5 text-[13.5px] font-bold text-ink transition-colors hover:bg-surface-3 disabled:opacity-40",
  ghost: "text-[13px] font-bold text-ink-3 transition-colors hover:text-ink",
  gold: "rounded-xl bg-gradient-to-r from-accent-2 to-accent font-display font-bold tracking-[0.08em] transition-[filter] hover:brightness-110 disabled:opacity-40",
};
