import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { quests } from "@/server/db/schema";
import { DIFFICULTIES, QUEST_TYPES } from "@/domain/types";
import { defaultXpFor } from "@/domain/xp";
import { completeQuest } from "@/server/services/completeQuest";
import { undoComplete } from "@/server/services/undoComplete";
import { listQuests } from "@/server/services/read";
import { notFound } from "@/server/services/errors";
import { procedure, router } from "../trpc";

const questInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  icon: z.string().max(8).nullish(),
  goalId: z.uuid().nullish(),
  type: z.enum(QUEST_TYPES).default("ONE_TIME"),
  difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
  /** Bỏ trống thì lấy mặc định theo difficulty (spec §7). */
  xpReward: z.number().int().min(1).max(10_000).nullish(),
  dueDate: z.iso.date().nullish(),
});

export const questRouter = router({
  list: procedure.query(({ ctx }) => listQuests(ctx.userId)),

  create: procedure.input(questInput).mutation(async ({ ctx, input }) => {
    const [quest] = await db
      .insert(quests)
      .values({
        userId: ctx.userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? null,
        goalId: input.goalId ?? null,
        type: input.type,
        difficulty: input.difficulty,
        xpReward: input.xpReward ?? defaultXpFor(input.difficulty),
        dueDate: input.dueDate ?? null,
      })
      .returning();
    return quest;
  }),

  update: procedure
    .input(questInput.partial().extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, xpReward, ...rest } = input;
      const [quest] = await db
        .update(quests)
        .set({
          ...rest,
          ...(xpReward != null ? { xpReward } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(quests.id, id), eq(quests.userId, ctx.userId)))
        .returning();
      if (!quest) throw notFound("quest");
      return quest;
    }),

  archive: procedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [quest] = await db
      .update(quests)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(quests.id, input.id), eq(quests.userId, ctx.userId)))
      .returning();
    if (!quest) throw notFound("quest");
    return quest;
  }),

  /**
   * spec §10.1 — trả về juice payload.
   *
   * `title` chỉ để client hiện toast ngay lập tức mà không phải đợi query lại;
   * server bỏ qua nó hoàn toàn.
   */
  complete: procedure
    .input(z.object({ questId: z.uuid(), title: z.string().max(200).optional() }))
    .mutation(({ ctx, input }) => completeQuest({ userId: ctx.userId, questId: input.questId })),

  /** spec §10.2 */
  undo: procedure
    .input(z.object({ questId: z.uuid() }))
    .mutation(({ ctx, input }) => undoComplete({ userId: ctx.userId, questId: input.questId })),
});
