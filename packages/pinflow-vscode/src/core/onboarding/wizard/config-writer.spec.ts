import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { writeWizardConfig } from './config-writer.js';

describe('writeWizardConfig', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'pinflow-cw-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('writes pinflow.config.json with correct framework field', async () => {
    // Arrange
    const input = { cwd, agent: 'codex' as const, framework: 'vite' as const, appRoot: '.' };

    // Act
    await writeWizardConfig(input);

    // Assert
    const raw = await readFile(path.join(cwd, 'pinflow.config.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { framework: string };
    expect(parsed.framework).toBe('vite');
  });

  it('throws when pinflow.config.json already exists', async () => {
    // Arrange
    const configPath = path.join(cwd, 'pinflow.config.json');
    await writeFile(configPath, '{}', 'utf-8');

    // Act & Assert
    await expect(
      writeWizardConfig({ cwd, agent: 'codex' as const, framework: 'vite' as const, appRoot: '.' }),
    ).rejects.toThrow('pinflow.config.json already exists');
  });

  it('appends .pinflow/ block to existing .gitignore', async () => {
    // Arrange
    const gitignorePath = path.join(cwd, '.gitignore');
    await writeFile(gitignorePath, 'node_modules/\n', 'utf-8');

    // Act
    await writeWizardConfig({ cwd, agent: 'claude-code' as const, framework: 'next' as const, appRoot: '.' });

    // Assert
    const content = await readFile(gitignorePath, 'utf-8');
    expect(content).toContain('.pinflow/');
    expect(content).toContain('node_modules/');
  });

  it('creates .gitignore with block when file does not exist', async () => {
    // Arrange — no .gitignore in temp dir

    // Act
    await writeWizardConfig({ cwd, agent: 'copilot' as const, framework: 'webpack' as const, appRoot: '.' });

    // Assert
    const content = await readFile(path.join(cwd, '.gitignore'), 'utf-8');
    expect(content).toContain('.pinflow/');
  });

  it('does not duplicate .pinflow/ block when already present (idempotent)', async () => {
    // Arrange
    const gitignorePath = path.join(cwd, '.gitignore');
    await writeFile(gitignorePath, 'node_modules/\n.pinflow/\n', 'utf-8');

    // Act
    await writeWizardConfig({ cwd, agent: 'codex' as const, framework: 'nuxt' as const, appRoot: '.' });

    // Assert
    const content = await readFile(gitignorePath, 'utf-8');
    const occurrences = content.split('.pinflow/').length - 1;
    expect(occurrences).toBe(1);
  });
});
