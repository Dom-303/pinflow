import { describe, it, expect, vi } from 'vitest';
import { detectPackageManager } from './package-manager.js';

describe('detectPackageManager', () => {
  it('detects pnpm when pnpm-lock.yaml is present', () => {
    // Arrange
    const deps = { fileExists: vi.fn((p: string) => p.endsWith('pnpm-lock.yaml')) };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('pnpm');
    expect(result.installCmd).toBe('pnpm add -D');
  });

  it('detects yarn when yarn.lock is present', () => {
    // Arrange
    const deps = { fileExists: vi.fn((p: string) => p.endsWith('yarn.lock')) };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('yarn');
    expect(result.installCmd).toBe('yarn add -D');
  });

  it('detects bun when bun.lock is present', () => {
    // Arrange
    const deps = { fileExists: vi.fn((p: string) => p.endsWith('bun.lock')) };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('bun');
    expect(result.installCmd).toBe('bun add -D');
  });

  it('detects bun when bun.lockb (binary) is present', () => {
    // Arrange
    const deps = { fileExists: vi.fn((p: string) => p.endsWith('bun.lockb')) };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('bun');
    expect(result.installCmd).toBe('bun add -D');
  });

  it('falls back to npm when no lockfile is present', () => {
    // Arrange
    const deps = { fileExists: vi.fn(() => false) };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('npm');
    expect(result.installCmd).toBe('npm install -D');
  });

  it('pnpm wins over yarn when both lockfiles are present', () => {
    // Arrange
    const deps = {
      fileExists: vi.fn(
        (p: string) => p.endsWith('pnpm-lock.yaml') || p.endsWith('yarn.lock'),
      ),
    };

    // Act
    const result = detectPackageManager('/workspace', deps);

    // Assert
    expect(result.id).toBe('pnpm');
  });
});
