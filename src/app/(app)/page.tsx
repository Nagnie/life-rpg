'use client';

import Link from 'next/link';

import {
  btn,
  EmptyState,
  Kbd,
  LevelRing,
  ProgressBar,
  SectionHeader,
} from '@/components/ui/primitives';
import { QuestCard } from '@/components/ui/quest-card';
import { RewardProgressCard } from '@/components/ui/reward-card';
import { useQuestActions } from '@/lib/hooks';
import { useUi } from '@/lib/store';
import { trpc } from '@/lib/trpc';

export default function DashboardPage() {
  const player = trpc.player.state.useQuery();
  const quests = trpc.quest.list.useQuery();
  const rewards = trpc.reward.list.useQuery();
  const goals = trpc.goal.list.useQuery();
  const { complete, undo, isBusy } = useQuestActions();
  const { openOnboarding, openQuestForm } = useUi();

  const p = player.data;
  const today = (quests.data ?? []).filter((q) => q.bucket === 'today');
  const active = (rewards.data ?? [])
    .filter((r) => r.status === 'LOCKED')
    .slice(0, 3);
  const goalList = goals.data ?? [];
  const doneToday = today.filter((q) => q.isDone).length;

  const nothingYet =
    quests.isSuccess &&
    goals.isSuccess &&
    (quests.data?.length ?? 0) === 0 &&
    goalList.length === 0;

  if (player.error) {
    return (
      <div className='rounded-2xl border border-danger/40 bg-surface p-6 text-sm'>
        <p className='font-bold text-danger'>{player.error.message}</p>
        <p className='mt-2 text-ink-2'>
          Chạy: pnpm db:push &amp;&amp; pnpm db:seed
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5.5'>
      {/* ── hero ─────────────────────────────────────────────────────── */}
      <section
        data-testid='player-header'
        className='animate-rise relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-5.5 shadow-e2'
      >
        <div className='flex flex-wrap items-center gap-5.5'>
          <LevelRing
            level={p?.level ?? 1}
            ratio={p?.xpRatio ?? 0}
            size={84}
            testId='player-level'
          />

          <div className='min-w-85 flex-1'>
            <div className='mb-2.5 flex items-baseline gap-2.5'>
              <div
                data-testid='player-xp-into-level'
                className='font-display text-3xl font-bold tracking-[-0.03em] tnum'
              >
                {(p?.xpIntoLevel ?? 0).toLocaleString()}
              </div>
              <div className='font-display text-[15px] text-ink-3 tnum'>
                / {(p?.xpForNextLevel ?? 0).toLocaleString()} XP
              </div>
              <div className='text-xs font-semibold text-ink-3'>
                {Math.max(
                  0,
                  (p?.xpForNextLevel ?? 0) - (p?.xpIntoLevel ?? 0),
                ).toLocaleString()}{' '}
                XP to Lv. {(p?.level ?? 1) + 1}
              </div>
            </div>
            <ProgressBar ratio={p?.xpRatio ?? 0} className='h-3' glow />
          </div>

          <div className='flex gap-2.5'>
            <div className='min-w-24 rounded-xl bg-flame-soft px-4 py-3 text-center'>
              <div className='animate-flame text-xl'>🔥</div>
              <div
                data-testid='player-streak'
                className='font-display text-[22px] font-bold tracking-[-0.02em] text-flame tnum'
              >
                {p?.streak.current ?? 0}
              </div>
              <div className='text-[10.5px] font-bold tracking-[0.06em] text-ink-3'>
                DAY STREAK
              </div>
            </div>
            <div className='min-w-24 rounded-xl bg-surface-2 px-4 py-3 text-center'>
              <div className='text-xl'>⚔️</div>
              <div
                data-testid='player-completed'
                className='font-display text-[22px] font-bold tracking-[-0.02em] tnum'
              >
                {p?.completedQuests ?? 0}
              </div>
              <div className='text-[10.5px] font-bold tracking-[0.06em] text-ink-3'>
                QUESTS DONE
              </div>
            </div>
          </div>
        </div>
        <div className='absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-primary to-accent' />
        <span className='hidden' data-testid='player-total-xp'>
          {p?.totalXp ?? 0}
        </span>
      </section>

      {nothingYet ? (
        <EmptyState
          testId='dashboard-empty'
          icon='⚔️'
          title="Your adventure hasn't started yet"
          body="Pick a starter template and we'll fill in your first goal, three quests and one real-world reward. You can edit everything after."
        >
          <button
            onClick={openOnboarding}
            className={btn.primary}
            data-testid='open-onboarding'
          >
            Choose a template
          </button>
          <button onClick={openQuestForm} className={btn.subtle}>
            Start from scratch
          </button>
        </EmptyState>
      ) : (
        <>
          <section>
            <SectionHeader
              title="TODAY'S QUESTS"
              badge={`${doneToday}/${today.length} done`}
              hint={
                <>
                  Select a card and press <Kbd>C</Kbd> to complete
                </>
              }
            />
            {today.length === 0 ? (
              <div className='rounded-[13px] border border-dashed border-line-2 bg-surface px-5 py-8 text-center text-[13px] text-ink-2'>
                Không có quest nào cho hôm nay.
              </div>
            ) : (
              <div className='flex flex-col gap-2.5'>
                {today.map((q) => (
                  <QuestCard
                    key={q.id}
                    quest={q}
                    busy={isBusy}
                    onComplete={() => complete(q.id, q.title)}
                    onUndo={() => undo(q.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {active.length > 0 && (
            <section>
              <SectionHeader
                title='ACTIVE REWARDS'
                action={
                  <Link
                    href='/rewards'
                    className='text-xs font-bold text-primary hover:underline'
                  >
                    All rewards →
                  </Link>
                }
              />
              <div className='grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3'>
                {active.map((r) => (
                  <RewardProgressCard key={r.id} reward={r} compact />
                ))}
              </div>
            </section>
          )}

          {goalList.length > 0 && (
            <section>
              <SectionHeader title='GOALS' />
              <div className='overflow-hidden rounded-[13px] border border-line bg-surface'>
                {goalList.map((g, i) => (
                  <div
                    key={g.id}
                    data-testid='goal-item'
                    data-goal-title={g.title}
                    className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <div className='text-[17px]'>{g.icon ?? '🎯'}</div>
                    <div className='w-47.5 shrink-0 text-[13.5px] font-bold tracking-[-0.01em]'>
                      {g.title}
                    </div>
                    <ProgressBar
                      ratio={g.percent / 100}
                      className='h-2 min-w-20 flex-1'
                      barClassName='bg-gradient-to-r from-primary to-primary-hi'
                    />
                    {/* Goal chỉ có DAILY quest thì "0 / 0 · 0%" là con số vô
                        nghĩa — nói thẳng ra thay vì hiện số không. */}
                    {g.totalQuests === 0 ? (
                      <div className='w-32 shrink-0 text-right text-[12.5px] text-ink-3'>
                        daily habits only
                      </div>
                    ) : (
                      <>
                        <div className='w-21 shrink-0 text-right font-display text-[12.5px] text-ink-3 tnum'>
                          {g.completedQuests} / {g.totalQuests}
                        </div>
                        <div className='w-11 shrink-0 text-right font-display text-sm font-bold tnum'>
                          {g.percent}%
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
