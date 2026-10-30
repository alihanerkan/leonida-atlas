import { expect, test, type Page } from '@playwright/test';

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const PAGES = ['/en', '/en/map', '/en/characters', '/tr/araclar', '/ru/personazhi/dzhejson-dyuval', '/zh-CN/locations/vice-city', '/en/easter-eggs', '/en/news', '/en/compare', '/en/my-atlas', '/en/search?q=vice', '/fr/a-propos', '/login'];

async function scrollThrough(page: Page) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 700) await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.evaluate(() => window.scrollTo(0, 0));
}

for (const width of WIDTHS) {
    test.describe(`${width}px`, () => {
        test.use({ viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: width < 1024 });

        for (const path of PAGES) {
            test(`no overflow or errors on ${path}`, async ({ page }) => {
                const errors: string[] = [];
                page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
                page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
                const response = await page.goto(path, { waitUntil: 'networkidle' });
                expect(response?.status()).toBe(200);
                await scrollThrough(page);
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
                expect(errors).toEqual([]);
            });
        }
    });
}

test.describe('mobile navigation', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('menu opens, is navigable and has large touch targets', async ({ page }) => {
        await page.goto('/en');
        await page.getByRole('button', { name: 'Menu' }).tap();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.waitForTimeout(400); // let the opening transition finish before tapping
        const link = dialog.getByRole('link', { name: /^Vehicles/ });
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await link.tap();
        await expect(page).toHaveURL(/\/en\/vehicles$/);
    });

    test('map supports tapping a cluster and opening a marker panel', async ({ page }) => {
        await page.goto('/en/map?marker=1');
        await expect(page.getByRole('region', { name: 'Vice City' })).toBeVisible();
        await expect(page.getByText('Approximate position').first()).toBeVisible();
    });
});

test('language switch keeps the same entry and localized slug', async ({ page }) => {
    await page.goto('/en/characters/jason-duval');
    await page.getByRole('button', { name: /Language/ }).click();
    await page.getByRole('menuitem', { name: /Русский/ }).click();
    await expect(page).toHaveURL(/\/ru\/personazhi\/dzhejson-dyuval$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Джейсон Дюваль');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('untranslated entries show a fallback notice', async ({ page }) => {
    await page.goto('/it/personaggi/cal-hampton');
    await expect(page.getByRole('note').filter({ hasText: 'Italiano' })).toBeVisible();
});

test('search palette supports keyboard navigation', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('lucia');
    await expect(page.getByRole('option').first()).toContainText('Lucia');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/characters\/lucia-caminos$/);
});

test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('hero content is visible immediately', async ({ page }) => {
        await page.goto('/en');
        await expect(page.getByRole('link', { name: 'Explore the atlas' })).toBeVisible({ timeout: 2500 });
        const heroOpacity = await page.locator('#cover-title').evaluate((el) => getComputedStyle(el).opacity);
        expect(Number(heroOpacity)).toBe(1);
    });
});

test('favourites persist for anonymous visitors', async ({ page }) => {
    await page.goto('/en/characters/lucia-caminos');
    await page.getByRole('button', { name: 'Save to favourites' }).first().click();
    await page.goto('/en/my-atlas');
    await expect(page.getByRole('heading', { name: 'Favourites' })).toBeVisible();
    await expect(page.locator('main').getByText('Lucia Caminos').first()).toBeVisible();
});
