import { expect, test } from '@playwright/test';

test('a weekly task creates one next occurrence and can stop without losing history', async ({ page }) => {
  await page.goto('/tasks');
  const quick = page.getByPlaceholder(/Add a task/);
  await quick.fill('Weekly review'); await quick.press('Enter');
  await page.getByRole('button', { name: /Weekly review/ }).click();
  const editor = page.getByRole('dialog', { name: 'Task', exact: true });
  await editor.getByLabel('Due', { exact: true }).fill('2026-10-22');
  await editor.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('weekly');
  await editor.getByRole('combobox', { name: 'Status', exact: true }).selectOption('done');
  await expect(editor.getByText(/next occurrence has already been created/)).toBeVisible();
  await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Weekly review/ }).click();
  await expect(editor.getByRole('combobox', { name: 'Repeat', exact: true })).toHaveValue('weekly');
  await expect(editor.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('next');
  await editor.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('');
  await editor.getByRole('combobox', { name: 'Status', exact: true }).selectOption('done');
  await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show done', exact: true }).check();
  await expect(page.getByRole('button', { name: /Weekly review/ })).toHaveCount(2);
});
