import { expect, test } from '../fixtures/test';

/** Records the 13×13 grid's width on every frame (before the browser paints it) until `stop()`. */
async function recordGridWidths(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const widths: number[] = [];
    Object.assign(window, { gridWidths: widths, recording: true });
    const sample = () => {
      const grid = document.querySelector('[data-testid="hand-grid"]');
      if (grid) widths.push(grid.getBoundingClientRect().width);
      if ((window as unknown as { recording: boolean }).recording) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  return async () => page.evaluate(() => {
    Object.assign(window, { recording: false });
    return (window as unknown as { gridWidths: number[] }).gridWidths;
  });
}

test.describe('Phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('changing the chart never shows the grid at a size that does not fit, not even for a frame', async ({ page, shell, explorer }) => {
    await explorer.open('btn_open', 25);
    await expect(explorer.grid.cell('AA')).toBeVisible();
    const stop = await recordGridWidths(page);

    for (const stack of [8, 15, 20] as const) {
      await shell.chooseStack(stack);
      await expect(page).toHaveURL(new RegExp(`stack=${stack}$`));
      await expect(explorer.grid.cell('AA')).toBeVisible();
    }
    await shell.chooseSituation('SB Open (BTN fold)');
    await expect(explorer.grid.cell('AA')).toBeVisible();
    await page.waitForTimeout(300);

    const widths = await stop();
    expect(widths.length, 'frames sampled').toBeGreaterThan(5);
    expect(Math.max(...widths), 'widest grid in any frame (px)').toBeLessThanOrEqual(390);
  });
});
