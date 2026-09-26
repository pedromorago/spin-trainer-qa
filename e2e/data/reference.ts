import { readFileSync } from 'node:fs';

/**
 * Datos de referencia de los E2E: los rangos del seed de la API (Tablasmentov3.pdf), leídos de la copia fijada
 * contract/reference-ranges.json (gradlew rangesCheck), la misma que usan el mock de la web y los tests de Java
 * (ReferenceRanges). Es el oráculo del Explorer, el Quiz y el Builder; se usa btn_open a 25 BB.
 */
export const BTN_OPEN = { key: 'btn_open', label: 'BTN Open', stack: 25 } as const;

interface ReferenceFile {
  ranges: { situation: string; stack: number; hands: Record<string, string> }[];
}
const reference: ReferenceFile = JSON.parse(
  readFileSync(new URL('../../contract/reference-ranges.json', import.meta.url), 'utf8'),
);

/** Manos con acción explícita de una combinación del seed. */
export function referenceRange(situation: string, stack: number): Readonly<Record<string, string>> {
  const range = reference.ranges.find((r) => r.situation === situation && r.stack === stack);
  if (!range) throw new Error(`Sin rango de referencia en el seed: ${situation}@${stack}`);
  return range.hands;
}

export const BTN_OPEN_25 = referenceRange(BTN_OPEN.key, BTN_OPEN.stack);
/** Manos jugadas (acción explícita) de btn_open a 25 BB. */
export const BTN_OPEN_25_HANDS = Object.keys(BTN_OPEN_25).length;

/** Acciones de btn_open en el orden de la paleta (el atajo de teclado es la posición + 1). */
export const BTN_OPEN_ACTIONS = ['MR_4B_C', 'MR_C_C', 'MR_C_F', 'MR_F_F', 'L_C_C', 'L_C_F', 'ALLIN', 'FOLD'] as const;

/** Acción correcta en btn_open a 25 BB: la del rango o FOLD (implícita). */
export const btnOpen25 = (hand: string): string => BTN_OPEN_25[hand] ?? 'FOLD';

/** Nombre accesible de cada acción en la web (botones de la paleta y celdas del grid). */
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
