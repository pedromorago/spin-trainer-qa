/**
 * Datos de referencia de los E2E: btn_open a 25 BB, el único rango de referencia tanto en el mock de la web como en
 * el seed de QA (env/flyway/R__qa_reference_ranges.sql; en Java, QaReferenceData). Es el oráculo del Quiz y el Builder.
 */
export const BTN_OPEN = { key: 'btn_open', label: 'BTN Open', stack: 25 } as const;

export const BTN_OPEN_25: Readonly<Record<string, string>> = {
  AA: 'MR_4B_C', KK: 'MR_4B_C', QQ: 'MR_4B_C', AKs: 'MR_4B_C', AKo: 'MR_4B_C',
  JJ: 'MR_C_C', TT: 'MR_C_C', AQs: 'MR_C_C', AQo: 'MR_C_C',
  '99': 'MR_C_F', '88': 'MR_C_F', AJs: 'MR_C_F', KQs: 'MR_C_F',
  '77': 'MR_F_F', '66': 'MR_F_F', ATs: 'MR_F_F', KJs: 'MR_F_F', QJs: 'MR_F_F', AJo: 'MR_F_F', KQo: 'MR_F_F',
  '55': 'L_C_C', '44': 'L_C_C', '33': 'L_C_C', '22': 'L_C_C',
  T9s: 'L_C_F', '98s': 'L_C_F', '87s': 'L_C_F', '76s': 'L_C_F',
};

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
