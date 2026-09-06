/**
 * LocalDate — MỘT NGÀY TRÊN LỊCH CỦA USER, không phải một mốc thời gian.
 *
 * spec §11.1: streak không có timezone là streak sai. "Hôm nay" của user ở
 * GMT+7 không phải "hôm nay" theo UTC của server.
 *
 * Vì vậy mọi phép tính streak chạy trên LocalDate ("YYYY-MM-DD"), không chạy
 * trên Date. Việc chuyển Date -> LocalDate xảy ra đúng MỘT lần, tại biên
 * (lúc ghi QuestCompletion), dùng timezone của user.
 *
 * Số học ngày được làm hoàn toàn ở UTC. Đây là chủ ý: một LocalDate đã là ngày
 * lịch rồi, nên "+1 ngày" luôn là +1 ô trên lịch. Nếu dùng giờ địa phương ở
 * đây thì ngày chuyển DST (23h hoặc 25h) sẽ cho kết quả sai.
 */

export type LocalDate = string & { readonly __brand: "LocalDate" };

const MS_PER_DAY = 86_400_000;
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_RE.test(value)) return false;
  // Loại "2026-02-30": round-trip qua UTC phải cho lại đúng chuỗi ban đầu.
  return unsafeLocalDate(fromUtcMillis(toUtcMillis(value as LocalDate))) === value;
}

/** Ép kiểu không kiểm tra. Chỉ dùng khi giá trị chắc chắn đến từ DB `date` column. */
export function unsafeLocalDate(value: string): LocalDate {
  return value as LocalDate;
}

export function parseLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) throw new Error(`LocalDate không hợp lệ: ${value}`);
  return value;
}

/**
 * Mốc thời gian tuyệt đối -> ngày trên lịch của user.
 * Đây là ranh giới duy nhất giữa "thời điểm" và "ngày".
 */
export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => {
    const p = parts.find((x) => x.type === type);
    if (!p) throw new Error(`Intl thiếu part "${type}" cho timezone ${timeZone}`);
    return p.value;
  };
  return `${get("year")}-${get("month")}-${get("day")}` as LocalDate;
}

function toUtcMillis(d: LocalDate): number {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  return Date.UTC(y, m - 1, day);
}

function fromUtcMillis(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: LocalDate, days: number): LocalDate {
  return fromUtcMillis(toUtcMillis(d) + days * MS_PER_DAY) as LocalDate;
}

/** Số ngày từ `b` tới `a`. Dương nghĩa là `a` sau `b`. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMillis(a) - toUtcMillis(b)) / MS_PER_DAY);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxLocalDate(a: LocalDate, b: LocalDate): LocalDate {
  return a >= b ? a : b;
}
