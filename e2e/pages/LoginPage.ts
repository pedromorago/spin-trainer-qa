import type { Locator, Page } from '@playwright/test';

/**
 * The sign-in page (/login), for whoever opens a page of the app signed out. Google is the only way in (ADR-0020); the
 * test-player form exists only in the web's mock mode. The landing page shows the same card in a dialog (LandingPage).
 */
export class LoginPage {
  // #region Locators
  readonly screen: Locator;
  readonly google: Locator;
  readonly privacy: Locator;
  readonly testPlayer: Locator;
  readonly chart: Locator;
  readonly home: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.screen = page.getByRole('main', { name: 'Sign in to keep training' });
    this.google = page.getByRole('button', { name: 'Continue with Google' });
    this.privacy = page.getByRole('link', { name: 'Privacy' });
    this.testPlayer = page.getByRole('form', { name: 'Test player' });
    this.chart = page.getByRole('complementary', { name: 'An example range' }).getByRole('table', { name: /^Range / });
    this.home = page.getByRole('link', { name: 'Back to home' });
  }

  // #region Actions
  /** Mock mode only: plays as the player with this email. */
  async signInAs(email: string): Promise<void> {
    await this.testPlayer.getByLabel("Test player's email").fill(email);
    await this.testPlayer.getByRole('button', { name: 'Sign in as this player' }).click();
  }
  // #endregion
}
