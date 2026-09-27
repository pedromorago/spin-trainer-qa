import { btnOpen25 } from '../data/reference';
import { allowErrors, expect, test } from '../fixtures/test';

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

  // Mock only: there "Continuar con Google" signs in without leaving; the real round trip needs Google (tested by hand).
  test('entrar con Google vuelve a la ruta y la selección', { tag: '@solo-mock' }, async ({ page, shell, login }) => {
    await shell.open('/quiz', { situation: 'btn_open', stack: 25 });

    await shell.signOut.click();
    await login.google.click();

    await expect(page).toHaveURL(/\/quiz\?s=btn_open&stack=25$/);
  });

  for (const [caso, query, mensaje] of [
    ['cancelado por el jugador', '?error=access_denied&error_description=The+user+denied+access', 'Has cancelado el acceso con Google.'],
    ['fallido en Google', '?error=server_error&error_description=Unable+to+exchange+external+code', 'Google no ha podido completar el acceso.'],
    ['sin código', '', 'El enlace de acceso no es válido'],
  ]) {
    test(`la vuelta de Google (${caso}) se explica y ofrece volver a entrar`, async ({ page }) => {
      await page.goto(`/auth/callback${query}`);

      await expect(page.getByRole('alert')).toContainText(mensaje);
      await expect(page.getByRole('link', { name: 'Volver a entrar' })).toHaveAttribute('href', '/login');
    });
  }

  // A code without its PKCE verifier (another browser, or one already used) must not open a session.
  test('un código de Google ajeno no abre sesión', async ({ page, backend, consoleErrors }) => {
    test.skip(backend === 'mock', 'the mock has no Supabase: any code signs in');
    await page.goto('/auth/callback?code=codigo-de-otro-navegador');

    await expect(page.getByRole('alert')).toContainText('El enlace de acceso no es válido');
    // If Supabase's client asks for the exchange anyway, the QA Supabase has no such endpoint: an expected 404.
    allowErrors(consoleErrors, /auth\/v1\/token/);
  });

  test('la privacidad se lee sin cuenta', async ({ page, shell, login }) => {
    await shell.open('/explorer');
    await shell.signOut.click();

    await login.privacy.click();
    await expect(page.getByRole('heading', { name: 'Privacidad', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'pedromoragolv@gmail.com' }).first()).toBeVisible();
  });
});
