import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readFixture(relativePath: string): string {
  return readFileSync(
    resolve(
      process.cwd(),
      'packages/pinflow-test-fixtures/fixtures/vite/v5/react-18-ts',
      relativePath,
    ),
    'utf8',
  );
}

describe('pinflow visible preview branding', () => {
  it('brands the canonical preview fixture as PinFlow in the document title', () => {
    const html = readFixture('index.html');

    expect(html).toContain('<title>PinFlow Preview - React 18</title>');
  });

  it('brands the canonical preview sidebar as PinFlow Workspace', () => {
    const navigation = readFixture('src/Navigation.tsx');

    expect(navigation).toContain('PinFlow Workspace');
  });
});
