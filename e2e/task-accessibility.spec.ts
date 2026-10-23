import { expect, test } from '@playwright/test';

test('empty, filtered and completed task states work in both views', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Quick add task', exact: true });
  await input.fill('Keep this task #Work'); await input.press('Enter');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const project = page.getByRole('dialog', { name: 'New project', exact: true });
  await project.getByRole('textbox', { name: 'Name', exact: true }).fill('Empty project');
  await project.getByRole('textbox', { name: 'Name', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Empty project', exact: true }).click();
  await expect(page.getByText('No matching tasks', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByText('No matching tasks', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mark complete: Keep this task', exact: true }).click();
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show completed' }).click();
  const card = page.getByRole('button', { name: 'Open task: Keep this task', exact: true });
  await card.focus(); await page.keyboard.press('Enter');
  const task = page.getByRole('dialog', { name: 'Task', exact: true });
  await task.getByRole('combobox', { name: 'Status', exact: true }).selectOption('next');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await page.getByRole('checkbox', { name: 'Show done' }).uncheck();
  await expect(card).toBeVisible();
  await card.press('Space');
  await expect(task).toBeVisible();
});

test('habit controls expose full dates and completion without relying on color at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/health');
  await page.getByRole('button', { name: 'New habit', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New habit', exact: true });
  await form.getByRole('textbox', { name: 'Habit', exact: true }).fill('Walk');
  await form.getByRole('button', { name: 'Add habit' }).click();
  await expect(form).toBeHidden();
  const day = page.locator('.habit-day.today');
  await expect(day).toHaveAttribute('aria-label', /Walk: (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
  await day.focus(); await page.keyboard.press('Space');
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(day).toContainText('✓');
  expect(await day.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  const size = await day.boundingBox(); expect(size!.width).toBeGreaterThanOrEqual(40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // A 320 CSS-pixel viewport also exercises reflow equivalent to a 1280px viewport at 400% zoom.
});

for (const theme of ['dark', 'light']) test(`${theme} secondary text and habit completion have measured contrast`, async ({ page }) => {
  await page.goto('/tasks');
  const ratios = await page.evaluate((theme) => {
    document.documentElement.dataset.theme = theme;
    const styles = getComputedStyle(document.documentElement);
    const luminance = (name: string) => {
      const hex = styles.getPropertyValue(name).trim().replace('#', '');
      const values = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    return [...['--text-2', '--text-3'].flatMap(text => ['--bg', '--bg-elev', '--bg-elev-2'].map(bg => ({ pair: `${text}/${bg}`, ratio: contrast(text, bg) }))), { pair: 'habit completion', ratio: contrast('--health-ink', '--health') }];
  }, theme);
  for (const { pair, ratio } of ratios) expect(ratio, `${theme} ${pair}`).toBeGreaterThanOrEqual(4.5);
});

test('task list separates keyboard actions and restores focus after editing', async ({ page }) => {
  await page.goto('/tasks');
  const input = page.getByRole('textbox', { name: 'Quick add task', exact: true });
  await input.fill('Keyboard task'); await input.press('Enter');
  const list = page.getByRole('button', { name: 'List', exact: true });
  const board = page.getByRole('button', { name: 'Board', exact: true });
  await expect(list).toHaveAttribute('aria-pressed', 'true');
  await expect(board).toHaveAttribute('aria-pressed', 'false');
  const opener = page.getByRole('button', { name: 'Open task: Keyboard task', exact: true });
  await opener.focus(); await page.keyboard.press('Space');
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  const complete = page.getByRole('checkbox', { name: 'Mark complete: Keyboard task', exact: true });
  await complete.focus(); await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show completed' }).click();
  await opener.press('Enter');
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).selectOption('next');
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  const lens = page.getByRole('group', { name: 'Life lens' });
  await lens.getByRole('button', { name: 'Business', exact: true }).press('Space');
  await expect(lens.getByRole('button', { name: 'Business', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(lens.getByRole('button', { name: 'Everything', exact: true })).toHaveAttribute('aria-pressed', 'false');
});
