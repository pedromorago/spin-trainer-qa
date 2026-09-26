import type { Locator } from '@playwright/test';

/** Grid 13×13 (componente compartido): cada celda lleva data-hand, data-action (acción efectiva) y data-verdict. */
export class HandGrid {
  constructor(readonly root: Locator) {}

  cell(hand: string): Locator {
    return this.root.locator(`[data-hand="${hand}"]`);
  }

  /** Pinta con el pincel activo (clic: el grid pinta en pointerdown). */
  async paint(...hands: string[]): Promise<void> {
    for (const hand of hands) {
      await this.cell(hand).click();
    }
  }
}
