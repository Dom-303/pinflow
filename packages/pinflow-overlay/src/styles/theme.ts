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
    --ds-brand-primary: #a66f3d;
    --ds-brand-secondary: #8d5d34;
    --ds-brand-light: #d7b38a;

    /* Status colors */
    --ds-success: #10b981;
    --ds-warning: #f59e0b;
    --ds-error: #ef4444;
    --ds-info: var(--ds-brand-primary);

    /* Highlight color (for element picker) */
    --ds-highlight: rgba(166, 111, 61, 0.1);
    --ds-highlight-border: #a66f3d;
    --ds-highlight-glow: 0 0 22px rgba(166, 111, 61, 0.16);

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
    --ds-shell-glow: rgba(215, 190, 160, 0.28);
    --ds-shell-shadow-raise: 0 10px 24px rgba(92, 71, 48, 0.08);
    --ds-shell-shadow-float: 0 -12px 28px rgba(92, 71, 48, 0.08);
    --ds-shell-blur: blur(12px);
    --ds-shell-gradient:
      linear-gradient(
        180deg,
        rgba(255, 252, 247, 0.96) 0%,
        rgba(246, 242, 234, 0.96) 100%
      );
    --ds-panel-surface: rgba(255, 252, 247, 0.82);
    --ds-panel-surface-strong: rgba(255, 253, 250, 0.94);
    --ds-panel-surface-muted: rgba(247, 241, 232, 0.74);
    --ds-panel-border: rgba(231, 223, 210, 0.9);
    --ds-panel-border-strong: rgba(225, 213, 198, 0.95);
    --ds-panel-shadow: 0 14px 34px rgba(92, 71, 48, 0.08);
    --ds-panel-shadow-soft: 0 6px 18px rgba(92, 71, 48, 0.06);
    --ds-pill-surface: rgba(255, 252, 247, 0.9);
    --ds-pill-border: rgba(225, 213, 198, 0.92);
    --ds-card-surface: rgba(255, 253, 249, 0.94);
    --ds-card-surface-strong: rgba(255, 254, 251, 0.97);
    --ds-empty-surface: rgba(255, 253, 249, 0.9);
    --ds-empty-border: rgba(225, 213, 198, 0.92);
    --ds-note-surface: rgba(255, 250, 243, 0.58);
    --ds-status-ready-surface: rgba(255, 252, 247, 0.92);
    --ds-status-ready-border: rgba(225, 213, 198, 0.95);
    --ds-status-running-surface: rgba(255, 245, 227, 0.94);
    --ds-status-running-border: rgba(233, 189, 112, 0.55);
    --ds-status-done-surface: rgba(238, 248, 243, 0.96);
    --ds-status-done-border: rgba(108, 196, 152, 0.42);
    --ds-status-error-surface: rgba(255, 241, 239, 0.96);
    --ds-status-error-border: rgba(239, 68, 68, 0.3);
    --ds-status-archived-surface: rgba(247, 241, 232, 0.88);
    --ds-status-archived-border: rgba(209, 198, 185, 0.9);
    --ds-response-surface: rgba(255, 250, 244, 0.92);
    --ds-response-border: rgba(223, 205, 184, 0.86);
    --ds-chrome-divider: rgba(231, 223, 210, 0.7);
    --ds-picker-scrim: rgba(66, 49, 31, 0.07);
    --ds-picker-spotlight: rgba(247, 222, 192, 0.22);
    --ds-tab-shadow: -10px 16px 28px rgba(92, 71, 48, 0.18);
    --ds-tooltip-surface: rgba(255, 253, 249, 0.97);

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
    --ds-sidebar-width: 340px;
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

  :host([theme='dark']) {
    /* Accent Scale - warm logo-gold on black */
    --ds-cyan-50: #211509;
    --ds-cyan-100: #2d1b0d;
    --ds-cyan-200: #473018;
    --ds-cyan-300: #6f4a24;
    --ds-cyan-400: #9a6732;
    --ds-cyan-500: #c98540;
    --ds-cyan-600: #e3a358;
    --ds-cyan-700: #f2be76;
    --ds-cyan-800: #ffd99c;
    --ds-cyan-900: #ffecc9;

    /* Neutral Scale - near-black editorial surfaces */
    --ds-neutral-50: #f8f3ea;
    --ds-neutral-100: #dfd1bd;
    --ds-neutral-200: #bba892;
    --ds-neutral-300: #9a8166;
    --ds-neutral-400: #765f49;
    --ds-neutral-500: #574333;
    --ds-neutral-600: #3c3026;
    --ds-neutral-700: #27211b;
    --ds-neutral-800: #17130f;
    --ds-neutral-900: #0d0b09;
    --ds-neutral-950: #050403;

    /* Backgrounds */
    --ds-bg-app: #050403;
    --ds-bg-primary: #0b0907;
    --ds-bg-secondary: rgba(12, 10, 8, 0.96);
    --ds-bg-tertiary: #100d0a;
    --ds-bg-hover: #18120d;
    --ds-bg-active: #20150d;

    /* Text colors */
    --ds-text-primary: #fff7eb;
    --ds-text-secondary: #c7b9a9;
    --ds-text-tertiary: #7c6e60;
    --ds-text-accent: #ad7642;

    /* Brand colors */
    --ds-brand-primary: #9a6732;
    --ds-brand-secondary: #b98549;
    --ds-brand-light: #c99c68;

    /* Status colors */
    --ds-success: #34d399;
    --ds-warning: #fbbf24;
    --ds-error: #f87171;
    --ds-info: var(--ds-brand-secondary);

    /* Highlight color */
    --ds-highlight: rgba(154, 103, 50, 0.1);
    --ds-highlight-border: #9a6732;
    --ds-highlight-glow: 0 0 22px rgba(154, 103, 50, 0.16);

    /* Border colors */
    --ds-border-primary: rgba(54, 41, 31, 0.92);
    --ds-border-secondary: rgba(38, 30, 24, 0.9);
    --ds-border-focus: #b98549;

    /* Dark shell tokens */
    --ds-shell-surface: rgba(5, 4, 3, 0.94);
    --ds-shell-surface-soft: rgba(7, 6, 5, 0.88);
    --ds-shell-surface-quiet: rgba(10, 8, 7, 0.84);
    --ds-shell-surface-strong: rgba(12, 10, 8, 0.98);
    --ds-shell-border-soft: rgba(46, 35, 26, 0.68);
    --ds-shell-border-muted: rgba(38, 30, 24, 0.62);
    --ds-shell-glow: rgba(154, 103, 50, 0.045);
    --ds-shell-shadow-raise: 0 16px 38px rgba(0, 0, 0, 0.34);
    --ds-shell-shadow-float: 0 -14px 34px rgba(0, 0, 0, 0.32);
    --ds-shell-blur: blur(14px);
    --ds-shell-gradient:
      linear-gradient(
        180deg,
        rgba(7, 6, 5, 0.995) 0%,
        rgba(2, 2, 1, 0.995) 100%
      );
    --ds-panel-surface: rgba(9, 8, 7, 0.94);
    --ds-panel-surface-strong: rgba(13, 11, 9, 0.98);
    --ds-panel-surface-muted: rgba(8, 7, 6, 0.92);
    --ds-panel-border: rgba(48, 36, 27, 0.68);
    --ds-panel-border-strong: rgba(69, 49, 33, 0.74);
    --ds-panel-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
    --ds-panel-shadow-soft: 0 8px 18px rgba(0, 0, 0, 0.22);
    --ds-pill-surface: rgba(13, 11, 9, 0.94);
    --ds-pill-border: rgba(50, 38, 29, 0.72);
    --ds-card-surface:
      linear-gradient(
        180deg,
        rgba(12, 10, 8, 0.98) 0%,
        rgba(5, 4, 3, 0.98) 100%
      );
    --ds-card-surface-strong:
      linear-gradient(
        180deg,
        rgba(14, 12, 10, 0.99) 0%,
        rgba(5, 4, 3, 0.99) 100%
      );
    --ds-empty-surface:
      linear-gradient(
        180deg,
        rgba(12, 10, 8, 0.96) 0%,
        rgba(5, 4, 3, 0.95) 100%
      );
    --ds-empty-border: rgba(50, 38, 29, 0.62);
    --ds-note-surface: rgba(18, 14, 10, 0.5);
    --ds-status-ready-surface: rgba(12, 10, 8, 0.92);
    --ds-status-ready-border: rgba(50, 38, 29, 0.68);
    --ds-status-running-surface: rgba(24, 17, 11, 0.78);
    --ds-status-running-border: rgba(154, 103, 50, 0.28);
    --ds-status-done-surface: rgba(29, 55, 47, 0.88);
    --ds-status-done-border: rgba(52, 211, 153, 0.34);
    --ds-status-error-surface: rgba(72, 33, 33, 0.88);
    --ds-status-error-border: rgba(248, 113, 113, 0.38);
    --ds-status-archived-surface: rgba(12, 10, 8, 0.88);
    --ds-status-archived-border: rgba(48, 36, 27, 0.58);
    --ds-response-surface:
      linear-gradient(
        180deg,
        rgba(18, 13, 9, 0.94) 0%,
        rgba(8, 7, 6, 0.94) 100%
      );
    --ds-response-border: rgba(50, 38, 29, 0.64);
    --ds-chrome-divider: rgba(48, 36, 27, 0.56);
    --ds-picker-scrim: rgba(3, 2, 1, 0.34);
    --ds-picker-spotlight: rgba(154, 103, 50, 0.06);
    --ds-tab-shadow: -10px 18px 34px rgba(0, 0, 0, 0.34);
    --ds-tooltip-surface:
      linear-gradient(
        180deg,
        rgba(17, 14, 11, 0.98) 0%,
        rgba(7, 6, 5, 0.98) 100%
      );

    /* Shadows */
    --ds-shadow-sm: 0 6px 14px rgba(0, 0, 0, 0.18);
    --ds-shadow-md: 0 12px 28px rgba(0, 0, 0, 0.22);
    --ds-shadow-lg: 0 22px 48px rgba(0, 0, 0, 0.28);
    --ds-shadow-xl: 0 30px 64px rgba(0, 0, 0, 0.34);
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
