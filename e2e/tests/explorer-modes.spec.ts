import { expect, test } from '../fixtures/test';

test.describe('Explorer: reading and editing', () => {
  test.beforeEach(async ({ explorer }) => {
    await explorer.open('btn_open', 25);
    await expect(explorer.grid.cell('AA')).toBeVisible();
  });

  test('it opens read-only: Edit and Copy, a legend instead of brushes, and the grid cannot be painted', async ({ explorer }) => {
    await expect(explorer.edit).toBeVisible();
    await expect(explorer.copy).toBeVisible();
    await expect(explorer.save).toBeHidden();
    await expect(explorer.reset).toBeHidden();
    await expect(explorer.legend).toBeVisible();
    await expect(explorer.brushes).toBeHidden();

    await explorer.grid.cell('72o').click();

    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
    await expect(explorer.modifiedBadge).toBeHidden();
  });

  test('an example range says what it is, until the player makes it their own (ADR-0024)', async ({ page, explorer }) => {
    const explanation = page.getByRole('tooltip').filter({ hasText: 'not a strategy' });
    await expect(explorer.referenceBadge).toHaveText('Example');

    await explorer.exampleInfo.click();
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText('ranked by their all-in equity against a random hand');
    await explorer.heading.click();
    await expect(explanation).toBeHidden();

    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.customBadge).toBeVisible();
    await expect(explorer.referenceBadge).toBeHidden();
    await expect(explorer.exampleInfo).toBeHidden();
  });

  test('Edit brings Save, Cancel and Reset', async ({ explorer }) => {
    await explorer.edit.click();

    await expect(explorer.editingBadge).toBeVisible();
    await expect(explorer.edit).toBeHidden();
    await expect(explorer.save).toBeEnabled();
    await expect(explorer.cancel).toBeEnabled();
    await expect(explorer.reset, 'nothing custom to delete yet').toBeDisabled();
    await expect(explorer.legend).toBeHidden();
    await expect(explorer.brushes).toBeVisible();
  });

  test('Save with nothing changed just goes back to reading, saving nothing', async ({ page, explorer }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/ranges/user/')) writes.push(`${request.method()} ${request.url()}`);
    });
    await explorer.edit.click();

    await explorer.save.click();

    await expect(explorer.edit).toBeVisible();
    await expect(explorer.save).toBeHidden();
    await expect(explorer.notice, 'nothing was saved').toBeEmpty();
    await expect(explorer.referenceBadge).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('saving confirms it and goes back to reading, with the range now custom', async ({ explorer }) => {
    await explorer.paint('ALLIN', '72o');

    await explorer.save.click();

    await expect(explorer.notice).toHaveText('✓ Saved');
    await expect(explorer.edit).toBeVisible();
    await expect(explorer.save).toBeHidden();
    await expect(explorer.customBadge).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');

    await explorer.edit.click();
    await expect(explorer.notice, 'the confirmation goes once editing again').toBeEmpty();
  });

  test('Cancel leaves at once without changes, and asks first with them', async ({ explorer }) => {
    await explorer.edit.click();
    await explorer.cancel.click();
    await expect(explorer.edit).toBeVisible();

    await explorer.paint('ALLIN', '72o');
    await explorer.cancel.click();
    await expect(explorer.confirmCancel).toBeVisible();
    await explorer.confirmCancel.getByRole('button', { name: 'Keep editing' }).click();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');

    await explorer.cancel.click();
    await explorer.confirmCancel.getByRole('button', { name: 'Discard changes' }).click();

    await expect(explorer.edit).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
    await expect(explorer.referenceBadge).toBeVisible();
  });

  test('Reset deletes the custom range, confirms it and goes back to reading the example one', async ({ explorer }) => {
    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.customBadge).toBeVisible();

    await explorer.resetToReference();

    await expect(explorer.notice).toHaveText('✓ Back to the example range');
    await expect(explorer.edit).toBeVisible();
    await expect(explorer.referenceBadge).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
  });
});
