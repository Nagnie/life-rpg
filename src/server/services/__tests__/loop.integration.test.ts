/**
 * Integration test — chạy thật trên Postgres. spec §33 (MVP Success Criteria).
 *
 * Chạy:  docker compose up -d && pnpm db:push && pnpm test
 * Tự bỏ qua nếu không có DATABASE_URL.
 *
 * Test này kiểm chứng những thứ mà unit test của domain KHÔNG kiểm chứng được:
 * tính atomic của transaction, ràng buộc DB, và việc scope reward theo goal.
 */

import "dotenv/config";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { goals, players, quests, rewards, users, xpTransactions } from "@/server/db/schema";
import { completeQuest } from "../completeQuest";
import { undoComplete } from "../undoComplete";
import { claimReward, createReward } from "../rewardActions";
import { getPlayerState, listRewards } from "../read";
import { AppError } from "../errors";

const hasDb = Boolean(process.env.DATABASE_URL);
const TZ = "Asia/Ho_Chi_Minh";
const EMAIL = "integration@life-rpg.test";

/** 12:00 giờ Việt Nam của một ngày cụ thể — tránh mọi ca biên nửa đêm. */
const noon = (day: string) => new Date(`${day}T05:00:00Z`);

type Fixture = {
  userId: string;
  goalDsa: string;
  goalRead: string;
  dsaQuests: string[];
  readQuest: string;
};

async function freshFixture(): Promise<Fixture> {
  await db.delete(users).where(eq(users.email, EMAIL));

  const [user] = await db
    .insert(users)
    .values({ name: "Integration", email: EMAIL, timezone: TZ })
    .returning();
  await db.insert(players).values({ userId: user.id });

  const [dsa, read] = await db
    .insert(goals)
    .values([
      { userId: user.id, title: "DSA" },
      { userId: user.id, title: "Reading" },
    ])
    .returning();

  const dsaQuests = await db
    .insert(quests)
    .values(
      Array.from({ length: 4 }, (_, i) => ({
        userId: user.id,
        goalId: dsa.id,
        title: `DSA quest ${i + 1}`,
        type: "ONE_TIME" as const,
        difficulty: "MEDIUM" as const,
        xpReward: 50,
      })),
    )
    .returning();

  const [readQuest] = await db
    .insert(quests)
    .values({
      userId: user.id,
      goalId: read.id,
      title: "Read 20 pages",
      type: "DAILY",
      difficulty: "EASY",
      xpReward: 20,
    })
    .returning();

  return {
    userId: user.id,
    goalDsa: dsa.id,
    goalRead: read.id,
    dsaQuests: dsaQuests.map((q) => q.id),
    readQuest: readQuest.id,
  };
}

describe.skipIf(!hasDb)("core loop (spec §33)", () => {
  let f: Fixture;

  beforeEach(async () => {
    f = await freshFixture();
  });

  afterAll(async () => {
    if (hasDb) await db.delete(users).where(eq(users.email, EMAIL));
  });

  it("complete quest thì cộng XP, level và streak", async () => {
    const result = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });

    expect(result.xpAwarded).toBe(50);
    expect(result.totalXp).toBe(50);
    expect(result.streak.current).toBe(1);
    expect(result.levelUp).toBeUndefined(); // 50 XP chưa đủ lên level 2 (cần 100)

    const state = await getPlayerState(f.userId, noon("2026-09-06"));
    expect(state.totalXp).toBe(50);
    expect(state.completedQuests).toBe(1);
  });

  it("⚠️ ONE_TIME quest không complete được hai lần", async () => {
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    await expect(
      completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("⚠️ DAILY quest: hai lần trong cùng ngày bị chặn, hôm sau thì được", async () => {
    await completeQuest({ userId: f.userId, questId: f.readQuest, now: noon("2026-09-06") });

    await expect(
      completeQuest({ userId: f.userId, questId: f.readQuest, now: noon("2026-09-06") }),
    ).rejects.toThrow();

    const next = await completeQuest({
      userId: f.userId,
      questId: f.readQuest,
      now: noon("2026-09-07"),
    });
    expect(next.streak.current).toBe(2);
  });

  it("⚠️ hai quest cùng ngày chỉ tính một ngày streak", async () => {
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    const second = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[1],
      now: noon("2026-09-06"),
    });
    expect(second.streak.current).toBe(1);
  });

  it("lên level bắn ra levelUp trong juice payload", async () => {
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    const second = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[1],
      now: noon("2026-09-06"),
    });

    expect(second.totalXp).toBe(100);
    expect(second.levelUp).toEqual({ from: 1, to: 2 });
    expect(second.notifications.some((n) => n.type === "LEVEL_UP")).toBe(true);
  });
});

