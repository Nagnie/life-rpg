'use client';

import { btn, EmptyState, ProgressBar } from '@/components/ui/primitives';
import { useUi } from '@/lib/store';
import { trpc } from '@/lib/trpc';

export default function GoalsPage() {
  const goals = trpc.goal.list.useQuery();
  const rewards = trpc.reward.list.useQuery();
  const { openGoalForm, openOnboarding } = useUi();

  const list = goals.data ?? [];
  // When a reward is linked to a goal, its emoji is displayed on that goal card.
  const rewardsByGoal = new Map<string, string[]>();
  for (const r of rewards.data ?? []) {
    if (!r.goalId) continue;
    rewardsByGoal.set(r.goalId, [
      ...(rewardsByGoal.get(r.goalId) ?? []),
      r.icon,
    ]);
  }

  return (
    <div>
      <div className='mb-4.5 flex items-center gap-2.5'>
        <p className='max-w-130 text-[13px] leading-relaxed text-ink-2'>
          A goal is the arc your quests ladder up to. Progress counts{' '}
          <strong className='text-ink'>one-off quests only</strong> — daily
          habits never “finish”.
        </p>
        <div className='flex-1' />
        <button
          onClick={openGoalForm}
          className={btn.primary}
          data-testid='new-goal-button'
        >
          + New goal
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          testId='goals-empty'
          icon='🎯'
          title='No goals yet'
          body='A goal is the arc your quests ladder up to — "Become a Strong SWE", "Read More Books".'
        >
          <button onClick={openGoalForm} className={btn.primary}>
            Create a goal
          </button>
          <button onClick={openOnboarding} className={btn.subtle}>
            Use a template
          </button>
        </EmptyState>
      ) : (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3.5'>
          {list.map((g) => (
            <div
              key={g.id}
              data-testid='goal-item'
              data-goal-title={g.title}
              className='rounded-[15px] border border-line bg-surface p-4.5 shadow-e1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-e2'
            >
              <div className='mb-4 flex items-start gap-3'>
                <div className='grid size-11 place-items-center rounded-[13px] bg-surface-2 text-[22px]'>
                  {g.icon ?? '🎯'}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-extrabold tracking-[-0.015em]'>
                    {g.title}
                  </div>
                  <div className='mt-0.5 text-xs text-ink-3'>
                    {g.totalQuests === 0
                      ? 'daily habits only'
                      : `${Math.max(0, g.totalQuests - g.completedQuests)} quests to go`}
                  </div>
                </div>
                <div className='font-display text-[22px] font-bold tracking-[-0.03em] tnum'>
                  {g.percent}
                  <span className='text-[13px] text-ink-3'>%</span>
                </div>
              </div>
              <ProgressBar
                ratio={g.percent / 100}
                className='h-2.5'
                barClassName='bg-gradient-to-r from-primary to-primary-hi'
              />
              <div className='mt-3 flex items-center justify-between'>
                <div className='font-display text-[12.5px] font-semibold text-ink-2 tnum'>
                  {g.completedQuests} / {g.totalQuests} quests
                </div>
                <div className='flex gap-1.5'>
                  {(rewardsByGoal.get(g.id) ?? [])
                    .slice(0, 3)
                    .map((icon, i) => (
                      <div
                        key={i}
                        className='grid size-6 place-items-center rounded-[7px] bg-accent-soft text-xs'
                      >
                        {icon}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
