import { btnOpen25 } from '../data/reference';
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

  test('salir con cambios sin guardar pregunta antes', async ({ shell, login, explorer }) => {
    await explorer.open('btn_open', 25);
    await explorer.paint('ALLIN', '72o');
    await expect(explorer.modifiedBadge).toBeVisible();

    await shell.signOut.click();
    await expect(explorer.unsavedChanges).toBeVisible();
    await explorer.unsavedChanges.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(explorer.modifiedBadge).toBeVisible();
    await expect(login.form).toBeHidden();

    await shell.signOut.click();
    await explorer.unsavedChanges.getByRole('button', { name: 'Descartar cambios' }).click();
    await expect(login.form).toBeVisible();
  });

  // Mock only (each email is a player there): in fullstack the login is Supabase's.
  test('otro jugador en la misma pestaña no hereda el marcador de la sesión', { tag: '@solo-mock' }, async ({ shell, login, quiz }) => {
    await quiz.open('btn_open', 25);
    await quiz.answer(btnOpen25(await quiz.currentHand()));
    await expect(shell.sessionTotal).toHaveText('1');

    await shell.signOut.click();
    await login.signIn('otra@example.com', 'secreto123');
    await expect(shell.sessionTotal).toHaveText('0');

    await shell.signOut.click();
    await login.signIn('mock@local', 'secreto123');
    await expect(shell.sessionTotal).toHaveText('1');
  });

  // Mock only: in fullstack the login is Supabase's, which doesn't exist in QA (the session is injected).
  test('al volver a entrar se recupera la ruta y la selección', { tag: '@solo-mock' }, async ({ page, shell, login }) => {
    await shell.open('/quiz', { situation: 'btn_open', stack: 25 });

    await shell.signOut.click();
    await login.signIn('pedro@example.com', 'secreto123');

    await expect(page).toHaveURL(/\/quiz\?s=btn_open&stack=25$/);
  });
});
