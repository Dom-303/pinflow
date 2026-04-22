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

    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>PinFlow Vorschau - React 18</title>');
  });

  it('marks the left rail as demo space and explains that the workspace lives on the right', () => {
    const navigation = readFixture('src/Navigation.tsx');
    const app = readFixture('src/App.tsx');
    const viteConfig = readFixture('vite.config.ts');

    expect(navigation).toContain('PinFlow Demo');
    expect(navigation).toContain('pinflow-icon-light.png');
    expect(navigation).toContain('Children Manipulation');
    expect(app).toContain('Klicke auf das halb sichtbare PinFlow-Logo');
    expect(app).toContain('pinflow-stacked-light.png');
    expect(app).not.toContain('codeToUiImage');
    expect(app).not.toContain('uiToCodeImage');
    expect(viteConfig).toContain("initialMode: 'collapsed'");
    expect(viteConfig).toContain("initialTheme: 'light'");
  });
});
