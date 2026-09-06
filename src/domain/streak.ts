/**
 * Streak. spec §11.
 *
 * Ba luật, mỗi luật đều là một bug đã bị bắt trong spec v1:
 *
 *  §11.1  Mọi thứ chạy trên LocalDate theo timezone của user.
 *  §11.2  Không có cron. Streak PHÂN RÃ khi đọc, không phải khi ghi.
 *         Ranh giới: hôm qua active + hôm nay chưa làm gì  ->  CHƯA mất streak.
 *         Chỉ reset khi đã bỏ lỡ TRỌN một ngày.
 *  §11.3  Idempotent theo ngày: 2 quest cùng ngày không cho +2 streak.
 */

import { addDays, diffDays, type LocalDate } from "./date";
import { STREAK_MILESTONES } from "./types";

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: LocalDate | null;
};

export const EMPTY_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

/**
 * Đường đi nhanh khi ghi: cập nhật streak sau khi ghi nhận một completion.
 *
 * §11.3 — gọi lại với cùng một ngày là no-op. Đây là thứ ngăn "làm 2 quest
 * trong ngày thì +2 streak".
 */
export function applyCompletion(state: StreakState, date: LocalDate): StreakState {
  const { lastActiveDate } = state;

  if (lastActiveDate === null) {
    return { currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastActiveDate: date };
  }

  const gap = diffDays(date, lastActiveDate);

  // Cùng ngày -> đã tính rồi. Hoặc ngày quá khứ (backfill) -> không lùi được.
  if (gap <= 0) return state;

  const current = gap === 1 ? state.currentStreak + 1 : 1;

  return {
    currentStreak: current,
    longestStreak: Math.max(state.longestStreak, current),
    lastActiveDate: date,
  };
}

/**
 * Đường đi khi ĐỌC: giá trị streak để hiển thị, tính lười. spec §11.2.
 *
 * KHÔNG ghi DB. `currentStreak` lưu trong DB là giá trị tại lần active gần
 * nhất; hàm này áp phần phân rã lên trên nó.
 */
export function readStreak(
  state: StreakState,
  today: LocalDate,
): { current: number; longest: number } {
  if (state.lastActiveDate === null) {
    return { current: 0, longest: state.longestStreak };
  }

  const daysSince = diffDays(today, state.lastActiveDate);

  // daysSince === 0  -> đã active hôm nay
  // daysSince === 1  -> hôm qua active, hôm nay chưa làm gì. CHƯA mất.
  // daysSince >= 2   -> đã bỏ lỡ trọn một ngày.
  const current = daysSince <= 1 ? state.currentStreak : 0;

  return { current, longest: state.longestStreak };
}

/**
 * Tính lại streak từ ĐẦU, dựa trên toàn bộ các ngày đã active.
 *
 * Dùng sau khi UNDO (spec §10.2): xoá một completion có thể làm lastActiveDate
 * lùi lại, và đường đi nhanh applyCompletion() không đảo ngược được. Tính lại
 * từ tập ngày luôn cho kết quả đúng.
 *
 * `dates` không cần sắp xếp và được phép trùng lặp.
 */
export function computeStreakFromDates(dates: readonly LocalDate[]): StreakState {
  if (dates.length === 0) return EMPTY_STREAK;

  const unique = [...new Set(dates)].sort();

  let longest = 1;
  let run = 1;

  for (let i = 1; i < unique.length; i++) {
    run = diffDays(unique[i], unique[i - 1]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return {
    currentStreak: run, // chuỗi kết thúc ở ngày active gần nhất
    longestStreak: longest,
    lastActiveDate: unique[unique.length - 1],
  };
}

/** Streak vừa chạm một mốc đáng ăn mừng? spec §19 STREAK_MILESTONE. */
export function crossedMilestone(previous: number, current: number): number | null {
  if (current <= previous) return null;
  const hit = STREAK_MILESTONES.find((m) => m > previous && m <= current);
  return hit ?? null;
}

/** Chỉ dùng cho test/preview: sinh dãy ngày liên tiếp kết thúc tại `end`. */
export function consecutiveDaysEndingAt(end: LocalDate, count: number): LocalDate[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
}
