import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Scans the page with axe (WCAG 2.2 AA), attaches the result to the report and requires zero violations. */
export async function expectAccessible(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  await testInfo.attach(`axe-${name}`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, `incumplimientos de accesibilidad en ${name}`).toEqual([]);
}
