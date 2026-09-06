/**
 * Drizzle schema — spec §24 (v2).
 *
 * Ba bảng MỚI so với v1, mỗi bảng sửa một lỗi thiết kế:
 *   quest_completion  §9.3   — tách sự kiện khỏi định nghĩa quest
 *   xp_transaction    §10.3  — ledger, để undo đảo ngược được
 *   reward_claim      §16.1  — lịch sử claim cho reward repeatable
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  CONDITION_TYPES,
  DIFFICULTIES,
  GOAL_STATUSES,
  NOTIFICATION_TYPES,
  QUEST_TYPES,
  REWARD_STATUSES,
  XP_SOURCES,
} from "@/domain/types";

export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES);
export const questTypeEnum = pgEnum("quest_type", QUEST_TYPES);
export const goalStatusEnum = pgEnum("goal_status", GOAL_STATUSES);
export const rewardStatusEnum = pgEnum("reward_status", REWARD_STATUSES);
export const conditionTypeEnum = pgEnum("condition_type", CONDITION_TYPES);
export const xpSourceEnum = pgEnum("xp_source", XP_SOURCES);
export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------- user

export const users = pgTable("user", {
  id: id(),
  name: text().notNull(),
  email: text().notNull().unique(),
  /** ⚠️ spec §11.1 — IANA. Thiếu field này thì toàn bộ streak vô nghĩa. */
  timezone: text().notNull().default("Asia/Ho_Chi_Minh"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------- player

export const players = pgTable("player", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Cache của SUM(xp_transaction.amount). Ledger là source of truth (§10.3). */
  totalXp: integer().notNull().default(0),
  /** ⚠️ DERIVED từ totalXp (§7.1). Chỉ là cache để đọc nhanh. */
  level: integer().notNull().default(1),
  /** Giá trị tại lần active gần nhất. Phân rã được áp lúc ĐỌC (§11.2). */
  currentStreak: integer().notNull().default(0),
  longestStreak: integer().notNull().default(0),
  lastActiveDate: date(),
});

// ---------------------------------------------------------------- goal

export const goals = pgTable(
  "goal",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text(),
    /** Chỉ là nhãn hiển thị. KHÔNG dùng trong reward condition (§14.1). */
    category: text(),
    icon: text(),
    status: goalStatusEnum().notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (t) => [index("goal_user_idx").on(t.userId, t.status)],
);

// ---------------------------------------------------------------- quest (định nghĩa)

export const quests = pgTable(
  "quest",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** ⚠️ nullable — không bắt tạo Goal trước mới được tạo Quest (§9.2). */
    goalId: uuid().references(() => goals.id, { onDelete: "set null" }),
    title: text().notNull(),
    description: text(),
    /** Emoji hiển thị trên quest card. Null thì suy ra theo difficulty. */
    icon: text(),
    type: questTypeEnum().notNull().default("ONE_TIME"),
    difficulty: difficultyEnum().notNull().default("MEDIUM"),
    xpReward: integer().notNull(),
    /** ⚠️ thay cho `status` của v1. Trạng thái done được SUY RA từ completions. */
    isArchived: boolean().notNull().default(false),
    dueDate: date(),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (t) => [
    index("quest_user_idx").on(t.userId, t.isArchived),
    index("quest_goal_idx").on(t.goalId),
  ],
);

// ---------------------------------------------------------------- quest_completion (sự kiện) ⚠️ MỚI

export const questCompletions = pgTable(
  "quest_completion",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    /** ⚠️ Snapshot. User sửa quest.xpReward sau này không được đổi lịch sử (§9.3). */
    xpAwarded: integer().notNull(),
    completedAt: createdAt(),
    /** ⚠️ Ngày theo timezone của user, tính sẵn lúc ghi (§9.3). */
    localDate: date().notNull(),
  },
  (t) => [
    /** ⚠️ DAILY quest: mỗi ngày tối đa một lần. */
    uniqueIndex("quest_completion_per_day").on(t.questId, t.localDate),
    index("quest_completion_streak_idx").on(t.userId, t.localDate),
    index("quest_completion_count_idx").on(t.userId, t.questId),
  ],
);

// ---------------------------------------------------------------- xp_transaction (ledger) ⚠️ MỚI

