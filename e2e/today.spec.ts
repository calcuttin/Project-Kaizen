import { expect, test } from '@playwright/test';

test('Today offers direct entry actions and preserves the daily check-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Quick add for today', exact: true }).fill('Plan the week');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByText('Plan the week', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: "Today's intention", exact: true }).fill('Make time for a walk');
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByRole('textbox', { name: 'Add a win', exact: true }).fill('Read a chapter');
  await page.getByRole('button', { name: 'Add win', exact: true }).click();
  await expect(page.getByText('Read a chapter', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Plan the week', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: "Today's intention", exact: true })).toHaveValue('Make time for a walk');
  await expect(page.getByRole('button', { name: 'Good', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Read a chapter', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const plan = page.getByRole('region', { name: 'Plan your day' });
  const bounds = await plan.boundingBox();
  const taskInput = await page.getByRole('textbox', { name: 'Quick add for today' }).boundingBox();
  const add = await page.getByRole('button', { name: 'Add task', exact: true }).boundingBox();
  expect(taskInput!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(add!.x + add!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  await page.getByRole('textbox', { name: 'Quick add for today' }).fill('Take a break');
  await page.getByRole('textbox', { name: 'Quick add for today' }).press('Enter');
  await expect(page.getByText('Take a break', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bookshelf' })).toBeVisible();
});
