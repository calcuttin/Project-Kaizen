import { expect, test, type Page } from '@playwright/test';

const editLabel = (name: string) => `Edit project “${name}”`;
const quickAdd = async (page: Page, text: string) => {
  const input = page.getByRole('textbox', { name: 'Quick add task', exact: true });
  await input.fill(text);
  await input.press('Enter');
};
const createProject = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
};
const openEditor = async (page: Page, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: editLabel(name.replace(' (archived)', '')), exact: true }).click();
  return page.getByRole('dialog', { name: 'Edit project' });
};

test('a project can be renamed, recoloured, archived and restored', async ({ page }) => {
  await page.goto('/tasks');
  await createProject(page, 'Website');
  const chip = page.getByRole('button', { name: 'Website', exact: true });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  const editor = await openEditor(page, 'Website');
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Relaunch');
  await editor.getByRole('button', { name: 'Color #9ece6a', exact: true }).click();
  await editor.getByRole('textbox', { name: 'Name', exact: true }).press('Enter');
  await expect(editor).toBeHidden();
  await expect(page.getByRole('button', { name: 'Website', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Relaunch', exact: true })).toBeVisible();

  await quickAdd(page, 'Fix nav #Relaunch');
  await expect(page.locator('.list-item').filter({ hasText: 'Fix nav' }).getByText('Relaunch', { exact: true })).toBeVisible();

  const archived = await openEditor(page, 'Relaunch');
  await archived.getByRole('button', { name: 'Archive project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Relaunch', exact: true })).toHaveCount(0);
  const showArchived = page.getByRole('checkbox', { name: 'Show archived', exact: true });
  await expect(showArchived).toBeVisible();
  await showArchived.check();
  await expect(page.getByRole('button', { name: 'Relaunch (archived)', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Relaunch (archived)', exact: true })).toHaveCount(0);
  await expect(showArchived).toBeVisible();
  await showArchived.check();
  const restored = await openEditor(page, 'Relaunch (archived)');
  await restored.getByRole('button', { name: 'Unarchive project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Relaunch', exact: true })).toBeVisible();
  await expect(showArchived).toHaveCount(0);
});

test('quick add brings an archived project back instead of duplicating it', async ({ page }) => {
  await page.goto('/tasks');
  await createProject(page, 'Relaunch');
  const editor = await openEditor(page, 'Relaunch');
  await editor.getByRole('button', { name: 'Archive project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Relaunch', exact: true })).toHaveCount(0);
  await quickAdd(page, 'Ship it #relaunch');
  await expect(page.getByRole('button', { name: 'Relaunch', exact: true })).toHaveCount(1);
  await expect(page.locator('.list-item').filter({ hasText: 'Ship it' }).getByText('Relaunch', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Show archived', exact: true })).toHaveCount(0);
});

test('deleting a project keeps its tasks and leaves them unassigned', async ({ page }) => {
  await page.goto('/tasks');
  await createProject(page, 'Website');
  await quickAdd(page, 'Fix nav #Website');
  await quickAdd(page, 'Ship it #Website');
  const editor = await openEditor(page, 'Website');
  page.once('dialog', (dialog) => dialog.accept());
  await editor.getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Website', exact: true })).toHaveCount(0);
  const fixNav = page.locator('.list-item').filter({ hasText: 'Fix nav' });
  const shipIt = page.locator('.list-item').filter({ hasText: 'Ship it' });
  await expect(fixNav).toBeVisible();
  await expect(shipIt).toBeVisible();
  await expect(page.getByText('Website', { exact: true })).toHaveCount(0);
  await fixNav.getByText('Fix nav', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Task' }).getByRole('combobox', { name: 'Project', exact: true })).toHaveValue('');
});

test('saving is refused for an empty or duplicate project name', async ({ page }) => {
  await page.goto('/tasks');
  await createProject(page, 'Alpha');
  await createProject(page, 'Beta');
  const editor = await openEditor(page, 'Beta');
  const name = editor.getByRole('textbox', { name: 'Name', exact: true });
  const save = editor.getByRole('button', { name: 'Save changes', exact: true });
  await name.fill('');
  await expect(save).toBeDisabled();
  await name.fill('alpha');
  await expect(save).toBeDisabled();
  await expect(editor.getByText('A project named “alpha” already exists')).toBeVisible();
  await name.fill('Gamma');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole('button', { name: 'Gamma', exact: true })).toBeVisible();
});
