import { BTN_OPEN, bbVsSbOs10, btnOpen25, REFERENCE_RANGES, REFERENCE_SITUATIONS } from '../data/reference';
import { expectAccessible } from '../fixtures/a11y';
import { expect, test } from '../fixtures/test';

test.describe('Landing page (ADR-0022)', () => {
  test('shows the product, with the live reference chart, without asking anyone to sign in', async ({ landing, login }) => {
    await landing.open();

    await expect(landing.heading).toBeVisible();
    await expect(login.screen).toBeHidden();
    await expect(landing.preview).toContainText(`${BTN_OPEN.label} · ${BTN_OPEN.stack} BB`);
    const actions = await landing.previewActions();
    expect(Object.keys(actions), 'a full 13×13 chart').toHaveLength(169);
    expect(actions, 'every cell shows the reference action').toEqual(
      Object.fromEntries(Object.keys(actions).map((hand) => [hand, btnOpen25(hand)])),
    );
  });

  test('its figures are counted from the reference data', async ({ landing }) => {
    await landing.open();

    await expect(landing.fact('situations')).toHaveText(String(REFERENCE_SITUATIONS));
    await expect(landing.fact('reference ranges')).toHaveText(String(REFERENCE_RANGES));
    await expect(landing.fact('hands each')).toHaveText('169');
  });

  test('"Try a hand" grades the answer against the chart and keeps the score', async ({ landing }) => {
    await landing.open();
    const hand = (await landing.hand.textContent()) ?? '';
    const calls = bbVsSbOs10(hand) === 'CALL';

    await landing.answer('CALL');

    await expect(landing.feedback).toHaveText(
      calls ? `Correct: the chart calls ${hand} here.` : `Wrong: the chart folds ${hand} here; you chose Call.`,
    );
    await expect(landing.score).toHaveText(calls ? '1 / 1' : '0 / 1');

    await landing.nextHand.click();
    await expect(landing.feedback).toBeEmpty();
    await expect(landing.nextHand).toBeDisabled();
    await expect(landing.score).toHaveText(calls ? '1 / 1' : '0 / 1');
    await expect(landing.keepGoing).toHaveAttribute('href', '/quiz?s=bb_vs_sb_os&stack=10');
  });

  test('its call to action opens the Explorer with the default selection', async ({ page, shell, explorer, landing }) => {
    await landing.open();

    await landing.start.click();

    await expect(page).toHaveURL(/\/explorer$/);
    await expect(explorer.heading).toBeVisible();
    await expect(shell.situation).toHaveValue(BTN_OPEN.key);
    await expect(shell.stack(BTN_OPEN.stack)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a signed-in player is offered the way back in', async ({ landing }) => {
    await landing.open();

    await expect(landing.start).toHaveText('Open the trainer');
    await expect(landing.startTop).toHaveText('Open the trainer');
    await expect(landing.note).toContainText('Signed in as');
  });

  test('makes no request to the API: everything on it is bundled with the web', async ({ page, landing }) => {
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1')) apiCalls.push(request.url());
    });

    await landing.open();
    await expect(landing.previewGrid.cell('AA')).toBeVisible();
    await landing.answer('FOLD');
    await expect(landing.feedback).not.toBeEmpty();

    expect(apiCalls).toEqual([]);
  });

  test('fits a phone screen without scrolling sideways', async ({ page, landing }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await landing.open();
    await expect(landing.previewGrid.cell('AA')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
  });

  test('links to the privacy notice', async ({ page, landing }) => {
    await landing.open();

    await landing.privacy.click();

    await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  });

  test('passes an accessibility scan (axe, WCAG 2.2 AA) with a hand answered', async ({ page, landing }, testInfo) => {
    await landing.open();
    await expect(landing.previewGrid.cell('AA')).toBeVisible();
    await landing.answer('FOLD');
    await expect(landing.feedback).not.toBeEmpty();

    await expectAccessible(page, testInfo, 'landing');
  });
});
