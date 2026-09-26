import type { Locator, Page } from '@playwright/test';
import { ACTION_LABELS } from '../data/reference';
import { HandGrid } from './HandGrid';

/** Builder: construir de memoria el rango de un spot y verificarlo contra el rango efectivo. No persiste nada. */
export class BuilderPage {
  // #region Localizadores
  readonly question: Locator;
  readonly grid: HandGrid;
  readonly solution: HandGrid;
  readonly brushes: Locator;
  readonly verify: Locator;
  readonly score: Locator;
  readonly evaluation: Locator;
  readonly toggleSolution: Locator;
  readonly customTargetNote: Locator;
  // #endregion

  constructor(readonly page: Page) {
    this.question = page.getByTestId('builder-question');
    this.grid = new HandGrid(page.getByRole('table', { name: 'Tu rango' }));
    this.solution = new HandGrid(page.getByRole('table', { name: 'Solución' }));
    this.brushes = page.getByRole('group', { name: 'Pincel' });
    this.verify = page.getByRole('button', { name: 'Verificar' });
    this.score = page.getByTestId('builder-score');
    this.evaluation = page.getByRole('complementary', { name: 'Resultado' });
    this.toggleSolution = page.getByTestId('builder-toggle-solution');
    this.customTargetNote = page.getByTestId('builder-custom-target');
  }

  // #region Acciones
  async open(situation = 'btn_open', stack: number = 25): Promise<void> {
    await this.page.goto(`/builder?s=${situation}&stack=${stack}`);
  }

  async paint(action: string, ...hands: string[]): Promise<void> {
    await this.brushes.getByRole('button', { name: ACTION_LABELS[action], exact: true }).click();
    await this.grid.paint(...hands);
  }
  // #endregion
}
