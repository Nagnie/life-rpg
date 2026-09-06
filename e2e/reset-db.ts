/**
 * Reset the database to a "brand-new, empty" state before running e2e tests.
 *
 * The "Golden path" (§33) begins with a blank screen, so seed data would introduce interference
 * (e.g., seed rewards might unlock mid-flow and skew the count).
 */

import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { DEV_USER_EMAIL } from '@/config/current-user';
import { db } from '@/server/db';
import { players, users } from '@/server/db/schema';

export async function resetToBareUser() {
  // ON DELETE CASCADE clear goal/quest/completion/xp/reward/notification.
  await db.delete(users).where(eq(users.email, DEV_USER_EMAIL));

  const [user] = await db
    .insert(users)
    .values({
      name: 'E2E',
      email: DEV_USER_EMAIL,
      timezone: 'Asia/Ho_Chi_Minh',
    })
    .returning();

  await db.insert(players).values({ userId: user.id });
  return user.id;
}

export default async function globalSetup() {
  const userId = await resetToBareUser();
  console.log(`[e2e] reset xong, dev user = ${userId}`);
}
