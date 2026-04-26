import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.mts',
  '.sh',
  '.ts',
  '.tsx',
  '.txt',
  '.vue',
  '.yaml',
  '.yml',
  '',
]);

const ROOT = resolve(process.cwd());
const LEGACY_BRAND_PATTERN = new RegExp(
  [
    ['dom', 'scribe'].join(''),
    ['Dom', 'scribe'].join(''),
    ['DOM', 'SCRIBE'].join(''),
    ['@dom', 'scribe/'].join(''),
  ].join('|'),
);
const ALLOWED_FOUNDATION_REFERENCES = new Set(['CHANGELOG.md', 'README.md']);

function listTrackedTextFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  return output
    .split('\0')
    .filter(Boolean)
    .filter((file) => {
      const extension = extname(file);

      if (!TEXT_EXTENSIONS.has(extension)) {
        return false;
      }

      return !file.startsWith('assets/');
    });
}

describe('pinflow repository rename completeness', () => {
  it('contains no tracked legacy package or implementation references', () => {
    const offenders = listTrackedTextFiles()
      .filter((file) => !ALLOWED_FOUNDATION_REFERENCES.has(file))
      .map((file) => {
        const content = readFileSync(resolve(ROOT, file), 'utf8');

        return LEGACY_BRAND_PATTERN.test(content)
          ? file
          : null;
      })
      .filter((file): file is string => file !== null);

    expect(offenders).toEqual([]);
  });
});
