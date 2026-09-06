/**
 * Seed dev data. Chạy: pnpm db:seed
 *
 * Idempotent: xoá sạch dev user rồi tạo lại từ đầu.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from ".";
import { goals, players, quests, rewards, users } from "./schema";
import { DEV_USER_EMAIL } from "@/config/current-user";
import { defaultXpFor } from "@/domain/xp";

async function main() {
  console.log("Seeding...");

  await db.delete(users).where(eq(users.email, DEV_USER_EMAIL));

  const [user] = await db
    .insert(users)
    .values({ name: "Dev", email: DEV_USER_EMAIL, timezone: "Asia/Ho_Chi_Minh" })
    .returning();

  await db.insert(players).values({ userId: user.id });

  const [swe, reading, fitness] = await db
    .insert(goals)
    .values([
      { userId: user.id, title: "Become a Strong SWE", category: "Career", icon: "💻" },
      { userId: user.id, title: "Read More Books", category: "Learning", icon: "📚" },
      { userId: user.id, title: "Stay Healthy", category: "Health", icon: "🏃" },
    ])
    .returning();

  await db.insert(quests).values([
    {
      userId: user.id,
      goalId: swe.id,
      title: "Solve 2 LeetCode problems",
      type: "DAILY",
      difficulty: "MEDIUM",
      xpReward: defaultXpFor("MEDIUM"),
    },
    {
      userId: user.id,
      goalId: swe.id,
      title: "Review System Design chapter",
      type: "ONE_TIME",
      difficulty: "MEDIUM",
      xpReward: defaultXpFor("MEDIUM"),
    },
    {
      userId: user.id,
      goalId: swe.id,
      title: "Finish portfolio site",
      type: "ONE_TIME",
      difficulty: "EPIC",
      xpReward: defaultXpFor("EPIC"),
    },
    {
      userId: user.id,
      goalId: reading.id,
      title: "Read 20 pages",
      type: "DAILY",
      difficulty: "EASY",
      xpReward: defaultXpFor("EASY"),
    },
    {
      userId: user.id,
      goalId: fitness.id,
      title: "Walk 30 minutes",
      type: "DAILY",
      difficulty: "EASY",
      xpReward: 30,
    },
  ]);

  // ⚠️ baseline = 0 ở đây vì user mới toanh. Reward tạo qua API sẽ tự chụp
  // baseline theo tiến độ hiện tại (spec §14.2).
  await db.insert(rewards).values([
    {
      userId: user.id,
      name: "Matcha",
      icon: "🍵",
      description: "Một ly matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 5,
      goalId: swe.id,
      baselineValue: 0,
      repeatable: true,
    },
    {
      userId: user.id,
      name: "Sushi",
      icon: "🍣",
      conditionType: "QUEST_COUNT",
      conditionValue: 3,
      goalId: reading.id,
      baselineValue: 0,
      repeatable: true,
    },
    {
      userId: user.id,
      name: "1 Month Premium",
      icon: "⭐",
      conditionType: "XP_TOTAL",
      conditionValue: 1000,
      baselineValue: 0,
    },
    {
      userId: user.id,
      name: "Movie Night",
      icon: "🎬",
      conditionType: "STREAK",
      conditionValue: 7,
      baselineValue: 0,
    },
  ]);

  console.log(`OK — user ${user.email} (${user.id})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
