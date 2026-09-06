/**
 * Read model cho UI. Không ghi gì, không mở transaction.
 *
 * ⚠️ Streak được áp phân rã Ở ĐÂY (readStreak), không phải bằng cron (§11.2).
 */

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  goals,
  notifications,
  players,
  questCompletions,
  quests,
  rewardClaims,
  rewards,
  users,
  type Goal,
  type Quest,
  type Reward,
} from "@/server/db/schema";
import { toLocalDate, unsafeLocalDate, type LocalDate } from "@/domain/date";
import { levelProgress } from "@/domain/leveling";
import {
  conditionLabel,
  progressOf,
  remainingLabel,
  type RewardProgress,
} from "@/domain/rewards";
import { questIcon } from "@/domain/xp";
import { readStreak } from "@/domain/streak";
import { notFound } from "./errors";
import { buildMetrics, loadQuestCounts, loadTotalXp } from "./metrics";

async function requireUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound("user");
  return user;
}

export type PlayerState = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRatio: number;
  streak: { current: number; longest: number };
  completedQuests: number;
  today: LocalDate;
  timezone: string;
};

export async function getPlayerState(userId: string, now = new Date()): Promise<PlayerState> {
  const user = await requireUser(userId);
  const [player] = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  if (!player) throw notFound("player");

  const today = toLocalDate(now, user.timezone);
  const streak = readStreak(
    {
      currentStreak: player.currentStreak,
      longestStreak: player.longestStreak,
      lastActiveDate: player.lastActiveDate ? unsafeLocalDate(player.lastActiveDate) : null,
    },
    today,
  );

  const [{ value: completedQuests }] = await db
    .select({ value: count() })
    .from(questCompletions)
    .where(eq(questCompletions.userId, userId));

  const progress = levelProgress(player.totalXp);

  return {
    level: progress.level,
    totalXp: player.totalXp,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    xpRatio: progress.ratio,
    streak,
    completedQuests,
    today,
    timezone: user.timezone,
  };
}

export type QuestBucket = "today" | "upcoming";

export type QuestView = Quest & {
  goalTitle: string | null;
  goalIcon: string | null;
  /** Emoji đã suy ra (§ design quest card). */
  displayIcon: string;
  /** DAILY: đã làm hôm nay. ONE_TIME: đã làm bao giờ chưa. */
  isDone: boolean;
  /** Tab Today vs Upcoming. Tab Completed lọc theo isDone. */
  bucket: QuestBucket;
  /** Dòng phụ trên card: "Every day" / "Due Sep 14" / "Done today · resets at midnight" */
  dueLabel: string;
};

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatDue(quest: Quest, isDone: boolean, today: string): string {
  if (quest.type === "DAILY") {
    return isDone ? "Done today · resets at midnight" : "Every day";
  }
  if (isDone) return "Completed";
  if (!quest.dueDate) return "No due date";
  if (quest.dueDate === today) return "Due today";
  if (quest.dueDate < today) return "Overdue";
  // Ngày lịch thuần -> ép về UTC để không bị lệch múi giờ khi format.
  return `Due ${monthDay.format(new Date(`${quest.dueDate}T00:00:00Z`))}`;
}

export async function listQuests(userId: string, now = new Date()): Promise<QuestView[]> {
  const user = await requireUser(userId);
  const today = toLocalDate(now, user.timezone);

  const rows = await db
    .select({ quest: quests, goalTitle: goals.title, goalIcon: goals.icon })
    .from(quests)
    .leftJoin(goals, eq(goals.id, quests.goalId))
    .where(and(eq(quests.userId, userId), eq(quests.isArchived, false)))
    .orderBy(desc(quests.createdAt));

  const doneToday = new Set(
    (
      await db
        .selectDistinct({ questId: questCompletions.questId })
        .from(questCompletions)
        .where(and(eq(questCompletions.userId, userId), eq(questCompletions.localDate, today)))
    ).map((r) => r.questId),
  );

  const doneEver = new Set(
    (
      await db
        .selectDistinct({ questId: questCompletions.questId })
        .from(questCompletions)
        .where(eq(questCompletions.userId, userId))
    ).map((r) => r.questId),
  );

  return rows.map(({ quest, goalTitle, goalIcon }) => {
    const isDone = quest.type === "DAILY" ? doneToday.has(quest.id) : doneEver.has(quest.id);
    // DAILY luôn thuộc hôm nay. ONE_TIME chỉ là "upcoming" khi hạn còn ở tương lai.
    const bucket: QuestBucket =
      quest.type === "DAILY" || !quest.dueDate || quest.dueDate <= today ? "today" : "upcoming";
    return {
      ...quest,
      goalTitle,
      goalIcon,
      displayIcon: questIcon(quest.icon, quest.difficulty),
      isDone,
      bucket,
      dueLabel: formatDue(quest, isDone, today),
    };
  });
}

