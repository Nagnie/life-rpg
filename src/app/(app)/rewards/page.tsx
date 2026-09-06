'use client';

import { btn, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { RewardProgressCard, RewardUnlockedCard, TrophyItem } from '@/components/ui/reward-card';
import { useClaimReward } from '@/lib/hooks';
import { useUi } from '@/lib/store';
import { trpc } from '@/lib/trpc';

const claimedOn = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default function RewardsPage() {
  const rewards = trpc.reward.list.useQuery();
  const trophies = trpc.reward.trophyCase.useQuery();
  const openRewardForm = useUi((s) => s.openRewardForm);
  const { claim, isBusy } = useClaimReward();

  const list = rewards.data ?? [];
  const unlocked = list.filter((r) => r.status === 'UNLOCKED');
  const active = list.filter((r) => r.status === 'LOCKED');
  const trophyCase = trophies.data ?? [];

  return (
    <div>
      <div className='mb-4.5 flex items-center gap-2.5'>
        <p className='max-w-130 text-[13px] leading-relaxed text-ink-2'>
          Rewards are{' '}
          <strong className='text-ink'>real things you give yourself</strong>.
          You set the price in quests, XP or streak days — the app just keeps
          you honest.
        </p>
        <div className='flex-1' />
        <button
          onClick={openRewardForm}
          className={btn.primary}
          data-testid='new-reward-button'
        >
          + New reward
        </button>
      </div>

      {list.length === 0 && trophyCase.length === 0 ? (
        <EmptyState
          testId='rewards-empty'
          icon='🍵'
          title='Nothing on the line yet'
          body='Name one small thing you actually want — a matcha, an evening of games — and what it costs in quests.'
        >
          <button onClick={openRewardForm} className={btn.primary}>
            Create first reward
          </button>
        </EmptyState>
      ) : (
        <div className='flex flex-col gap-6.5'>
          {unlocked.length > 0 && (
            <section>
              <div className='mb-3 flex items-center gap-2.5'>
                <div className='text-[11.5px] font-extrabold tracking-widest text-accent-ink'>
                  UNLOCKED — READY TO CLAIM
                </div>
                <div className='h-px flex-1 bg-linear-to-r from-accent to-transparent' />
              </div>
              <div className='grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5'>
                {unlocked.map((r) => (
                  <RewardUnlockedCard
                    key={r.id}
                    reward={r}
                    busy={isBusy}
                    onClaim={() => claim(r.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section>
              <SectionHeader title='ACTIVE — IN PROGRESS' />
              <div className='grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5'>
                {active.map((r) => (
                  <RewardProgressCard key={r.id} reward={r} />
                ))}
              </div>
            </section>
          )}

          {trophyCase.length > 0 && (
            <section>
              <SectionHeader
                title='TROPHY CASE — CLAIMED'
                badge={trophyCase.length}
                hint='Everything here you earned and actually collected'
              />
              <div className='rounded-2xl border border-line bg-linear-to-b from-surface to-surface-2 px-5.5 pt-5.5 pb-2'>
                <div className='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4.5'>
                  {trophyCase.map((t) => (
                    <TrophyItem
                      key={t.id}
                      icon={t.rewardIcon}
                      name={t.rewardName}
                      claimedOn={claimedOn.format(t.claimedAt)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
