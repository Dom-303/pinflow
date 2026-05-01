import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = resolve(__dirname, '../../..');
const previewAppPath = resolve(
  workspaceRoot,
  'packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts/src/App.tsx',
);

const demoAssets = [
  'architecture',
  'code-to-ui',
  'local-setup-flow',
  'pinflow-overview',
  'ui-to-code',
  'workflow-loop',
] as const;

const maxDemoAssetBytes = 420_000;

describe('pinflow demo asset budget', () => {
  it('uses optimized webp assets for the canonical product demo visuals', () => {
    const appSource = readFileSync(previewAppPath, 'utf-8');

    for (const assetName of demoAssets) {
      const webpImport = `assets/${assetName}.webp`;
      const webpPath = resolve(workspaceRoot, webpImport);

      expect(appSource).toContain(webpImport);
      expect(existsSync(webpPath), `${webpImport} should exist`).toBe(true);
      expect(statSync(webpPath).size).toBeLessThanOrEqual(maxDemoAssetBytes);
    }
  });
});
