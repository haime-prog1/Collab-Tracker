/**
 * End-to-end offline smoke test against the production build.
 *   npm run build && npm run preview   (in another terminal)
 *   node e2e/offline-smoke.mjs [baseUrl] [screenshotDir]
 * Needs the `playwright` package and a Chromium (PLAYWRIGHT_CHROMIUM=/path to override).
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// createRequire so a globally installed Playwright (NODE_PATH) works too.
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const BASE = process.argv[2] ?? 'http://localhost:4173';
const SHOTS = process.argv[3];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const step = (m) => console.log(`✓ ${m}`);

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const context = await browser.newContext({ ...devices['iPhone 14'], acceptDownloads: true });
context.setDefaultTimeout(15000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// 1. First load: service worker installs and controls the page.
await page.goto(BASE);
await page.getByText('Welcome to Collab Tracker').waitFor();
// registerType 'prompt' doesn't claim the first page, so wait for activation (precache complete).
await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
step('service worker installed & active (app shell precached)');
await shot(page, '01-empty');

// 2. Go offline and reload — the app shell must come from the precache.
await context.setOffline(true);
await page.reload();
await page.getByText('Welcome to Collab Tracker').waitFor();
step('reloads offline');

// 3. Create a collab offline.
await page.getByRole('button', { name: 'New collab' }).first().click();
await page.getByLabel('Brand / creator').fill('Orbit Energy');
await page.getByLabel('Title').fill('Launch day integration');
await page.getByRole('button', { name: 'YouTube' }).click();
await page.getByRole('tab', { name: /Money/ }).click();
await page.getByRole('button', { name: 'Flat fee' }).click();
await page.getByLabel('Amount').fill('2500');
await shot(page, '02-editor-money');
await page.getByRole('button', { name: 'Add collab' }).click();
await page.getByText('Pending').first().waitFor();
step('created collab offline');

// 4. Advance it through every stage to Published using the quick-move button.
await page.goto(`${BASE}/pipeline`);
for (const next of ['Negotiating', 'Confirmed', 'In Production', 'Pending Approval', 'Published']) {
  await page.getByRole('button', { name: new RegExp(`Move to ${next}`) }).first().click();
}
await page.getByText(/is live! Nice work/).waitFor();
step('moved to Published, celebration toast shown');
await page.waitForTimeout(400);
await shot(page, '03-pipeline-published');

// 5. Data survives an offline reload.
await page.reload();
await page.getByText('Launch day integration').first().waitFor();
const stage = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const req = indexedDB.open('collab-tracker');
      req.onsuccess = () => {
        const g = req.result.transaction('collabs').objectStore('collabs').getAll();
        g.onsuccess = () => resolve(g.result[0]?.stage);
      };
    }),
);
assert.equal(stage, 'published');
step('persisted in IndexedDB across reload');

// 6. Export a JSON backup, erase everything, restore it.
await page.goto(`${BASE}/settings`);
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON backup' }).click()]);
const file = await download.path();
const backup = JSON.parse(readFileSync(file, 'utf8'));
assert.equal(backup.app, 'collab-tracker');
assert.equal(backup.data.collabs.length, 1);
step('exported backup');

await page.getByRole('button', { name: 'Erase all data' }).click();
await page.getByRole('button', { name: 'Erase all', exact: true }).click();
await page.getByText('0 collabs · 0 brands').waitFor();
await page.locator('input[type=file]').setInputFiles(file);
await page.getByRole('button', { name: 'Replace all' }).click();
await page.getByRole('button', { name: 'Replace', exact: true }).click();
await page.getByText('1 collabs · 1 brands').waitFor();
step('restored backup');

// 7. Brand directory picked up the brand with its history.
await page.goto(`${BASE}/brands`);
await page.getByText('Orbit Energy').click();
await page.getByText('Collaboration history').waitFor();
await page.getByText('Launch day integration').waitFor();
step('brand directory shows collab history');

await context.setOffline(false);
assert.deepEqual(errors, [], `page errors: ${errors.join('\n')}`);
await browser.close();
console.log('\nAll offline smoke checks passed.');
