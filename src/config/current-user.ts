/**
 * ⚠️ TẠM THỜI — Phase 1 chạy với một user hardcode, chưa có auth.
 *
 * Toàn bộ app chỉ lấy userId qua đúng file này. Tới Phase 5 (PLAN.md), thay
 * thân hàm bằng session của Better Auth là xong — không phải sửa chỗ nào khác.
 *
 * QUY TẮC: không router/service nào được tự đọc userId từ nơi khác.
 */

export const DEV_USER_EMAIL = "dev@life-rpg.local";

/**
 * ⚠️ KHÔNG cache kết quả. E2E global setup xoá và tạo lại dev user trong khi
 * dev server đang chạy, nên một id cache lại sẽ trỏ vào hàng đã bị xoá và mọi
 * request sau đó báo lỗi khoá ngoại. Một query có index thì rẻ, cứ đọc lại.
 */
export async function getCurrentUserId(): Promise<string> {
  const { db } = await import("@/server/db");
  const { users } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const [user] = await db.select().from(users).where(eq(users.email, DEV_USER_EMAIL)).limit(1);
  if (!user) {
    throw new Error(
      `Chưa có dev user. Chạy: pnpm db:push && pnpm db:seed`,
    );
  }
  return user.id;
}
