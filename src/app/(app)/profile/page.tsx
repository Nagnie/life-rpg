'use client';

import { LevelRing, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { trpc } from '@/lib/trpc';

/** 26-week heatmap (182 days), arranged in 7-day columns like a contribution graph. */
const WEEKS = 26;
const DAYS = WEEKS * 7;

function heatColor(count: number): string {
  if (count <= 0) return 'var(--surface-2)';
  const level = Math.min(4, count);
  return `color-mix(in oklab, var(--primary) ${18 + level * 20}%, var(--surface-2))`;
}

const dayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export default function ProfilePage() {
  const player = trpc.player.state.useQuery();
  const activeDates = trpc.player.activeDates.useQuery();

  const p = player.data;
  const byDate = new Map(
    (activeDates.data ?? []).map((d) => [d.localDate, d.value]),
  );

  // Dựng lưới lùi từ hôm nay. Dùng UTC để không lệch ngày khi qua DST.
  const cells: { date: string; count: number }[] = [];
  if (p) {
    const end = Date.parse(`${p.today}T00:00:00Z`);
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
      cells.push({ date, count: byDate.get(date) ?? 0 });
    }
  }

  const activeDays = cells.filter((c) => c.count > 0).length;

  const stats = [
    { label: 'LEVEL', value: p?.level ?? 0, unit: '', color: 'text-ink' },
    {
      label: 'TOTAL XP',
      value: p?.totalXp ?? 0,
      unit: 'xp',
      color: 'text-accent-ink',
    },
    {
      label: 'CURRENT STREAK',
      value: p?.streak.current ?? 0,
      unit: 'days',
      color: (p?.streak.current ?? 0) > 0 ? 'text-flame' : 'text-ink-3',
    },
    {
      label: 'LONGEST STREAK',
      value: p?.streak.longest ?? 0,
      unit: 'days',
      color: 'text-ink',
    },
    {
      label: 'QUESTS COMPLETED',
      value: p?.completedQuests ?? 0,
      unit: '',
      color: 'text-ink',
    },
  ];

  return (
    <div className='flex flex-col gap-5'>
      <section className='flex flex-wrap items-center gap-5.5 rounded-2xl border border-line bg-surface px-6 py-5.5 shadow-e1'>
        <LevelRing
          level={p?.level ?? 1}
          ratio={p?.xpRatio ?? 0}
          size={96}
          label='LEVEL'
          color='var(--primary)'
        />
        <div className='min-w-50 flex-1'>
          <div className='text-xl font-extrabold tracking-[-0.02em]'>
            Player
          </div>
          <div className='mt-1 text-[13px] text-ink-2'>
            Level {p?.level ?? 1} · {p?.timezone ?? '—'}
          </div>
          <ProgressBar
            ratio={p?.xpRatio ?? 0}
            className='mt-3 h-2.5 max-w-85'
          />
          <div className='mt-1.5 font-display text-xs text-ink-3 tnum'>
            {Math.max(
              0,
              (p?.xpForNextLevel ?? 0) - (p?.xpIntoLevel ?? 0),
            ).toLocaleString()}{' '}
            XP to next level
          </div>
        </div>
      </section>

      <div className='grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-3'>
        {stats.map((s) => (
          <div
            key={s.label}
            data-testid='stat-tile'
            data-stat={s.label}
            className='rounded-[14px] border border-line bg-surface px-4.5 py-4'
          >
            <div className='text-[11px] font-extrabold tracking-[0.08em] text-ink-3'>
              {s.label}
            </div>
            <div className='mt-2 flex items-baseline gap-1.5'>
              <span
                className={`font-display text-[28px] font-bold tracking-[-0.03em] tnum ${s.color}`}
              >
                {s.value.toLocaleString()}
              </span>
              <span className='text-[12.5px] font-semibold text-ink-3'>
                {s.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className='rounded-2xl border border-line bg-surface px-5.5 py-5'>
        <SectionHeader
          title={`ACTIVITY — LAST ${WEEKS} WEEKS`}
          hint={
            <div className='flex items-center gap-1.5'>
              <span>less</span>
              {[0, 1, 2, 3, 4].map((v) => (
                <div
                  key={v}
                  className='size-2.5 rounded-[3px]'
                  style={{ background: heatColor(v) }}
                />
              ))}
              <span>more</span>
            </div>
          }
        />
        <div className='grid grid-flow-col grid-rows-7 gap-0.75 overflow-x-auto pb-1'>
          {cells.map((c) => (
            <div
              key={c.date}
              title={`${dayLabel.format(new Date(`${c.date}T00:00:00Z`))} · ${c.count} quests`}
              className='size-3 rounded-[3px]'
              style={{ background: heatColor(c.count) }}
            />
          ))}
        </div>
        <div className='mt-3 text-xs text-ink-3'>
          {activeDays === 0
            ? 'Complete your first quest and this grid starts filling in.'
            : `${activeDays} active ${activeDays === 1 ? 'day' : 'days'} in the last ${WEEKS} weeks · longest run ${p?.streak.longest ?? 0} ${
                (p?.streak.longest ?? 0) === 1 ? 'day' : 'days'
              }`}
        </div>
      </section>
    </div>
  );
}
