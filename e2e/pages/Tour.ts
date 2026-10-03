import type { Locator, Page } from '@playwright/test';

/** The guided tour (ADR-0022): a modal dialog per step, next to the element it explains. */
export class Tour {
  // #region Locators
  readonly dialog: Locator;
  readonly progress: Locator;
  readonly title: Locator;
  readonly skip: Locator;
  readonly back: Locator;
  readonly next: Locator;
  readonly done: Locator;
  readonly tryQuiz: Locator;
  // #endregion

  /** Steps of the Explorer's tour. */
  static readonly STEPS = 9;

  constructor(readonly page: Page) {
    this.dialog = page.getByTestId('tour');
    this.progress = page.getByTestId('tour-progress');
    this.title = this.dialog.getByRole('heading', { level: 2 });
    this.skip = this.dialog.getByRole('button', { name: 'Skip tour' });
    this.back = this.dialog.getByRole('button', { name: 'Back' });
    this.next = this.dialog.getByRole('button', { name: 'Next' });
    this.done = this.dialog.getByRole('button', { name: 'Done' });
    this.tryQuiz = this.dialog.getByRole('button', { name: 'Try the Quiz' });
  }

  // #region Actions
  /** Moves forward to step `step` (1-based) from the current one. */
  async goToStep(step: number): Promise<void> {
    for (let current = await this.currentStep(); current < step; current++) await this.next.click();
  }
  // #endregion

  // #region Queries
  async currentStep(): Promise<number> {
    return Number((await this.progress.textContent())?.split('/')[0]);
  }

  /** What this device remembers about the tour: 'done', 'skipped' or null (never seen). */
  async remembered(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('spin-trainer.tour'));
  }

  /** Whether keyboard focus is inside the dialog. */
  async hasFocus(): Promise<boolean> {
    return this.dialog.evaluate((dialog) => dialog.contains(document.activeElement));
  }
  // #endregion
}
