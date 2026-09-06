/**
 * Hệ thống level. spec §7.1.
 *
 * ⚠️ `level` là giá trị DẪN XUẤT từ totalXp, không bao giờ là source of truth.
 * DB có thể cache nó, nhưng luôn tính lại từ totalXp mỗi lần ghi.
 *
 * Công thức: XP để đi từ level L lên L+1 = round(100 * L^1.5)
 *
 *   Lv 1 -> 2 :  100 XP   (tổng      0)
 *   Lv 2 -> 3 :  283 XP   (tổng    100)
 *   Lv 3 -> 4 :  520 XP   (tổng    383)
 *   ...
 *
 * Chi phí mỗi level được LÀM TRÒN thành số nguyên trước khi cộng dồn. Nhờ vậy
 * ngưỡng của mọi level đều là số nguyên và levelFromXp(xpForLevel(k)) === k
 * đúng tuyệt đối, không có sai số dấu phẩy động.
 */

const COEFFICIENT = 100;
const EXPONENT = 1.5;
export const MAX_LEVEL = 999;

/** thresholds[i] = tổng XP cần để ĐẠT level (i + 1). thresholds[0] = 0. */
const thresholds: number[] = [0];

function ensureThresholds(upTo: number): void {
  const target = Math.min(upTo, MAX_LEVEL);
  while (thresholds.length < target) {
    const level = thresholds.length; // level hiện tại đang đứng
    const cost = Math.round(COEFFICIENT * Math.pow(level, EXPONENT));
    thresholds.push(thresholds[level - 1] + cost);
  }
}

/** XP cần để lên từ `level` sang `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(COEFFICIENT * Math.pow(level, EXPONENT));
}

/** Tổng XP tích luỹ cần để ĐẠT `level`. xpForLevel(1) === 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const capped = Math.min(level, MAX_LEVEL);
  ensureThresholds(capped);
  return thresholds[capped - 1];
}

/** Level ứng với tổng XP. Đơn điệu không giảm theo totalXp. */
export function levelFromXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) return 1;
  const xp = Math.floor(totalXp);

  // Nới mảng ngưỡng cho tới khi vượt qua xp (hoặc chạm trần).
  while (
    thresholds.length < MAX_LEVEL &&
    thresholds[thresholds.length - 1] <= xp
  ) {
    ensureThresholds(thresholds.length + 32);
  }

  // Chặt nhị phân: level lớn nhất có ngưỡng <= xp.
  let lo = 0;
  let hi = thresholds.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (thresholds[mid] <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export type LevelProgress = {
  level: number;
  /** XP đã kiếm được BÊN TRONG level hiện tại. */
  xpIntoLevel: number;
  /** XP cần để hoàn thành level hiện tại. Infinity ở MAX_LEVEL. */
  xpForNextLevel: number;
  /** 0..1 — dùng để vẽ XP bar. */
  ratio: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const floor = xpForLevel(level);
  const needed = xpToNextLevel(level);
  const into = Math.max(0, Math.floor(totalXp) - floor);
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: needed,
    ratio: Number.isFinite(needed) ? Math.min(1, into / needed) : 1,
  };
}
