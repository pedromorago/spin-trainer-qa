import { expect, test } from '@playwright/test';

const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';

// Los E2E fullstack necesitan el entorno de QA en marcha: mejor un error claro que 30 tests en timeout.
test('la API de QA está en marcha', async ({ request }) => {
  const health = new URL('/actuator/health', apiUrl).toString();
  const response = await request.get(health).catch(() => null);
  expect(response?.ok(), `La API no responde en ${health}: levanta el entorno con "npm run env:up"`).toBe(true);
});
