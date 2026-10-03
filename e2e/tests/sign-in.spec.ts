import { expectAccessible } from '../fixtures/a11y';
import { playGoogle, playSupabase, signedInWithGoogle } from '../fixtures/google';
import { supabaseSession } from '../fixtures/session';
import { expect, test } from '../fixtures/test';
import type { AppShell } from '../pages/AppShell';
import type { LandingPage } from '../pages/LandingPage';
import type { LoginPage } from '../pages/LoginPage';

const SUPABASE = process.env.QA_SUPABASE_URL ?? 'http://localhost:8089';

/**
 * The landing page as a signed-out visitor sees it. With the API the visitor arrives signed out; the mock is always
 * signed in, so its player signs out and goes back home first.
 */
async function openSignedOut(backend: string, shell: AppShell, login: LoginPage, landing: LandingPage): Promise<void> {
  if (backend === 'api') {
    await landing.open();
  } else {
    await shell.open('/explorer');
    await shell.signOut.click();
    await login.home.click();
  }
  await expect(landing.start).toHaveText('Start training');
  // Fully loaded: the chart and the question arrive a moment later and push the sections below down, so a click before
  // then can land where a link used to be.
  await expect(landing.previewGrid.cell('AA')).toBeVisible();
  await expect(landing.hand).toBeVisible();
}

test.describe('Signing in from the landing page', () => {
  test.use({ signedIn: false });

  test('Start training asks to sign in right on the page, with the focus on Google\'s button', async ({ page, backend, shell, login, landing }) => {
    await openSignedOut(backend, shell, login, landing);

    await landing.start.click();

    await expect(landing.signIn).toBeVisible();
    await expect(landing.signInWithGoogle).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Escape, the close button and a click outside close it, and focus goes back to what opened it', async ({ page, backend, shell, login, landing }) => {
    await openSignedOut(backend, shell, login, landing);

    await landing.start.click();
    await page.keyboard.press('Escape');
    await expect(landing.signIn).toBeHidden();
    await expect(landing.start).toBeFocused();

    await landing.startTop.click();
    await landing.closeSignIn.click();
    await expect(landing.signIn).toBeHidden();
    await expect(landing.startTop).toBeFocused();

    await landing.feature('Builder').click();
    await expect(landing.signIn).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(landing.signIn).toBeHidden();
    await expect(landing.feature('Builder')).toBeFocused();
  });

  test('signing in from a way into the app goes where it pointed', async ({ page, backend, player, shell, login, landing, quiz }) => {
    if (backend === 'api') {
      await playGoogle(page, signedInWithGoogle);
      await playSupabase(page, (route) => route.fulfill({ json: JSON.parse(supabaseSession(player.id, SUPABASE).value) }));
    }
    await openSignedOut(backend, shell, login, landing);

    await landing.keepGoing.click();
    await landing.signInWithGoogle.click();

    await expect(page).toHaveURL(/\/quiz\?s=bb_vs_sb_os&stack=10$/);
    await expect(quiz.hand).toBeVisible();
    await expect(landing.signIn).toBeHidden();
  });

  // What opens the new tab is the browser (Chromium does not always report a background tab to Playwright): what the
  // page must do is leave the click alone.
  test('a click meant for a new tab is left to the browser: no dialog, nothing prevented', async ({ page, backend, shell, login, landing }) => {
    await openSignedOut(backend, shell, login, landing);
    // After React's handlers (they listen on the app's root, below window): did anyone prevent the browser's default?
    await page.evaluate(() => window.addEventListener('click', (e) => Object.assign(window, { clickPrevented: e.defaultPrevented })));

    await landing.feature('Quiz').click({ modifiers: ['ControlOrMeta'] });

    expect(await page.evaluate(() => (window as unknown as { clickPrevented: boolean }).clickPrevented)).toBe(false);
    await expect(landing.signIn).toBeHidden();
    await expect(page).toHaveURL(/\/$/);

    await landing.feature('Quiz').click();
    expect(await page.evaluate(() => (window as unknown as { clickPrevented: boolean }).clickPrevented), 'a plain click asks here').toBe(true);
    await expect(landing.signIn).toBeVisible();
  });

  test('on a phone it docks at the bottom of the screen', async ({ page, backend, shell, login, landing }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSignedOut(backend, shell, login, landing);

    await landing.start.click();

    const box = await landing.signIn.boundingBox();
    expect(box && Math.round(box.y + box.height), 'bottom edge (px)').toBe(844);
    expect(box?.width).toBe(390);
  });

  test('with the dialog open the page passes an accessibility scan (axe, WCAG 2.2 AA)', async ({ page, backend, shell, login, landing }, testInfo) => {
    await openSignedOut(backend, shell, login, landing);
    await landing.start.click();
    await expect(landing.signInWithGoogle).toBeFocused();

    await expectAccessible(page, testInfo, 'sign-in-dialog');
  });
});

test.describe('The sign-in page', () => {
  test.use({ signedIn: false });

  /** Opening a page of the app signed out (the mock's player signs out from it). */
  async function openSignInFrom(path: string, backend: string, shell: AppShell): Promise<void> {
    await shell.open(path);
    if (backend !== 'api') await shell.signOut.click();
  }

  test('shows the sign-in beside a live reference chart, with a way back home', async ({ backend, shell, login, landing }) => {
    await openSignInFrom('/stats', backend, shell);

    await expect(login.screen).toBeVisible();
    await expect(login.google).toBeVisible();
    await expect(login.chart.locator('[data-hand]')).toHaveCount(169);

    await login.home.click();
    await expect(landing.heading).toBeVisible();
  });

  test('fits a phone screen without scrolling sideways, Google\'s button first', async ({ page, backend, shell, login }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openSignInFrom('/stats', backend, shell);
    await expect(login.chart.locator('[data-hand="AA"]')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    await expect(login.google).toBeInViewport();
  });
});
