import { expect, Locator, Page } from '@playwright/test';

/**
 * The select options are labeled "<emoji> <title>", whereas `selectOption({label})` requires
 * an exact match. Pass the value corresponding to the option containing the title instead of guessing the emoji.
 */
async function selectByOptionText(select: Locator, text: string) {
  const value = await select
    .locator('option', { hasText: text })
    .first()
    .getAttribute('value');
  if (!value) throw new Error(`Không tìm thấy option chứa "${text}"`);
  await select.selectOption(value);
}

export const quest = (page: Page, title: string) =>
  page.locator(`[data-testid="quest-item"][data-quest-title="${title}"]`);

export const reward = (page: Page, name: string) =>
  page.locator(`[data-testid="reward-item"][data-reward-name="${name}"]`);

export const goal = (page: Page, title: string) =>
  page.locator(`[data-testid="goal-item"][data-goal-title="${title}"]`);

/** Goal chỉ tạo được từ màn Goals, nên helper tự điều hướng. */
export async function createGoal(page: Page, title: string) {
  await page.goto('/goals');
  await page.getByTestId('new-goal-button').click();
  await page.getByTestId('goal-title-input').fill(title);
  await page.getByTestId('goal-submit').click();
  await expect(page.getByTestId('goal-form-modal')).toHaveCount(0);
  await expect(goal(page, title)).toBeVisible();
}

/** Nút New Quest nằm ở header nên gọi được từ bất kỳ màn nào. */
export async function createQuest(
  page: Page,
  title: string,
  options: {
    goal?: string;
    type?: 'ONE_TIME' | 'DAILY';
    difficulty?: string;
  } = {},
) {
  await page.getByTestId('new-quest-button').click();
  await page.getByTestId('quest-title-input').fill(title);
  if (options.goal) {
    await selectByOptionText(
      page.getByTestId('quest-goal-select'),
      options.goal,
    );
  }
  if (options.difficulty) {
    await page
      .locator(
        `[data-testid="quest-difficulty-option"][data-value="${options.difficulty}"]`,
      )
      .click();
  }
  if (options.type) {
    await page
      .locator(
        `[data-testid="quest-type-option"][data-value="${options.type}"]`,
      )
      .click();
  }
  await page.getByTestId('quest-submit').click();
  await expect(page.getByTestId('quest-form-modal')).toHaveCount(0);
}

export async function createReward(
  page: Page,
  name: string,
  options: {
    icon?: string;
    condition?: 'QUEST_COUNT' | 'XP_TOTAL' | 'STREAK';
    value: number;
    goal?: string;
    repeatable?: boolean;
  },
) {
  await page.goto('/rewards');
  await page.getByTestId('new-reward-button').click();
  await page.getByTestId('reward-name-input').fill(name);
  if (options.icon) {
    await page
      .locator(
        `[data-testid="reward-icon-option"][data-value="${options.icon}"]`,
      )
      .click();
  }
  if (options.condition) {
    await page
      .locator(
        `[data-testid="reward-condition-option"][data-value="${options.condition}"]`,
      )
      .click();
  }
  await page.getByTestId('reward-value-input').fill(String(options.value));
  if (options.goal) {
    await selectByOptionText(
      page.getByTestId('reward-goal-select'),
      options.goal,
    );
  }
  // Checkbox thật bị sr-only nên không click trực tiếp được — bấm vào label.
  const box = page.getByTestId('reward-repeatable');
  if ((await box.isChecked()) !== Boolean(options.repeatable)) {
    await page.getByTestId('reward-repeatable-toggle').click();
  }
  await page.getByTestId('reward-submit').click();
  await expect(page.getByTestId('reward-form-drawer')).toHaveCount(0);
  await expect(reward(page, name)).toBeVisible();
}

export async function completeQuest(page: Page, title: string) {
  await quest(page, title).getByTestId('complete-button').click();
  await expect(quest(page, title)).toHaveAttribute('data-quest-done', 'true');
}

/** Modal ăn mừng chặn màn hình — phải đóng trước khi thao tác tiếp. */
export async function dismissCelebrations(page: Page) {
  const levelUp = page.getByTestId('levelup-continue');
  if (await levelUp.isVisible().catch(() => false)) await levelUp.click();
  const unlock = page.getByTestId('unlock-modal');
  if (await unlock.isVisible().catch(() => false)) {
    await page.getByText('Save it for later').click();
  }
  await expect(page.getByTestId('levelup-modal')).toHaveCount(0);
  await expect(page.getByTestId('unlock-modal')).toHaveCount(0);
}
