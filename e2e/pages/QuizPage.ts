import { expect, type Locator, type Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';

/** Quiz: the table with the hero's hand, the answer (buttons or keys 1..9, 0) and the grading. */
export class QuizPage {
  // #region Locators
  readonly spot: Locator;
  readonly hand: Locator;
  readonly table: Locator;
  readonly answers: Locator;
  readonly feedback: Locator;
  readonly expected: Locator;
  readonly next: Locator;
  readonly round: Locator;
  readonly customRangeNote: Locator;
  readonly announcement: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.spot = page.getByTestId('quiz-spot');
    this.hand = page.getByTestId('quiz-hand');
    this.table = page.getByTestId('poker-table');
    this.answers = page.getByRole('group', { name: 'Actions' });
    this.feedback = page.getByTestId('quiz-feedback');
    this.expected = page.getByTestId('quiz-expected');
    this.next = page.getByRole('button', { name: 'Next hand' });
    this.round = page.getByTestId('quiz-stats');
    this.customRangeNote = page.getByTestId('quiz-custom-range');
    // What a screen reader hears after answering (a status region, not the grading box with its grid).
    this.announcement = page.getByRole('status').filter({ hasText: /^(Correct|Wrong)\./ });
  }

  // #region Actions
  async open(situation = 'btn_open', stack: number = 25): Promise<void> {
    await this.page.goto(`/quiz?s=${situation}&stack=${stack}`);
    await expect(this.hand).toBeVisible();
  }

  async currentHand(): Promise<string> {
    return (await this.hand.textContent()) ?? '';
  }

  async answer(action: string): Promise<void> {
    await this.answerButton(action).click();
    await expect(this.feedback).toBeVisible();
  }

  async answerWithKey(key: number | string): Promise<void> {
    await this.page.keyboard.press(String(key));
    await expect(this.feedback).toBeVisible();
  }

  /** Moves to the next hand with Enter (shortcut) and waits for the grading to disappear. */
  async nextHand(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await expect(this.feedback).toBeHidden();
  }

  /** Answers the current hand according to the oracle and returns the hand and the given answer. */
  async answerWith(oracle: (hand: string) => string): Promise<{ hand: string; given: string }> {
    const hand = await this.currentHand();
    const given = oracle(hand);
    await this.answer(given);
    return { hand, given };
  }
  // #endregion

  // #region Queries
  answerButton(action: string): Locator {
    return this.answers.getByRole('button', { name: ACTION_LABELS[action], exact: true });
  }

  /** The answer given to the current hand (pressed while the grading is shown). */
  givenAnswer(): Locator {
    return this.answers.getByRole('button', { pressed: true });
  }
  // #endregion
}
