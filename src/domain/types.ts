/**
 * Kiểu dùng chung cho domain layer.
 *
 * QUY TẮC: mọi thứ trong src/domain/ là TypeScript thuần.
 * KHÔNG import Drizzle, KHÔNG import tRPC, KHÔNG chạm DB.
 * Nhờ vậy chúng test được mà không cần database (PLAN.md nguyên tắc #2).
 */

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EPIC"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUEST_TYPES = ["ONE_TIME", "DAILY"] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** spec §16 — đã bỏ ELIGIBLE của v1, việc đánh giá là đồng bộ trong transaction. */
export const REWARD_STATUSES = ["LOCKED", "UNLOCKED", "CLAIMED"] as const;
export type RewardStatus = (typeof REWARD_STATUSES)[number];

/** spec §14 */
export const CONDITION_TYPES = ["QUEST_COUNT", "XP_TOTAL", "STREAK"] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

/** spec §10.3 — ledger */
export const XP_SOURCES = ["QUEST_COMPLETE", "QUEST_UNDO", "ADJUSTMENT"] as const;
export type XpSource = (typeof XP_SOURCES)[number];

/** spec §19 */
export const NOTIFICATION_TYPES = [
  "LEVEL_UP",
  "REWARD_UNLOCKED",
  "STREAK_MILESTONE",
  "GOAL_COMPLETED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Mốc streak được ăn mừng riêng (spec §19 STREAK_MILESTONE). */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;
