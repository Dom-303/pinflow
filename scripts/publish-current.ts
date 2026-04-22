import { execSync } from 'child_process';
import { chmodSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface PublishCurrentOptions {
  registry: string;
}

function parseArgs(argv: string[]): PublishCurrentOptions {
  let registry = 'http://localhost:4873';

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--registry') {
      registry = argv[index + 1] ?? registry;
      index += 1;
    }
  }

  return { registry };
}

function runCommand(command: string, extraEnv: NodeJS.ProcessEnv = {}): void {
  execSync(command, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv, FORCE_COLOR: '0' },
  });
}

function ensurePnpmShim(): string {
  const shimDir = resolve(process.cwd(), 'tmp/pinflow-preview-registry/bin');
  const shimPath = resolve(shimDir, 'pnpm');

  mkdirSync(shimDir, { recursive: true });
  writeFileSync(
    shimPath,
    '#!/usr/bin/env bash\nexec corepack pnpm "$@"\n',
    'utf-8',
  );
  chmodSync(shimPath, 0o755);

  return shimDir;
}

function ensurePublishUserConfig(registry: string): string {
  const configDir = resolve(process.cwd(), 'tmp/pinflow-preview-registry');
  const userConfigPath = resolve(configDir, '.npmrc');
  const registryHost = new URL(registry).host;

  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    userConfigPath,
    [
      'registry=https://registry.npmjs.org/',
      `//${registryHost}/:_authToken="pinflow-preview"`,
      '',
    ].join('\n'),
    'utf-8',
  );

  return userConfigPath;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const shimDir = ensurePnpmShim();
  const userConfigPath = ensurePublishUserConfig(options.registry);
  const publishPath = `${shimDir}:${process.env['PATH'] ?? ''}`;

  console.log(
    `[pinflow-publish-current] Building and publishing current PinFlow packages to ${options.registry}`,
  );

  runCommand('corepack pnpm run build:all');
  runCommand('corepack pnpm exec nx run-many -t sync-dist');
  runCommand(
    `corepack pnpm exec nx release publish --registry=${options.registry}`,
    {
      PATH: publishPath,
      NPM_CONFIG_USERCONFIG: userConfigPath,
      npm_config_userconfig: userConfigPath,
      NODE_AUTH_TOKEN: 'pinflow-preview',
    },
  );
}

main();
