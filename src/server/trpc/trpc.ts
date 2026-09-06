import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getCurrentUserId } from "@/config/current-user";
import { AppError, type AppErrorCode } from "@/server/services/errors";

export type Context = { userId: string };

/**
 * Phase 1: userId đến từ dev user hardcode.
 * Phase 5: đổi thân hàm này sang session của Better Auth, không đụng router nào.
 */
export async function createContext(): Promise<Context> {
  return { userId: await getCurrentUserId() };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const TRPC_CODE: Record<AppErrorCode, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
  FORBIDDEN: "FORBIDDEN",
};

/**
 * Dịch AppError của tầng service sang mã tRPC — service không cần biết tRPC tồn tại.
 *
 * ⚠️ tRPC KHÔNG throw ra khỏi next(); nó trả về { ok: false, error }. Viết
 * try/catch quanh next() sẽ không bao giờ chạy, và mọi AppError sẽ rơi ra
 * ngoài thành 500 INTERNAL_SERVER_ERROR thay vì 409/404 đúng nghĩa.
 */
const mapErrors = t.middleware(async ({ next }) => {
  const result = await next();

  if (!result.ok) {
    const cause = result.error.cause;
    if (cause instanceof AppError) {
      throw new TRPCError({ code: TRPC_CODE[cause.code], message: cause.message, cause });
    }
  }

  return result;
});

export const router = t.router;
export const procedure = t.procedure.use(mapErrors);
