import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { patchViteConfig } from './vite-config-patcher.js';

const REACT_VITE_CONFIG = `\
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
});
`;

const VUE_VITE_CONFIG = `\
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
  ],
});
`;

const MULTI_PLUGIN_CONFIG = `\
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import otherPlugin from 'other-plugin';

export default defineConfig({
  plugins: [
    react(),
    otherPlugin(),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
});
`;

const ALREADY_PATCHED_CONFIG = `\
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [
    react(),
    pinflow(),
  ],
});
`;

const NO_PLUGINS_CONFIG = `\
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    alias: { '@': '/src' },
  },
});
`;

const CUSTOM_PLUGIN_ONLY_CONFIG = `\
import { defineConfig } from 'vite';
import customPlugin from 'custom-plugin';

export default defineConfig({
  plugins: [customPlugin()],
});
`;

function makeTmpDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'pinflow-patcher-spec-'));
}

function writeConfig(dir: string, filename: string, content: string): string {
  const full = path.join(dir, filename);
  writeFileSync(full, content, 'utf8');
  return full;
}

describe('patchViteConfig', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it('patches a clean react-vite config: inserts import and pinflow() after react()', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', REACT_VITE_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('patched');
    expect(result.configFile).toBe(path.join(dir, 'vite.config.ts'));
    expect(result.backupFile).toBe(path.join(dir, 'vite.config.ts.pinflow-backup'));
    expect(result.importLine).toBeTypeOf('number');
    expect(result.pluginLine).toBeTypeOf('number');

    const patched = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(patched).toContain("import { pinflow } from '@pinflow/react/vite';");
    expect(patched).toContain('pinflow()');
    // pinflow() appears after react()
    expect(patched.indexOf('react()')).toBeLessThan(patched.indexOf('pinflow()'));
  });

  it('patches a vue-vite config: inserts vue/vite import and pinflow() after vue()', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', VUE_VITE_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'vue-vite');

    // Assert
    expect(result.status).toBe('patched');

    const patched = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(patched).toContain("import { pinflow } from '@pinflow/vue/vite';");
    expect(patched).toContain('pinflow()');
    expect(patched.indexOf('vue()')).toBeLessThan(patched.indexOf('pinflow()'));
  });

  it('preserves otherPlugin(), resolve.alias, and all other content in a multi-plugin config', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', MULTI_PLUGIN_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('patched');

    const patched = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(patched).toContain('otherPlugin()');
    expect(patched).toContain("alias: { '@': '/src' }");
    expect(patched).toContain('pinflow()');
    expect(patched.indexOf('react()')).toBeLessThan(patched.indexOf('pinflow()'));
  });

  it('returns already-patched and makes no changes when the import is already present', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', ALREADY_PATCHED_CONFIG);
    const originalContent = ALREADY_PATCHED_CONFIG;

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('already-patched');
    const content = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(content).toBe(originalContent);
    // No backup should be created
    try {
      readFileSync(path.join(dir, 'vite.config.ts.pinflow-backup'), 'utf8');
      expect.fail('Backup file should not exist for already-patched');
    } catch (err: unknown) {
      expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
    }
  });

  it('creates a backup equal to the original before patching', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', REACT_VITE_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('patched');
    const backup = readFileSync(path.join(dir, 'vite.config.ts.pinflow-backup'), 'utf8');
    expect(backup).toBe(REACT_VITE_CONFIG);
  });

  it('returns no-config-file when no vite.config.* exists in the directory', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('no-config-file');
    expect(result.configFile).toBeUndefined();
  });

  it('detects vite.config.js (not only .ts)', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.js', REACT_VITE_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('patched');
    expect(result.configFile).toBe(path.join(dir, 'vite.config.js'));

    const patched = readFileSync(path.join(dir, 'vite.config.js'), 'utf8');
    expect(patched).toContain("import { pinflow } from '@pinflow/react/vite';");
  });

  it('returns pattern-miss and leaves the original unchanged when plugins: array is absent', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', NO_PLUGINS_CONFIG);
    const originalContent = NO_PLUGINS_CONFIG;

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('pattern-miss');
    const content = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(content).toBe(originalContent);
  });

  it('uses fallback insertion after [ when no react/vue factory is in the plugins array', async () => {
    // Arrange
    const dir = makeTmpDir();
    dirs.push(dir);
    writeConfig(dir, 'vite.config.ts', CUSTOM_PLUGIN_ONLY_CONFIG);

    // Act
    const result = await patchViteConfig(dir, 'react-vite');

    // Assert
    expect(result.status).toBe('patched');

    const patched = readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
    expect(patched).toContain('pinflow()');
    expect(patched).toContain('customPlugin()');
    expect(patched).toContain("import { pinflow } from '@pinflow/react/vite';");
  });
});
