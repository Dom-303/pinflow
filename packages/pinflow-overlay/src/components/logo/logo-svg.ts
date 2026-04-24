/**
 * Logo SVG generator
 *
 * Generates SVG markup with unique mask IDs to avoid conflicts
 * when multiple logos are rendered on the same page.
 */

import { html, svg, type TemplateResult } from 'lit';
import {
  CURSOR_PATH,
  CLICK_LINE_PATH,
  SPARKLE_PATHS,
  SIMPLIFIED,
  FULL,
  SIMPLIFIED_THRESHOLD,
} from './logo-paths.js';

export const lightIconAsset = new URL(
  './assets/pinflow-icon-light.png',
  import.meta.url,
).href;

export const darkIconAsset = new URL(
  './assets/pinflow-icon-dark.png',
  import.meta.url,
).href;

export const lightWordmarkAsset = new URL(
  './assets/pinflow-horizontal-light.png',
  import.meta.url,
).href;

export const darkWordmarkAsset = new URL(
  './assets/pinflow-horizontal-dark.png',
  import.meta.url,
).href;

export function getThemeIconAsset(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? darkIconAsset : lightIconAsset;
}

export function getThemeWordmarkAsset(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? darkWordmarkAsset : lightWordmarkAsset;
}

/**
 * Counter for generating unique mask IDs
 */
let instanceCounter = 0;

/**
 * Logo variant type
 */
export type LogoVariant = 'simplified' | 'full' | 'auto';

/**
 * Options for logoSvg function
 */
export interface LogoOptions {
  /**
   * Rendered size in pixels (width and height)
   * Used for both dimensions and auto variant selection
   */
  size: number;

  /**
   * Fill color for the logo
   * @default 'var(--ds-brand-primary)' for theme integration
   */
  color?: string;

  /**
   * CSS class to apply to the SVG element
   */
  className?: string;

  /**
   * Force a specific variant instead of auto-selecting based on size
   * - 'simplified': cursor only (better for small sizes)
   * - 'full': cursor + click line + sparkles
   * - 'auto': select based on size threshold (default)
   */
  variant?: LogoVariant;

  /**
   * Use the warm dimensional PinFlow mark treatment instead of a flat fill.
   * Keeps the logo itself frameless while adding subtle material depth.
   */
  dimensional?: boolean;
}

/**
 * Generate the mask content for simplified variant (cursor only)
 */
function simplifiedMask(maskId: string): TemplateResult {
  return svg`
    <mask id="${maskId}">
      <rect width="64" height="64" fill="white" />
      <g transform="${SIMPLIFIED.cursorTransform}">
        <path d="${CURSOR_PATH}" fill="black" />
      </g>
    </mask>
  `;
}

/**
 * Generate the mask content for full variant (cursor + sparkles)
 */
function fullMask(maskId: string): TemplateResult {
  return svg`
    <mask id="${maskId}">
      <rect width="64" height="64" fill="white" />
      <g transform="${FULL.cursorTransform}">
        <path d="${CURSOR_PATH}" fill="black" />
        <path
          d="${CLICK_LINE_PATH}"
          stroke="black"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
        <path
          d="${SPARKLE_PATHS}"
          stroke="black"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
      </g>
    </mask>
  `;
}

/**
 * Generate a PinFlow vector logo SVG
 *
 * @example
 * ```ts
 * // In a Lit component render method:
 * render() {
 *   return html`
 *     <div class="brand">
 *       ${logoSvg({ size: 24 })}
 *       <span>PinFlow</span>
 *     </div>
 *   `;
 * }
 * ```
 *
 * @example
 * ```ts
 * // Force full variant at small size:
 * ${logoSvg({ size: 24, variant: 'full' })}
 *
 * // Custom color:
 * ${logoSvg({ size: 32, color: '#fafafa' })}
 * ```
 */
export function logoSvg(options: LogoOptions): TemplateResult {
  const {
    size,
    color = 'var(--ds-brand-primary)',
    className,
    variant = 'auto',
    dimensional = false,
  } = options;

  // Generate unique mask ID for this instance
  const instanceId = ++instanceCounter;
  const maskId = `ds-logo-mask-${instanceId}`;
  const gradientId = `ds-logo-gradient-${instanceId}`;
  const shineId = `ds-logo-shine-${instanceId}`;

  // Determine which variant to use
  const useSimplified =
    variant === 'simplified' ||
    (variant === 'auto' && size <= SIMPLIFIED_THRESHOLD);

  // Select paths and mask based on variant
  const dPath = useSimplified ? SIMPLIFIED.dPath : FULL.dPath;
  const maskContent = useSimplified ? simplifiedMask(maskId) : fullMask(maskId);
  const detail = useSimplified ? SIMPLIFIED : FULL;
  const detailContent = useSimplified
    ? svg`
        <path d="${CURSOR_PATH}" fill="#fffaf2" />
      `
    : svg`
        <path d="${CURSOR_PATH}" fill="#fffaf2" />
        <path
          d="${CLICK_LINE_PATH}"
          stroke="#fffaf2"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
        <path
          d="${SPARKLE_PATHS}"
          stroke="#fff3dc"
          stroke-width="${FULL.strokeWidth}"
          stroke-linecap="round"
        />
      `;

  return html`
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 64 64"
      fill="none"
      class="${className || ''}"
      aria-hidden="true"
    >
      <defs>
        ${maskContent}
        ${dimensional
          ? svg`
              <linearGradient
                id="${gradientId}"
                x1="8"
                y1="8"
                x2="58"
                y2="58"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stop-color="#ffe09a" />
                <stop offset="0.32" stop-color="#e8a24f" />
                <stop offset="0.72" stop-color="#b56d2e" />
                <stop offset="1" stop-color="#6f431b" />
              </linearGradient>
              <radialGradient
                id="${shineId}"
                cx="19"
                cy="13"
                r="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stop-color="#fff7d8" stop-opacity="0.78" />
                <stop offset="0.5" stop-color="#ffd891" stop-opacity="0.22" />
                <stop offset="1" stop-color="#ffd891" stop-opacity="0" />
              </radialGradient>
            `
          : null}
      </defs>
      ${dimensional
        ? svg`
            <path d="${dPath}" fill="url(#${gradientId})" />
            <path
              d="${dPath}"
              fill="url(#${shineId})"
              opacity="0.88"
            />
            <g
              transform="${detail.cursorTransform}"
              style="filter: drop-shadow(0 1px 1px rgba(93, 50, 17, 0.28));"
            >
              ${detailContent}
            </g>
          `
        : svg`
            <path d="${dPath}" fill="${color}" mask="url(#${maskId})" />
          `}
    </svg>
  `;
}

/**
 * Reset the instance counter (useful for testing)
 * @internal
 */
export function _resetInstanceCounter(): void {
  instanceCounter = 0;
}
