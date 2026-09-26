import type { Locator, Page } from '@playwright/test';

/** Route error screen: replaces a page that could not render or be downloaded; the header stays. */
export class RouteErrorScreen {
  // #region Locators
  readonly heading: Locator;
  readonly message: Locator;
  readonly reloadButton: Locator;
  readonly homeLink: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'No se ha podido mostrar esta pantalla' });
    this.message = page.getByTestId('route-error').getByRole('alert');
    this.reloadButton = page.getByRole('button', { name: 'Recargar' });
    this.homeLink = page.getByRole('link', { name: 'Ir al inicio' });
  }

  // #region Actions
  async reload(): Promise<void> {
    await this.reloadButton.click();
  }
  // #endregion
}