describe.skipIf(!hasDb)("reward engine (spec §14.2, §16.1, §26)", () => {
  let f: Fixture;

  beforeEach(async () => {
    f = await freshFixture();
  });

  afterAll(async () => {
    if (hasDb) await db.delete(users).where(eq(users.email, EMAIL));
  });

  it("⚠️ reward tạo SAU khi đã có tiến độ không unlock ngay (baseline)", async () => {
    // Làm trước 2 quest DSA.
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[1], now: noon("2026-09-06") });

    // Rồi mới tạo reward "2 quest DSA".
    const reward = await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 2,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    expect(reward.baselineValue).toBe(2);
    expect(reward.status).toBe("LOCKED");

    const views = await listRewards(f.userId, noon("2026-09-06"));
    expect(views[0].progress.progress).toBe(0);
    expect(views[0].progress.unlocked).toBe(false);

    // Phải làm THÊM 2 cái nữa.
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[2], now: noon("2026-09-06") });
    const last = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[3],
      now: noon("2026-09-06"),
    });

    expect(last.unlockedRewards.map((r) => r.name)).toEqual(["Matcha"]);
  });

  it("⚠️ reward scope theo goal chỉ đếm quest của goal đó", async () => {
    await createReward({
      userId: f.userId,
      name: "Sushi",
      conditionType: "QUEST_COUNT",
      conditionValue: 1,
      goalId: f.goalRead,
      now: noon("2026-09-06"),
    });

    // Quest DSA KHÔNG được tính vào reward của goal Reading.
    const dsa = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });
    expect(dsa.unlockedRewards).toHaveLength(0);

    const reading = await completeQuest({
      userId: f.userId,
      questId: f.readQuest,
      now: noon("2026-09-06"),
    });
    expect(reading.unlockedRewards.map((r) => r.name)).toEqual(["Sushi"]);
  });

  it("⚠️ complete thêm sau khi đã unlock KHÔNG sinh notification trùng", async () => {
    await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 1,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    const first = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });
    expect(first.unlockedRewards).toHaveLength(1);

    for (let i = 1; i < 4; i++) {
      const again = await completeQuest({
        userId: f.userId,
        questId: f.dsaQuests[i],
        now: noon("2026-09-06"),
      });
      expect(again.unlockedRewards).toHaveLength(0);
      expect(again.notifications.filter((n) => n.type === "REWARD_UNLOCKED")).toHaveLength(0);
    }
  });

  it("⚠️ claim reward repeatable thì baseline reset và quay về LOCKED", async () => {
    const reward = await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 2,
      goalId: f.goalDsa,
      repeatable: true,
      now: noon("2026-09-06"),
    });

    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[1], now: noon("2026-09-06") });

    const { reward: after, claim } = await claimReward({
      userId: f.userId,
      rewardId: reward.id,
      now: noon("2026-09-06"),
    });

    expect(claim.rewardName).toBe("Matcha");
    expect(after.status).toBe("LOCKED"); // chu kỳ mới
    expect(after.baselineValue).toBe(2); // chụp lại tại 2 quest
    expect(after.claimedAt).toBeNull();

    // Chu kỳ mới cần thêm 2 quest nữa.
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[2], now: noon("2026-09-06") });
    const fourth = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[3],
      now: noon("2026-09-06"),
    });
    expect(fourth.unlockedRewards.map((r) => r.name)).toEqual(["Matcha"]);
  });

  it("reward chưa đủ điều kiện thì không claim được", async () => {
    const reward = await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 5,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    await expect(
      claimReward({ userId: f.userId, rewardId: reward.id, now: noon("2026-09-06") }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe.skipIf(!hasDb)("undo (spec §10.2, §10.3)", () => {
  let f: Fixture;

  beforeEach(async () => {
    f = await freshFixture();
  });

  afterAll(async () => {
    if (hasDb) await db.delete(users).where(eq(users.email, EMAIL));
  });

  it("⚠️ undo ghi dòng ledger ĐẢO CHIỀU, không xoá dòng cũ", async () => {
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    await undoComplete({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    const ledger = await db
      .select()
      .from(xpTransactions)
      .where(eq(xpTransactions.userId, f.userId));

    expect(ledger).toHaveLength(2);
    expect(ledger.map((r) => r.amount).sort((a, b) => a - b)).toEqual([-50, 50]);
    expect(ledger.map((r) => r.source).sort()).toEqual(["QUEST_COMPLETE", "QUEST_UNDO"]);

    const state = await getPlayerState(f.userId, noon("2026-09-06"));
    expect(state.totalXp).toBe(0);
    expect(state.completedQuests).toBe(0);
  });

  it("undo quest duy nhất của hôm nay thì streak lùi lại", async () => {
    await completeQuest({ userId: f.userId, questId: f.readQuest, now: noon("2026-09-05") });
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    let state = await getPlayerState(f.userId, noon("2026-09-06"));
    expect(state.streak.current).toBe(2);

    await undoComplete({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    state = await getPlayerState(f.userId, noon("2026-09-06"));
    expect(state.streak.current).toBe(1);

    // QUYẾT ĐỊNH NGỮ NGHĨA: longestStreak được TÍNH LẠI từ lịch sử completion
    // còn lại, nên nó tụt về 1 chứ không giữ 2.
    //
    // Lý do: chuỗi 2 ngày đó chỉ tồn tại nhờ completion vừa bị undo. Nếu giữ
    // longest = 2 thì Profile khoe một kỷ lục user chưa từng thật sự đạt được,
    // và user có thể bơm longestStreak bằng cách complete-rồi-undo.
    //
    // "longest chỉ tăng" (§11.3) vẫn đúng trên đường đi TIẾN — applyCompletion
    // không bao giờ làm giảm nó. Undo là thao tác xoá lịch sử, nên nó tính lại.
    expect(state.streak.longest).toBe(1);
  });

  it("⚠️ undo hạ reward UNLOCKED chưa claim về LOCKED", async () => {
    await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 1,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    const done = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });
    expect(done.unlockedRewards).toHaveLength(1);

    const undone = await undoComplete({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });
    expect(undone.relockedRewards.map((r) => r.name)).toEqual(["Matcha"]);

    const [reward] = await db
      .select()
      .from(rewards)
      .where(and(eq(rewards.userId, f.userId), eq(rewards.name, "Matcha")));
    expect(reward.status).toBe("LOCKED");
    expect(reward.unlockedAt).toBeNull();
  });

  it("⚠️ undo KHÔNG revert reward đã CLAIMED", async () => {
    const reward = await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 1,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });
    await claimReward({ userId: f.userId, rewardId: reward.id, now: noon("2026-09-06") });

    await undoComplete({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    const [after] = await db.select().from(rewards).where(eq(rewards.id, reward.id));
    expect(after.status).toBe("CLAIMED"); // uống matcha rồi thì thôi
  });

  it("⚠️ không undo được quest của ngày hôm trước", async () => {
    await completeQuest({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-05") });

    await expect(
      undoComplete({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("undo xoá notification do completion đó sinh ra", async () => {
    await createReward({
      userId: f.userId,
      name: "Matcha",
      conditionType: "QUEST_COUNT",
      conditionValue: 1,
      goalId: f.goalDsa,
      now: noon("2026-09-06"),
    });

    const done = await completeQuest({
      userId: f.userId,
      questId: f.dsaQuests[0],
      now: noon("2026-09-06"),
    });
    expect(done.notifications.length).toBeGreaterThan(0);

    await undoComplete({ userId: f.userId, questId: f.dsaQuests[0], now: noon("2026-09-06") });

    const { listNotifications } = await import("../read");
    expect(await listNotifications(f.userId)).toHaveLength(0);
  });
});
