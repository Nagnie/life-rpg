import { describe, expect, it } from "vitest";
import { parseLocalDate, toLocalDate, type LocalDate } from "../date";
import {
  EMPTY_STREAK,
  applyCompletion,
  computeStreakFromDates,
  consecutiveDaysEndingAt,
  crossedMilestone,
  readStreak,
  type StreakState,
} from "../streak";

const d = (s: string): LocalDate => parseLocalDate(s);
const HCM = "Asia/Ho_Chi_Minh";

/** Chạy một dãy ngày qua đường đi nhanh applyCompletion. */
function run(dates: string[], from: StreakState = EMPTY_STREAK): StreakState {
  return dates.reduce((s, x) => applyCompletion(s, d(x)), from);
}

describe("streak — ghi (spec §11.3)", () => {
  it("⚠️ hai quest CÙNG NGÀY không cho +2 streak", () => {
    const once = run(["2026-09-06"]);
    const twice = applyCompletion(once, d("2026-09-06"));
    const thrice = applyCompletion(twice, d("2026-09-06"));

    expect(once.currentStreak).toBe(1);
    expect(twice.currentStreak).toBe(1);
    expect(thrice.currentStreak).toBe(1);
    expect(thrice).toEqual(once); // no-op hoàn toàn
  });

  it("ngày liên tiếp thì cộng dồn", () => {
    const s = run(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
    expect(s.currentStreak).toBe(4);
    expect(s.lastActiveDate).toBe("2026-09-04");
  });

  it("⚠️ active trở lại sau khi đứt cho streak = 1, không phải 0", () => {
    const s = run(["2026-09-01", "2026-09-02", "2026-09-09"]);
    expect(s.currentStreak).toBe(1);
  });

  it("⚠️ longestStreak chỉ tăng, không bao giờ giảm", () => {
    const s = run([
      "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
      "2026-09-20", // đứt, chuỗi mới
    ]);
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(5);
  });

  it("completion ở quá khứ không làm lùi state", () => {
    const s = run(["2026-09-05", "2026-09-06"]);
    expect(applyCompletion(s, d("2026-09-02"))).toEqual(s);
  });
});

describe("streak — đọc, phân rã lười (spec §11.2)", () => {
  const active: StreakState = {
    currentStreak: 7,
    longestStreak: 12,
    lastActiveDate: d("2026-09-06"),
  };

  it("đã active hôm nay -> giữ nguyên", () => {
    expect(readStreak(active, d("2026-09-06")).current).toBe(7);
  });

  it("⚠️ hôm qua active, hôm nay CHƯA làm gì -> KHÔNG mất streak", () => {
    // Đây là bug giết app: user mở app buổi sáng và thấy streak về 0.
    expect(readStreak(active, d("2026-09-07")).current).toBe(7);
  });

  it("⚠️ bỏ lỡ TRỌN một ngày -> streak = 0", () => {
    expect(readStreak(active, d("2026-09-08")).current).toBe(0);
    expect(readStreak(active, d("2026-10-01")).current).toBe(0);
  });

  it("longest sống sót qua phân rã", () => {
    expect(readStreak(active, d("2026-10-01")).longest).toBe(12);
  });

  it("user chưa từng active -> 0", () => {
    expect(readStreak(EMPTY_STREAK, d("2026-09-06")).current).toBe(0);
  });
});

describe("streak — timezone (spec §11.1)", () => {
  it("⚠️ user GMT+7 complete lúc 23:30 local -> localDate là hôm nay local, không phải hôm qua UTC", () => {
    // 2026-09-06 23:30 ở GMT+7 = 2026-09-06T16:30Z. Cùng ngày ở cả hai — chọn
    // một ca mà UTC và local LỆCH nhau mới là phép thử thật:
    // 2026-09-07 00:30 local = 2026-09-06T17:30Z -> UTC vẫn là ngày 6.
    const instant = new Date("2026-09-06T17:30:00Z");
    expect(toLocalDate(instant, "UTC")).toBe("2026-09-06");
    expect(toLocalDate(instant, HCM)).toBe("2026-09-07");

    // Streak phải chạy theo lịch của user, không theo lịch của server.
    const base = run(["2026-09-06"]);
    const next = applyCompletion(base, toLocalDate(instant, HCM));
    expect(next.currentStreak).toBe(2);

    // Nếu dùng nhầm timezone server thì đây sẽ là no-op và user mất một ngày streak.
    const wrong = applyCompletion(base, toLocalDate(instant, "UTC"));
    expect(wrong.currentStreak).toBe(1);
  });

  it("⚠️ qua ranh giới DST vẫn đếm đúng", () => {
    // America/New_York đổi DST ngày 2026-03-08.
    const NY = "America/New_York";
    const days = [
      new Date("2026-03-06T18:00:00Z"), // 13:00 EST, ngày 6
      new Date("2026-03-07T18:00:00Z"), // 13:00 EST, ngày 7
      new Date("2026-03-08T18:00:00Z"), // 14:00 EDT, ngày 8  <- ngày chỉ có 23h
      new Date("2026-03-09T18:00:00Z"), // 14:00 EDT, ngày 9
    ];
    const dates = days.map((x) => toLocalDate(x, NY));
    expect(dates).toEqual(["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"]);

    const s = dates.reduce((acc, x) => applyCompletion(acc, x), EMPTY_STREAK);
    expect(s.currentStreak).toBe(4);
  });
});

describe("streak — tính lại từ tập ngày (dùng cho undo, spec §10.2)", () => {
  it("không có ngày nào -> state rỗng", () => {
    expect(computeStreakFromDates([])).toEqual(EMPTY_STREAK);
  });

  it("cho cùng kết quả với đường đi nhanh applyCompletion", () => {
    const dates = [
      "2026-09-01", "2026-09-02", "2026-09-03",
      "2026-09-10",
      "2026-09-20", "2026-09-21",
    ];
    expect(computeStreakFromDates(dates.map(d))).toEqual(run(dates));
  });

  it("bỏ qua ngày trùng lặp và thứ tự lộn xộn", () => {
    const s = computeStreakFromDates(
      ["2026-09-03", "2026-09-01", "2026-09-02", "2026-09-02"].map(d),
    );
    expect(s.currentStreak).toBe(3);
    expect(s.lastActiveDate).toBe("2026-09-03");
  });

  it("undo completion cuối cùng của hôm nay thì streak lùi lại đúng", () => {
    const before = consecutiveDaysEndingAt(d("2026-09-06"), 5);
    expect(computeStreakFromDates(before).currentStreak).toBe(5);

    const after = before.slice(0, -1); // xoá ngày hôm nay
    const s = computeStreakFromDates(after);
    expect(s.currentStreak).toBe(4);
    expect(s.lastActiveDate).toBe("2026-09-05");
  });
});

describe("mốc streak (spec §19)", () => {
  it("bắt đúng mốc vừa vượt qua", () => {
    expect(crossedMilestone(6, 7)).toBe(7);
    expect(crossedMilestone(7, 8)).toBeNull();
    expect(crossedMilestone(0, 1)).toBeNull();
    expect(crossedMilestone(2, 3)).toBe(3);
  });

  it("streak giảm thì không bắn milestone", () => {
    expect(crossedMilestone(10, 1)).toBeNull();
  });
});
