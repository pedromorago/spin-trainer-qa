import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  // #region Locators
  readonly form: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly google: Locator;
  readonly privacy: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.form = page.getByRole('form', { name: 'Entrar' });
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Contraseña');
    this.submit = page.getByRole('button', { name: 'Entrar', exact: true });
    this.google = page.getByRole('button', { name: 'Continuar con Google' });
    this.privacy = page.getByRole('link', { name: 'Privacidad' });
  }

  // #region Actions
  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
  // #endregion
}
