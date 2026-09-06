/**
 * Tạo và claim reward. spec §14.2, §17.1, §16.1.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { players, rewardClaims, rewards, users, type Reward, type RewardClaim } from "@/server/db/schema";
import { unsafeLocalDate } from "@/domain/date";
import { toLocalDate } from "@/domain/date";
import { readStreak } from "@/domain/streak";
import { baselineFor, type ConditionTypeInput } from "./rewardTypes";
import { badRequest, conflict, notFound } from "./errors";
import { buildMetrics, loadQuestCounts, loadTotalXp } from "./metrics";

/** Chỉ số hiện tại của user, dùng để chụp baseline. */
async function currentMetrics(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  goalId: string | null,
  now: Date,
) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound("user");

  const [player] = await tx.select().from(players).where(eq(players.userId, userId)).limit(1);
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

  const counts = await loadQuestCounts(tx, userId);
  const totalXp = await loadTotalXp(tx, userId);

  return { metrics: buildMetrics(counts, goalId, totalXp, streak.current), counts, totalXp, streak };
}

export type CreateRewardInput = {
  userId: string;
  name: string;
  description?: string | null;
  icon?: string;
  conditionType: ConditionTypeInput;
  conditionValue: number;
  goalId?: string | null;
  repeatable?: boolean;
  now?: Date;
};

/**
 * ⚠️ §14.2 — baseline được CHỤP tại đây. Đây là dòng code ngăn "user đã có 50
 * quest, tạo reward 10 quest thì unlock ngay lập tức".
 */
export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const now = input.now ?? new Date();
  if (input.conditionValue < 1) throw badRequest("conditionValue phải >= 1");
  if (input.conditionType !== "QUEST_COUNT" && input.goalId) {
    throw badRequest("Chỉ QUEST_COUNT mới giới hạn được theo goal");
  }

  return db.transaction(async (tx) => {
    const goalId = input.goalId ?? null;
    const { metrics } = await currentMetrics(tx, input.userId, goalId, now);

    const [reward] = await tx
      .insert(rewards)
      .values({
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? "🎁",
        conditionType: input.conditionType,
        conditionValue: input.conditionValue,
        goalId,
        baselineValue: baselineFor(input.conditionType, metrics),
        repeatable: input.repeatable ?? false,
        status: "LOCKED",
      })
      .returning();

    return reward;
  });
}

export type ClaimRewardResult = { reward: Reward; claim: RewardClaim };

/** spec §17.1 */
export async function claimReward(input: {
  userId: string;
  rewardId: string;
  now?: Date;
}): Promise<ClaimRewardResult> {
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [reward] = await tx
      .select()
      .from(rewards)
      .where(and(eq(rewards.id, input.rewardId), eq(rewards.userId, input.userId)))
      .for("update")
      .limit(1);

    if (!reward) throw notFound("reward");
    if (reward.status === "LOCKED") throw conflict("Reward chưa đủ điều kiện");
    if (reward.status === "CLAIMED") throw conflict("Reward đã được claim rồi");

    // Trophy case — chụp lại tên/icon để lịch sử không đổi khi user sửa reward.
    const [claim] = await tx
      .insert(rewardClaims)
      .values({
        userId: input.userId,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardIcon: reward.icon,
        claimedAt: now,
      })
      .returning();

    // ⚠️ §16.1 — repeatable thì chụp lại baseline và mở chu kỳ mới.
    if (reward.repeatable) {
      const { metrics } = await currentMetrics(tx, input.userId, reward.goalId, now);
      const [reset] = await tx
        .update(rewards)
        .set({
          status: "LOCKED",
          baselineValue: baselineFor(reward.conditionType, metrics),
          unlockedAt: null,
          claimedAt: null,
        })
        .where(eq(rewards.id, reward.id))
        .returning();
      return { reward: reset, claim };
    }

    const [claimed] = await tx
      .update(rewards)
      .set({ status: "CLAIMED", claimedAt: now })
      .where(eq(rewards.id, reward.id))
      .returning();

    return { reward: claimed, claim };
  });
}
