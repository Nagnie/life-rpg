import { describe, expect, it } from "vitest";
import { MAX_LEVEL, levelFromXp, levelProgress, xpForLevel, xpToNextLevel } from "../leveling";

describe("leveling (spec §7.1)", () => {
  it("user mới bắt đầu ở level 1 với 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("đơn điệu không giảm trên toàn dải 0..100_000 XP", () => {
    let previous = levelFromXp(0);
    for (let xp = 0; xp <= 100_000; xp += 97) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("round-trip: levelFromXp(xpForLevel(k)) === k với mọi k trong 1..100", () => {
    for (let k = 1; k <= 100; k++) {
      expect(levelFromXp(xpForLevel(k))).toBe(k);
    }
  });

  it("thiếu đúng 1 XP thì vẫn ở level cũ", () => {
    for (let k = 2; k <= 50; k++) {
      expect(levelFromXp(xpForLevel(k) - 1)).toBe(k - 1);
    }
  });

  it("XP âm hoặc không hợp lệ vẫn cho level 1, không văng lỗi", () => {
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
  });

  it("chặn trần ở MAX_LEVEL", () => {
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
    expect(xpToNextLevel(MAX_LEVEL)).toBe(Number.POSITIVE_INFINITY);
    expect(levelProgress(Number.MAX_SAFE_INTEGER).ratio).toBe(1);
  });

  it("levelProgress cho ra dữ liệu vẽ XP bar đúng", () => {
    const atFloor = levelProgress(xpForLevel(5));
    expect(atFloor.level).toBe(5);
    expect(atFloor.xpIntoLevel).toBe(0);
    expect(atFloor.ratio).toBe(0);

    const midway = levelProgress(xpForLevel(5) + Math.floor(xpToNextLevel(5) / 2));
    expect(midway.level).toBe(5);
    expect(midway.ratio).toBeGreaterThan(0.49);
    expect(midway.ratio).toBeLessThan(0.51);
  });
});
