"use client";

import { cn } from "@/lib/utils";
import type { RewardView } from "@/server/services/read";
import { ProgressBar } from "./primitives";

const nf = new Intl.NumberFormat("en-US");

/** Reward đang tiến tới. Gần đích (>=80%) thì đổi sang màu accent để "gần được rồi" nhìn thấy được. */
export function RewardProgressCard({
  reward,
  compact = false,
}: {
  reward: RewardView;
  compact?: boolean;
}) {
  const { progress } = reward;
  const close = progress.ratio >= 0.8;

  return (
    <div
      data-testid="reward-item"
      data-reward-name={reward.name}
      data-reward-status={reward.status}
      className={cn(
        "rounded-[15px] border border-line bg-surface shadow-e1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-e2",
        compact ? "px-4 py-3.5" : "p-4.5",
      )}
    >
      <div className={cn("flex items-center gap-3", compact ? "mb-3" : "mb-3.5")}>
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-xl",
            compact ? "size-9.5 bg-accent-soft text-xl" : "size-11.5 bg-surface-2 text-[23px]",
          )}
        >
          {reward.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("font-bold tracking-[-0.015em]", compact ? "text-sm" : "text-[15px]")}>
            {reward.name}
          </div>
          <div className="truncate text-[11.5px] text-ink-3">{reward.conditionLabel}</div>
        </div>
        {compact ? (
          <div
            data-testid="reward-progress"
            className={cn(
              "font-display text-sm font-bold tnum",
              close ? "text-accent-ink" : "text-ink-2",
            )}
          >
            {progress.progress} / {progress.target}
          </div>
        ) : (
          <span className="rounded-[5px] border border-line-2 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.05em] text-ink-3">
            {reward.repeatable ? "REPEATABLE" : "ONE-OFF"}
          </span>
        )}
      </div>

      {!compact && (
        <div className="mb-2 flex items-baseline gap-1.5">
          <span
            data-testid="reward-progress"
            className="font-display text-2xl font-bold tracking-[-0.03em] tnum"
          >
            {nf.format(progress.progress)} / {nf.format(progress.target)}
          </span>
          <span className="flex-1" />
          <span className="font-display text-[13px] font-bold text-ink-2 tnum">
            {Math.round(progress.ratio * 100)}%
          </span>
        </div>
      )}

      <ProgressBar
        ratio={progress.ratio}
        className={compact ? "h-2" : "h-2.5"}
        barClassName={
          close
            ? "bg-gradient-to-r from-accent-2 to-accent"
            : "bg-gradient-to-r from-primary to-primary-hi"
        }
      />
      <div className={cn("text-[11.5px] font-semibold text-ink-3", compact ? "mt-2" : "mt-2.5")}>
        {reward.remainingLabel}
      </div>
    </div>
  );
}

/** Reward đã đủ điều kiện — card duy nhất trong app có shimmer, vì nó là đích đến. */
export function RewardUnlockedCard({
  reward,
  onClaim,
  busy,
}: {
  reward: RewardView;
  onClaim: () => void;
  busy: boolean;
}) {
  return (
    <div
      data-testid="reward-item"
      data-reward-name={reward.name}
      data-reward-status={reward.status}
      className="relative overflow-hidden rounded-2xl border-[1.5px] border-accent bg-surface p-5 shadow-accent-glow"
    >
      <div className="animate-shimmer pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,oklch(0.85_0.14_85/.16)_50%,transparent_70%)] bg-[length:200%_100%]" />
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="grid size-13 place-items-center rounded-[15px] bg-accent-soft text-[27px]">
          {reward.icon}
        </div>
        <div className="flex-1">
          <div className="text-base font-extrabold tracking-[-0.015em]">{reward.name}</div>
          <div className="text-xs font-bold text-accent-ink">
            {reward.conditionLabel} ✓{" "}
            <span data-testid="reward-progress">
              {reward.progress.progress} / {reward.progress.target}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClaim}
        disabled={busy}
        data-testid="claim-button"
        className="w-full rounded-[11px] bg-gradient-to-r from-accent-2 to-accent py-3.5 font-display text-sm font-bold tracking-[0.08em] text-[oklch(0.2_0.05_70)] shadow-[0_6px_18px_oklch(0.74_0.16_78/.4)] transition-[filter] hover:brightness-107 disabled:opacity-50"
      >
        CLAIM
      </button>
    </div>
  );
}

/** Tủ cúp — bằng chứng cho công sức đã bỏ ra (§17.2). */
export function TrophyItem({
  icon,
  name,
  claimedOn,
}: {
  icon: string;
  name: string;
  claimedOn: string;
}) {
  return (
    <div className="text-center" data-testid="trophy-item" data-trophy-name={name}>
      <div className="grid h-24 place-items-center rounded-t-[14px] bg-[radial-gradient(ellipse_at_50%_100%,var(--accent-soft),transparent_70%)]">
        <div className="text-[40px] drop-shadow-[0_6px_10px_oklch(0.5_0.1_70/.3)]">{icon}</div>
      </div>
      <div className="h-2 rounded-[3px] bg-gradient-to-r from-accent-2 to-accent shadow-e1" />
      <div className="mx-auto h-2.5 w-[70%] rounded-b-md bg-surface-3" />
      <div className="mt-2.5 text-[13px] font-bold tracking-[-0.01em]">{name}</div>
      <div className="mt-0.5 text-[11px] text-ink-3">{claimedOn}</div>
      <div className="mt-1.5 inline-block rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.05em] text-success">
        CLAIMED ✓
      </div>
    </div>
  );
}
