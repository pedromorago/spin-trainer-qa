import type { Locator, Page } from '@playwright/test';

/** Stats: session scoreboard (local) and history (API aggregates over the attempts). */
export class StatsPage {
  // #region Locators
  readonly sessionTotal: Locator;
  readonly sessionAccuracy: Locator;
  readonly globalTotal: Locator;
  readonly globalAccuracy: Locator;
  readonly chart: Locator;
  readonly chartAsTable: Locator;
  readonly progressTable: Locator;
  readonly weakest: Locator;
  readonly situationMeters: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.sessionTotal = page.getByTestId('stats-session-total');
    this.sessionAccuracy = page.getByTestId('stats-session-accuracy');
    this.globalTotal = page.getByTestId('stats-global-total');
    this.globalAccuracy = page.getByTestId('stats-global-accuracy');
    this.chart = page.getByTestId('progress-chart');
    this.chartAsTable = page.getByRole('button', { name: 'Ver tabla' });
    this.progressTable = page.getByTestId('progress-table');
    this.weakest = page.getByTestId('stats-weakest');
    this.situationMeters = page.getByRole('list', { name: 'Precisión por situación' }).getByRole('meter');
  }
}
