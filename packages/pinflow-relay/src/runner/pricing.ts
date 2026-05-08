/**
 * Blended USD-per-million-token rates per agent model.
 *
 * Codex emits only an aggregate `tokens used` count, not an
 * input/output split. Storing a single blended rate (assumed 70 %
 * input / 30 % output for typical coding tasks) lets us produce a
 * cost estimate from that one number. Anything we surface to the
 * user must be labelled as approximate.
 *
 * @remarks Rates are a snapshot from public price sheets as of
 * 2026-05. They will drift; treat the cost as a directional figure,
 * not an invoice.
 */
export const MODEL_BLENDED_USD_PER_MILLION_TOKENS = {
  'gpt-5': 3.875,
  'gpt-5.5': 3.875,
  'gpt-5-mini': 0.775,
  'gpt-5-nano': 0.155,
  'claude-opus-4-7': 33,
  'claude-opus-4-6': 33,
  'claude-sonnet-4-6': 6.6,
  'claude-sonnet-4-5': 6.6,
  'claude-haiku-4-5': 1.76,
} as const;

export type KnownPricingModel = keyof typeof MODEL_BLENDED_USD_PER_MILLION_TOKENS;

export function isKnownPricingModel(model: string): model is KnownPricingModel {
  return model in MODEL_BLENDED_USD_PER_MILLION_TOKENS;
}

/**
 * Returns the blended USD-per-million-tokens rate for a model, or
 * `undefined` when the model is unknown. UI callers should render a
 * neutral placeholder for unknown models rather than a guessed cost.
 */
export function getBlendedRate(model: string | undefined): number | undefined {
  if (!model) return undefined;
  return isKnownPricingModel(model)
    ? MODEL_BLENDED_USD_PER_MILLION_TOKENS[model]
    : undefined;
}

export interface EstimateCostInput {
  model?: string;
  totalTokens?: number;
}

/**
 * Returns an estimated USD cost for a run, or `undefined` when
 * either the model or the token count is missing/unknown.
 *
 * The result is rounded to four decimal places so JSON summaries
 * stay free of floating-point artefacts. A `0` token count yields
 * `0`, not `undefined`, so a known-but-empty run is still cheap and
 * displayed as such.
 */
export function estimateCostUsd(
  input: EstimateCostInput,
): number | undefined {
  const rate = getBlendedRate(input.model);
  if (rate === undefined) return undefined;
  if (input.totalTokens === undefined) return undefined;
  if (input.totalTokens < 0) return undefined;

  const rawCost = (input.totalTokens / 1_000_000) * rate;
  return Math.round(rawCost * 10_000) / 10_000;
}
