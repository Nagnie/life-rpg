import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { rewards } from "@/server/db/schema";
import { CONDITION_TYPES } from "@/domain/types";
import { claimReward, createReward } from "@/server/services/rewardActions";
import { listRewards, listTrophyCase } from "@/server/services/read";
import { notFound } from "@/server/services/errors";
import { procedure, router } from "../trpc";

export const rewardRouter = router({
  list: procedure.query(({ ctx }) => listRewards(ctx.userId)),
  trophyCase: procedure.query(({ ctx }) => listTrophyCase(ctx.userId)),

  create: procedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(1000).nullish(),
        icon: z.string().min(1).max(8).default("🎁"),
        conditionType: z.enum(CONDITION_TYPES),
        conditionValue: z.number().int().min(1).max(1_000_000),
        goalId: z.uuid().nullish(),
        repeatable: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) => createReward({ ...input, userId: ctx.userId })),

  claim: procedure
    .input(z.object({ rewardId: z.uuid() }))
    .mutation(({ ctx, input }) => claimReward({ userId: ctx.userId, rewardId: input.rewardId })),

  /**
   * Chỉ sửa được phần trình bày (tên, icon, mô tả).
   *
   * ⚠️ conditionType / conditionValue / goalId / baselineValue KHÔNG sửa được:
   * đổi điều kiện giữa chừng làm progress đã tích luỹ mất ý nghĩa, và sửa
   * baseline là cửa hậu để tự unlock reward. Muốn đổi điều kiện thì xoá và
   * tạo lại — lúc đó baseline được chụp lại đúng cách (§14.2).
   */
  update: procedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(1000).nullish(),
        icon: z.string().min(1).max(8).optional(),
        repeatable: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [updated] = await db
        .update(rewards)
        .set(patch)
        .where(and(eq(rewards.id, id), eq(rewards.userId, ctx.userId)))
        .returning();
      if (!updated) throw notFound("reward");
      return updated;
    }),

  delete: procedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [deleted] = await db
      .delete(rewards)
      .where(and(eq(rewards.id, input.id), eq(rewards.userId, ctx.userId)))
      .returning();
    if (!deleted) throw notFound("reward");
    return deleted;
  }),
});
