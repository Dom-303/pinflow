/**
 * Golden-path privacy and serialization tests for runtime context capture.
 *
 * These tests use the real ContextCapturer, PropsCapturer, StateCapturer, and
 * serializer stack with a small fake adapter. They verify the Phase 1 contract
 * agents depend on: props/state are useful, JSON-safe, bounded, and redacted by
 * default.
 *
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest';
import { ContextCapturer } from './context-capturer.js';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';

function createAdapter(data: {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
}): FrameworkAdapter {
  const component = { type: 'FixtureComponent' };

  return {
    name: 'react',
    version: '18.2.0',
    getComponentInstance: () => component,
    captureProps: () => data.props,
    captureState: () => data.state,
    getSerializationHints: () => ({
      skipKeys: new Set(['_owner']),
      skipKeyPrefixes: ['__react'],
    }),
  };
}

describe('ContextCapturer privacy golden path', () => {
  it('captures bounded JSON-safe redacted props and state by default', async () => {
    const circularState: Record<string, unknown> = {
      sessionToken: 'secret-token',
      history: Array.from({ length: 30 }, (_, index) => index),
    };
    circularState['self'] = circularState;

    const adapter = createAdapter({
      props: {
        email: 'user@example.com',
        password: 'plain-text-password',
        onClick: () => 'do not serialize',
        _owner: { internal: true },
        __reactFiber$fixture: { internal: true },
        longLabel: 'This label is intentionally longer than the limit.',
      },
      state: circularState,
    });

    const capturer = new ContextCapturer({
      adapter,
      serialization: {
        maxArrayLength: 3,
        maxStringLength: 12,
        maxProperties: 10,
        maxTotalBytes: 10_000,
      },
    });

    const context = await capturer.captureForElement(
      document.createElement('button'),
    );

    expect(context).toEqual({
      componentProps: {
        email: '[REDACTED]',
        password: '[REDACTED]',
        longLabel: 'This label i... [truncated]',
      },
      componentState: {
        sessionToken: '[REDACTED]',
        history: [0, 1, 2, { __truncated: true, originalLength: 30 }],
        self: '[Circular Reference]',
      },
    });
    expect(() => JSON.stringify(context)).not.toThrow();
  });
});
