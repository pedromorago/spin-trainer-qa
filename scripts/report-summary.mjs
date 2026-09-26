// Resumen del informe de Allure en Markdown (el CI lo añade al resumen de la ejecución en GitHub).
import { readFileSync } from 'node:fs';

const { stats } = JSON.parse(readFileSync(new URL('../build/allure-report/summary.json', import.meta.url), 'utf8'));
const count = (key) => stats[key] ?? 0;
const failed = count('failed') + count('broken');

console.log(`## ${failed === 0 ? '✅' : '❌'} Spin Trainer · QA\n`);
console.log('| Total | Correctos | Fallidos | Rotos | Omitidos |');
console.log('|---:|---:|---:|---:|---:|');
console.log(`| ${count('total')} | ${count('passed')} | ${count('failed')} | ${count('broken')} | ${count('skipped')} |`);
console.log('\nInforme completo (Allure, Playwright, Newman, logs del entorno): artefacto `qa-reports`.');
