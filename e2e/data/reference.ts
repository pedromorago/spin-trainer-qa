import { readFileSync } from 'node:fs';

/**
 * E2E reference data: the ranges from the API seed (Tablasmentov3.pdf), read from the pinned copy
 * contract/reference-ranges.json (gradlew rangesCheck), the same one used by the web's mock and the Java tests
 * (ReferenceRanges). It is the oracle for the Explorer, the Quiz and the Builder; btn_open at 25 BB is used.
 */
export const BTN_OPEN = { key: 'btn_open', label: 'BTN Open', stack: 25 } as const;

interface ReferenceFile {
  ranges: { situation: string; stack: number; hands: Record<string, string> }[];
}
const reference: ReferenceFile = JSON.parse(
  readFileSync(new URL('../../contract/reference-ranges.json', import.meta.url), 'utf8'),
);

/** Hands with an explicit action for one seed combination. */
export function referenceRange(situation: string, stack: number): Readonly<Record<string, string>> {
  const range = reference.ranges.find((r) => r.situation === situation && r.stack === stack);
  if (!range) throw new Error(`Sin rango de referencia en el seed: ${situation}@${stack}`);
  return range.hands;
}

export const BTN_OPEN_25 = referenceRange(BTN_OPEN.key, BTN_OPEN.stack);
/** Played hands (explicit action) of btn_open at 25 BB. */
export const BTN_OPEN_25_HANDS = Object.keys(BTN_OPEN_25).length;

/** btn_open actions in palette order (the keyboard shortcut is the position + 1). */
export const BTN_OPEN_ACTIONS = ['MR_4B_C', 'MR_C_C', 'MR_C_F', 'MR_F_F', 'L_C_C', 'L_C_F', 'ALLIN', 'FOLD'] as const;

/** Correct action in btn_open at 25 BB: the range's one or FOLD (implicit). */
export const btnOpen25 = (hand: string): string => BTN_OPEN_25[hand] ?? 'FOLD';

/** Accessible name of each action in the web app (palette buttons and grid cells). */
export const ACTION_LABELS: Readonly<Record<string, string>> = {
  MR_4B_C: 'MR / 4bet vs 3b / Call AI',
  MR_C_C: 'MR / Call 3b / Call 4b',
  MR_C_F: 'MR / Call 3b / Fold 4b',
  MR_F_F: 'MR / Fold a 3b',
  L_C_C: 'Limp / Call iso / Call AI',
  L_C_F: 'Limp / Call iso / Fold AI',
  ALLIN: 'All-in',
  FOLD: 'Fold',
  CHECK: 'Check',
};
