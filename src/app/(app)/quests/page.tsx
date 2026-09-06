'use client';

import { useState } from 'react';

import { btn, DIFF_CLASS, EmptyState, Kbd } from '@/components/ui/primitives';
import { QuestCard } from '@/components/ui/quest-card';
import { DIFFICULTIES, Difficulty } from '@/domain/types';
import { useQuestActions } from '@/lib/hooks';
import { useUi } from '@/lib/store';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'upcoming' | 'completed';
const TABS: Tab[] = ['today', 'upcoming', 'completed'];

export default function QuestsPage() {
  const [tab, setTab] = useState<Tab>('today');
  const [goalFilter, setGoalFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');

  const quests = trpc.quest.list.useQuery();
  const goals = trpc.goal.list.useQuery();
  const { complete, undo, isBusy } = useQuestActions();
  const openQuestForm = useUi((s) => s.openQuestForm);

  const all = quests.data ?? [];
  const counts: Record<Tab, number> = {
    today: all.filter((q) => q.bucket === 'today').length,
    upcoming: all.filter((q) => q.bucket === 'upcoming').length,
    completed: all.filter((q) => q.isDone).length,
  };

  const filtered = all.filter((q) => {
    if (tab === 'completed' ? !q.isDone : q.bucket !== tab) return false;
    if (goalFilter !== 'all' && q.goalId !== goalFilter) return false;
    if (diffFilter !== 'all' && q.difficulty !== diffFilter) return false;
    return true;
  });

  const noQuestsAtAll = all.length === 0;

  return (
    <div>
      <div className='mb-3.5 flex flex-wrap items-center gap-2'>
        <div className='flex gap-1 rounded-[10px] border border-line bg-surface-2 p-1'>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid='quest-tab'
              data-tab={t}
              data-active={tab === t}
              className={cn(
                'rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-bold capitalize transition-colors',
                tab === t
                  ? 'bg-surface text-ink shadow-e1'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              {t}{' '}
              <span className='font-display opacity-55 tnum'>{counts[t]}</span>
            </button>
          ))}
        </div>

        <div className='flex-1' />

        <select
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
          data-testid='quest-goal-filter'
          className='rounded-[9px] border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink'
        >
          <option value='all'>All goals</option>
          {(goals.data ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.icon ?? '🎯'} {g.title}
            </option>
          ))}
        </select>

        <div className='flex gap-1.5'>
          {(['all', ...DIFFICULTIES] as const).map((d) => {
            const on = diffFilter === d;
            return (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={cn(
                  'rounded-full border px-2.5 py-1.5 text-[11.5px] font-extrabold tracking-[0.03em] transition-[filter] hover:brightness-105',
                  on
                    ? cn(
                        'border-transparent',
                        d === 'all'
                          ? 'bg-primary-soft text-primary'
                          : DIFF_CLASS[d],
                      )
                    : 'border-line bg-surface text-ink-3',
                )}
              >
                {d === 'all' ? 'All' : d}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          testId='quests-empty'
          icon='🗒️'
          title={
            noQuestsAtAll ? 'No quests yet' : 'Nothing matches those filters'
          }
          body={
            noQuestsAtAll
              ? 'Quests are the unit of progress — one clear action, one XP value. Start with three small ones.'
              : 'Try another tab, goal or difficulty.'
          }
        >
          {noQuestsAtAll && (
            <button onClick={openQuestForm} className={btn.primary}>
              New quest <Kbd className='ml-1 border-current opacity-70'>N</Kbd>
            </button>
          )}
        </EmptyState>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {filtered.map((q) => (
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
    </div>
  );
}
