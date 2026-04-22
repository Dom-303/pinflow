import { describe, expect, it } from 'vitest';
import {
  buildPreviewPlan,
  PINFLOW_PREVIEW_REGISTRY_PORT,
  PINFLOW_PREVIEW_REGISTRY_URL,
} from './pinflow-preview.js';

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
      `FIXTURE_ID=vite-v5-react-18-ts REGISTRY_URL=${PINFLOW_PREVIEW_REGISTRY_URL} REGISTRY_PORT=${PINFLOW_PREVIEW_REGISTRY_PORT} corepack pnpm exec tsx packages/pinflow-test-fixtures/scripts/install-fixture.ts`,
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
});
