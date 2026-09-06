import { procedure, router } from "../trpc";
import { getPlayerState, listActiveDates, listNotifications } from "@/server/services/read";

export const playerRouter = router({
  state: procedure.query(({ ctx }) => getPlayerState(ctx.userId)),
  activeDates: procedure.query(({ ctx }) => listActiveDates(ctx.userId)),
  notifications: procedure.query(({ ctx }) => listNotifications(ctx.userId)),
});
