/**
 * Theme - CSS variables and design tokens for the overlay
 *
 * PinFlow overlay design system
 * Primary: warm paper glow accents
 * Foundation: soft editorial neutrals for a calm workspace
 */

import { css } from 'lit';

/**
 * CSS custom properties for theming
 */
export const themeStyles = css`
  :host {
    /* ========================================
     * PINFLOW OVERLAY DESIGN SYSTEM
     * ======================================== */

    /* Accent Scale - kept on existing token names for compatibility */
    --ds-cyan-50: #fff8ef;
    --ds-cyan-100: #f9ead8;
    --ds-cyan-200: #f1d9b8;
    --ds-cyan-300: #e7c193;
    --ds-cyan-400: #d9a976;
    --ds-cyan-500: #c79564;
    --ds-cyan-600: #b78253;
    --ds-cyan-700: #9b6940;
    --ds-cyan-800: #7a5132;
    --ds-cyan-900: #5b3d28;

    /* Neutral Scale - Warm paper and taupe */
    --ds-neutral-50: #fffdfa;
    --ds-neutral-100: #faf6ef;
    --ds-neutral-200: #efe7dc;
    --ds-neutral-300: #e1d5c6;
    --ds-neutral-400: #b6a796;
    --ds-neutral-500: #8d8175;
    --ds-neutral-600: #6f6458;
    --ds-neutral-700: #564c44;
    --ds-neutral-800: #413932;
    --ds-neutral-900: #312b25;
    --ds-neutral-950: #211c17;

    /* ========================================
     * SEMANTIC TOKENS
     * ======================================== */

    /* Backgrounds - warm paper surfaces */
    --ds-bg-app: #f3efe8;
    --ds-bg-primary: #f7f3ec;
    --ds-bg-secondary: rgba(255, 251, 244, 0.86);
    --ds-bg-tertiary: #fffdfa;
    --ds-bg-hover: #f3ede4;
    --ds-bg-active: #ece4d8;

    /* Text colors */
    --ds-text-primary: #312b25;
    --ds-text-secondary: #6f6458;
    --ds-text-tertiary: #8d8175;
    --ds-text-accent: #b27d4f;

    /* Brand colors */
    --ds-brand-primary: #c79564;
    --ds-brand-secondary: #b78253;
    --ds-brand-light: #e1bf98;

    /* Status colors */
    --ds-success: #10b981;
    --ds-warning: #f59e0b;
    --ds-error: #ef4444;
    --ds-info: var(--ds-brand-primary);

    /* Highlight color (for element picker) */
    --ds-highlight: rgba(199, 149, 100, 0.14);
    --ds-highlight-border: #c79564;
    --ds-highlight-glow: 0 0 26px rgba(215, 178, 127, 0.22);

    /* Border colors */
    --ds-border-primary: #e7dfd2;
    --ds-border-secondary: #efe7dc;
    --ds-border-focus: #c79564;

    /* Paper Glow shell tokens */
    --ds-shell-surface: rgba(255, 251, 244, 0.84);
    --ds-shell-surface-soft: rgba(255, 251, 244, 0.72);
    --ds-shell-surface-quiet: rgba(255, 253, 250, 0.72);
    --ds-shell-surface-strong: rgba(255, 253, 250, 0.92);
    --ds-shell-border-soft: rgba(231, 223, 210, 0.9);
    --ds-shell-border-muted: rgba(239, 231, 220, 0.86);
    --ds-shell-glow: rgba(245, 222, 192, 0.72);
    --ds-shell-shadow-raise: 0 10px 24px rgba(92, 71, 48, 0.08);
    --ds-shell-shadow-float: 0 -12px 28px rgba(92, 71, 48, 0.08);
    --ds-shell-blur: blur(12px);
    --ds-shell-gradient:
      linear-gradient(
        180deg,
        rgba(255, 252, 247, 0.96) 0%,
        rgba(246, 242, 234, 0.96) 100%
      );

    /* Shadows */
    --ds-shadow-sm: 0 4px 10px rgba(92, 71, 48, 0.05);
    --ds-shadow-md: 0 10px 24px rgba(92, 71, 48, 0.08);
    --ds-shadow-lg: 0 18px 40px rgba(92, 71, 48, 0.1);
    --ds-shadow-xl: 0 28px 60px rgba(92, 71, 48, 0.12);

    /* Spacing */
    --ds-space-xs: 4px;
    --ds-space-sm: 8px;
    --ds-space-md: 12px;
    --ds-space-lg: 16px;
    --ds-space-xl: 24px;
    --ds-space-2xl: 32px;

    /* Border radius */
    --ds-radius-sm: 8px;
    --ds-radius-md: 12px;
    --ds-radius-lg: 18px;
    --ds-radius-full: 9999px;

    /* Typography */
    --ds-font-family:
      'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    --ds-font-mono:
      'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Fira Code', monospace;

    --ds-font-size-xs: 10px;
    --ds-font-size-sm: 12px;
    --ds-font-size-md: 14px;
    --ds-font-size-lg: 16px;
    --ds-font-size-xl: 18px;

    --ds-line-height: 1.5;
    --ds-font-weight-normal: 400;
    --ds-font-weight-medium: 500;
    --ds-font-weight-semibold: 600;

    /* Layout */
    --ds-sidebar-width: 360px;
    --ds-tab-width: 32px;
    --ds-header-height: 48px;

    /* Z-index layers */
    --ds-z-overlay: 2147483646;
    --ds-z-picker: 2147483647;

    /* Transitions */
    --ds-transition-fast: 150ms ease;
    --ds-transition-normal: 250ms ease;
    --ds-transition-slow: 350ms ease;
  }
`;

/**
 * Common utility styles
 */
export const utilityStyles = css`
  /* Reset */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* Typography */
  .text-xs {
    font-size: var(--ds-font-size-xs);
  }
  .text-sm {
    font-size: var(--ds-font-size-sm);
  }
  .text-md {
    font-size: var(--ds-font-size-md);
  }
  .text-lg {
    font-size: var(--ds-font-size-lg);
  }

  .text-primary {
    color: var(--ds-text-primary);
  }
  .text-secondary {
    color: var(--ds-text-secondary);
  }
  .text-accent {
    color: var(--ds-text-accent);
  }

  .font-mono {
    font-family: var(--ds-font-mono);
  }
  .font-medium {
    font-weight: var(--ds-font-weight-medium);
  }
  .font-semibold {
    font-weight: var(--ds-font-weight-semibold);
  }

  /* Spacing */
  .p-xs {
    padding: var(--ds-space-xs);
  }
  .p-sm {
    padding: var(--ds-space-sm);
  }
  .p-md {
    padding: var(--ds-space-md);
  }
  .p-lg {
    padding: var(--ds-space-lg);
  }

  /* Flex utilities */
  .flex {
    display: flex;
  }
  .flex-col {
    flex-direction: column;
  }
  .items-center {
    align-items: center;
  }
  .justify-between {
    justify-content: space-between;
  }
  .gap-sm {
    gap: var(--ds-space-sm);
  }
  .gap-md {
    gap: var(--ds-space-md);
  }

  /* Visibility */
  .hidden {
    display: none !important;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
