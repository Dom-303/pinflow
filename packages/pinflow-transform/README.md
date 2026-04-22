# @pinflow/transform

AST injection of stable element IDs and bundler plugins for PinFlow.

## Install

```bash
npm install -D @pinflow/transform
```

> **Note:** You probably want a framework adapter instead (`@pinflow/react`, `@pinflow/vue`, `@pinflow/next`, `@pinflow/nuxt`). Those packages wrap this one and handle framework-specific wiring automatically.

## Bundler Support

| Bundler   | Plugin                                 | Parser                   |
| --------- | -------------------------------------- | ------------------------ |
| Vite 5-7  | `@pinflow/transform/plugins/vite`    | Acorn (JS/JSX) or VueSFC |
| Webpack 5 | `@pinflow/transform/plugins/webpack` | Babel (TS/JSX) or VueSFC |
| Turbopack | Self-initializing loader               | Babel (TS/JSX)           |

## Configuration

### Shared Options — Relay

These options apply to the `relay` field across all bundler plugins.

| Option      | Type      | Default           | Description                                              |
| ----------- | --------- | ----------------- | -------------------------------------------------------- |
| `autoStart` | `boolean` | `true`            | Auto-start the relay daemon if not running               |
| `port`      | `number`  | `0` (dynamic)     | Relay server port (only used when starting)              |
| `host`      | `string`  | `'127.0.0.1'`     | Relay server host (only used when starting)              |
| `bodyLimit` | `number`  | `10485760` (10MB) | Max request body size in bytes (only used when starting) |

### Shared Options — Overlay

These options apply when `overlay` is set to an object instead of a boolean.

| Option        | Type                        | Default       | Description                          |
| ------------- | --------------------------- | ------------- | ------------------------------------ |
| `initialMode` | `'collapsed' \| 'expanded'` | `'collapsed'` | Initial display mode for the overlay |
| `debug`       | `boolean`                   | `false`       | Enable debug logging in the overlay  |

---

### Vite Plugin

```ts
import { pinflow } from '@pinflow/transform/plugins/vite';

pinflow({
  include: /\.(jsx|tsx|vue)$/i,
  exclude: /node_modules|\.test\.|\.spec\./i,
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1', bodyLimit: 10485760 },
  overlay: true,
  rootDir: undefined, // Override root directory for .pinflow/ artifacts
});
```

| Option    | Type                              | Default                               | Description                                                                                                                               |
| --------- | --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | `RegExp`                          | `/\.(jsx\|tsx\|vue)$/i`               | File pattern to include                                                                                                                   |
| `exclude` | `RegExp`                          | `/node_modules\|\.test\.\|\.spec\./i` | File pattern to exclude                                                                                                                   |
| `debug`   | `boolean`                         | `false`                               | Enable debug logging                                                                                                                      |
| `relay`   | `RelayPluginOptions`              | See shared                            | Relay server config                                                                                                                       |
| `overlay` | `boolean \| OverlayPluginOptions` | `true`                                | Overlay UI config                                                                                                                         |
| `rootDir` | `string`                          | Vite's `config.root`                  | Override root directory for `.pinflow/` artifacts. |

---

### Webpack Plugin

```ts
import { PinFlowWebpackPlugin } from '@pinflow/transform/plugins/webpack';

new PinFlowWebpackPlugin({
  enabled: true,
  debug: false,
  relay: { autoStart: true, port: 0, host: '127.0.0.1' },
  overlay: true,
});
```

| Option    | Type                              | Default                              | Description          |
| --------- | --------------------------------- | ------------------------------------ | -------------------- |
| `enabled` | `boolean`                         | `true` in dev, `false` in production | Enable the plugin    |
| `debug`   | `boolean`                         | `false`                              | Enable debug logging |
| `relay`   | `RelayPluginOptions`              | See shared                           | Relay server config  |
| `overlay` | `boolean \| OverlayPluginOptions` | `true`                               | Overlay UI config    |

#### Webpack Loader Options

The webpack loader is managed internally by `PinFlowWebpackPlugin`. If you need to configure it directly via `@pinflow/transform/webpack-loader`:

| Option    | Type      | Default | Description           |
| --------- | --------- | ------- | --------------------- |
| `debug`   | `boolean` | `false` | Enable debug logging  |
| `enabled` | `boolean` | `true`  | Enable transformation |

---

### Turbopack Loader

Turbopack has no plugin system, so the loader is self-initializing — it manages relay lifecycle and overlay injection directly.

```ts
// next.config.ts (turbopack)
{
  turbopack: {
    rules: {
      '*.{tsx,jsx}': {
        loaders: [{
          loader: '@pinflow/transform/turbopack-loader',
          options: {
            enabled: true,
            debug: false,
            relay: { autoStart: true, port: 0, host: '127.0.0.1' },
            overlay: false,
            autoInitPath: undefined,
          },
        }],
      },
    },
  },
}
```

| Option         | Type                              | Default                                                 | Description                                                                                                                                                                                                           |
| -------------- | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`      | `boolean`                         | `true`                                                  | Enable transformation                                                                                                                                                                                                 |
| `debug`        | `boolean`                         | `false`                                                 | Enable debug logging                                                                                                                                                                                                  |
| `relay`        | `RelayPluginOptions`              | See shared                                              | Relay server config                                                                                                                                                                                                   |
| `overlay`      | `boolean \| OverlayPluginOptions` | `false`                                                 | Overlay UI config. Defaults to `false` unlike Vite/Webpack — overlay injection must be handled by the meta-framework wrapper.                                                                                         |
| `autoInitPath` | `string`                          | `undefined` (falls back to `@pinflow/next/auto-init`) | Absolute filesystem path to the auto-init module. Used in pnpm monorepos where transformed files don't directly depend on the auto-init package. Meta-framework wrappers should resolve this via `require.resolve()`. |

#### `getInitResult()`

```ts
import { getInitResult } from '@pinflow/transform/plugins/turbopack';

const result = getInitResult();
// { relayHost: string | undefined, relayPort: number | undefined }
```

Returns the relay host and port detected during loader initialization. Available after the first file is processed. Used by meta-framework wrappers (e.g., `@pinflow/next`) to read relay connection info after the loader has initialized.

---

## Subpath Exports

| Subpath                                  | Description                                    |
| ---------------------------------------- | ---------------------------------------------- |
| `@pinflow/transform/plugins/vite`      | Vite plugin (`pinflow`)                        |
| `@pinflow/transform/plugins/webpack`   | Webpack plugin (`PinFlowWebpackPlugin`)        |
| `@pinflow/transform/webpack-loader`    | Webpack loader path (string, for direct use)   |
| `@pinflow/transform/plugins/turbopack` | Turbopack exports (`getInitResult`)            |
| `@pinflow/transform/turbopack-loader`  | Turbopack loader path (string, for direct use) |

## Links

Part of PinFlow, built on the original [Domscribe](https://github.com/patchorbit/domscribe) foundation.

## License

MIT
