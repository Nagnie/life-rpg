import { describe, expect, it } from "vitest";
import {
  baselineFor,
  conditionLabel,
  currentValueFor,
  progressOf,
  remainingLabel,
  type ProgressMetrics,
  type RewardCondition,
} from "../rewards";

const metrics = (over: Partial<ProgressMetrics> = {}): ProgressMetrics => ({
  questCount: 0,
  totalXp: 0,
  currentStreak: 0,
  ...over,
});

describe("reward baseline (spec §14.2) — bug lớn nhất của v1", () => {
  it("⚠️ user đã có 50 quest, tạo reward target 10 -> progress 0/10, KHÔNG unlock", () => {
    const m = metrics({ questCount: 50 });
    const cond: RewardCondition = {
      type: "QUEST_COUNT",
      value: 10,
      baselineValue: baselineFor("QUEST_COUNT", m), // chụp lúc tạo
    };

    const p = progressOf(cond, m);
    expect(p.progress).toBe(0);
    expect(p.target).toBe(10);
    expect(p.unlocked).toBe(false);
  });

  it("phải làm THÊM đúng 10 cái nữa mới unlock", () => {
    const atCreation = metrics({ questCount: 50 });
    const cond: RewardCondition = {
      type: "QUEST_COUNT",
      value: 10,
      baselineValue: baselineFor("QUEST_COUNT", atCreation),
    };

    expect(progressOf(cond, metrics({ questCount: 57 })).progress).toBe(7);
    expect(progressOf(cond, metrics({ questCount: 59 })).unlocked).toBe(false);
    expect(progressOf(cond, metrics({ questCount: 60 })).unlocked).toBe(true);
  });

  it("⚠️ user đã có 3000 XP, tạo reward 1000 XP -> progress 0/1000", () => {
    const m = metrics({ totalXp: 3000 });
    const cond: RewardCondition = {
      type: "XP_TOTAL",
      value: 1000,
      baselineValue: baselineFor("XP_TOTAL", m),
    };

    expect(progressOf(cond, m).progress).toBe(0);
    expect(progressOf(cond, metrics({ totalXp: 4000 })).unlocked).toBe(true);
  });

  it("user mới (baseline 0) thì hành xử như trực giác", () => {
    const cond: RewardCondition = { type: "QUEST_COUNT", value: 10, baselineValue: 0 };
    expect(progressOf(cond, metrics({ questCount: 7 })).progress).toBe(7);
  });
});

describe("reward STREAK (spec §14.2 ngoại lệ)", () => {
  it("⚠️ STREAK KHÔNG trừ baseline", () => {
    const m = metrics({ currentStreak: 9 });
    expect(baselineFor("STREAK", m)).toBe(0);

    const cond: RewardCondition = { type: "STREAK", value: 7, baselineValue: 0 };
    expect(progressOf(cond, metrics({ currentStreak: 5 })).progress).toBe(5);
    expect(progressOf(cond, metrics({ currentStreak: 7 })).unlocked).toBe(true);
  });

  it("streak reset thì progress cũng tụt theo — đây là chủ ý", () => {
    const cond: RewardCondition = { type: "STREAK", value: 7, baselineValue: 0 };
    expect(progressOf(cond, metrics({ currentStreak: 6 })).progress).toBe(6);
    expect(progressOf(cond, metrics({ currentStreak: 0 })).progress).toBe(0);
  });
});

describe("reward progress (spec §25)", () => {
  it("⚠️ progress bị clamp, không vượt quá target", () => {
    const cond: RewardCondition = { type: "QUEST_COUNT", value: 10, baselineValue: 0 };
    const p = progressOf(cond, metrics({ questCount: 999 }));
    expect(p.progress).toBe(10);
    expect(p.ratio).toBe(1);
  });

  it("progress không âm kể cả khi số hiện tại tụt dưới baseline (sau undo)", () => {
    const cond: RewardCondition = { type: "QUEST_COUNT", value: 10, baselineValue: 50 };
    const p = progressOf(cond, metrics({ questCount: 48 }));
    expect(p.progress).toBe(0);
    expect(p.ratio).toBe(0);
  });

  it("ratio nằm trong 0..1 và vẽ được", () => {
    const cond: RewardCondition = { type: "XP_TOTAL", value: 1000, baselineValue: 0 };
    expect(progressOf(cond, metrics({ totalXp: 780 })).ratio).toBeCloseTo(0.78);
  });

  it("target 0 hoặc âm không gây chia cho 0", () => {
    const cond: RewardCondition = { type: "QUEST_COUNT", value: 0, baselineValue: 0 };
    const p = progressOf(cond, metrics({ questCount: 3 }));
    expect(Number.isFinite(p.ratio)).toBe(true);
    expect(p.target).toBe(1);
  });
});

