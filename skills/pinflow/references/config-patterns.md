# PinFlow Config Patterns

How to edit each framework's bundler config to integrate PinFlow. The 8 framework combinations reduce to 4 distinct integration patterns.

---

## Next.js — HOF Wrapper

**Import to add:**

```typescript
import { withPinFlow } from '@pinflow/next';
```

**How to edit:**

Wrap the existing default export with `withPinFlow()()`. This is a higher-order function that returns a config transformer.

- If the file has `export default <expression>` — change to `export default withPinFlow()(<expression>)`
- If the file has `const config = ...; export default config` — change to `export default withPinFlow()(config)`
- If the file already uses another wrapper (e.g., `withMDX`), compose them: `export default withPinFlow()(withMDX(config))`

**Full example (`next.config.ts`):**

```typescript
import type { NextConfig } from 'next';
import { withPinFlow } from '@pinflow/next';

const nextConfig: NextConfig = {};

export default withPinFlow()(nextConfig);
```

---

## Nuxt — Module Registration

**How to edit:**

Add `'@pinflow/nuxt'` as a string to the `modules` array inside `defineNuxtConfig()`. No import needed — Nuxt resolves the module by package name.

- If no `modules` key exists in the config object, add it: `modules: ['@pinflow/nuxt']`
- If `modules` exists, append `'@pinflow/nuxt'` to the array

**Full example (`nuxt.config.ts`):**

```typescript
export default defineNuxtConfig({
  modules: ['@pinflow/nuxt'],
});
```

---

## Vite Plugin (React / Vue / Other)

Three variants — same pattern, different import path:

| Framework  | Import path                         |
| ---------- | ----------------------------------- |
| react-vite | `@pinflow/react/vite`               |
| vue-vite   | `@pinflow/vue/vite`                 |
| other-vite | `@pinflow/transform/plugins/vite`   |

**Import to add** (use the path from the table above):

```typescript
import { pinflow } from '@pinflow/react/vite';
```

**How to edit:**

Add `pinflow()` to the `plugins` array inside `defineConfig()`. Place it after the framework plugin (e.g., after `react()` or `vue()`).

- If `plugins` exists, append `pinflow()` to the array
- If `plugins` doesn't exist, add `plugins: [pinflow()]`

**Full example — React + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pinflow } from '@pinflow/react/vite';

export default defineConfig({
  plugins: [react(), pinflow()],
});
```

**Full example — Vue + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pinflow } from '@pinflow/vue/vite';

export default defineConfig({
  plugins: [vue(), pinflow()],
});
```

**Full example — Other + Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from 'vite';
import { pinflow } from '@pinflow/transform/plugins/vite';

export default defineConfig({
  plugins: [pinflow()],
});
```

---

## Webpack Plugin + Loader (React / Vue / Other)

Three variants — same pattern, different import path:

| Framework     | Import path                            |
| ------------- | -------------------------------------- |
| react-webpack | `@pinflow/react/webpack`               |
| vue-webpack   | `@pinflow/vue/webpack`                 |
| other-webpack | `@pinflow/transform/plugins/webpack`   |

**Two edits required:**

### Edit 1 — Add the transform loader rule

Add a pre-enforce loader rule to `module.rules`. This must run before other loaders:

```javascript
{
  test: /\.[jt]sx?$/,
  exclude: /node_modules/,
  enforce: 'pre',
  use: [
    {
      loader: '@pinflow/transform/webpack-loader',
      options: { enabled: process.env.NODE_ENV !== 'production' },
    },
  ],
}
```

### Edit 2 — Add the webpack plugin

Add the plugin instance to the `plugins` array. Use the import path from the table above:

```javascript
const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');

// In the plugins array:
new PinFlowWebpackPlugin({
  enabled: process.env.NODE_ENV !== 'production',
  overlay: true,
});
```

**Full example — React + Webpack (`webpack.config.js`):**

```javascript
const { PinFlowWebpackPlugin } = require('@pinflow/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@pinflow/transform/webpack-loader',
            options: { enabled: isDevelopment },
          },
        ],
      },
      // ... existing loaders
    ],
  },
  plugins: [
    new PinFlowWebpackPlugin({
      enabled: isDevelopment,
      overlay: true,
    }),
  ],
};
```

---

## Package Manager Install Commands

| Lockfile                 | Package manager | Install command  |
| ------------------------ | --------------- | ---------------- |
| `pnpm-lock.yaml`         | pnpm            | `pnpm add -D`    |
| `yarn.lock`              | yarn            | `yarn add -D`    |
| `bun.lock` / `bun.lockb` | bun             | `bun add -D`     |
| (none)                   | npm             | `npm install -D` |

## Gitignore

If `.pinflow` is not already listed in `.gitignore`, append:

```
# PinFlow artifacts
.pinflow
```
