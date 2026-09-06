import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

/**
 * ⚠️ Dùng postgres.js, KHÔNG dùng drizzle-orm/neon-http.
 *
 * neon-http không hỗ trợ transaction, mà completeQuest / undoComplete /
 * claimReward đều bắt buộc phải atomic (spec §28). postgres.js chạy được cả
 * với Postgres local lẫn Neon (dùng connection string pooled).
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL — copy .env.example thành .env");
}

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

// Next dev hot-reload sẽ tạo lại module nhiều lần; giữ một pool duy nhất.
const client = globalForDb.__pg ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });

export type Database = typeof db;
/** Kiểu của `tx` bên trong db.transaction(). Services nhận kiểu này. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Chấp nhận cả db lẫn tx — cho phép service gọi lồng nhau. */
export type Executor = Database | Tx;
