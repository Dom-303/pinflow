import { describe, expect, it } from 'vitest';
import {
  buildPreviewPlan,
  PINFLOW_PREVIEW_REGISTRY_PORT,
  PINFLOW_PREVIEW_REGISTRY_URL,
} from './pinflow-preview.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('pinflow preview plan', () => {
  it('builds the canonical vite react preview flow', () => {
    const plan = buildPreviewPlan({
      fixtureId: 'vite-v5-react-18-ts',
      port: 4301,
    });

    expect(plan.fixtureId).toBe('vite-v5-react-18-ts');
    expect(plan.fixturePath).toContain('fixtures/vite/v5/react-18-ts');
    expect(plan.steps.map((step) => step.command)).toEqual([
      `corepack pnpm run registry:publish:current -- --registry ${PINFLOW_PREVIEW_REGISTRY_URL}`,
      `FIXTURE_ID=vite-v5-react-18-ts REGISTRY_URL=${PINFLOW_PREVIEW_REGISTRY_URL} REGISTRY_PORT=${PINFLOW_PREVIEW_REGISTRY_PORT} FORCE_REINSTALL=1 corepack pnpm exec tsx packages/pinflow-test-fixtures/scripts/install-fixture.ts`,
      'corepack pnpm dev --host 0.0.0.0 --port 4301',
    ]);
  });

  it('omits the dev step in prepare-only mode', () => {
    const plan = buildPreviewPlan({
      fixtureId: 'vite-v5-react-18-ts',
      port: 4301,
      prepareOnly: true,
    });

    expect(plan.prepareOnly).toBe(true);
    expect(plan.steps).toHaveLength(2);
  });

  it('keeps PinFlow preview packages local instead of proxying same-version public packages', () => {
    const config = readFileSync(
      resolve(process.cwd(), '.verdaccio/config.yml'),
      'utf8',
    );
    const pinflowScopeRule = config.indexOf("  '@pinflow/*':");
    const pinflowCliRule = config.indexOf("  'pinflow':");
    const catchAllRule = config.indexOf("  '**':");

    expect(pinflowScopeRule).toBeGreaterThan(-1);
    expect(pinflowCliRule).toBeGreaterThan(pinflowScopeRule);
    expect(catchAllRule).toBeGreaterThan(pinflowCliRule);

    const pinflowRules = config.slice(pinflowScopeRule, catchAllRule);
    expect(pinflowRules).not.toContain('proxy: npmjs');
  });

  it('publishes fixture packages with runtime-safe root exports', () => {
    const pkg = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          'packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts/node_modules/@pinflow/react/package.json',
        ),
        'utf8',
      ),
    ) as {
      exports?: Record<string, { import?: string }>;
    };

    expect(pkg.exports?.['.']?.import).toBe('./index.js');
  });
});
