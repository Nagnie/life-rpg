import { describe, expect, it } from "vitest";
import { addDays, diffDays, isLocalDate, isValidTimeZone, parseLocalDate, toLocalDate } from "../date";

const HCM = "Asia/Ho_Chi_Minh"; // GMT+7, không có DST

describe("LocalDate (spec §11.1)", () => {
  it("chuyển instant sang ngày lịch theo timezone user", () => {
    // 2026-09-06T10:00:00Z  ->  17:00 ở GMT+7, vẫn là ngày 6
    expect(toLocalDate(new Date("2026-09-06T10:00:00Z"), HCM)).toBe("2026-09-06");
  });

  it("cùng một instant cho ra ngày KHÁC nhau ở hai timezone khác nhau", () => {
    const instant = new Date("2026-09-06T16:30:00Z");
    expect(toLocalDate(instant, HCM)).toBe("2026-09-06"); // 23:30 local
    expect(toLocalDate(instant, "UTC")).toBe("2026-09-06");
    expect(toLocalDate(instant, "Pacific/Kiritimati")).toBe("2026-09-07"); // GMT+14
  });

  it("số học ngày miễn nhiễm với DST", () => {
    // 2026-03-08 là ngày Mỹ đổi sang DST (ngày chỉ có 23 giờ).
    const before = parseLocalDate("2026-03-07");
    expect(addDays(before, 1)).toBe("2026-03-08");
    expect(addDays(before, 2)).toBe("2026-03-09");
    expect(diffDays(parseLocalDate("2026-03-09"), before)).toBe(2);
  });

  it("qua ranh giới tháng và năm nhuận", () => {
    expect(addDays(parseLocalDate("2026-01-31"), 1)).toBe("2026-02-01");
    expect(addDays(parseLocalDate("2024-02-28"), 1)).toBe("2024-02-29"); // nhuận
    expect(addDays(parseLocalDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(diffDays(parseLocalDate("2027-01-01"), parseLocalDate("2026-12-31"))).toBe(1);
  });

  it("từ chối ngày không tồn tại", () => {
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("2026-13-01")).toBe(false);
    expect(isLocalDate("2026-9-6")).toBe(false);
    expect(isLocalDate("2026-09-06")).toBe(true);
    expect(() => parseLocalDate("nonsense")).toThrow();
  });

  it("nhận diện timezone hợp lệ", () => {
    expect(isValidTimeZone(HCM)).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});
