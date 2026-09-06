"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useUi } from "@/lib/store";
import { useClaimReward } from "@/lib/hooks";
import { Backdrop } from "@/components/ui/overlay";

/* ── LEVEL UP ─────────────────────────────────────────────────────────── */

export function LevelUpModal() {
  const levelUp = useUi((s) => s.levelUp);
  const close = useUi((s) => s.closeLevelUp);
  const player = trpc.player.state.useQuery(undefined, { enabled: Boolean(levelUp) });

  if (!levelUp) return null;

  return (
    <Backdrop
      testId="levelup-modal"
      className="z-100 grid place-items-center bg-[oklch(0.15_0.02_285/.72)]"
    >
      <div className="animate-modal-in w-[420px] max-w-[92vw] rounded-[22px] border border-line bg-surface px-8 py-9 text-center shadow-e3">
        <div className="text-[11.5px] font-extrabold tracking-[0.16em] text-primary">LEVEL UP</div>

        <div className="relative mx-auto mt-5 mb-1.5 size-33">
          <div className="animate-spin-slow absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,var(--primary),var(--accent),var(--primary))]" />
          <div className="animate-ring-pulse absolute inset-1.5 grid place-items-center rounded-full bg-surface">
            <div className="font-display tracking-[-0.04em]">
              <div className="text-[10.5px] font-bold tracking-[0.1em] text-ink-3">LEVEL</div>
              <div className="text-[54px] leading-[0.95] font-bold tnum">{levelUp.to}</div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 text-[22px] font-extrabold tracking-[-0.02em]">
          You reached Level {levelUp.to}
        </div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          Hard quests are worth more now. Your daily floor stays the same — that is what keeps the
          streak alive.
        </p>

        <div className="mt-5 flex justify-center gap-2.5 text-xs text-ink-3">
          <div className="rounded-[9px] bg-surface-2 px-3 py-2 font-semibold">
            Next:{" "}
            <span className="font-display font-bold text-ink tnum">
              {(player.data?.xpForNextLevel ?? 0).toLocaleString()} XP
            </span>
          </div>
          <div className="rounded-[9px] bg-flame-soft px-3 py-2 font-bold text-flame">
            🔥 {levelUp.streak} day streak kept
          </div>
        </div>

        <button
          onClick={close}
          data-testid="levelup-continue"
          className="mt-5.5 w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold tracking-[0.02em] text-primary-ink shadow-e1 transition-colors hover:bg-primary-hi"
        >
          Continue
        </button>
        <div className="mt-2.5 font-mono text-[10.5px] text-ink-3">or press ENTER</div>
      </div>
    </Backdrop>
  );
}

/* ── REWARD UNLOCKED ──────────────────────────────────────────────────── */

const CONFETTI_COLORS = [
  "var(--accent)",
  "var(--primary)",
  "oklch(0.7 0.2 340)",
  "oklch(0.72 0.18 150)",
  "oklch(0.78 0.16 60)",
];

