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
    this.heading = page.getByRole('heading', { name: 'This screen could not be shown' });
    this.message = page.getByTestId('route-error').getByRole('alert');
    this.reloadButton = page.getByRole('button', { name: 'Reload' });
    this.homeLink = page.getByRole('link', { name: 'Go to start' });
  }

  // #region Actions
  async reload(): Promise<void> {
    await this.reloadButton.click();
  }
  // #endregion
}
