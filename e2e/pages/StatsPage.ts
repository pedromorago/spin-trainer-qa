import type { Locator, Page } from '@playwright/test';

/** Stats: marcador de la sesión (local) e histórico (agregados de la API sobre los intentos). */
export class StatsPage {
  // #region Localizadores
  readonly sessionTotal: Locator;
  readonly sessionAccuracy: Locator;
  readonly globalTotal: Locator;
  readonly globalAccuracy: Locator;
  readonly chart: Locator;
  readonly chartAsTable: Locator;
  readonly progressTable: Locator;
  readonly weakest: Locator;
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
  }
}
