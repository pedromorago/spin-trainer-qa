import { expectAccessible } from '../fixtures/a11y';
import { expect, test } from '../fixtures/test';
import { Tour } from '../pages/Tour';

test.describe('First-visit tour (ADR-0022)', () => {
  test.use({ onboarded: false });

  test('the first visit to the Explorer opens the tour, and skipping it is remembered on this device', async ({ page, explorer, tour }) => {
    await explorer.open();

    await expect(tour.dialog).toBeVisible();
    await expect(tour.progress).toHaveText(`1 / ${Tour.STEPS}`);
    await expect(tour.title).toHaveText('Welcome to Spin Trainer');
    await expect(tour.title).toBeFocused();

    await tour.skip.click();
    await expect(tour.dialog).toBeHidden();
    expect(await tour.remembered()).toBe('skipped');

    await page.reload();
    await expect(explorer.heading).toBeVisible();
    await expect(tour.dialog).toBeHidden();
  });

  test('Next walks through every step and Done ends the tour for good', async ({ page, explorer, tour }) => {
    await explorer.open();
    const titles: string[] = [];

    for (let step = 1; step <= Tour.STEPS; step++) {
      await expect(tour.progress).toHaveText(`${step} / ${Tour.STEPS}`);
      titles.push((await tour.title.textContent()) ?? '');
      if (step < Tour.STEPS) await tour.next.click();
    }
    expect(new Set(titles).size, 'one title per step').toBe(Tour.STEPS);
    await expect(tour.skip, 'nothing left to skip on the last step').toBeHidden();

    await tour.done.click();
    await expect(tour.dialog).toBeHidden();
    expect(await tour.remembered()).toBe('done');
    await page.reload();
    await expect(explorer.heading).toBeVisible();
    await expect(tour.dialog).toBeHidden();
  });

  test('Back returns to the previous step and Escape skips the tour', async ({ explorer, tour }) => {
    await explorer.open();
    await tour.goToStep(3);
    await expect(tour.title).toHaveText('Pick a situation');

    await tour.back.click();
    await expect(tour.progress).toHaveText(`2 / ${Tour.STEPS}`);
    await expect(tour.title).toHaveText('Four ways to train');
    await expect(tour.title).toBeFocused();

    await tour.page.keyboard.press('Escape');
    await expect(tour.dialog).toBeHidden();
    expect(await tour.remembered()).toBe('skipped');
  });

  test('keyboard focus stays inside the tour while it is open', async ({ page, explorer, tour }) => {
    await explorer.open();
    await tour.goToStep(2);

    for (let press = 0; press < 6; press++) {
      await page.keyboard.press('Tab');
      expect(await tour.hasFocus(), `focus after Tab #${press + 1}`).toBe(true);
    }
    for (let press = 0; press < 6; press++) {
      await page.keyboard.press('Shift+Tab');
      expect(await tour.hasFocus(), `focus after Shift+Tab #${press + 1}`).toBe(true);
    }
  });

  test('each step points at what it explains, next to it on a wide screen', async ({ explorer, tour }) => {
    await explorer.open();
    await expect(explorer.grid.cell('AA')).toBeVisible();

    for (let step = 2; step < Tour.STEPS; step++) {
      await tour.goToStep(step);
      await expect(tour.dialog, `step ${step}`).toHaveAttribute('data-placement', 'floating');
    }
  });

  test('the last step can take you straight to the Quiz, with the same selection', async ({ page, shell, explorer, tour }) => {
    await explorer.open('sb_open', 20);
    await tour.goToStep(Tour.STEPS);

    await tour.tryQuiz.click();

    await expect(page).toHaveURL(/\/quiz\?s=sb_open&stack=20$/);
    await expect(shell.situation).toHaveValue('sb_open');
    expect(await tour.remembered()).toBe('done');
  });

  test('on a phone the tour docks at the bottom of the screen', async ({ page, explorer, tour }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await explorer.open();

    await expect(tour.dialog).toHaveAttribute('data-placement', 'sheet');
    const box = await tour.dialog.boundingBox();
    expect(box && Math.round(box.y + box.height), 'bottom edge (px)').toBe(844 - 12);
  });

  test('the tour passes an accessibility scan (axe, WCAG 2.2 AA)', async ({ page, explorer, tour }, testInfo) => {
    await explorer.open();
    await expect(explorer.grid.cell('AA')).toBeVisible();
    await tour.goToStep(6);

    await expectAccessible(page, testInfo, 'tour');
  });
});

test.describe('Replaying the tour (ADR-0022)', () => {
  test('the Tour button replays it from any tab, keeping the selection', async ({ page, shell, explorer, quiz, tour }) => {
    await quiz.open('sb_open', 20);
    await expect(tour.dialog).toBeHidden();

    await shell.replayTour.click();

    await expect(page).toHaveURL(/\/explorer\?s=sb_open&stack=20$/);
    await expect(tour.dialog).toBeVisible();
    await expect(tour.progress).toHaveText(`1 / ${Tour.STEPS}`);
    await tour.skip.click();
    await expect(tour.dialog).toBeHidden();

    await page.reload();
    await expect(explorer.heading).toBeVisible();
    await expect(tour.dialog, 'a replay does not come back on reload').toBeHidden();
  });
});
