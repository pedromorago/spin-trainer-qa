// Allure report summary in Markdown (CI appends it to the GitHub run summary).
import { readFileSync } from 'node:fs';

const { stats } = JSON.parse(readFileSync(new URL('../build/allure-report/summary.json', import.meta.url), 'utf8'));
const count = (key) => stats[key] ?? 0;
const failed = count('failed') + count('broken');

console.log(`## ${failed === 0 ? '✅' : '❌'} Spin Trainer · QA\n`);
console.log('| Total | Passed | Failed | Broken | Skipped |');
console.log('|---:|---:|---:|---:|---:|');
console.log(`| ${count('total')} | ${count('passed')} | ${count('failed')} | ${count('broken')} | ${count('skipped')} |`);
console.log('\nFull report (Allure, Playwright, Newman, environment logs): `qa-reports` artifact.');
