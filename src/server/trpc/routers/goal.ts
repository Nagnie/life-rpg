import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { goals } from "@/server/db/schema";
import { GOAL_STATUSES } from "@/domain/types";
import { listGoals } from "@/server/services/read";
import { notFound } from "@/server/services/errors";
import { procedure, router } from "../trpc";

const goalInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  category: z.string().max(80).nullish(),
  icon: z.string().max(8).nullish(),
});

export const goalRouter = router({
  list: procedure.query(({ ctx }) => listGoals(ctx.userId)),

  create: procedure.input(goalInput).mutation(async ({ ctx, input }) => {
    const [goal] = await db
      .insert(goals)
      .values({ ...input, userId: ctx.userId })
      .returning();
    return goal;
  }),

  update: procedure
    .input(goalInput.partial().extend({ id: z.uuid(), status: z.enum(GOAL_STATUSES).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [goal] = await db
        .update(goals)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(goals.id, id), eq(goals.userId, ctx.userId)))
        .returning();
      if (!goal) throw notFound("goal");
      return goal;
    }),

  archive: procedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [goal] = await db
      .update(goals)
      .set({ status: "ARCHIVED", updatedAt: new Date() })
      .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
      .returning();
    if (!goal) throw notFound("goal");
    return goal;
  }),
});
