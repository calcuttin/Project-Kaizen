import { expect, test } from '@playwright/test';

test('invalid task dates preserve the draft and completed tasks have a recovery action', async ({ page }) => {
  await page.goto('/tasks');
  const input = page.getByRole('textbox', { name: 'Quick add task', exact: true });
  await input.fill('Review 2026-13-01');
  await expect(page.getByText('That date does not exist.', { exact: false })).toBeVisible();
  await input.press('Enter');
  await expect(page.getByText('Review 2026-13-01', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark complete', exact: true }).click();
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show completed' }).click();
  await expect(page.getByText('Review 2026-13-01', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByText('Review 2026-13-01', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Show done', exact: true }).uncheck();
  await expect(page.getByText('Review 2026-13-01', { exact: true })).toBeHidden();
});

test('palette keeps the background inert, closes with Escape, and opens saved records', async ({ page }) => {
  await page.goto('/tasks');
  const input = page.getByRole('textbox', { name: 'Quick add task', exact: true });
  await input.fill('Find this task'); await input.press('Enter');
  const trigger = page.getByRole('button', { name: 'Search & add' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  const search = page.getByRole('combobox', { name: 'Search records and commands' });
  await search.press('Shift+Tab');
  expect(await page.locator('input[type=checkbox]').evaluate((node) => node === document.activeElement)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click(); await search.fill('Find this task');
  await expect(page.getByRole('option').first()).toContainText('Find this task');
  await search.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Task', exact: true }).getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Find this task');
});

test('habit target validation, first-day scoring, editing and archiving preserve history', async ({ page }) => {
  await page.goto('/health');
  await page.getByRole('button', { name: 'New habit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New habit', exact: true });
  await dialog.getByRole('textbox', { name: 'Habit', exact: true }).fill('Drink water');
  await dialog.getByRole('combobox', { name: 'Type', exact: true }).selectOption('count');
  await dialog.getByRole('spinbutton', { name: 'Daily target', exact: true }).fill('0');
  await expect(dialog.getByRole('button', { name: 'Add habit' })).toBeDisabled();
  await dialog.getByRole('spinbutton', { name: 'Daily target', exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Add habit' }).click();
  const today = page.locator('.habit-day.today');
  await today.click();
  await expect(today).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Drink water', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit habit', exact: true });
  await edit.getByRole('textbox', { name: 'Habit', exact: true }).fill('Water');
  await edit.getByRole('button', { name: 'Save habit' }).click();
  await expect(today).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Archive Water', exact: true }).click();
  await expect(today).toHaveCount(0);
  await page.getByText('Archived habits', { exact: true }).click();
  await page.getByRole('button', { name: 'Edit / restore' }).click();
  await page.getByRole('button', { name: 'Save & restore' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit habit', exact: true })).toBeHidden();
  await page.reload();
  await expect(page.locator('.habit-day.today')).toHaveAttribute('aria-pressed', 'true');
});
