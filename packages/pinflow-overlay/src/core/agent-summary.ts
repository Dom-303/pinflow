import type { Annotation } from '@pinflow/core';
import type { DispatchChannel } from './dispatch-config.js';
import { getAnnotationDispatchView } from './dispatch-config.js';
import type { DispatchBatchStatus } from './types.js';

export interface AnnotationAgentSummary {
  channelLabel?: string;
  statusLabel: string;
  statusDetail?: string;
  responseExcerpt?: string;
  verificationLabel?: string;
  verificationDetail?: string;
  nextAction: string;
}

export interface WorkflowAgentAttentionInput {
  annotations: Annotation[];
  awaitingConfirmationCount: number;
  inFlightCount: number;
  latestBatchChannel?: DispatchChannel;
  latestBatchStatus?: DispatchBatchStatus;
}

export interface WorkflowAgentAttention {
  title: string;
  copy: string;
}

export function getAnnotationAgentSummary(
  annotation: Annotation,
  options: {
    releasedAnnotationIds?: string[];
    awaitingConfirmationIds?: string[];
  } = {},
): AnnotationAgentSummary {
  const dispatchView = getAnnotationDispatchView(annotation, {
    releasedAnnotationIds: options.releasedAnnotationIds ?? [],
    awaitingConfirmationIds: options.awaitingConfirmationIds ?? [],
  });
  const verification = annotation.verification;
  const verificationLabel = verification
    ? getVerificationLabel(verification.status)
    : undefined;
  const verificationDetail = verification?.reasons.length
    ? verification.reasons.map(formatReason).join(', ')
    : undefined;

  return {
    channelLabel: getAnnotationChannelLabel(annotation),
    statusLabel: dispatchView.statusLabel,
    statusDetail: dispatchView.statusDetail,
    responseExcerpt: getResponseExcerpt(annotation.agentResponse?.message),
    verificationLabel,
    verificationDetail,
    nextAction: dispatchView.nextAction,
  };
}

export function getWorkflowAgentAttention(
  input: WorkflowAgentAttentionInput,
): WorkflowAgentAttention | null {
  const failedCount = input.annotations.filter(
    (annotation) => annotation.metadata.status === 'failed',
  ).length;

  if (failedCount > 0) {
    return {
      title: 'Fehler brauchen Aufmerksamkeit',
      copy: `${failedCount} Aufgabe${failedCount === 1 ? '' : 'n'} ${
        failedCount === 1 ? 'ist' : 'sind'
      } fehlgeschlagen. Fehler in der Annotation pruefen.`,
    };
  }

  if (input.awaitingConfirmationCount > 0) {
    return {
      title: 'Freigabe wartet',
      copy: `${input.awaitingConfirmationCount} Aufgabe${
        input.awaitingConfirmationCount === 1 ? '' : 'n'
      } warten auf Freigabe.`,
    };
  }

  if (input.inFlightCount > 0 || input.latestBatchStatus === 'running') {
    const channelLabel = getChannelLabel(input.latestBatchChannel);
    return {
      title: 'Lauf gestartet',
      copy: `1 Lauf ist gestartet${channelLabel ? ` bei ${channelLabel}` : ''}.`,
    };
  }

  return null;
}

function getAnnotationChannelLabel(annotation: Annotation): string | undefined {
  const target = annotation.dispatch?.target;
  if (!target) return undefined;
  return target.label?.trim() || getProviderLabel(target.provider);
}

function getProviderLabel(provider: string): string {
  if (provider === 'codex') return 'Codex';
  if (provider === 'claude') return 'Claude';
  if (provider === 'manual') return 'Manual';
  if (provider === 'other') return 'Other';
  return provider;
}

function getChannelLabel(
  channel: DispatchChannel | undefined,
): string | undefined {
  if (channel === 'codex') return 'Codex';
  if (channel === 'claude') return 'Claude';
  if (channel === 'queue_only') return 'der Warteliste';
  return undefined;
}

function getVerificationLabel(status: string): string {
  if (status === 'verified') return 'Aenderung geprueft';
  if (status === 'uncertain') return 'Pruefung unsicher';
  if (status === 'unable') return 'Pruefung nicht moeglich';
  return status;
}

function getResponseExcerpt(message: string | undefined): string | undefined {
  const normalized = message?.trim().replace(/\s+/g, ' ');
  if (!normalized) return undefined;
  if (normalized.length <= 140) return normalized;
  return `${normalized.slice(0, 137)}...`;
}

function formatReason(reason: string): string {
  return reason
    .split('_')
    .map((part) => {
      if (part === 'browser') return 'Browser';
      if (part === 'not') return 'nicht';
      if (part === 'connected') return 'verbunden';
      if (part === 'manifest') return 'Manifest';
      if (part === 'stale') return 'veraltet';
      if (part === 'runtime') return 'Runtime';
      if (part === 'timeout') return 'Timeout';
      if (part === 'source') return 'Source';
      if (part === 'line') return 'Zeile';
      if (part === 'found') return 'gefunden';
      return part;
    })
    .join(' ');
}
