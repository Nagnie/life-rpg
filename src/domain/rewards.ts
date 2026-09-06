/**
 * Reward engine. spec §14, §25, §26.
 *
 * ⚠️ BASELINE là fix quan trọng nhất so với spec v1.
 *
 * v1 đếm TOÀN BỘ quest đã hoàn thành từ trước tới giờ, nên một user đã làm 50
 * quest mà tạo reward "10 quest" sẽ unlock NGAY LẬP TỨC. Baseline chụp lại giá
 * trị tại thời điểm tạo reward, biến điều kiện thành "từ giờ làm THÊM 10 cái".
 *
 * Ngoại lệ: STREAK không đơn điệu tăng (nó reset), nên baseline vô nghĩa với nó.
 * Streak được đánh giá tuyệt đối.
 */

import type { ConditionType } from "./types";

/** Các chỉ số tiến độ hiện tại của user. Nguồn lấy ở spec §25. */
export type ProgressMetrics = {
  /** Số QuestCompletion. Nếu reward có goalId thì chỉ đếm trong goal đó. */
  questCount: number;
  /** SUM(XpTransaction.amount) — ledger là source of truth. */
  totalXp: number;
  /** Streak đã áp phân rã (dùng readStreak). */
  currentStreak: number;
};

export type RewardCondition = {
  type: ConditionType;
  /** Ngưỡng cần đạt. */
  value: number;
  /** Chụp lúc tạo reward, và chụp lại mỗi lần claim nếu repeatable. */
  baselineValue: number;
};

export type RewardProgress = {
  progress: number;
  target: number;
  /** 0..1 cho progress bar. */
  ratio: number;
  unlocked: boolean;
};

/** Giá trị thô hiện tại của một loại condition. */
export function currentValueFor(type: ConditionType, m: ProgressMetrics): number {
  switch (type) {
    case "QUEST_COUNT":
      return m.questCount;
    case "XP_TOTAL":
      return m.totalXp;
    case "STREAK":
      return m.currentStreak;
  }
}

/**
 * Baseline cần chụp khi TẠO reward (hoặc khi reset một reward repeatable).
 * STREAK luôn là 0 — xem giải thích ở đầu file.
 */
export function baselineFor(type: ConditionType, m: ProgressMetrics): number {
  return type === "STREAK" ? 0 : currentValueFor(type, m);
}

export function progressOf(cond: RewardCondition, m: ProgressMetrics): RewardProgress {
  const target = Math.max(1, cond.value);
  const current = currentValueFor(cond.type, m);

  // STREAK bỏ qua baseline; các loại khác trừ đi mốc xuất phát.
  const raw = cond.type === "STREAK" ? current : current - cond.baselineValue;
  const progress = Math.min(Math.max(raw, 0), target);

  return {
    progress,
    target,
    ratio: progress / target,
    unlocked: progress >= target,
  };
}

export function isUnlocked(cond: RewardCondition, m: ProgressMetrics): boolean {
  return progressOf(cond, m).unlocked;
}

// ---------------------------------------------------------------- nhãn hiển thị
// Design hiển thị điều kiện dưới dạng câu tiếng Anh ("Complete 10 SWE quests").
// Giữ ở domain vì đây là luật hiển thị của luật chơi, và test được không cần DB.

const nf = new Intl.NumberFormat("en-US");

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function conditionLabel(
  type: ConditionType,
  value: number,
  goalTitle?: string | null,
): string {
  switch (type) {
    case "QUEST_COUNT": {
      // Tên goal đứng SAU dấu chấm giữa chứ không nhét vào giữa câu.
      // "Complete 1 Become a Strong SWE quests" vừa sai số ít/nhiều vừa gượng;
      // tên goal do user tự đặt nên không thể giả định nó là một danh từ.
      const base = `Complete ${nf.format(value)} ${plural(value, "quest", "quests")}`;
      return goalTitle ? `${base} · ${goalTitle}` : base;
    }
    case "XP_TOTAL":
      return `Earn ${nf.format(value)} XP`;
    case "STREAK":
      return `Reach a ${nf.format(value)}-day streak`;
  }
}

/** "220 XP to unlock" / "3 more quests to unlock" / "7 more days to unlock" */
export function remainingLabel(type: ConditionType, p: RewardProgress): string {
  const left = Math.max(0, p.target - p.progress);
  if (left === 0) return "Ready to claim";
  switch (type) {
    case "XP_TOTAL":
      return `${nf.format(left)} XP to unlock`;
    case "STREAK":
      return `${left} more ${plural(left, "day", "days")} to unlock`;
    case "QUEST_COUNT":
      return `${left} more ${plural(left, "quest", "quests")} to unlock`;
  }
}
