/**
 * GOLDEN PATH — spec §33 MVP Success Criteria, run on the actual interface.
 *
 *   Create Goal → Create Quest → Create Reward → Complete Quest → Earn XP
 *   → See Progress → Complete enough → Reward UNLOCKED → Claim Reward
 *
 * The `data-testid` attributes here serve as a contract with the UI.
 * If the interface changes, keep the `testids`—do not rewrite the tests;
 * they act as a safety net for that very interface change.
 */

import { expect, test } from '@playwright/test';

import {
  completeQuest,
  createGoal,
  createQuest,
  createReward,
  dismissCelebrations,
  quest,
  reward,
} from './helpers';
import { resetToBareUser } from './reset-db';

test.beforeEach(async ({ page }) => {
  await resetToBareUser();
  await page.goto('/');
  await expect(page.getByTestId('player-header')).toBeVisible();
});

test('§33 — từ màn hình trống tới claim reward', async ({ page }) => {
  await expect(page.getByTestId('player-level')).toHaveText('1');
  await expect(page.getByTestId('player-completed')).toHaveText('0');
  await expect(page.getByTestId('dashboard-empty')).toBeVisible();

  // 1. Create Goal
  await createGoal(page, 'Become a Strong SWE');

  // 2. Create Quest — MEDIUM = 50 XP default (spec §7)
  await createQuest(page, 'Solve LeetCode #283', {
    goal: 'Become a Strong SWE',
    difficulty: 'MEDIUM',
  });
  await createQuest(page, 'Solve LeetCode #11', {
    goal: 'Become a Strong SWE',
  });
  await createQuest(page, 'Solve LeetCode #3', { goal: 'Become a Strong SWE' });

  // 3. Create Reward — Complete 3 SWE quests to get a cup of matcha.
  await createReward(page, 'Matcha', {
    icon: '🍵',
    condition: 'QUEST_COUNT',
    value: 3,
    goal: 'Become a Strong SWE',
  });

  const matcha = reward(page, 'Matcha');
  await expect(matcha).toHaveAttribute('data-reward-status', 'LOCKED');
  await expect(matcha.getByTestId('reward-progress')).toHaveText('0 / 3');

  // 4. Complete Quest → 5. Earn XP → 6. See Progress
  await page.goto('/');
  await completeQuest(page, 'Solve LeetCode #283');
  await expect(page.getByTestId('toast').first()).toContainText('+50 XP');
  await expect(page.getByTestId('player-total-xp')).toHaveText('50');
  await expect(page.getByTestId('player-streak')).toHaveText('1');
  await expect(page.getByTestId('player-completed')).toHaveText('1');

  // 100 XP = exactly enough for Level 2 (spec §7.1) -> Level Up modal blocks the screen.
  await completeQuest(page, 'Solve LeetCode #11');
  await expect(page.getByTestId('levelup-modal')).toBeVisible();
  await expect(page.getByTestId('levelup-modal')).toContainText(
    'You reached Level 2',
  );
  await page.getByTestId('levelup-continue').click();
  await expect(page.getByTestId('player-level')).toHaveText('2');

  // 7. Complete enough quests → 8. Reward UNLOCKED
  await completeQuest(page, 'Solve LeetCode #3');
  const unlockModal = page.getByTestId('unlock-modal');
  await expect(unlockModal).toBeVisible();
  await expect(unlockModal).toContainText('Matcha');
  await expect(unlockModal).toContainText(
    'Complete 3 quests · Become a Strong SWE',
  );

  // 9. Claim Reward (§17.2)
  await unlockModal.getByTestId('claim-button').click();
  const claimed = page.getByTestId('claimed-modal');
  await expect(claimed).toBeVisible();
  await expect(claimed).toContainText('Enjoy your matcha');
  await page.getByTestId('claimed-close').click();

  // Final state: trophy case contains the trophy, player stats are correct.
  await page.goto('/rewards');
  await expect(
    page.locator('[data-testid="trophy-item"][data-trophy-name="Matcha"]'),
  ).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('player-completed')).toHaveText('3');
  await expect(page.getByTestId('player-total-xp')).toHaveText('150');
  await expect(page.getByTestId('player-level')).toHaveText('2');
});

test('⚠️ §14.2 — reward tạo sau khi đã có tiến độ KHÔNG unlock ngay', async ({
  page,
}) => {
  // The biggest bug in spec v1, verified through the actual user interface.
  await createGoal(page, 'DSA');
  await page.goto('/');
  for (const n of [1, 2, 3, 4]) {
    await createQuest(page, `Quest ${n}`, { goal: 'DSA' });
  }

  await completeQuest(page, 'Quest 1');
  await completeQuest(page, 'Quest 2');
  await dismissCelebrations(page);
  await expect(page.getByTestId('player-completed')).toHaveText('2');

  // Only then should you create the "2 DSA quests" reward.
  await createReward(page, 'Sushi', {
    icon: '🍣',
    condition: 'QUEST_COUNT',
    value: 2,
    goal: 'DSA',
  });

  const sushi = reward(page, 'Sushi');
  await expect(sushi.getByTestId('reward-progress')).toHaveText('0 / 2');
  await expect(sushi).toHaveAttribute('data-reward-status', 'LOCKED');

  // You have to do two more to unlock it.
  await page.goto('/');
  await completeQuest(page, 'Quest 3');
  await dismissCelebrations(page);
  await page.goto('/rewards');
  await expect(reward(page, 'Sushi').getByTestId('reward-progress')).toHaveText(
    '1 / 2',
  );
  await expect(reward(page, 'Sushi')).toHaveAttribute(
    'data-reward-status',
    'LOCKED',
  );

  await page.goto('/');
  await completeQuest(page, 'Quest 4');
  await expect(page.getByTestId('unlock-modal')).toBeVisible();
  await page.getByText('Save it for later').click();
  await page.goto('/rewards');
  await expect(reward(page, 'Sushi')).toHaveAttribute(
    'data-reward-status',
    'UNLOCKED',
  );
});

