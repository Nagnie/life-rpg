'use client';

import { useCallback } from 'react';

import { Overlays } from '@/components/overlays';
import { Header } from '@/components/shell/header';
import { Shortcuts } from '@/components/shell/shortcuts';
import { Sidebar } from '@/components/shell/sidebar';
import { useQuestActions } from '@/lib/hooks';
import { useUi } from '@/lib/store';
import { trpc } from '@/lib/trpc';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  const quests = trpc.quest.list.useQuery();
  const { complete } = useQuestActions();

  /**
   * Pressing the 'C' key completes the currently selected quest.
   * If nothing is selected, it picks up the first uncompleted quest of the day—pressing 'C' immediately upon opening the app also works.
   */
  const completeSelected = useCallback(() => {
    const list = quests.data ?? [];
    const selectedId = useUi.getState().selectedQuestId;
    const target =
      list.find((q) => q.id === selectedId && !q.isDone) ??
      list.find((q) => q.bucket === 'today' && !q.isDone);
    if (target) complete(target.id, target.title);
  }, [quests.data, complete]);

  return (
    <div className='flex min-h-screen bg-bg text-ink'>
      <Sidebar />
      <main className='flex min-w-0 flex-1 flex-col'>
        <Header />
        <div className='w-full max-w-295 px-7 pt-6.5 pb-16'>{children}</div>
      </main>
      <Shortcuts onComplete={completeSelected} />
      <Overlays />
    </div>
  );
}
