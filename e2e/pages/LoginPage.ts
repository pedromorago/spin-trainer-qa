import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  // #region Localizadores
  readonly form: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.form = page.getByRole('form', { name: 'Entrar' });
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Contraseña');
    this.submit = page.getByRole('button', { name: 'Entrar' });
  }

  // #region Acciones
  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
  // #endregion
}
