/**
 * Display helpers for the per-run cost metadata surfaced in the
 * sidebar. Numbers in the run summary are stored verbatim (raw
 * tokens, raw USD, raw ms); these helpers turn them into compact,
 * unit-suffixed strings for the dense card UI.
 */

const COST_UNAVAILABLE = '—';

export function formatTokens(value: number | undefined): string {
  if (value === undefined || value < 0 || !Number.isFinite(value)) {
    return COST_UNAVAILABLE;
  }
  if (value < 1_000) return `${value}`;
  if (value < 1_000_000) {
    return `${trimTrailingZero((value / 1_000).toFixed(1))}k`;
  }
  return `${trimTrailingZero((value / 1_000_000).toFixed(2))}M`;
}

export function formatCostUsd(value: number | undefined): string {
  if (value === undefined || value < 0 || !Number.isFinite(value)) {
    return COST_UNAVAILABLE;
  }
  if (value === 0) return '$0';
  if (value < 0.01) return '~<$0.01';
  return `~$${value.toFixed(2)}`;
}

export function formatDurationMs(value: number | undefined): string {
  if (value === undefined || value < 0 || !Number.isFinite(value)) {
    return COST_UNAVAILABLE;
  }
  if (value < 1_000) return `${Math.round(value)}ms`;

  const totalSeconds = Math.round(value / 1_000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainderMinutes}m`;
}

export function formatProviderModel(
  provider: string | undefined,
  model: string | undefined,
): string {
  const parts = [provider, model].filter(
    (segment): segment is string => Boolean(segment && segment.trim()),
  );
  return parts.join(' · ');
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
