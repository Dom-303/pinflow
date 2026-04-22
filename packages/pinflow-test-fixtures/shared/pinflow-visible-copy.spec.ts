import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readFixture(relativePath: string): string {
  return readFileSync(
    resolve(
      process.cwd(),
      'packages/pinflow-test-fixtures/fixtures',
      relativePath,
    ),
    'utf8',
  );
}

describe('pinflow visible fixture copy', () => {
  it('brands the canonical preview smoke-test globals and logs as PinFlow', () => {
    const smokeTest = readFixture('vite/v5/react-18-ts/src/domscribe-smoke-test.ts');

    expect(smokeTest).toContain('const pinflowUtils = {');
    expect(smokeTest).toContain(
      '(window as unknown as Record<string, unknown>).pinflow = pinflowUtils;',
    );
    expect(smokeTest).toContain(
      '(window as unknown as Record<string, unknown>).domscribe = pinflowUtils;',
    );
    expect(smokeTest).toContain('[pinflow-preview] Runtime initialized');
    expect(smokeTest).toContain(
      '[pinflow-preview] Smoke test utilities loaded. Available commands:',
    );
    expect(smokeTest).toContain(
      '  pinflow.captureElement(element) - Capture context for element',
    );
  });

  it('brands next fixture metadata as PinFlow', () => {
    const layout = readFixture('next/v15/ts/app/layout.tsx');
    const metadata = readFixture('next/v15/ts/src/components/Metadata.tsx');

    expect(layout).toContain("description: 'Test fixture for PinFlow transform validation'");
    expect(metadata).toContain("title: 'PinFlow Test Fixture'");
    expect(metadata).toContain("description: 'Next.js test fixture for PinFlow transform validation'");
    expect(metadata).toContain('PinFlow captures');
  });

  it('brands the Nuxt smoke utilities as PinFlow-first with a legacy alias', () => {
    const plugin = readFixture('nuxt/v3/ts/plugins/domscribe.client.ts');
    const smokeModule = readFixture('nuxt/v3/ts/domscribe-smoke-test.ts');

    expect(plugin).toContain('const pinflowUtils = {');
    expect(plugin).toContain(
      '(window as unknown as Record<string, unknown>).pinflow = pinflowUtils;',
    );
    expect(plugin).toContain(
      '(window as unknown as Record<string, unknown>).domscribe = pinflowUtils;',
    );
    expect(smokeModule).toContain(
      'Available commands: pinflow.captureElement(el), pinflow.captureSelector(sel), pinflow.listTracked(), pinflow.status()',
    );
  });
});