test('⚠️ §10.2 — undo trả lại XP và hạ reward chưa claim về LOCKED', async ({
  page,
}) => {
  await createGoal(page, 'DSA');
  await page.goto('/');
  await createQuest(page, 'Quest 1', { goal: 'DSA' });
  await createReward(page, 'Matcha', {
    icon: '🍵',
    condition: 'QUEST_COUNT',
    value: 1,
    goal: 'DSA',
  });

  await page.goto('/');
  await completeQuest(page, 'Quest 1');
  await expect(page.getByTestId('unlock-modal')).toBeVisible();
  await page.getByText('Save it for later').click();

  await page.goto('/rewards');
  await expect(reward(page, 'Matcha')).toHaveAttribute(
    'data-reward-status',
    'UNLOCKED',
  );

  await page.goto('/');
  await expect(page.getByTestId('player-total-xp')).toHaveText('50');
  await quest(page, 'Quest 1').getByTestId('undo-button').click();

  await expect(quest(page, 'Quest 1')).toHaveAttribute(
    'data-quest-done',
    'false',
  );
  await expect(page.getByTestId('player-total-xp')).toHaveText('0');
  await expect(page.getByTestId('player-completed')).toHaveText('0');

  await page.goto('/rewards');
  await expect(reward(page, 'Matcha')).toHaveAttribute(
    'data-reward-status',
    'LOCKED',
  );
  await expect(
    reward(page, 'Matcha').getByTestId('reward-progress'),
  ).toHaveText('0 / 1');
});

test('⚠️ §16.1 — claim reward repeatable thì mở chu kỳ mới', async ({
  page,
}) => {
  await createGoal(page, 'Reading');
  await page.goto('/');
  for (const n of [1, 2, 3, 4]) {
    await createQuest(page, `Read ${n}`, { goal: 'Reading' });
  }
  await createReward(page, 'Manga', {
    icon: '📚',
    condition: 'QUEST_COUNT',
    value: 2,
    goal: 'Reading',
    repeatable: true,
  });

  await page.goto('/');
  await completeQuest(page, 'Read 1');
  await completeQuest(page, 'Read 2');

  // ⚠️ 2 quest MEDIUM = 100 XP = vừa đủ Level 2, nên CẢ level up LẪN reward
  // unlock cùng xảy ra. Level up hiện trước; reward phải được XẾP HÀNG chứ
  // không bị nuốt — đóng level up là unlock hiện ra.
  await expect(page.getByTestId('levelup-modal')).toBeVisible();
  await expect(page.getByTestId('unlock-modal')).toHaveCount(0);
  await page.getByTestId('levelup-continue').click();
  await expect(page.getByTestId('unlock-modal')).toBeVisible();

  await page.getByTestId('unlock-modal').getByTestId('claim-button').click();
  await expect(page.getByTestId('claimed-modal')).toContainText(
    'Earn it again',
  );
  await page.getByTestId('claimed-close').click();

  // repeatable: quay lại LOCKED với baseline mới, KHÔNG phải CLAIMED vĩnh viễn.
  await page.goto('/rewards');
  await expect(reward(page, 'Manga')).toHaveAttribute(
    'data-reward-status',
    'LOCKED',
  );
  await expect(reward(page, 'Manga').getByTestId('reward-progress')).toHaveText(
    '0 / 2',
  );
  await expect(
    page.locator('[data-testid="trophy-item"][data-trophy-name="Manga"]'),
  ).toBeVisible();

  await page.goto('/');
  await completeQuest(page, 'Read 3');
  await dismissCelebrations(page);
  await completeQuest(page, 'Read 4');
  await expect(page.getByTestId('unlock-modal')).toBeVisible();
});

test('phím tắt: N mở form quest, G+Q nhảy màn, ⌘K mở palette', async ({
  page,
}) => {
  await page.keyboard.press('n');
  await expect(page.getByTestId('quest-form-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('quest-form-modal')).toHaveCount(0);

  await page.keyboard.press('g');
  await page.keyboard.press('q');
  await expect(page).toHaveURL(/\/quests$/);

  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByTestId('command-palette')).toBeVisible();
  await page.getByTestId('palette-input').fill('goals');
  await page.getByTestId('palette-item').first().click();
  await expect(page).toHaveURL(/\/goals$/);
});
