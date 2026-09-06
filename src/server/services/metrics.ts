/**
 * Đọc các chỉ số tiến độ mà reward engine cần. spec §25.
 *
 * Mỗi reward có thể scope theo một goal khác nhau, nên questCount không phải
 * một con số duy nhất. Thay vì query mỗi reward một lần, lấy MỘT lần đếm theo
 * từng goal rồi tra bảng.
 */

import { and, eq, sql } from "drizzle-orm";
import type { Executor } from "@/server/db";
import { questCompletions, quests, xpTransactions } from "@/server/db/schema";
import type { ProgressMetrics } from "@/domain/rewards";

export type QuestCounts = {
  /** Tổng số completion của user. */
  total: number;
  /** Số completion theo từng goalId. Quest không thuộc goal nào không có mặt ở đây. */
  byGoal: Map<string, number>;
};

export async function loadQuestCounts(tx: Executor, userId: string): Promise<QuestCounts> {
  const rows = await tx
    .select({
      goalId: quests.goalId,
      count: sql<number>`count(*)::int`,
    })
    .from(questCompletions)
    .innerJoin(quests, eq(quests.id, questCompletions.questId))
    .where(eq(questCompletions.userId, userId))
    .groupBy(quests.goalId);

  const byGoal = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    total += row.count;
    if (row.goalId) byGoal.set(row.goalId, row.count);
  }
  return { total, byGoal };
}

export function questCountFor(counts: QuestCounts, goalId: string | null): number {
  return goalId ? (counts.byGoal.get(goalId) ?? 0) : counts.total;
}

/** ⚠️ Ledger là source of truth cho XP (§10.3), không phải player.totalXp. */
export async function loadTotalXp(tx: Executor, userId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int` })
    .from(xpTransactions)
    .where(eq(xpTransactions.userId, userId));
  return row?.total ?? 0;
}

/** Các ngày distinct user đã active — dùng để tính lại streak sau undo (§10.2). */
export async function loadActiveDates(tx: Executor, userId: string): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ localDate: questCompletions.localDate })
    .from(questCompletions)
    .where(eq(questCompletions.userId, userId))
    .orderBy(questCompletions.localDate);
  return rows.map((r) => r.localDate);
}

export async function hasCompletionOn(
  tx: Executor,
  questId: string,
  localDate: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: questCompletions.id })
    .from(questCompletions)
    .where(and(eq(questCompletions.questId, questId), eq(questCompletions.localDate, localDate)))
    .limit(1);
  return Boolean(row);
}

export async function hasAnyCompletion(tx: Executor, questId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: questCompletions.id })
    .from(questCompletions)
    .where(eq(questCompletions.questId, questId))
    .limit(1);
  return Boolean(row);
}

export function buildMetrics(
  counts: QuestCounts,
  goalId: string | null,
  totalXp: number,
  currentStreak: number,
): ProgressMetrics {
  return { questCount: questCountFor(counts, goalId), totalXp, currentStreak };
}
