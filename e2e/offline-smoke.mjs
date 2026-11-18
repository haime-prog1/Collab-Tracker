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

// 8. Global search finds the brand's contact-free collab and the brand itself.
await page.goto(`${BASE}/`);
await page.getByRole('combobox').fill('orbit');
await page.getByRole('option', { name: /Orbit Energy/ }).first().waitFor();
step('global search shows grouped results');
await page.keyboard.press('Escape');
await page.getByRole('combobox').fill('');

// 9. Calendar: a payment due today shows with brand, and "Mark paid" works.
await page.evaluate(async () => {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const db = await new Promise((r) => { const q = indexedDB.open('collab-tracker'); q.onsuccess = () => r(q.result); });
  const c = await new Promise((r) => { const g = db.transaction('collabs').objectStore('collabs').getAll(); g.onsuccess = () => r(g.result[0]); });
  c.compensation[0] = { ...c.compensation[0], status: 'invoiced', paidAt: undefined, dueDate: iso };
  await new Promise((r) => { const t = db.transaction('collabs', 'readwrite'); t.objectStore('collabs').put(c); t.oncomplete = r; });
});
await page.goto(`${BASE}/calendar`);
await page.getByText('Payment due').first().waitFor();
await page.getByRole('button', { name: 'Mark paid' }).first().click();
await page.getByText(/marked paid/).waitFor();
await page.getByText('Payment received').first().waitFor();
step('calendar shows payment due and marks it paid');
await shot(page, '04-calendar');

// 10. Reports: totals render and the CSV downloads.
await page.goto(`${BASE}/reports`);
await page.getByText('Earned in period').waitFor();
const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Payments CSV' }).click()]);
const csvText = readFileSync(await csv.path(), 'utf8');
assert.match(csvText, /Orbit Energy/);
assert.match(csvText, /2500/);
assert.match(csvText, /PHP/);
step('report generated and CSV exported');
await shot(page, '05-report');

await context.setOffline(false);
assert.deepEqual(errors, [], `page errors: ${errors.join('\n')}`);
await browser.close();
console.log('\nAll offline smoke checks passed.');
