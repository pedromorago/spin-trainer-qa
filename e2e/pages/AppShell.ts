import type { Locator, Page } from '@playwright/test';

/** Common frame: navigation, single situation and stack selector, session scoreboard and sign-out. */
export class AppShell {
  // #region Locators
  readonly nav: Locator;
  readonly situation: Locator;
  readonly stacks: Locator;
  readonly randomMode: Locator;
  readonly sessionTotal: Locator;
  readonly sessionAccuracy: Locator;
  readonly sessionStreak: Locator;
  readonly signOut: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Secciones' });
    this.situation = page.getByRole('combobox', { name: 'Situación' });
    this.stacks = page.getByRole('group', { name: 'Stack' });
    this.randomMode = page.getByTestId('random-mode');
    this.sessionTotal = page.getByTestId('session-total');
    this.sessionAccuracy = page.getByTestId('session-accuracy');
    this.sessionStreak = page.getByTestId('session-streak');
    this.signOut = page.getByRole('button', { name: 'Salir' });
  }

  // #region Actions
  async open(path: string, selection?: { situation: string; stack: number | 'any' }): Promise<void> {
    const query = selection ? `?s=${selection.situation}&stack=${selection.stack}` : '';
    await this.page.goto(`${path}${query}`);
  }

  async goTo(section: 'Explorer' | 'Quiz' | 'Builder' | 'Stats'): Promise<void> {
    await this.tab(section).click();
  }

  async chooseSituation(label: string): Promise<void> {
    await this.situation.selectOption({ label });
  }

  async chooseStack(stack: number | 'Any'): Promise<void> {
    await this.stack(stack).click();
  }
  // #endregion

  // #region Queries
  tab(section: string): Locator {
    return this.nav.getByRole('link', { name: section });
  }

  stack(stack: number | 'Any'): Locator {
    return this.stacks.getByRole('button', { name: stack === 'Any' ? 'Any' : `${stack} BB`, exact: true });
  }
  // #endregion
}
