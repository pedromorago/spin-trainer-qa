import type { Locator, Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';
import { HandGrid } from './HandGrid';

/** Explorer: el rango efectivo editable (pincel, Guardar, Reset) y su resumen. */
export class ExplorerPage {
  // #region Localizadores
  readonly heading: Locator;
  readonly grid: HandGrid;
  readonly brushes: Locator;
  readonly save: Locator;
  readonly reset: Locator;
  readonly confirmReset: Locator;
  readonly savedBadge: Locator;
  readonly modifiedBadge: Locator;
  readonly referenceBadge: Locator;
  readonly handsCount: Locator;
  readonly unsavedChanges: Locator;
  readonly error: Locator;
  readonly reloadAfterConflict: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Explorer' });
    this.grid = new HandGrid(page.getByRole('table', { name: /^Rango / }));
    this.brushes = page.getByRole('group', { name: 'Pincel' });
    this.save = page.getByTestId('explorer-save');
    this.reset = page.getByRole('button', { name: 'Reset' });
    this.confirmReset = page.getByTestId('explorer-reset-confirm');
    this.savedBadge = page.getByTestId('badge-saved');
    this.modifiedBadge = page.getByTestId('badge-modified');
    this.referenceBadge = page.getByTestId('badge-reference');
    this.handsCount = page.getByTestId('range-hands');
    this.unsavedChanges = page.getByTestId('explorer-unsaved');
    this.error = page.getByTestId('error');
    this.reloadAfterConflict = page.getByTestId('explorer-reload');
  }

  // #region Acciones
  async open(situation = 'btn_open', stack: number = 25): Promise<void> {
    await this.page.goto(`/explorer?s=${situation}&stack=${stack}`);
  }

  /** Elige el pincel (acción o "Goma") y pinta las manos. */
  async paint(action: string, ...hands: string[]): Promise<void> {
    await this.brush(action).click();
    await this.grid.paint(...hands);
  }

  async resetToReference(): Promise<void> {
    await this.reset.click();
    await this.confirmReset.getByRole('button', { name: 'Borrar y volver al PDF' }).click();
  }
  // #endregion

  // #region Consultas
  brush(action: string): Locator {
    return this.brushes.getByRole('button', { name: action === 'ERASE' ? 'Goma' : ACTION_LABELS[action], exact: true });
  }
  // #endregion
}
