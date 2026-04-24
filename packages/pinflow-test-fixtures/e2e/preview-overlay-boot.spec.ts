/**
 * Preview overlay boot — regression guard
 *
 * The workspace-source preview loader (react-18-ts fixture) is the only
 * path exercised by `pnpm pinflow:preview`. Three boot-time regressions
 * have bitten it in the past and are silent on the server side:
 *
 *  1. Module resolution breaks for lit's pnpm peer graph when
 *     `resolve.preserveSymlinks` is on.
 *  2. esbuild rejects lit's `@customElement` legacy decorators when
 *     `experimentalDecorators` / `useDefineForClassFields` aren't pinned
 *     via `esbuild.tsconfigRaw`.
 *  3. A `?v=` cache tag on init imports splits Vite's module graph and
 *     makes the custom element decorator run twice, throwing
 *     "has already been used with this registry".
 *
 * The HTTP smoke check in `scripts/pinflow-preview.ts` covers (1) and
 * (2). (3) only manifests after the JS runs in a real browser, so we
 * guard it here: if this spec fails, `pnpm pinflow:preview` is broken
 * for a developer even when the smoke check is green.
 *
 * Requires: Chromium installed via `pnpm exec playwright install
 * chromium` inside the test-fixtures package.
 */

import { test, expect, getServer } from './fixtures.js';

const PREVIEW_FIXTURE_ID = 'vite-v5-react-18-ts';

const FATAL_ERROR_SIGNATURES = [
  'has already been used with this registry',
  'Invalid or unexpected token',
  'Failed to resolve module specifier',
  'Failed to load overlay',
  '[pinflow] Failed to load overlay',
  '[pinflow] Failed to init React runtime',
] as const;

function matchesFatalSignature(line: string): boolean {
  return FATAL_ERROR_SIGNATURES.some((signature) => line.includes(signature));
}

test.describe('preview overlay boot (vite-v5-react-18-ts)', () => {
  test.describe.configure({ mode: 'serial' });

  test('mounts ds-overlay exactly once and boots without fatal errors', async ({
    page,
  }) => {
    const server = await getServer(PREVIEW_FIXTURE_ID);

    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        consoleMessages.push(`${type}: ${msg.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(server.url);

    await page.waitForFunction(
      () => document.querySelectorAll('ds-overlay').length > 0,
      null,
      { timeout: 15_000 },
    );

    const dsOverlayCount = await page.evaluate(
      () => document.querySelectorAll('ds-overlay').length,
    );
    expect(dsOverlayCount, 'exactly one <ds-overlay> in DOM').toBe(1);

    const isRegistered = await page.evaluate(
      () => customElements.get('ds-overlay') !== undefined,
    );
    expect(isRegistered, 'ds-overlay custom element is registered').toBe(true);

    const fatalConsoleLines = consoleMessages.filter(matchesFatalSignature);
    const fatalPageErrors = pageErrors.filter(matchesFatalSignature);

    expect(
      { console: fatalConsoleLines, pageErrors: fatalPageErrors },
      'no regression-signature errors during overlay boot',
    ).toEqual({ console: [], pageErrors: [] });
  });
});
