#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../dist/runs-webview');
const LIMIT_BYTES = 150 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    }),
  );
  return files.flat();
}

const files = await walk(ROOT);
let total = 0;
const breakdown = [];
for (const file of files) {
  const buf = await readFile(file);
  const gz = gzipSync(buf).length;
  total += gz;
  breakdown.push({ file: path.relative(ROOT, file), gz });
}

breakdown.sort((a, b) => b.gz - a.gz);
console.log('runs-webview bundle (gzipped):');
for (const { file, gz } of breakdown) {
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} KB  ${file}`);
}
console.log(`  ${'-'.repeat(30)}`);
console.log(`  ${(total / 1024).toFixed(1).padStart(7)} KB  TOTAL`);

if (total > LIMIT_BYTES) {
  console.error(
    `\nBundle exceeds limit: ${(total / 1024).toFixed(1)} KB > ${LIMIT_BYTES / 1024} KB`,
  );
  process.exit(1);
}
