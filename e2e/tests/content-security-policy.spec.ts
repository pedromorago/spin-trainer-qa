import { btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

/**
 * The web app is served with the production headers of its vercel.json (scripts/serve-web.mjs), so every E2E test runs
 * under the Content-Security-Policy and the console guard fails on any violation. This test makes it explicit: the
 * policy is really served, and the four tabs work under it (no inline scripts or styles, connections only to the API
 * and Supabase) without the browser reporting a violation.
 */
test.describe('Política de seguridad de contenido de producción (vercel.json)', () => {
  test('las cuatro pestañas funcionan bajo la CSP sin infracciones', async ({ page, shell, explorer, quiz, builder, stats }) => {
    await page.addInitScript(() => {
      const violations: string[] = [];
      Object.assign(window, { cspViolations: violations });
      window.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.effectiveDirective} ${e.blockedURI}`));
    });

    const document = await page.goto('/builder?s=btn_open&stack=25');
    expect(document?.headers()['content-security-policy'], 'CSP servida').toContain("script-src 'self'");

    await builder.paint('ALLIN', '72o');
    await builder.verify.click();
    await expect(builder.score).toBeVisible();
    await explorer.open('btn_open', 25);
    await explorer.paint('ALLIN', '72o');
    await quiz.open('btn_open', 25);
    await quiz.answerWith(btnOpen25);
    await shell.goTo('Stats');
    await expect(stats.chart).toBeVisible();

    const violations = await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
    expect(violations, 'infracciones de la CSP').toEqual([]);
  });
});
