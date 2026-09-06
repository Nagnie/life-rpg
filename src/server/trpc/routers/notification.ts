import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { listNotifications } from "@/server/services/read";
import { notFound } from "@/server/services/errors";
import { procedure, router } from "../trpc";

export const notificationRouter = router({
  list: procedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(({ ctx, input }) => listNotifications(ctx.userId, input?.limit ?? 30)),

  markRead: procedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.userId)))
      .returning();
    if (!updated) throw notFound("notification");
    return updated;
  }),

  markAllRead: procedure.mutation(async ({ ctx }) => {
    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, ctx.userId), eq(notifications.read, false)))
      .returning();
    return { count: updated.length };
  }),
});
