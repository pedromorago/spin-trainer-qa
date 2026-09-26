// Allure report summary in Markdown (CI appends it to the GitHub run summary).
import { readFileSync } from 'node:fs';

const { stats } = JSON.parse(readFileSync(new URL('../build/allure-report/summary.json', import.meta.url), 'utf8'));
const count = (key) => stats[key] ?? 0;
const failed = count('failed') + count('broken');
// No results is not a success: the environment may not have started, or a suite may not have run at all.
const ok = failed === 0 && count('total') > 0;

console.log(`## ${ok ? '✅' : '❌'} Spin Trainer · QA\n`);
if (count('total') === 0) console.log('No test results: check the environment logs.\n');
console.log('| Total | Passed | Failed | Broken | Skipped |');
console.log('|---:|---:|---:|---:|---:|');
console.log(`| ${count('total')} | ${count('passed')} | ${count('failed')} | ${count('broken')} | ${count('skipped')} |`);
console.log('\nFull report (Allure, Playwright, Newman, environment logs): `qa-reports` artifact.');
