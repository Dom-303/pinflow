import { getFixtureById } from './fixture-registry.js';

export interface PinflowPreviewOptions {
  fixtureId: string;
  port?: number;
  prepareOnly?: boolean;
}

export const PINFLOW_PREVIEW_REGISTRY_PORT = 4874;
export const PINFLOW_PREVIEW_REGISTRY_URL = `http://127.0.0.1:${PINFLOW_PREVIEW_REGISTRY_PORT}`;

export interface PinflowPreviewStep {
  label: 'publish' | 'install' | 'dev';
  command: string;
  cwd: string;
}

export interface PinflowPreviewPlan {
  fixtureId: string;
  fixturePath: string;
  port: number;
  prepareOnly: boolean;
  steps: PinflowPreviewStep[];
}

export function buildPreviewPlan(
  options: PinflowPreviewOptions,
  workspaceRoot = process.cwd(),
): PinflowPreviewPlan {
  const fixture = getFixtureById(options.fixtureId);

  if (!fixture) {
    throw new Error(`Unknown fixture: ${options.fixtureId}`);
  }

  const port = options.port ?? 4301;
  const prepareOnly = options.prepareOnly ?? false;

  const steps: PinflowPreviewStep[] = [
    {
      label: 'publish',
      command: `corepack pnpm run registry:publish:current -- --registry ${PINFLOW_PREVIEW_REGISTRY_URL}`,
      cwd: workspaceRoot,
    },
    {
      label: 'install',
      command: `FIXTURE_ID=${options.fixtureId} REGISTRY_URL=${PINFLOW_PREVIEW_REGISTRY_URL} REGISTRY_PORT=${PINFLOW_PREVIEW_REGISTRY_PORT} corepack pnpm exec tsx packages/pinflow-test-fixtures/scripts/install-fixture.ts`,
      cwd: workspaceRoot,
    },
  ];

  if (!prepareOnly) {
    steps.push({
      label: 'dev',
      command: `corepack pnpm dev --host 0.0.0.0 --port ${port}`,
      cwd: fixture.path,
    });
  }

  return {
    fixtureId: options.fixtureId,
    fixturePath: fixture.path,
    port,
    prepareOnly,
    steps,
  };
}
