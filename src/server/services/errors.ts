export type AppErrorCode = "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST" | "FORBIDDEN";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError("NOT_FOUND", `Không tìm thấy ${what}`);
export const conflict = (msg: string) => new AppError("CONFLICT", msg);
export const badRequest = (msg: string) => new AppError("BAD_REQUEST", msg);
