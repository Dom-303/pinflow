/**
 * Bundle the VS Code extension host entrypoint into a single self-contained
 * CommonJS file. Replaces the previous `tsc` build, which left bare imports
 * (e.g. `@pinflow/core`) in the emitted output and required `node_modules` to
 * be present at activation — but `vsce package --no-dependencies` ships none.
 *
 * Output:
 *   dist/extension.cjs         (Node CJS bundle, all workspace deps inlined)
 *   dist/extension.cjs.map     (sourcemap for stack traces in the Output channel)
 *
 * The webview side is built separately via `build:webview` (vite).
 */
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // The `vscode` module is provided by the extension host at runtime — never
  // bundle it. Everything else (including @pinflow/core, zod, etc.) is inlined.
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info',
  // Use the library tsconfig so esbuild picks up `paths` (workspace package
  // aliases like `@pinflow/core` → packages/pinflow-core/src/index.ts).
  tsconfig: 'tsconfig.lib.json',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[esbuild] watching for changes…');
} else {
  await esbuild.build(options);
}
