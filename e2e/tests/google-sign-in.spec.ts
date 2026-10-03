import { createHash, randomUUID } from 'node:crypto';
import { ID_TOKEN, playGoogle, playSupabase, QA_GOOGLE_CLIENT_ID as CLIENT_ID, signedInWithGoogle } from '../fixtures/google';
import { supabaseSession } from '../fixtures/session';
import { allowErrors, expect, test } from '../fixtures/test';

// Sign-in with Google by OpenID Connect, straight from the site (ADR-0023). Google and Supabase's token endpoint are
// played by the tests (fixtures/google.ts); the web's part is real: the request to Google, the check of its answer and
// the exchange of the ID token.
const SUPABASE = process.env.QA_SUPABASE_URL ?? 'http://localhost:8089';

test.describe('Sign-in with Google, straight from the site (ADR-0023)', () => {
  // As a visitor arrives: signed out (with the API; the mock is always signed in).
  test.use({ signedIn: false });

  test.describe('the whole round trip', () => {
    test.skip(({ backend }) => backend === 'mock', 'the mock signs in without leaving for Google');

    test('comes back signed in with the session Supabase gives for Google\'s token, to the route and selection', async ({ page, shell, login }) => {
      const newcomer = randomUUID();
      const asked = await playGoogle(page, signedInWithGoogle);
      const exchanges = await playSupabase(page, (route) => route.fulfill({ json: JSON.parse(supabaseSession(newcomer, SUPABASE).value) }));
      await shell.open('/quiz', { situation: 'btn_open', stack: 25 });
      await expect(login.screen).toBeVisible();

      await login.google.click();

      await expect(page).toHaveURL(/\/quiz\?s=btn_open&stack=25$/);
      await expect(page.getByRole('banner').getByText(`qa+${newcomer}@example.com`), 'the session from the exchange').toBeVisible();
      expect(asked).toHaveLength(1);
      expect(Object.fromEntries(asked[0])).toMatchObject({
        client_id: CLIENT_ID,
        redirect_uri: new URL('/auth/google', page.url()).href,
        response_type: 'id_token',
        scope: 'openid email profile',
      });
      expect(exchanges).toEqual([expect.objectContaining({ provider: 'google', id_token: ID_TOKEN })]);
      expect(createHash('sha256').update(String(exchanges[0].nonce)).digest('hex'), 'Google gets the SHA-256 of the nonce Supabase gets')
        .toBe(asked[0].get('nonce'));
    });

    test('each sign-in asks Google with a new state and nonce', async ({ page, shell, login }) => {
      const asked = await playGoogle(page, () => 'error=access_denied');
      await shell.open('/explorer');
      await expect(login.screen).toBeVisible();

      await login.google.click();
      await page.getByTestId('oauth-back').click();
      await login.google.click();

      await expect(page.getByRole('alert')).toBeVisible();
      expect(asked).toHaveLength(2);
      expect(asked[1].get('state')).not.toBe(asked[0].get('state'));
      expect(asked[1].get('nonce')).not.toBe(asked[0].get('nonce'));
    });

    test('an answer to a sign-in this tab did not start (another state) never reaches Supabase', async ({ page, shell, login }) => {
      await playGoogle(page, () => `id_token=${ID_TOKEN}&state=someone-elses-state`);
      const exchanges = await playSupabase(page, (route) => route.abort());
      await shell.open('/explorer');
      await expect(login.screen).toBeVisible();

      await login.google.click();

      await expect(page.getByRole('alert')).toContainText('This sign-in link is not valid or has already been used.');
      expect(exchanges).toEqual([]);
    });

    test('a token Supabase rejects is explained, and the token does not stay in the address bar', async ({ page, shell, login, consoleErrors }) => {
      await playGoogle(page, (q) => `id_token=${ID_TOKEN}&state=${q.get('state')}`);
      await playSupabase(page, (route) => route.fulfill({ status: 400, json: { code: 400, error_code: 'bad_id_token', msg: 'Bad ID token' } }));
      await shell.open('/explorer');
      await expect(login.screen).toBeVisible();

      await login.google.click();

      await expect(page.getByRole('alert')).toContainText('Could not sign in. Please try again.');
      await expect(page.getByTestId('oauth-back')).toHaveAttribute('href', '/login');
      expect(page.url(), 'no token left in the URL').toMatch(/\/auth\/google$/);
      const rejected = /^HTTP 400 POST \S+\/auth\/v1\/token\?grant_type=id_token$|^console: Failed to load resource: the server responded with a status of 400\b/;
      expect(allowErrors(consoleErrors, rejected)).toBe(2);
    });
  });

  for (const [what, fragment, message] of [
    ['the player cancelled', 'error=access_denied&error_description=The+user+denied+access', 'You cancelled the sign-in with Google.'],
    ['Google failed', 'error=server_error', 'Google could not complete the sign-in.'],
    ['no sign-in was started in this tab', `id_token=${ID_TOKEN}&state=from-another-tab`, 'This sign-in link is not valid'],
  ]) {
    test(`a return from Google where ${what} is explained, with a way back to sign in`, async ({ page }) => {
      await page.goto(`/auth/google#${fragment}`);

      await expect(page.getByRole('alert')).toContainText(message);
      await expect(page.getByRole('link', { name: 'Back to sign-in' })).toHaveAttribute('href', '/login');
      expect(page.url()).toMatch(/\/auth\/google$/);
    });
  }
});
