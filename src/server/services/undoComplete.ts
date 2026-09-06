/**
 * Hoàn tác hoàn thành quest. spec §10.2.
 *
 * v1 của spec thiếu hẳn phần này — và không có nó thì một cú bấm nhầm sẽ làm
 * XP lạm phát, reward unlock sai, không có cách sửa.
 *
 * Hai quy tắc:
 *   - Reward đã CLAIMED thì KHÔNG revert.
 *   - Chỉ undo được trong ngày, để không phải tính lại streak lịch sử.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  notifications,
  players,
  questCompletions,
  users,
  xpTransactions,
  type Reward,
} from "@/server/db/schema";
import { toLocalDate, unsafeLocalDate } from "@/domain/date";
import { computeStreakFromDates } from "@/domain/streak";
import { conflict, notFound } from "./errors";
import { loadActiveDates, loadQuestCounts } from "./metrics";
import { revertUnclaimedRewards, syncXpAndLevel } from "./progression";

export type UndoCompleteResult = {
  questId: string;
  xpRemoved: number;
  totalXp: number;
  level: number;
  streak: { current: number; longest: number };
  relockedRewards: Reward[];
};

export async function undoComplete(input: {
  userId: string;
  questId: string;
  now?: Date;
}): Promise<UndoCompleteResult> {
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) throw notFound("user");

    const localDate = toLocalDate(now, user.timezone);

    const [completion] = await tx
      .select()
      .from(questCompletions)
      .where(
        and(
          eq(questCompletions.userId, input.userId),
          eq(questCompletions.questId, input.questId),
          eq(questCompletions.localDate, localDate),
        ),
      )
      .limit(1);

    if (!completion) {
      throw conflict("Chỉ hoàn tác được quest đã hoàn thành trong hôm nay");
    }

    await tx
      .select()
      .from(players)
      .where(eq(players.userId, input.userId))
      .for("update")
      .limit(1);

    // 1. Xoá sự kiện ---------------------------------------------------------
    await tx.delete(questCompletions).where(eq(questCompletions.id, completion.id));

    // 2. Ledger: ghi dòng ĐẢO CHIỀU, không xoá dòng cũ (§10.3) ----------------
    await tx.insert(xpTransactions).values({
      userId: input.userId,
      amount: -completion.xpAwarded,
      source: "QUEST_UNDO",
      questCompletionId: completion.id,
    });

    // 3. XP + level ----------------------------------------------------------
    const { totalXp, level } = await syncXpAndLevel(tx, input.userId);

    // 4. Streak: tính lại từ đầu ---------------------------------------------
    // applyCompletion() không đảo ngược được, nên tính lại từ tập ngày còn lại.
    const dates = await loadActiveDates(tx, input.userId);
    const streak = computeStreakFromDates(dates.map(unsafeLocalDate));

    await tx
      .update(players)
      .set({
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActiveDate: streak.lastActiveDate,
      })
      .where(eq(players.userId, input.userId));

    // 5. Reward: chỉ hạ những cái UNLOCKED chưa claim -------------------------
    const counts = await loadQuestCounts(tx, input.userId);
    const relockedRewards = await revertUnclaimedRewards(tx, input.userId, {
      totalXp,
      currentStreak: streak.currentStreak,
      counts,
    });

    // 6. Xoá notification sinh ra bởi completion này -------------------------
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, input.userId),
          eq(notifications.questCompletionId, completion.id),
        ),
      );

    return {
      questId: input.questId,
      xpRemoved: completion.xpAwarded,
      totalXp,
      level,
      streak: { current: streak.currentStreak, longest: streak.longestStreak },
      relockedRewards,
    } satisfies UndoCompleteResult;
  });
}
