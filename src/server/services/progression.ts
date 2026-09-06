/**
 * Phần dùng chung giữa completeQuest / undoComplete / claimReward.
 *
 * Mọi hàm ở đây nhận `tx` và PHẢI được gọi bên trong một transaction (spec §28).
 */

import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "@/server/db";
import { goals, notifications, players, rewards, type Reward } from "@/server/db/schema";
import { levelFromXp } from "@/domain/leveling";
import { conditionLabel, progressOf } from "@/domain/rewards";
import { buildMetrics, loadQuestCounts, loadTotalXp, type QuestCounts } from "./metrics";

/** Ghi lại totalXp + level từ ledger. Trả về giá trị mới. */
export async function syncXpAndLevel(
  tx: Tx,
  userId: string,
): Promise<{ totalXp: number; level: number }> {
  const totalXp = await loadTotalXp(tx, userId);
  const level = levelFromXp(totalXp);
  await tx.update(players).set({ totalXp, level }).where(eq(players.userId, userId));
  return { totalXp, level };
}

export type RewardEvaluationInput = {
  totalXp: number;
  currentStreak: number;
  counts?: QuestCounts;
};

/**
 * Đánh giá reward và unlock những cái đủ điều kiện. spec §26.
 *
 * ⚠️ CHỈ xét reward đang LOCKED. Reward đã UNLOCKED/CLAIMED bị bỏ qua, nếu
 * không mỗi lần complete quest sẽ sinh thêm một notification trùng.
 */
/**
 * Reward kèm nhãn điều kiện đã dựng sẵn.
 *
 * Modal ăn mừng cần đọc được "Complete 3 Become a Strong SWE quests" ngay khi
 * mutation trả về. Nếu để client tự ghép thì nó thiếu tên goal và phải query
 * thêm — trái với tinh thần "payload tự chứa" của §10.4.
 */
export type UnlockedReward = Reward & { conditionLabel: string };

export async function evaluateAndUnlock(
  tx: Tx,
  userId: string,
  input: RewardEvaluationInput,
): Promise<UnlockedReward[]> {
  const locked = await tx
    .select()
    .from(rewards)
    .where(and(eq(rewards.userId, userId), eq(rewards.status, "LOCKED")));

  if (locked.length === 0) return [];

  const counts = input.counts ?? (await loadQuestCounts(tx, userId));
  const now = new Date();

  const toUnlock = locked.filter((reward) => {
    const metrics = buildMetrics(counts, reward.goalId, input.totalXp, input.currentStreak);
    return progressOf(
      {
        type: reward.conditionType,
        value: reward.conditionValue,
        baselineValue: reward.baselineValue,
      },
      metrics,
    ).unlocked;
  });

  if (toUnlock.length === 0) return [];

  await tx
    .update(rewards)
    .set({ status: "UNLOCKED", unlockedAt: now })
    .where(
      inArray(
        rewards.id,
        toUnlock.map((r) => r.id),
      ),
    );

  const goalIds = [...new Set(toUnlock.map((r) => r.goalId).filter((x): x is string => x !== null))];
  const goalTitles = new Map<string, string>();
  if (goalIds.length > 0) {
    const rows = await tx
      .select({ id: goals.id, title: goals.title })
      .from(goals)
      .where(inArray(goals.id, goalIds));
    for (const row of rows) goalTitles.set(row.id, row.title);
  }

  return toUnlock.map((r) => ({
    ...r,
    status: "UNLOCKED" as const,
    unlockedAt: now,
    conditionLabel: conditionLabel(
      r.conditionType,
      r.conditionValue,
      r.goalId ? (goalTitles.get(r.goalId) ?? null) : null,
    ),
  }));
}

/**
 * Ngược lại của evaluateAndUnlock, dùng khi undo. spec §10.2.
 *
 * ⚠️ Chỉ đụng vào reward UNLOCKED-chưa-claim. Reward đã CLAIMED không bao giờ
 * revert — uống matcha rồi thì thôi.
 */
export async function revertUnclaimedRewards(
  tx: Tx,
  userId: string,
  input: RewardEvaluationInput,
): Promise<Reward[]> {
  const unlocked = await tx
    .select()
    .from(rewards)
    .where(and(eq(rewards.userId, userId), eq(rewards.status, "UNLOCKED")));

  if (unlocked.length === 0) return [];

  const counts = input.counts ?? (await loadQuestCounts(tx, userId));

  const toRelock = unlocked.filter((reward) => {
    const metrics = buildMetrics(counts, reward.goalId, input.totalXp, input.currentStreak);
    return !progressOf(
      {
        type: reward.conditionType,
        value: reward.conditionValue,
        baselineValue: reward.baselineValue,
      },
      metrics,
    ).unlocked;
  });

  if (toRelock.length === 0) return [];

  await tx
    .update(rewards)
    .set({ status: "LOCKED", unlockedAt: null })
    .where(
      inArray(
        rewards.id,
        toRelock.map((r) => r.id),
      ),
    );

  return toRelock;
}

export type NotificationDraft = {
  type: (typeof notifications.$inferInsert)["type"];
  title: string;
  message: string;
  questCompletionId?: string | null;
};

export async function pushNotifications(
  tx: Tx,
  userId: string,
  drafts: NotificationDraft[],
): Promise<(typeof notifications.$inferSelect)[]> {
  if (drafts.length === 0) return [];
  return tx
    .insert(notifications)
    .values(drafts.map((d) => ({ ...d, userId })))
    .returning();
}
