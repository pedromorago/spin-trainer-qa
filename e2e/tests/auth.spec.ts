import { btnOpen25 } from '../data/reference';
import { expect, test } from '../fixtures/test';

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
