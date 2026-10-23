import { expect, test } from '@playwright/test';

test('search groups four record types, opens each and explains lens behavior', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByRole('textbox', { name: 'Quick add task', exact: true }).waitFor();
  await page.evaluate(async () => {
    const { useTasks } = await import('/src/modules/' + 'tasks/store.ts');
    const { useLibrary } = await import('/src/modules/' + 'library/store.ts');
    const { useFeed } = await import('/src/modules/' + 'feed/store.ts');
    const { useStudio } = await import('/src/modules/' + 'studio/store.ts');
    const { whenHydrated } = await import('/src/core/' + 'store.ts');
    await Promise.all([useTasks, useLibrary, useFeed, useStudio].map(whenHydrated));
    useTasks.getState().addTask({ title: 'Search fixture task', domain: 'business' });
    useLibrary.getState().addBook({ title: 'Search fixture book', author: 'Writer', pages: 100 });
    const source = useFeed.getState().addSource({ name: 'Fixture', kind: 'podcast', domain: 'business' });
    useFeed.getState().addItem({ sourceId: source.id, title: 'Search fixture feed' });
    const channel = useStudio.getState().addChannel({ name: 'Fixture', kind: 'podcast' });
    useStudio.getState().addPiece({ channelId: channel.id, title: 'Search fixture piece' });
  });
  for (const [area, title, dialog] of [['Tasks', 'task', 'Task'], ['Library', 'book', 'Book details'], ['Feed', 'feed', 'Saved feed item'], ['Studio', 'piece', 'Piece']]) {
    await page.getByRole('tab', { name: 'Personal', exact: true }).click();
    await page.getByRole('button', { name: 'Search & add' }).click();
    const search = page.getByRole('combobox', { name: 'Search records and commands' });
    await search.fill('Search fixture');
    await expect(page.getByText('Searches Everything in this workspace.', { exact: false })).toBeVisible();
    const group = page.getByRole('group', { name: `Saved · ${area}`, exact: true });
    await group.getByRole('option').filter({ hasText: `Search fixture ${title}` }).click();
    await expect(page.getByRole('dialog', { name: dialog, exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tab', { name: 'Everything', exact: true })).toHaveClass(/active/);
  }
  await page.getByRole('button', { name: 'Search & add' }).click();
  await page.getByRole('combobox', { name: 'Search records and commands' }).fill('nonexistent-record-query');
  await expect(page.getByText('No saved records match.', { exact: false })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Create', exact: true })).toBeVisible();
});

test.describe('habit touch and keyboard editing', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('edits settings, archives and restores history through touch controls', async ({ page }) => {
    await page.goto('/health');
    await page.getByRole('button', { name: 'New habit', exact: true }).tap();
    const create = page.getByRole('dialog', { name: 'New habit', exact: true });
    await create.getByRole('textbox', { name: 'Habit', exact: true }).fill('Walk');
    await create.getByRole('button', { name: 'Add habit' }).tap();
    await page.locator('.habit-day.today').tap();
    await page.getByRole('button', { name: 'Edit Walk', exact: true }).tap();
    const edit = page.getByRole('dialog', { name: 'Edit habit', exact: true });
    await edit.getByRole('combobox', { name: 'Days per week' }).selectOption('3');
    await expect(edit.getByText('Changing the daily target or days per week', { exact: false })).toBeVisible();
    const save = edit.getByRole('button', { name: 'Save habit' });
    await save.focus(); await page.keyboard.press('Enter');
    await expect(edit).toBeHidden();
    await expect(page.locator('.habit-day.today')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Archive Walk', exact: true }).tap();
    await page.getByText('Archived habits', { exact: true }).tap();
    await page.getByRole('button', { name: 'Edit / restore' }).tap();
    await page.getByRole('button', { name: 'Save & restore' }).tap();
    await expect(edit).toBeHidden();
    await page.reload();
    await expect(page.locator('.habit-day.today')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('3×/week', { exact: false })).toBeVisible();
  });
});
