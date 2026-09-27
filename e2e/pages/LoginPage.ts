import type { Locator, Page } from '@playwright/test';

/** Google is the only way in (ADR-0020); the test-player form exists only in the web's mock mode. */
export class LoginPage {
  // #region Locators
  readonly screen: Locator;
  readonly google: Locator;
  readonly privacy: Locator;
  readonly testPlayer: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.screen = page.getByRole('main', { name: 'Spin Trainer' });
    this.google = page.getByRole('button', { name: 'Continue with Google' });
    this.privacy = page.getByRole('link', { name: 'Privacy' });
    this.testPlayer = page.getByRole('form', { name: 'Test player' });
  }

  // #region Actions
  /** Mock mode only: plays as the player with this email. */
  async signInAs(email: string): Promise<void> {
    await this.testPlayer.getByLabel("Test player's email").fill(email);
    await this.testPlayer.getByRole('button', { name: 'Sign in as this player' }).click();
  }
  // #endregion
}
