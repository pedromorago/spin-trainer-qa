import { btnOpen25 } from '../data/reference';
import { allowErrors, expect, test } from '../fixtures/test';

test.describe('Sesión (ADR-0003)', () => {
  test('tras cerrar sesión, volver atrás no enseña la app', async ({ page, shell, login, explorer }) => {
    await shell.open('/explorer', { situation: 'btn_open', stack: 25 });
    await shell.goTo('Quiz');

    await shell.signOut.click();
    await expect(login.screen).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(login.screen).toBeVisible();
    await expect(explorer.heading).toBeHidden();
  });

  test('salir con cambios sin guardar pregunta antes', async ({ shell, login, explorer }) => {
    await explorer.open('btn_open', 25);
    await explorer.paint('ALLIN', '72o');
    await expect(explorer.modifiedBadge).toBeVisible();

    await shell.signOut.click();
    await expect(explorer.unsavedChanges).toBeVisible();
    await explorer.unsavedChanges.getByRole('button', { name: 'Keep editing' }).click();
    await expect(explorer.modifiedBadge).toBeVisible();
    await expect(login.screen).toBeHidden();

    await shell.signOut.click();
    await explorer.unsavedChanges.getByRole('button', { name: 'Discard changes' }).click();
    await expect(login.screen).toBeVisible();
  });

  // Mock only (each email is a player there): in fullstack the login is Supabase's.
  test('otro jugador en la misma pestaña no hereda el marcador de la sesión', { tag: '@solo-mock' }, async ({ shell, login, quiz }) => {
    await quiz.open('btn_open', 25);
    await quiz.answer(btnOpen25(await quiz.currentHand()));
    await expect(shell.sessionTotal).toHaveText('1');

    await shell.signOut.click();
    await login.signInAs('otra@example.com');
    await expect(shell.sessionTotal).toHaveText('0');

    await shell.signOut.click();
    await login.signInAs('mock@local');
    await expect(shell.sessionTotal).toHaveText('1');
  });

  // Mock only: in fullstack the login is Supabase's, which doesn't exist in QA (the session is injected).
  test('al volver a entrar se recupera la ruta y la selección', { tag: '@solo-mock' }, async ({ page, shell, login }) => {
    await shell.open('/quiz', { situation: 'btn_open', stack: 25 });

    await shell.signOut.click();
    await login.signInAs('pedro@example.com');

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
    ['cancelado por el jugador', '?error=access_denied&error_description=The+user+denied+access', 'You cancelled the sign-in with Google.'],
    ['fallido en Google', '?error=server_error&error_description=Unable+to+exchange+external+code', 'Google could not complete the sign-in.'],
    ['sin código', '', 'This sign-in link is not valid'],
  ]) {
    test(`la vuelta de Google (${caso}) se explica y ofrece volver a entrar`, async ({ page }) => {
      await page.goto(`/auth/callback${query}`);

      await expect(page.getByRole('alert')).toContainText(mensaje);
      await expect(page.getByRole('link', { name: 'Back to sign-in' })).toHaveAttribute('href', '/login');
    });
  }

  // A code without its PKCE verifier (another browser, or one already used) must not open a session.
  test('un código de Google ajeno no abre sesión', async ({ page, backend, consoleErrors }) => {
    test.skip(backend === 'mock', 'the mock has no Supabase: any code signs in');
    await page.goto('/auth/callback?code=codigo-de-otro-navegador');

    await expect(page.getByRole('alert')).toContainText('This sign-in link is not valid');
    // If Supabase's client asks for the exchange anyway, the QA Supabase has no such endpoint: an expected 404.
    allowErrors(consoleErrors, /auth\/v1\/token/);
  });

  // Google is the only way in: the web shows no password form (in the mock, only the test player's).
  test('solo se entra con Google', async ({ backend, shell, login }) => {
    await shell.open('/explorer');
    await shell.signOut.click();

    await expect(login.google).toBeVisible();
    await expect(login.screen.getByLabel(/password/i)).toHaveCount(0);
    await expect(login.testPlayer).toHaveCount(backend === 'mock' ? 1 : 0);
  });

  // Google's consent screen and links already shared still point at the notice's first address.
  test('la dirección antigua de la privacidad lleva a la actual', async ({ page }) => {
    await page.goto('/privacidad');

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  });

  test('la privacidad se lee sin cuenta', async ({ page, shell, login }) => {
    await shell.open('/explorer');
    await shell.signOut.click();

    await login.privacy.click();
    await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'pedromoragolv@gmail.com' }).first()).toBeVisible();
  });
});
