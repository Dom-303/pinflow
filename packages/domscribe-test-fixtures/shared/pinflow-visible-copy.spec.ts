import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readFixture(relativePath: string): string {
  return readFileSync(
    resolve(
      process.cwd(),
      'packages/domscribe-test-fixtures/fixtures',
      relativePath,
    ),
    'utf8',
  );
}

describe('pinflow visible fixture copy', () => {
  it('brands the canonical preview smoke-test logs as PinFlow Preview', () => {
    const smokeTest = readFixture('vite/v5/react-18-ts/src/domscribe-smoke-test.ts');

    expect(smokeTest).toContain('[pinflow-preview] Runtime initialized');
    expect(smokeTest).toContain(
      '[pinflow-preview] Smoke test utilities loaded. Available commands:',
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
});
