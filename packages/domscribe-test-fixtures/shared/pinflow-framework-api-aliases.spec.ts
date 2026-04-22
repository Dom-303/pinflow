import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('pinflow framework api aliases', () => {
  it('exports PinFlow aliases alongside existing Domscribe names', () => {
    const nextIndex = readRepoFile('packages/domscribe-next/src/index.ts');
    const reactViteIndex = readRepoFile(
      'packages/domscribe-react/src/vite/index.ts',
    );
    const vueViteIndex = readRepoFile('packages/domscribe-vue/src/vite/index.ts');
    const transformViteIndex = readRepoFile(
      'packages/domscribe-transform/src/plugins/vite/index.ts',
    );
    const reactWebpackIndex = readRepoFile(
      'packages/domscribe-react/src/webpack/index.ts',
    );
    const vueWebpackIndex = readRepoFile(
      'packages/domscribe-vue/src/webpack/index.ts',
    );
    const transformWebpackIndex = readRepoFile(
      'packages/domscribe-transform/src/plugins/webpack/index.ts',
    );

    expect(nextIndex).toContain('withPinFlow');
    expect(reactViteIndex).toContain('pinflow');
    expect(vueViteIndex).toContain('pinflow');
    expect(transformViteIndex).toContain('pinflow');
    expect(reactWebpackIndex).toContain('PinFlowWebpackPlugin');
    expect(vueWebpackIndex).toContain('PinFlowWebpackPlugin');
    expect(transformWebpackIndex).toContain('PinFlowWebpackPlugin');
  });

  it('prefers PinFlow names in the main onboarding docs', () => {
    const readme = readRepoFile('README.md');
    const reactReadme = readRepoFile('packages/domscribe-react/README.md');
    const vueReadme = readRepoFile('packages/domscribe-vue/README.md');
    const transformReadme = readRepoFile('packages/domscribe-transform/README.md');

    expect(readme).toContain('withPinFlow');
    expect(readme).toContain('PinFlowWebpackPlugin');
    expect(readme).toContain('pinflow()');
    expect(reactReadme).toContain('pinflow()');
    expect(vueReadme).toContain('pinflow()');
    expect(transformReadme).toContain('PinFlowWebpackPlugin');
  });
});
