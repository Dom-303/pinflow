import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { writeWizardConfig } from './config-writer.js';

describe('writeWizardConfig', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(path.join(tmpdir(), 'pinflow-writer-spec-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('writes one pinflow.config.json per app at the app path', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    const appB = path.join(workdir, 'apps', 'api');
    mkdirSync(appA, { recursive: true });
    mkdirSync(appB, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [
        { appPath: appA, framework: 'vite' },
        { appPath: appB, framework: 'webpack' },
      ],
    });

    // Assert
    const configA = JSON.parse(readFileSync(path.join(appA, 'pinflow.config.json'), 'utf-8'));
    const configB = JSON.parse(readFileSync(path.join(appB, 'pinflow.config.json'), 'utf-8'));
    expect(configA.appRoot).toBe('.');
    expect(configA.framework).toBe('vite');
    expect(configB.appRoot).toBe('.');
    expect(configB.framework).toBe('webpack');
  });

  it('overwrites an existing pinflow.config.json without throwing', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    writeFileSync(path.join(appA, 'pinflow.config.json'), '{"old":"content"}', 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const config = JSON.parse(readFileSync(path.join(appA, 'pinflow.config.json'), 'utf-8'));
    expect(config.appRoot).toBe('.');
    expect(config.framework).toBe('vite');
  });

  it('creates .gitignore at workspace root with the .pinflow/ block when absent', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.pinflow/');
  });

  it('appends to an existing .gitignore that lacks .pinflow/', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    writeFileSync(path.join(workdir, '.gitignore'), 'node_modules\n', 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('.pinflow/');
  });

  it('does not duplicate the entry when .gitignore already contains .pinflow/', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    mkdirSync(appA, { recursive: true });
    const original = '# PinFlow artifacts\n.pinflow/\n';
    writeFileSync(path.join(workdir, '.gitignore'), original, 'utf-8');

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [{ appPath: appA, framework: 'vite' }],
    });

    // Assert
    const gitignore = readFileSync(path.join(workdir, '.gitignore'), 'utf-8');
    expect(gitignore).toBe(original);
  });

  it('updates gitignore exactly once for multi-app input', async () => {
    // Arrange
    const appA = path.join(workdir, 'apps', 'web');
    const appB = path.join(workdir, 'apps', 'api');
    mkdirSync(appA, { recursive: true });
    mkdirSync(appB, { recursive: true });

    // Act
    await writeWizardConfig({
      cwd: workdir,
      agent: 'codex',
      perApp: [
        { appPath: appA, framework: 'vite' },
        { appPath: appB, framework: 'webpack' },
      ],
    });

    // Assert — gitignore only at workspace root, not at app paths
    expect(existsSync(path.join(workdir, '.gitignore'))).toBe(true);
    expect(existsSync(path.join(appA, '.gitignore'))).toBe(false);
    expect(existsSync(path.join(appB, '.gitignore'))).toBe(false);
  });
});
