import { router } from "./trpc";
import { goalRouter } from "./routers/goal";
import { notificationRouter } from "./routers/notification";
import { playerRouter } from "./routers/player";
import { questRouter } from "./routers/quest";
import { rewardRouter } from "./routers/reward";

export const appRouter = router({
  player: playerRouter,
  goal: goalRouter,
  quest: questRouter,
  reward: rewardRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
