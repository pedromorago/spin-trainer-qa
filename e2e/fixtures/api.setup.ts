import { expect, test } from '@playwright/test';

const apiUrl = process.env.QA_API_URL ?? 'http://localhost:8081/api/v1';

// The fullstack E2E tests need the QA environment running: a clear error beats 30 tests timing out.
test('la API de QA está en marcha', async ({ request }) => {
  const health = new URL('/actuator/health', apiUrl).toString();
  const response = await request.get(health).catch(() => null);
  expect(response?.ok(), `La API no responde en ${health}: levanta el entorno con "npm run env:up"`).toBe(true);
});