export type GoalView = Goal & {
  totalQuests: number;
  completedQuests: number;
  percent: number;
};

/**
 * Tiến độ goal chỉ tính quest ONE_TIME. DAILY quest là việc lặp lại vô hạn,
 * đưa nó vào mẫu số thì % không bao giờ tới 100 và con số mất ý nghĩa.
 */
export async function listGoals(userId: string): Promise<GoalView[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "ACTIVE")))
    .orderBy(desc(goals.createdAt));

  if (rows.length === 0) return [];

  const goalIds = rows.map((g) => g.id);

  const totals = await db
    .select({ goalId: quests.goalId, value: count() })
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        eq(quests.isArchived, false),
        eq(quests.type, "ONE_TIME"),
        inArray(quests.goalId, goalIds),
      ),
    )
    .groupBy(quests.goalId);

  const completed = await db
    .select({
      goalId: quests.goalId,
      value: sql<number>`count(distinct ${questCompletions.questId})::int`,
    })
    .from(questCompletions)
    .innerJoin(quests, eq(quests.id, questCompletions.questId))
    .where(
      and(
        eq(questCompletions.userId, userId),
        eq(quests.type, "ONE_TIME"),
        inArray(quests.goalId, goalIds),
      ),
    )
    .groupBy(quests.goalId);

  const totalMap = new Map(totals.map((t) => [t.goalId!, t.value]));
  const doneMap = new Map(completed.map((c) => [c.goalId!, c.value]));

  return rows.map((goal) => {
    const totalQuests = totalMap.get(goal.id) ?? 0;
    const completedQuests = doneMap.get(goal.id) ?? 0;
    return {
      ...goal,
      totalQuests,
      completedQuests,
      percent: totalQuests === 0 ? 0 : Math.round((completedQuests / totalQuests) * 100),
    };
  });
}

export type RewardView = Reward & {
  progress: RewardProgress;
  goalTitle: string | null;
  /** "Complete 10 SWE quests" — dựng ở domain (§14) */
  conditionLabel: string;
  /** "3 more quests to unlock" */
  remainingLabel: string;
};

export async function listRewards(userId: string, now = new Date()): Promise<RewardView[]> {
  const state = await getPlayerState(userId, now);

  const rows = await db
    .select({ reward: rewards, goalTitle: goals.title })
    .from(rewards)
    .leftJoin(goals, eq(goals.id, rewards.goalId))
    .where(eq(rewards.userId, userId))
    .orderBy(desc(rewards.createdAt));

  const counts = await loadQuestCounts(db, userId);
  const totalXp = await loadTotalXp(db, userId);

  return rows.map(({ reward, goalTitle }) => {
    const progress = progressOf(
      {
        type: reward.conditionType,
        value: reward.conditionValue,
        baselineValue: reward.baselineValue,
      },
      buildMetrics(counts, reward.goalId, totalXp, state.streak.current),
    );
    return {
      ...reward,
      goalTitle,
      progress,
      conditionLabel: conditionLabel(reward.conditionType, reward.conditionValue, goalTitle),
      remainingLabel: remainingLabel(reward.conditionType, progress),
    };
  });
}

export async function listTrophyCase(userId: string) {
  return db
    .select()
    .from(rewardClaims)
    .where(eq(rewardClaims.userId, userId))
    .orderBy(desc(rewardClaims.claimedAt));
}

export async function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Heatmap ngày active cho màn Profile. */
export async function listActiveDates(userId: string) {
  return db
    .select({
      localDate: questCompletions.localDate,
      value: sql<number>`count(*)::int`,
    })
    .from(questCompletions)
    .where(eq(questCompletions.userId, userId))
    .groupBy(questCompletions.localDate)
    .orderBy(questCompletions.localDate);
}