describe("reward repeatable (spec §16.1)", () => {
  it("⚠️ sau khi claim, baseline reset và chu kỳ mới bắt đầu từ 0", () => {
    let cond: RewardCondition = { type: "QUEST_COUNT", value: 10, baselineValue: 0 };

    const atUnlock = metrics({ questCount: 10 });
    expect(progressOf(cond, atUnlock).unlocked).toBe(true);

    // claim + repeatable -> chụp lại baseline
    cond = { ...cond, baselineValue: baselineFor("QUEST_COUNT", atUnlock) };

    expect(progressOf(cond, atUnlock).progress).toBe(0);
    expect(progressOf(cond, atUnlock).unlocked).toBe(false);
    expect(progressOf(cond, metrics({ questCount: 20 })).unlocked).toBe(true);
  });
});

describe("currentValueFor ánh xạ đúng nguồn số liệu (spec §25)", () => {
  it("mỗi condition type đọc đúng chỉ số của nó", () => {
    const m = metrics({ questCount: 1, totalXp: 2, currentStreak: 3 });
    expect(currentValueFor("QUEST_COUNT", m)).toBe(1);
    expect(currentValueFor("XP_TOTAL", m)).toBe(2);
    expect(currentValueFor("STREAK", m)).toBe(3);
  });

  it("questCount truyền vào ĐÃ được scope theo goal — việc lọc là của tầng service", () => {
    // Hợp đồng: nếu reward.goalId != null, caller phải truyền số quest CHỈ trong
    // goal đó. Domain không biết goal là gì. Kiểm chứng ở test service (P1/P2).
    const cond: RewardCondition = { type: "QUEST_COUNT", value: 10, baselineValue: 0 };
    const scopedToDsa = metrics({ questCount: 7 });
    expect(progressOf(cond, scopedToDsa).progress).toBe(7);
  });
});

describe("nhãn hiển thị (§14, §25)", () => {
  it("⚠️ số ít / số nhiều đúng", () => {
    expect(conditionLabel("QUEST_COUNT", 1)).toBe("Complete 1 quest");
    expect(conditionLabel("QUEST_COUNT", 10)).toBe("Complete 10 quests");
  });

  it("⚠️ tên goal đứng sau dấu chấm giữa, không nhét vào giữa câu", () => {
    // "Complete 1 Become a Strong SWE quests" vừa sai ngữ pháp vừa gượng —
    // tên goal do user tự đặt nên không thể giả định nó là danh từ.
    expect(conditionLabel("QUEST_COUNT", 1, "Become a Strong SWE")).toBe(
      "Complete 1 quest · Become a Strong SWE",
    );
    expect(conditionLabel("QUEST_COUNT", 10, "DSA")).toBe("Complete 10 quests · DSA");
  });

  it("số lớn có dấu phân cách hàng nghìn", () => {
    expect(conditionLabel("XP_TOTAL", 1000)).toBe("Earn 1,000 XP");
    expect(conditionLabel("STREAK", 7)).toBe("Reach a 7-day streak");
  });

  it("goal chỉ áp dụng cho QUEST_COUNT", () => {
    expect(conditionLabel("XP_TOTAL", 500, "DSA")).toBe("Earn 500 XP");
    expect(conditionLabel("STREAK", 7, "DSA")).toBe("Reach a 7-day streak");
  });

  it("nhãn còn thiếu bao nhiêu cũng đúng số ít / số nhiều", () => {
    const p = (progress: number, target: number) => ({
      progress,
      target,
      ratio: progress / target,
      unlocked: progress >= target,
    });
    expect(remainingLabel("QUEST_COUNT", p(9, 10))).toBe("1 more quest to unlock");
    expect(remainingLabel("QUEST_COUNT", p(7, 10))).toBe("3 more quests to unlock");
    expect(remainingLabel("STREAK", p(6, 7))).toBe("1 more day to unlock");
    expect(remainingLabel("XP_TOTAL", p(780, 2000))).toBe("1,220 XP to unlock");
    expect(remainingLabel("QUEST_COUNT", p(10, 10))).toBe("Ready to claim");
  });
});
