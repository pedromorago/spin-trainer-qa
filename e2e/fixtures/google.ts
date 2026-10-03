import type { Page, Route } from '@playwright/test';

// Google and Supabase's ID-token exchange, played by the tests (ADR-0023): Google cannot be automated, and the QA
// "Supabase" only serves the JWKS. Everything between them, the web's part, runs for real.

export const QA_GOOGLE_CLIENT_ID = 'qa-client.apps.googleusercontent.com';
export const ID_TOKEN = 'qa.google-id-token.signature';

/** Plays Google: sends the browser back to the redirect URI with `answer` in the fragment. Returns what it was asked. */
export async function playGoogle(page: Page, answer: (asked: URLSearchParams) => string): Promise<URLSearchParams[]> {
  const asked: URLSearchParams[] = [];
  await page.route(
    (url) => url.origin === 'https://accounts.google.com' && url.pathname === '/o/oauth2/v2/auth',
    async (route) => {
      const params = new URL(route.request().url()).searchParams;
      asked.push(params);
      await route.fulfill({ status: 302, headers: { location: `${params.get('redirect_uri')}#${answer(params)}` } });
    },
  );
  return asked;
}

/** Google answering as it does when the player picks an account: an ID token for the state it was given. */
export const signedInWithGoogle = (asked: URLSearchParams) => `id_token=${ID_TOKEN}&state=${asked.get('state')}&authuser=0`;

/** Plays Supabase's ID-token exchange: answers with `reply`. Returns the exchanges it received. */
export async function playSupabase(page: Page, reply: (route: Route) => Promise<void>): Promise<Record<string, unknown>[]> {
  const exchanges: Record<string, unknown>[] = [];
  await page.route(
    (url) => url.pathname.endsWith('/auth/v1/token') && url.searchParams.get('grant_type') === 'id_token',
    async (route) => {
      exchanges.push(route.request().postDataJSON());
      await reply(route);
    },
  );
  return exchanges;
}
