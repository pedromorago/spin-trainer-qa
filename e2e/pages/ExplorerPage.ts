import { expect, type Locator, type Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';
import { HandGrid } from './HandGrid';

/**
 * Explorer: the effective range and its summary. It opens read-only (Edit, Copy, a legend); Edit brings the brushes,
 * Save, Cancel and Reset, and saving or resetting goes back to reading.
 */
export class ExplorerPage {
  // #region Locators
  readonly heading: Locator;
  readonly grid: HandGrid;
  readonly legend: Locator;
  readonly brushes: Locator;
  readonly edit: Locator;
  readonly copy: Locator;
  readonly save: Locator;
  readonly cancel: Locator;
  readonly reset: Locator;
  readonly confirmReset: Locator;
  readonly confirmCancel: Locator;
  readonly notice: Locator;
  readonly editingBadge: Locator;
  readonly customBadge: Locator;
  readonly modifiedBadge: Locator;
  readonly referenceBadge: Locator;
  readonly exampleInfo: Locator;
  readonly handsCount: Locator;
  readonly unsavedChanges: Locator;
  readonly error: Locator;
  readonly reloadAfterConflict: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Explorer' });
    this.grid = new HandGrid(page.getByRole('table', { name: /^Range / }));
    this.legend = page.getByRole('group', { name: 'Actions' });
    this.brushes = page.getByRole('group', { name: 'Brush' });
    this.edit = page.getByTestId('explorer-edit');
    this.copy = page.getByTestId('explorer-copy');
    this.save = page.getByTestId('explorer-save');
    this.cancel = page.getByTestId('explorer-cancel');
    this.reset = page.getByRole('button', { name: 'Reset' });
    this.confirmReset = page.getByTestId('explorer-reset-confirm');
    this.confirmCancel = page.getByTestId('explorer-cancel-confirm');
    this.notice = page.getByTestId('explorer-notice');
    this.editingBadge = page.getByTestId('badge-editing');
    this.customBadge = page.getByTestId('badge-custom');
    this.modifiedBadge = page.getByTestId('badge-modified');
    this.referenceBadge = page.getByTestId('badge-reference');
    this.exampleInfo = page.getByRole('button', { name: 'About the example ranges' });
    this.handsCount = page.getByTestId('range-hands');
    this.unsavedChanges = page.getByTestId('explorer-unsaved');
    this.error = page.getByTestId('error');
    this.reloadAfterConflict = page.getByTestId('explorer-reload');
  }

  // #region Actions
  async open(situation = 'btn_open', stack: number = 25): Promise<void> {
    await this.page.goto(`/explorer?s=${situation}&stack=${stack}`);
  }

  /** Goes into editing, unless it is already there. */
  async startEditing(): Promise<void> {
    await expect(this.edit.or(this.save)).toBeVisible();
    if (await this.edit.isVisible()) await this.edit.click();
    await expect(this.save).toBeVisible();
  }

  /** Picks the brush (an action or the eraser) and paints the hands, going into editing first. */
  async paint(action: string, ...hands: string[]): Promise<void> {
    await this.startEditing();
    await this.brush(action).click();
    await this.grid.paint(...hands);
  }

  async resetToReference(): Promise<void> {
    await this.startEditing();
    await this.reset.click();
    await this.confirmReset.getByRole('button', { name: 'Delete and go back to the example' }).click();
  }
  // #endregion

  // #region Queries
  brush(action: string): Locator {
    return this.brushes.getByRole('button', { name: action === 'ERASE' ? 'Eraser' : ACTION_LABELS[action], exact: true });
  }
  // #endregion
}
