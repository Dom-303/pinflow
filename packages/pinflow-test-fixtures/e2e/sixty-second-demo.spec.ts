/**
 * 60-second demo golden path.
 *
 * This keeps the product demo honest: a visible React/Vite element must map
 * back to source, answer `query.bySource` with live runtime context, survive a
 * small HMR text edit, and be queryable again from the same source location.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, getServer } from './fixtures.js';
import { getFixtureById } from '../shared/fixture-registry.js';
import { selectAndReadContext } from './helpers/capture-helpers.js';
import type { DevServerHandle } from './helpers/dev-server.js';

const FIXTURE_ID = 'vite-v5-react-18-ts';
const TARGET_SELECTOR = '[data-demo-id="pinflow-60-second-golden-path"] button';
const SOURCE_TEXT_BEFORE = 'Start source-exact edit';
const SOURCE_TEXT_AFTER = 'Ship source-exact edit';

interface ManifestEntry {
  id: string;
  file: string;
  start: { line: number; column?: number | null };
  tagName?: string;
  componentName?: string;
}

interface QueryBySourceResponse {
  found?: boolean;
  browserConnected?: boolean;
  sourceLocation?: {
    file: string;
    tagName?: string;
    componentName?: string;
  };
  match?: {
    confidence?: string;
  };
  runtime?: {
    rendered?: boolean;
    elementFound?: boolean;
    contextCaptured?: boolean;
    domSnapshot?: {
      tagName?: string;
      innerText?: string;
    };
    componentProps?: Record<string, unknown>;
    componentState?: Record<string, unknown>;
  };
  reasons?: string[];
}

function fixturePath(): string {
  const fixture = getFixtureById(FIXTURE_ID);
  if (!fixture) {
    throw new Error(`Fixture not found: ${FIXTURE_ID}`);
  }
  return fixture.path;
}

function readManifestEntryById(entryId: string): ManifestEntry {
  const manifestPath = path.join(fixturePath(), '.pinflow/manifest.jsonl');
  const lines = readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);

  for (const line of lines) {
    const entry = JSON.parse(line) as ManifestEntry;
    if (entry.id === entryId) {
      return entry;
    }
  }

  throw new Error(`Manifest entry not found for ${entryId}`);
}

async function waitForRelayPort(page: import('@playwright/test').Page) {
  return page.waitForFunction(
    () => typeof window.__PINFLOW_RELAY_PORT__ === 'number',
    null,
    { timeout: 10_000 },
  );
}

async function queryBySource(
  relayPort: number,
  entry: ManifestEntry,
): Promise<QueryBySourceResponse> {
  const response = await fetch(
    `http://127.0.0.1:${relayPort}/api/v1/manifest/resolve-by-source`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        file: entry.file,
        line: entry.start.line,
        column: entry.start.column ?? undefined,
        includeRuntime: true,
      }),
    },
  );

  expect(response.status, 'query.bySource HTTP status').toBe(200);
  return (await response.json()) as QueryBySourceResponse;
}

async function waitForBrowserConnection(relayPort: number): Promise<void> {
  const startedAt = Date.now();
  let lastStatus: unknown = null;

  while (Date.now() - startedAt < 10_000) {
    const response = await fetch(`http://127.0.0.1:${relayPort}/status`);
    lastStatus = await response.json();

    if (
      typeof lastStatus === 'object' &&
      lastStatus !== null &&
      'browser' in lastStatus &&
      (lastStatus as { browser?: { connected?: boolean } }).browser?.connected
    ) {
      return;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(
    `Browser did not connect to relay within 10s: ${JSON.stringify(lastStatus)}`,
  );
}

function replaceFixtureText(from: string, to: string): () => void {
  const appPath = path.join(fixturePath(), 'src/App.tsx');
  const original = readFileSync(appPath, 'utf8');

  if (!original.includes(from)) {
    throw new Error(`Fixture source text not found: ${from}`);
  }

  writeFileSync(appPath, original.replace(from, to));

  return () => {
    writeFileSync(appPath, original);
  };
}

test.describe('60-second demo golden path (vite-v5-react-18-ts)', () => {
  test.describe.configure({ mode: 'serial' });

  let server: DevServerHandle;

  test.beforeAll(async () => {
    server = await getServer(FIXTURE_ID);
  });

  test('maps a visible demo element to source and re-queries it after HMR', async ({
    page,
  }) => {
    await page.goto(server.url);
    await page.waitForSelector('.app', { timeout: 10_000 });
    await page.waitForSelector('ds-overlay', { timeout: 10_000 });
    await page.waitForSelector(TARGET_SELECTOR, { timeout: 10_000 });
    await waitForRelayPort(page);

    const context = await selectAndReadContext(page, TARGET_SELECTOR);
    expect(context, 'overlay context for golden path element').toBeTruthy();
    expect(context?.componentName).toBe('GoldenPathDemo');
    const dataDs = context?.dataDs;
    expect(dataDs).toBeTruthy();
    if (!dataDs) {
      throw new Error(
        'Golden Path element did not expose a data-ds attribute.',
      );
    }

    const relayPort = await page.evaluate(() => window.__PINFLOW_RELAY_PORT__);
    await waitForBrowserConnection(relayPort);
    const manifestEntry = readManifestEntryById(dataDs);
    expect(manifestEntry.file).toContain('src/App.tsx');
    expect(manifestEntry.tagName).toBe('button');

    const beforeQuery = await queryBySource(relayPort, manifestEntry);
    expect(beforeQuery.found).toBe(true);
    expect(beforeQuery.browserConnected).toBe(true);
    expect(beforeQuery.match?.confidence).toMatch(/high|medium/);
    expect(beforeQuery.sourceLocation?.tagName).toBe('button');
    expect(beforeQuery.runtime?.rendered).toBe(true);
    expect(beforeQuery.runtime?.contextCaptured).toBe(true);
    expect(beforeQuery.runtime?.domSnapshot?.innerText).toContain(
      SOURCE_TEXT_BEFORE,
    );

    const restore = replaceFixtureText(SOURCE_TEXT_BEFORE, SOURCE_TEXT_AFTER);
    try {
      await expect(page.locator(TARGET_SELECTOR)).toContainText(
        SOURCE_TEXT_AFTER,
        { timeout: 15_000 },
      );

      const afterQuery = await queryBySource(relayPort, manifestEntry);
      expect(afterQuery.found).toBe(true);
      expect(afterQuery.browserConnected).toBe(true);
      expect(afterQuery.runtime?.rendered).toBe(true);
      expect(afterQuery.runtime?.domSnapshot?.innerText).toContain(
        SOURCE_TEXT_AFTER,
      );
    } finally {
      restore();
      await expect(page.locator(TARGET_SELECTOR)).toContainText(
        SOURCE_TEXT_BEFORE,
        { timeout: 15_000 },
      );
    }
  });
});
