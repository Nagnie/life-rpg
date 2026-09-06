"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { celebrate, useUi } from "@/lib/store";

/** Làm mới mọi thứ mà một lần complete/undo/claim có thể đụng tới. */
export function useRefreshAll() {
  const utils = trpc.useUtils();
  return useCallback(async () => {
    await Promise.all([
      utils.player.state.invalidate(),
      utils.quest.list.invalidate(),
      utils.reward.list.invalidate(),
      utils.reward.trophyCase.invalidate(),
      utils.goal.list.invalidate(),
    ]);
  }, [utils]);
}

export function useQuestActions() {
  const refresh = useRefreshAll();
  const pushToast = useUi((s) => s.pushToast);

  const complete = trpc.quest.complete.useMutation({
    onSuccess: async (result, variables) => {
      celebrate(result, variables.title ?? "Quest");
      await refresh();
    },
    onError: (error) =>
      pushToast({ icon: "⚠️", title: "Không hoàn thành được", body: error.message }),
  });

  const undo = trpc.quest.undo.useMutation({
    onSuccess: async (result) => {
      pushToast({
        icon: "↩",
        title: "Đã hoàn tác",
        body: "Quest quay lại trạng thái chưa xong",
        right: `−${result.xpRemoved} XP`,
      });
      await refresh();
    },
    onError: (error) => pushToast({ icon: "⚠️", title: "Không hoàn tác được", body: error.message }),
  });

  return {
    complete: (questId: string, title: string) => complete.mutate({ questId, title }),
    undo: (questId: string) => undo.mutate({ questId }),
    isBusy: complete.isPending || undo.isPending,
  };
}

export function useClaimReward() {
  const refresh = useRefreshAll();
  const showClaimed = useUi((s) => s.showClaimed);
  const pushToast = useUi((s) => s.pushToast);

  const claim = trpc.reward.claim.useMutation({
    onSuccess: async ({ reward, claim: record }) => {
      showClaimed({
        icon: record.rewardIcon,
        name: record.rewardName,
        cost: String(reward.conditionValue),
        repeatable: reward.repeatable,
      });
      await refresh();
    },
    onError: (error) => pushToast({ icon: "⚠️", title: "Không claim được", body: error.message }),
  });

  return { claim: (rewardId: string) => claim.mutate({ rewardId }), isBusy: claim.isPending };
}