export const xpTransactions = pgTable(
  "xp_transaction",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Có thể âm — undo ghi một dòng đảo chiều, KHÔNG xoá dòng cũ (§10.3). */
    amount: integer().notNull(),
    source: xpSourceEnum().notNull(),
    questCompletionId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index("xp_transaction_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------- reward

export const rewards = pgTable(
  "reward",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    icon: text().notNull().default("🎁"),
    conditionType: conditionTypeEnum().notNull(),
    conditionValue: integer().notNull(),
    /** Chỉ dùng với QUEST_COUNT. `category` KHÔNG còn được dùng ở đây (§14.1). */
    goalId: uuid().references(() => goals.id, { onDelete: "set null" }),
    /** ⚠️ §14.2 — thiếu field này thì MỌI reward tạo mới unlock ngay lập tức. */
    baselineValue: integer().notNull().default(0),
    /** ⚠️ §16.1 — thiếu field này thì app cạn reward sau vài lần claim. */
    repeatable: boolean().notNull().default(false),
    status: rewardStatusEnum().notNull().default("LOCKED"),
    unlockedAt: timestamp({ withTimezone: true }),
    claimedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("reward_user_status_idx").on(t.userId, t.status)],
);

// ---------------------------------------------------------------- reward_claim ⚠️ MỚI

/**
 * Trophy case (§16.1). Phải là bảng riêng vì reward.claimedAt bị reset mỗi
 * lần lặp lại, nên lịch sử không thể sống trên chính row reward.
 */
export const rewardClaims = pgTable(
  "reward_claim",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewardId: uuid()
      .notNull()
      .references(() => rewards.id, { onDelete: "cascade" }),
    /** Chụp lại để trophy case vẫn đúng nếu user đổi tên reward sau này. */
    rewardName: text().notNull(),
    rewardIcon: text().notNull(),
    claimedAt: createdAt(),
  },
  (t) => [index("reward_claim_user_idx").on(t.userId, t.claimedAt)],
);

// ---------------------------------------------------------------- notification

export const notifications = pgTable(
  "notification",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum().notNull(),
    title: text().notNull(),
    message: text().notNull(),
    read: boolean().notNull().default(false),
    /** Cho phép undo xoá đúng notification đã sinh ra bởi completion đó (§10.2). */
    questCompletionId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [
    index("notification_user_idx").on(t.userId, t.read, t.createdAt),
    index("notification_completion_idx").on(t.questCompletionId),
  ],
);

// ---------------------------------------------------------------- relations

export const usersRelations = relations(users, ({ one, many }) => ({
  player: one(players, { fields: [users.id], references: [players.userId] }),
  goals: many(goals),
  quests: many(quests),
  rewards: many(rewards),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  quests: many(quests),
}));

export const questsRelations = relations(quests, ({ one, many }) => ({
  user: one(users, { fields: [quests.userId], references: [users.id] }),
  goal: one(goals, { fields: [quests.goalId], references: [goals.id] }),
  completions: many(questCompletions),
}));

export const questCompletionsRelations = relations(questCompletions, ({ one }) => ({
  quest: one(quests, { fields: [questCompletions.questId], references: [quests.id] }),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  user: one(users, { fields: [rewards.userId], references: [users.id] }),
  goal: one(goals, { fields: [rewards.goalId], references: [goals.id] }),
  claims: many(rewardClaims),
}));

export const rewardClaimsRelations = relations(rewardClaims, ({ one }) => ({
  reward: one(rewards, { fields: [rewardClaims.rewardId], references: [rewards.id] }),
}));

// ---------------------------------------------------------------- inferred types

export type User = typeof users.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type QuestCompletion = typeof questCompletions.$inferSelect;
export type XpTransaction = typeof xpTransactions.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type RewardClaim = typeof rewardClaims.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export const schema = {
  users,
  players,
  goals,
  quests,
  questCompletions,
  xpTransactions,
  rewards,
  rewardClaims,
  notifications,
  usersRelations,
  goalsRelations,
  questsRelations,
  questCompletionsRelations,
  rewardsRelations,
  rewardClaimsRelations,
};

/** Giữ `sql` được import để dùng ở migration thủ công nếu cần. */
export { sql };
