import type { Locator } from '@playwright/test';

/** 13×13 grid (shared component): each cell has data-hand, data-action (effective action) and data-verdict. */
export class HandGrid {
  constructor(readonly root: Locator) {}

  cell(hand: string): Locator {
    return this.root.locator(`[data-hand="${hand}"]`);
  }

  /** Paints with the active brush (click: the grid paints on pointerdown). */
  async paint(...hands: string[]): Promise<void> {
    for (const hand of hands) {
      await this.cell(hand).click();
    }
  }
}
