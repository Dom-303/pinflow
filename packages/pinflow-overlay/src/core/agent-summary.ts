import type { Annotation } from '@pinflow/core';
import type { DispatchChannel } from './dispatch-config.js';
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
): AnnotationAgentSummary {
  const status = annotation.metadata.status;
  const verification = annotation.verification;
  const statusDetail =
    status === 'failed' && annotation.metadata.errorDetails
      ? `Fehler: ${annotation.metadata.errorDetails}`
      : getStatusDetail(status);
  const verificationLabel = verification
    ? getVerificationLabel(verification.status)
    : undefined;
  const verificationDetail = verification?.reasons.length
    ? verification.reasons.map(formatReason).join(', ')
    : undefined;

  return {
    channelLabel: getAnnotationChannelLabel(annotation),
    statusLabel: getStatusLabel(status),
    statusDetail,
    responseExcerpt: getResponseExcerpt(annotation.agentResponse?.message),
    verificationLabel,
    verificationDetail,
    nextAction: getNextAction(annotation),
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
    return {
      title: 'Batch laeuft',
      copy: `1 Batch laeuft bei ${getChannelLabel(input.latestBatchChannel)}.`,
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

function getChannelLabel(channel: DispatchChannel | undefined): string {
  if (channel === 'codex') return 'Codex';
  if (channel === 'claude') return 'Claude';
  if (channel === 'queue_only') return 'Queue';
  return 'dem aktuellen Agent';
}

function getStatusLabel(status: string): string {
  if (status === 'queued') return 'Wartet auf Freigabe';
  if (status === 'claimed') return 'Von Agent uebernommen';
  if (status === 'processing') return 'Agent arbeitet daran';
  if (status === 'processed') return 'Antwort liegt vor';
  if (status === 'failed') return 'Fehler';
  if (status === 'archived') return 'Archiviert';
  return status;
}

function getStatusDetail(status: string): string | undefined {
  if (status === 'claimed') return 'Ein Agent hat die Aufgabe uebernommen.';
  if (status === 'processing') return 'Der Agent arbeitet gerade daran.';
  if (status === 'processed') return 'Die Agent-Antwort ist gespeichert.';
  return undefined;
}

function getVerificationLabel(status: string): string {
  if (status === 'verified') return 'Aenderung geprueft';
  if (status === 'uncertain') return 'Pruefung unsicher';
  if (status === 'unable') return 'Pruefung nicht moeglich';
  return status;
}

function getNextAction(annotation: Annotation): string {
  const status = annotation.metadata.status;

  if (status === 'queued') return 'Freigeben oder sammeln';
  if (status === 'claimed') return 'Warten, Agent hat uebernommen';
  if (status === 'processing') return 'Warten, Agent arbeitet';
  if (status === 'failed') return 'Fehler ansehen oder erneut senden';
  if (status === 'archived') return 'Keine Aktion noetig';
  if (status === 'processed') {
    if (annotation.verification?.status === 'verified') {
      return 'Archivieren oder weiterarbeiten';
    }
    if (annotation.verification?.status === 'uncertain') {
      return 'Erneut pruefen oder Quelle oeffnen';
    }
    if (annotation.verification?.status === 'unable') {
      return 'Fehler ansehen oder erneut pruefen';
    }
    return 'Pruefen';
  }

  return 'Status pruefen';
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
