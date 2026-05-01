import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('VS Code package smoke docs', () => {
  const packageRoot = path.resolve(__dirname, '..');
  const readme = readFileSync(path.join(packageRoot, 'README.md'), 'utf8');

  it('documents the required local PinFlow CLI workflow', () => {
    expect(readme).toContain('pinflow CLI');
    expect(readme).toContain('pinflow dev');
    expect(readme).toContain('pinflow follow');
    expect(readme).toContain('PinFlow: Start Workflow');
  });

  it('documents evidence viewing and external visible handoff commands', () => {
    expect(readme).toContain('PinFlow: Open Latest Run');
    expect(readme).toContain('PinFlow: Claim External Task');
    expect(readme).toContain('PinFlow: Complete External Task');
    expect(readme).toContain('PinFlow: Fail External Task');
  });

  it('documents local packaging without marketplace publishing', () => {
    expect(readme).toContain('pnpm run package:vsix');
    expect(readme).toContain('This does not publish the extension.');
  });

  it('ships local marketplace media assets referenced by the README', () => {
    expect(existsSync(path.join(packageRoot, 'media/icon.png'))).toBe(true);
    expect(existsSync(path.join(packageRoot, 'media/overview.webp'))).toBe(true);
    expect(existsSync(path.join(packageRoot, 'LICENSE'))).toBe(true);
    expect(existsSync(path.join(packageRoot, '.vscodeignore'))).toBe(true);
    expect(readme).toContain('media/icon.png');
  });
});
