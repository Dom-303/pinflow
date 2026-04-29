/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';

const mockStore = {
  submitAnnotation: vi.fn().mockResolvedValue(undefined),
  cancelInlineComment: vi.fn(),
};

const mockState = {
  theme: 'light' as const,
  relayConnected: true,
  inlineCommentDraft: {
    position: { x: 180, y: 220 },
    anchorRect: {
      x: 120,
      y: 160,
      left: 120,
      top: 160,
      right: 280,
      bottom: 208,
      width: 160,
      height: 48,
    },
    pickerMode: 'element' as const,
  },
};

vi.mock('../core/store-controller.js', () => ({
  StoreController: class {
    store = mockStore;
    state = mockState;
  },
}));

import './ds-inline-comment-composer.js';

describe('DsInlineCommentComposer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockStore.submitAnnotation.mockClear();
    mockStore.cancelInlineComment.mockClear();
    mockState.inlineCommentDraft = {
      position: { x: 180, y: 220 },
      anchorRect: {
        x: 120,
        y: 160,
        left: 120,
        top: 160,
        right: 280,
        bottom: 208,
        width: 160,
        height: 48,
      },
      pickerMode: 'element',
    };
    mockState.relayConnected = true;
  });

  it('submits the inline comment with Enter and keeps Shift+Enter for multiline text', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-inline-comment-composer></ds-inline-comment-composer>`,
      host,
    );

    const composer = host.querySelector(
      'ds-inline-comment-composer',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await composer.updateComplete;

    const textarea = composer.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'Bitte direkter kommentieren';
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }),
    );

    await composer.updateComplete;

    expect(mockStore.submitAnnotation).toHaveBeenCalledWith(
      'Bitte direkter kommentieren',
    );
    expect(mockStore.cancelInlineComment).not.toHaveBeenCalled();
  });

  it('cancels the inline comment with Escape', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-inline-comment-composer></ds-inline-comment-composer>`,
      host,
    );

    const composer = host.querySelector(
      'ds-inline-comment-composer',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await composer.updateComplete;

    const textarea = composer.shadowRoot.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
      }),
    );

    expect(mockStore.cancelInlineComment).toHaveBeenCalledTimes(1);
  });

  it('places the composer near the click without overflowing the viewport', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(320);
    mockState.inlineCommentDraft = {
      ...mockState.inlineCommentDraft,
      position: { x: 350, y: 300 },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      html`<ds-inline-comment-composer></ds-inline-comment-composer>`,
      host,
    );

    const composer = host.querySelector(
      'ds-inline-comment-composer',
    ) as HTMLElement & {
      shadowRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    await composer.updateComplete;

    const surface = composer.shadowRoot.querySelector(
      '.inline-composer',
    ) as HTMLElement;

    expect(surface.style.left).toBe('16px');
    expect(surface.style.top).toBe('104px');
  });
});
