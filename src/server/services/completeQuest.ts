/**
 * Hoàn thành quest. spec §10.1 — TẤT CẢ trong một transaction (§28).
 *
 * Nếu bất kỳ bước nào hỏng thì rollback toàn bộ, để không rơi vào trạng thái
 * "quest = completed, XP = chưa cộng, reward = đã unlock".
 */

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  players,
  questCompletions,
  quests,
  users,
  xpTransactions,
  type Notification,
} from "@/server/db/schema";
import { toLocalDate, unsafeLocalDate, type LocalDate } from "@/domain/date";
import { applyCompletion, crossedMilestone, readStreak, type StreakState } from "@/domain/streak";
import { conflict, notFound } from "./errors";
import { hasAnyCompletion, hasCompletionOn, loadQuestCounts } from "./metrics";
import {
  evaluateAndUnlock,
  pushNotifications,
  syncXpAndLevel,
  type NotificationDraft,
  type UnlockedReward,
} from "./progression";

/** spec §10.4 — "juice payload". Client bắn animation từ chính object này. */
export type CompleteQuestResult = {
  completionId: string;
  questId: string;
  xpAwarded: number;
  totalXp: number;
  level: number;
  /** Chỉ có mặt khi vừa lên level — client dùng để bật modal Level Up. */
  levelUp?: { from: number; to: number };
  streak: { current: number; longest: number; isNewRecord: boolean; milestone: number | null };
  unlockedRewards: UnlockedReward[];
  notifications: Notification[];
};

export async function completeQuest(input: {
  userId: string;
  questId: string;
  now?: Date;
}): Promise<CompleteQuestResult> {
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    // 1. Validate ------------------------------------------------------------
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) throw notFound("user");

    const [quest] = await tx.select().from(quests).where(eq(quests.id, input.questId)).limit(1);
    if (!quest || quest.userId !== input.userId) throw notFound("quest");
    if (quest.isArchived) throw conflict("Quest đã được archive");

    const localDate = toLocalDate(now, user.timezone);

    if (quest.type === "DAILY") {
      if (await hasCompletionOn(tx, quest.id, localDate)) {
        throw conflict("Quest này hôm nay đã hoàn thành rồi");
      }
    } else if (await hasAnyCompletion(tx, quest.id)) {
      throw conflict("Quest một-lần này đã hoàn thành rồi");
    }

    // Khoá player để hai request đồng thời không cùng cộng streak.
    const [player] = await tx
      .select()
      .from(players)
      .where(eq(players.userId, input.userId))
      .for("update")
      .limit(1);
    if (!player) throw notFound("player");

    // 2. Ghi sự kiện ---------------------------------------------------------
    const [completion] = await tx
      .insert(questCompletions)
      .values({
        userId: input.userId,
        questId: quest.id,
        xpAwarded: quest.xpReward,
        completedAt: now,
        localDate,
      })
      .returning();

    // 3. Ledger --------------------------------------------------------------
    await tx.insert(xpTransactions).values({
      userId: input.userId,
      amount: quest.xpReward,
      source: "QUEST_COMPLETE",
      questCompletionId: completion.id,
    });

    // 4. XP + level ----------------------------------------------------------
    const previousLevel = player.level;
    const { totalXp, level } = await syncXpAndLevel(tx, input.userId);

    // 5. Streak --------------------------------------------------------------
    const previousState: StreakState = {
      currentStreak: player.currentStreak,
      longestStreak: player.longestStreak,
      lastActiveDate: player.lastActiveDate ? unsafeLocalDate(player.lastActiveDate) : null,
    };
    // Giá trị user ĐANG NHÌN THẤY trước cú click (đã áp phân rã) — mốc so sánh
    // đúng để bắn milestone.
    const displayedBefore = readStreak(previousState, localDate).current;
    const nextState = applyCompletion(previousState, localDate);

    await tx
      .update(players)
      .set({
        currentStreak: nextState.currentStreak,
        longestStreak: nextState.longestStreak,
        lastActiveDate: nextState.lastActiveDate,
      })
      .where(eq(players.userId, input.userId));

    const milestone = crossedMilestone(displayedBefore, nextState.currentStreak);
    const isNewRecord = nextState.longestStreak > previousState.longestStreak;

    // 6. Reward --------------------------------------------------------------
    const counts = await loadQuestCounts(tx, input.userId);
    const unlockedRewards = await evaluateAndUnlock(tx, input.userId, {
      totalXp,
      currentStreak: nextState.currentStreak,
      counts,
    });

    // 7. Notification --------------------------------------------------------
    const drafts: NotificationDraft[] = [];

    if (level > previousLevel) {
      drafts.push({
        type: "LEVEL_UP",
        title: `Level ${level}`,
        message: `Bạn đã đạt Level ${level}.`,
        questCompletionId: completion.id,
      });
    }

    if (milestone !== null) {
      drafts.push({
        type: "STREAK_MILESTONE",
        title: `${milestone} Day Streak`,
        message: `Chuỗi ${milestone} ngày liên tiếp. Giữ nhịp nhé.`,
        questCompletionId: completion.id,
      });
    }

    for (const reward of unlockedRewards) {
      drafts.push({
        type: "REWARD_UNLOCKED",
        title: `${reward.icon} ${reward.name}`,
        message: reward.description ?? reward.conditionLabel,
        questCompletionId: completion.id,
      });
    }

    const created = await pushNotifications(tx, input.userId, drafts);

    // 8. Juice payload -------------------------------------------------------
    return {
      completionId: completion.id,
      questId: quest.id,
      xpAwarded: completion.xpAwarded,
      totalXp,
      level,
      ...(level > previousLevel ? { levelUp: { from: previousLevel, to: level } } : {}),
      streak: {
        current: nextState.currentStreak,
        longest: nextState.longestStreak,
        isNewRecord,
        milestone,
      },
      unlockedRewards,
      notifications: created,
    } satisfies CompleteQuestResult;
  });
}

export type { LocalDate };
