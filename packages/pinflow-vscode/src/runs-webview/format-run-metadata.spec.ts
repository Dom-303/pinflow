import { describe, expect, it } from 'vitest';

import {
  formatCostUsd,
  formatDurationMs,
  formatProviderModel,
  formatTokens,
} from './format-run-metadata.js';

describe('formatTokens', () => {
  it('renders sub-thousand counts as a plain integer', () => {
    expect(formatTokens(482)).toBe('482');
  });

  it('renders thousands with a single decimal and a "k" suffix', () => {
    expect(formatTokens(12_400)).toBe('12.4k');
  });

  it('drops a trailing zero from the decimal place', () => {
    expect(formatTokens(12_000)).toBe('12k');
  });

  it('renders millions with two decimals and an "M" suffix', () => {
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });

  it('returns the placeholder for undefined or negative values', () => {
    expect(formatTokens(undefined)).toBe('—');
    expect(formatTokens(-5)).toBe('—');
  });
});

describe('formatCostUsd', () => {
  it('renders a typical cost with a tilde prefix to flag the estimate', () => {
    expect(formatCostUsd(0.18)).toBe('~$0.18');
  });

  it('renders a zero-cost run as a flat $0 (run was free, not unknown)', () => {
    expect(formatCostUsd(0)).toBe('$0');
  });

  it('renders sub-cent costs without producing $0.00 noise', () => {
    expect(formatCostUsd(0.001)).toBe('~<$0.01');
  });

  it('returns the placeholder for undefined values', () => {
    expect(formatCostUsd(undefined)).toBe('—');
  });
});

describe('formatDurationMs', () => {
  it('renders sub-second runs in milliseconds', () => {
    expect(formatDurationMs(450)).toBe('450ms');
  });

  it('renders sub-minute runs in seconds', () => {
    expect(formatDurationMs(47_000)).toBe('47s');
  });

  it('renders minute-scale runs as "m s"', () => {
    expect(formatDurationMs(83_000)).toBe('1m 23s');
  });

  it('omits the second component when minutes are clean', () => {
    expect(formatDurationMs(120_000)).toBe('2m');
  });

  it('renders hour-scale runs as "h m"', () => {
    expect(formatDurationMs(3_900_000)).toBe('1h 5m');
  });

  it('returns the placeholder for undefined values', () => {
    expect(formatDurationMs(undefined)).toBe('—');
  });
});

describe('formatProviderModel', () => {
  it('joins provider and model with a middle dot', () => {
    expect(formatProviderModel('codex', 'gpt-5.5')).toBe('codex · gpt-5.5');
  });

  it('returns just the model when the provider is missing', () => {
    expect(formatProviderModel(undefined, 'gpt-5.5')).toBe('gpt-5.5');
  });

  it('returns just the provider when the model is missing', () => {
    expect(formatProviderModel('codex', undefined)).toBe('codex');
  });

  it('returns an empty string when both are missing (caller decides on placeholder)', () => {
    expect(formatProviderModel(undefined, undefined)).toBe('');
  });
});
