import { expect, test } from '../fixtures/test';

test.describe('Sesión (ADR-0003)', () => {
  test('tras cerrar sesión, volver atrás no enseña la app', async ({ page, shell, login, explorer }) => {
    await shell.open('/explorer', { situation: 'btn_open', stack: 25 });
    await shell.goTo('Quiz');

    await shell.signOut.click();
    await expect(login.form).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(login.form).toBeVisible();
    await expect(explorer.heading).toBeHidden();
  });

  // Mock only: in fullstack the login is Supabase's, which doesn't exist in QA (the session is injected).
  test('al volver a entrar se recupera la ruta y la selección', { tag: '@solo-mock' }, async ({ page, shell, login }) => {
    await shell.open('/quiz', { situation: 'btn_open', stack: 25 });

    await shell.signOut.click();
    await login.signIn('pedro@example.com', 'secreto123');

    await expect(page).toHaveURL(/\/quiz\?s=btn_open&stack=25$/);
  });
});