function Confetti() {
  // Giả ngẫu nhiên tất định: cùng một hạt luôn rơi cùng một kiểu giữa các lần
  // render, nên không bị "nhảy" khi React render lại.
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const r = (n: number) => Math.abs((Math.sin((i + 1) * n) * 1000) % 1);
        return {
          key: i,
          left: `${r(12.9) * 100}%`,
          width: `${5 + r(7.7) * 6}px`,
          height: `${9 + r(3.3) * 10}px`,
          radius: r(5.1) > 0.6 ? "50%" : "2px",
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          dx: `${(r(9.2) - 0.5) * 260}px`,
          rot: `${360 + r(4.4) * 900}deg`,
          animation: `confetti ${2.1 + r(2.2) * 2.2}s linear ${r(6.6) * 1.1}s infinite`,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute top-0"
          style={
            {
              left: p.left,
              width: p.width,
              height: p.height,
              borderRadius: p.radius,
              background: p.background,
              animation: p.animation,
              "--dx": p.dx,
              "--rot": p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function UnlockModal() {
  const unlock = useUi((s) => s.unlock);
  const dismiss = useUi((s) => s.dismissUnlock);
  const { claim, isBusy } = useClaimReward();

  if (!unlock) return null;

  return (
    <Backdrop
      testId="unlock-modal"
      className="z-110 grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,oklch(0.35_0.1_285/.8),oklch(0.12_0.02_285/.93))]"
    >
      <Confetti />
      <div className="animate-modal-in relative w-[500px] max-w-[94vw] rounded-[26px] border-[1.5px] border-accent bg-surface px-9 pt-10 pb-8.5 text-center shadow-[0_40px_90px_oklch(0_0_0/.5),0_0_70px_oklch(0.74_0.16_78/.3)]">
        <div className="text-[11.5px] font-extrabold tracking-[0.2em] text-accent-ink">
          REWARD UNLOCKED
        </div>

        <div className="relative mx-auto mt-5.5 mb-1 grid size-37.5 place-items-center">
          <div className="animate-ring-pulse absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(0.8_0.15_82/.35),transparent_65%)]" />
          <div className="animate-modal-in text-[82px] drop-shadow-[0_10px_22px_oklch(0.5_0.12_70/.45)]">
            {unlock.icon}
          </div>
        </div>

        <div className="mt-2 font-display text-[34px] font-bold tracking-[-0.03em]">
          {unlock.name}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success-soft px-3.5 py-2 text-[13px] font-bold text-success">
          ✓ {unlock.conditionLabel}
        </div>
        <p className="mx-auto mt-3.5 max-w-[360px] text-[13.5px] leading-relaxed text-pretty text-ink-2">
          You set this price yourself, and you paid it. Go and actually collect it — that is the
          whole deal.
        </p>

        <button
          onClick={() => claim(unlock.rewardId)}
          disabled={isBusy}
          data-testid="claim-button"
          className="mt-6.5 w-full rounded-[14px] bg-gradient-to-r from-accent-2 to-accent py-4.5 font-display text-base font-bold tracking-[0.1em] text-[oklch(0.2_0.05_70)] shadow-[0_10px_30px_oklch(0.74_0.16_78/.5)] transition-[filter,transform] hover:-translate-y-px hover:brightness-108 disabled:opacity-50"
        >
          CLAIM REWARD
        </button>
        <button
          onClick={dismiss}
          className="mt-3 text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
        >
          Save it for later
        </button>
      </div>
    </Backdrop>
  );
}

/* ── CLAIMED ──────────────────────────────────────────────────────────── */

export function ClaimedModal() {
  const claimed = useUi((s) => s.claimed);
  const close = useUi((s) => s.closeClaimed);

  if (!claimed) return null;

  return (
    <Backdrop
      testId="claimed-modal"
      className="z-110 grid place-items-center bg-[oklch(0.14_0.02_285/.9)] backdrop-blur-[10px]"
    >
      <div className="animate-modal-in w-[460px] max-w-[92vw] rounded-3xl border border-line bg-surface px-9 pt-11 pb-8 text-center shadow-e3">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-3xl font-extrabold text-success">
          ✓
        </div>
        <div className="mt-5 text-xs font-extrabold tracking-[0.16em] text-success">CLAIMED</div>
        <div className="mt-2.5 font-display text-[28px] font-bold tracking-[-0.025em]">
          Enjoy your {claimed.name.toLowerCase()} {claimed.icon}
        </div>
        <p className="mx-auto mt-4.5 max-w-[330px] text-[13.5px] leading-relaxed text-pretty text-ink-2">
          Logged and dated. It sits in your trophy case now as proof of the work behind it.
        </p>

        <div className="mt-5.5 flex gap-2.5 text-left">
          <div className="flex-1 rounded-[11px] bg-surface-2 px-3.5 py-3">
            <div className="text-[10.5px] font-extrabold tracking-[0.07em] text-ink-3">COST</div>
            <div className="mt-1 font-display text-[17px] font-bold">{claimed.cost}</div>
          </div>
          <div className="flex-1 rounded-[11px] bg-surface-2 px-3.5 py-3">
            <div className="text-[10.5px] font-extrabold tracking-[0.07em] text-ink-3">NEXT</div>
            <div className="mt-1 font-display text-[17px] font-bold">
              {claimed.repeatable ? "Earn it again" : "One-off"}
            </div>
          </div>
        </div>

        <button
          onClick={close}
          data-testid="claimed-close"
          className="mt-5.5 w-full rounded-xl border border-line bg-surface-2 py-3.5 text-[13.5px] font-bold text-ink transition-colors hover:bg-surface-3"
        >
          Add it to the trophy case
        </button>
      </div>
    </Backdrop>
  );
}
