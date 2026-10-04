import { btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

test.describe('Tooltips and help (ADR-0022)', () => {
  test('hovering an action explains it, and Escape dismisses the explanation', async ({ page, explorer }) => {
    await explorer.open();
    await explorer.startEditing();
    const allIn = explorer.brush('ALLIN');
    const tip = page.getByRole('tooltip').filter({ hasText: 'Go all-in.' });

    await allIn.hover();
    await expect(tip).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
  });

  test('keyboard focus shows the explanation too, and moving on shows the next one', async ({ page, explorer }) => {
    await explorer.open();
    await explorer.startEditing();
    const allIn = page.getByRole('tooltip').filter({ hasText: 'Go all-in.' });
    const fold = page.getByRole('tooltip').filter({ hasText: /^Fold\.$/ });

    await explorer.brush('L_C_F').focus();
    await page.keyboard.press('Tab');
    await expect(explorer.brush('ALLIN')).toBeFocused();
    await expect(allIn).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(explorer.brush('FOLD')).toBeFocused();
    await expect(allIn).toBeHidden();
    await expect(fold).toBeVisible();
  });

  test('screen readers get the explanation as the description of each action, without opening it', async ({ explorer }) => {
    await explorer.open();
    await explorer.startEditing();

    await expect(explorer.brush('MR_F_F')).toHaveAccessibleDescription('Min-raise; fold if someone 3-bets.');
    await expect(explorer.brush('ERASE')).toHaveAccessibleDescription(/puts a hand back to the implicit action/);
  });

  test('pressing an action puts its explanation away, so it does not cover the grid', async ({ page, explorer }) => {
    await explorer.open();
    await explorer.startEditing();
    const allIn = page.getByRole('tooltip').filter({ hasText: 'Go all-in.' });

    await explorer.brush('ALLIN').hover();
    await expect(allIn).toBeVisible();
    await explorer.brush('ALLIN').click();

    await expect(explorer.brush('ALLIN')).toHaveAttribute('aria-pressed', 'true');
    await expect(allIn).toBeHidden();
  });

  test('the "?" buttons open on a tap and close on a tap elsewhere', async ({ page, explorer }) => {
    await explorer.open();
    const glossary = page.getByRole('tooltip').filter({ hasText: 'MR = min-raise' });

    await page.getByRole('button', { name: 'What do these actions mean?' }).click();
    await expect(glossary).toBeVisible();
    await expect(glossary).toContainText('MR / 4bet vs 3b / Call AI: Min-raise; 4-bet if someone 3-bets; call if they go all-in.');

    await explorer.heading.click();
    await expect(glossary).toBeHidden();
  });

  test('the help stays inside the screen on a phone', async ({ page, explorer }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await explorer.open();

    await page.getByRole('button', { name: 'What do these actions mean?' }).click();
    const box = await page.getByRole('tooltip').filter({ hasText: 'MR = min-raise' }).boundingBox();

    expect(box, 'the glossary is on screen').not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });

  test('every section explains its own figures', async ({ page, shell, quiz, builder }) => {
    await quiz.open();
    await expect(page.getByRole('button', { name: 'About the Quiz modes' })).toBeVisible();
    await quiz.answerWith(btnOpen25);

    await shell.goTo('Builder');
    await builder.verify.click();
    await expect(page.getByRole('button', { name: 'About the verdicts' })).toBeVisible();

    await shell.goTo('Stats');
    await expect(page.getByRole('button', { name: 'About hard hands' })).toBeVisible();

    await shell.goTo('Explorer');
    await expect(page.getByRole('button', { name: 'About hands, combos and range' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About the stack and Any' })).toBeVisible();
  });
});
