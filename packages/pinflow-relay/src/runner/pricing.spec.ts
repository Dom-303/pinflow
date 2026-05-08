import { describe, expect, it } from 'vitest';

import {
  estimateCostUsd,
  getBlendedRate,
  isKnownPricingModel,
  MODEL_BLENDED_USD_PER_MILLION_TOKENS,
} from './pricing.js';

describe('isKnownPricingModel', () => {
  it('returns true for a model present in the rate map', () => {
    expect(isKnownPricingModel('gpt-5.5')).toBe(true);
  });

  it('returns false for an unknown model string', () => {
    expect(isKnownPricingModel('llama-99-xl')).toBe(false);
  });
});

describe('getBlendedRate', () => {
  it('returns the configured rate for a known model', () => {
    expect(getBlendedRate('gpt-5.5')).toBe(
      MODEL_BLENDED_USD_PER_MILLION_TOKENS['gpt-5.5'],
    );
  });

  it('returns undefined for an unknown model', () => {
    expect(getBlendedRate('llama-99-xl')).toBeUndefined();
  });

  it('returns undefined when no model is provided', () => {
    expect(getBlendedRate(undefined)).toBeUndefined();
  });
});

describe('estimateCostUsd', () => {
  it('computes a rounded USD cost for a known model and positive token count', () => {
    const cost = estimateCostUsd({ model: 'gpt-5.5', totalTokens: 1_000_000 });

    expect(cost).toBe(MODEL_BLENDED_USD_PER_MILLION_TOKENS['gpt-5.5']);
  });

  it('returns 0 for a known model with a zero token count (run was free)', () => {
    expect(estimateCostUsd({ model: 'gpt-5.5', totalTokens: 0 })).toBe(0);
  });

  it('returns undefined when the model is unknown', () => {
    expect(
      estimateCostUsd({ model: 'llama-99-xl', totalTokens: 1000 }),
    ).toBeUndefined();
  });

  it('returns undefined when token count is missing', () => {
    expect(estimateCostUsd({ model: 'gpt-5.5' })).toBeUndefined();
  });

  it('returns undefined for a negative token count', () => {
    expect(
      estimateCostUsd({ model: 'gpt-5.5', totalTokens: -5 }),
    ).toBeUndefined();
  });

  it('rounds the cost to four decimal places to avoid float artefacts in JSON', () => {
    const cost = estimateCostUsd({ model: 'gpt-5.5', totalTokens: 12_345 });

    expect(cost).toBeTypeOf('number');
    const decimals = String(cost ?? 0).split('.')[1] ?? '';
    expect(decimals.length).toBeLessThanOrEqual(4);
  });
});
