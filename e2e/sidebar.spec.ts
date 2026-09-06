import { expect, test } from '@playwright/test';

test('desktop navigation stays visible down a long page and works in short windows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const sidebar = page.getByRole('complementary');
  await expect(sidebar).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await expect.poll(async () => (await sidebar.boundingBox())!.y).toBeCloseTo(0, 0);
  await expect(sidebar.getByRole('link', { name: 'Today', exact: true })).toBeInViewport();
  await expect(sidebar.getByRole('link', { name: 'Settings', exact: true })).toBeInViewport();
  await sidebar.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Kaizen' })).toBeVisible();

  await page.setViewportSize({ width: 1000, height: 360 });
  const settings = sidebar.getByRole('link', { name: 'Settings', exact: true });
  await settings.scrollIntoViewIfNeeded();
  await expect(settings).toBeInViewport();
  const bounds = await sidebar.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(360);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Primary (mobile)', exact: true })).toBeInViewport();
});
