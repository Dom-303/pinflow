#!/usr/bin/env node
import { execSync } from 'node:child_process';

const env = {
  ...process.env,
  FORCE_COLOR: '0',
  NX_ISOLATE_PLUGINS: process.env.NX_ISOLATE_PLUGINS ?? 'false',
  NX_NO_CLOUD: process.env.NX_NO_CLOUD ?? 'true',
};

const commands = [
  'corepack pnpm run release:check:docs',
  'corepack pnpm run build:all',
];

for (const command of commands) {
  console.log(`\n[release-check] ${command}`);
  execSync(command, {
    stdio: 'inherit',
    shell: true,
    env,
  });
}
