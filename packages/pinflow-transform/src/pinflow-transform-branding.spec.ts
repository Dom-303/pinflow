import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEGACY_BRAND = ['Dom', 'scribe'].join('');

function readSource(relativePath: string): string {
  return readFileSync(resolve(import.meta.dirname, relativePath), 'utf8');
}

describe('pinflow transform branding', () => {
  it('uses pinflow-transform prefixes in active transform sources', () => {
    const injector = readSource('./core/injector.ts');
    const vitePlugin = readSource('./plugins/vite/vite.plugin.ts');
    const webpackPlugin = readSource('./plugins/webpack/webpack.plugin.ts');
    const webpackLoader = readSource('./plugins/webpack/webpack.loader.ts');
    const turbopackLoader = readSource('./plugins/turbopack/turbopack.loader.ts');

    expect(injector).toContain('[pinflow-transform][injector]');
    expect(vitePlugin).toContain('[pinflow-transform][vite-plugin]');
    expect(webpackPlugin).toContain('[pinflow-transform][webpack-plugin]');
    expect(webpackLoader).toContain('[pinflow-transform][webpack-loader]');
    expect(turbopackLoader).toContain("[pinflow-transform][turbopack-loader]");

    expect(injector).not.toContain(LEGACY_BRAND);
    expect(vitePlugin).not.toContain(LEGACY_BRAND);
    expect(webpackPlugin).not.toContain(LEGACY_BRAND);
    expect(webpackLoader).not.toContain(LEGACY_BRAND);
    expect(turbopackLoader).not.toContain(LEGACY_BRAND);
  });
});
