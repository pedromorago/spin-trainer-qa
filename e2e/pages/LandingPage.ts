import type { Locator, Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';
import { HandGrid } from './HandGrid';

/** Public landing page at / (ADR-0022): the product before any sign-in, with a live chart and one Quiz question. */
export class LandingPage {
  // #region Locators
  readonly heading: Locator;
  readonly start: Locator;
  readonly startTop: Locator;
  readonly note: Locator;
  readonly facts: Locator;
  readonly preview: Locator;
  readonly previewGrid: HandGrid;
  readonly hand: Locator;
  readonly answers: Locator;
  readonly feedback: Locator;
  readonly nextHand: Locator;
  readonly score: Locator;
  readonly keepGoing: Locator;
  readonly privacy: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Know your preflop ranges cold.' });
    this.start = page.getByTestId('landing-start');
    this.startTop = page.getByTestId('landing-start-top');
    this.note = page.getByTestId('landing-note');
    this.facts = page.getByTestId('landing-facts');
    this.preview = page.getByTestId('landing-preview');
    this.previewGrid = new HandGrid(this.preview.getByRole('table', { name: /^Range / }));
    const tryAHand = page.getByTestId('landing-try');
    this.hand = page.getByTestId('landing-hand');
    this.answers = tryAHand.getByRole('group', { name: 'Actions' });
    this.feedback = page.getByTestId('landing-feedback');
    this.nextHand = page.getByTestId('landing-next');
    this.score = page.getByTestId('landing-score');
    this.keepGoing = tryAHand.getByRole('link', { name: 'Keep going in the Quiz' });
    this.privacy = page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' });
  }

  // #region Actions
  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async answer(action: string): Promise<void> {
    await this.answers.getByRole('button', { name: ACTION_LABELS[action], exact: true }).click();
  }
  // #endregion

  // #region Queries
  /** The figure shown for a fact ("situations", "reference ranges", "hands each"). */
  fact(label: string): Locator {
    return this.facts.locator('div').filter({ has: this.page.getByRole('term').filter({ hasText: label }) }).getByRole('definition');
  }

  /** Effective action of every cell of the preview chart, by hand. */
  async previewActions(): Promise<Record<string, string>> {
    return this.previewGrid.root.locator('[data-hand]').evaluateAll((cells) =>
      Object.fromEntries(cells.map((cell) => [cell.getAttribute('data-hand'), cell.getAttribute('data-action')])),
    );
  }
  // #endregion
}
