import { expect, test } from '../fixtures/test';

test.describe('Builder: autoevaluación sin persistir (ADR-0012)', () => {
  test('verifica el rango construido mano a mano contra el de referencia', { tag: '@smoke' }, async ({ builder }) => {
    await builder.open('btn_open', 25);
    await expect(builder.question).toHaveText('BTN Open · 25 BB');

    await builder.paint('MR_4B_C', 'AA'); // correcta
    await builder.paint('MR_C_C', 'KK'); // otra acción que la correcta
    await builder.paint('ALLIN', '72o'); // jugada de más
    await builder.verify.click();

    await expect(builder.grid.cell('AA')).toHaveAttribute('data-verdict', 'correct');
    await expect(builder.grid.cell('KK')).toHaveAttribute('data-verdict', 'wrong');
    await expect(builder.grid.cell('72o')).toHaveAttribute('data-verdict', 'extra');
    await expect(builder.grid.cell('QQ')).toHaveAttribute('data-verdict', 'missing');
    await expect(builder.grid.cell('KK')).toHaveAccessibleName(/^KK: MR \/ Call 3b \/ Call 4b, .*\(correcta: MR \/ 4bet vs 3b \/ Call AI\)$/);
    // Manos jugadas: las 28 del rango correcto y 72o; solo AA está bien.
    await expect(builder.score).toHaveText('1 / 29 · 3%');
  });

  test('"Ver solución" enseña el rango de referencia', async ({ builder }) => {
    await builder.open('btn_open', 25);
    await builder.verify.click();

    await builder.toggleSolution.click();

    await expect(builder.solution.cell('AA')).toHaveAttribute('data-action', 'MR_4B_C');
    await expect(builder.solution.cell('76s')).toHaveAttribute('data-action', 'L_C_F');
    await expect(builder.toggleSolution).toHaveAttribute('aria-pressed', 'true');
  });

  test('lo construido no se guarda como rango personalizado', async ({ shell, builder, explorer }) => {
    await builder.open('btn_open', 25);
    await builder.paint('ALLIN', '72o');
    await builder.verify.click();

    await shell.goTo('Explorer');

    await expect(explorer.referenceBadge).toBeVisible();
    await expect(explorer.grid.cell('72o')).toHaveAttribute('data-action', 'FOLD');
  });
});
