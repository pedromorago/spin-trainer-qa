import { expect, test } from '../fixtures/test';
import { ExplorerPage } from '../pages/ExplorerPage';
import { Tour } from '../pages/Tour';

// Only in the "demo" project: the web built with --mode demo (ADR-0022), the public site while sign-in is switched off.
test.describe('Public demo (ADR-0022)', () => {
  test('nobody signs in or out: the header says where the progress is kept', async ({ page, shell, explorer }) => {
    await explorer.open();

    await expect(shell.demoBadge).toBeVisible();
    await expect(shell.signOut).toHaveCount(0);
    await page.getByRole('button', { name: 'About the demo' }).click();
    await expect(page.getByRole('tooltip').filter({ hasText: 'saved in this browser only' })).toBeVisible();
  });

  test('the sign-in page sends you straight into the app', async ({ page, explorer, login }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/explorer$/);
    await expect(explorer.heading).toBeVisible();
    await expect(login.screen).toBeHidden();
  });

  test('the sign-out address leads home, still in the demo', async ({ page, landing }) => {
    await page.goto('/logout');

    await expect(page).toHaveURL(/\/$/);
    await expect(landing.heading).toBeVisible();
    await expect(landing.start).toHaveText('Start training');
  });

  test('the landing page invites you in without an account', async ({ landing, explorer }) => {
    await landing.open();

    await expect(landing.start).toHaveText('Start training');
    await expect(landing.note).toHaveText('Free, no sign-up: your progress stays in this browser.');
    await landing.start.click();
    await expect(explorer.heading).toBeVisible();
  });

  test('saved work survives a reload, and another browser starts from the reference', async ({ browser, page, explorer }, testInfo) => {
    await explorer.open();
    await explorer.paint('ALLIN', '72o');
    await explorer.save.click();
    await expect(explorer.customBadge).toBeVisible();

    await page.reload();
    await expect(explorer.customBadge).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'ALLIN');

    const otherBrowser = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    try {
      const elsewhere = new ExplorerPage(await otherBrowser.newPage());
      await elsewhere.open();
      await expect(elsewhere.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
      await expect(elsewhere.referenceBadge).toBeVisible();
    } finally {
      await otherBrowser.close();
    }
  });
});

test.describe('Public demo, first visit (ADR-0022)', () => {
  test.use({ onboarded: false });

  test('the welcome step says no account is needed', async ({ explorer, tour }) => {
    await explorer.open();

    await expect(tour.progress).toHaveText(`1 / ${Tour.STEPS}`);
    await expect(tour.dialog).toContainText('No account needed: your progress is saved in this browser.');
  });
});
