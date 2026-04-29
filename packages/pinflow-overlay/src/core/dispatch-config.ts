import type { Annotation } from '@pinflow/core';

export type DispatchChannel = 'auto' | 'codex' | 'claude' | 'queue_only';
export type DispatchMode = 'manual' | 'immediate' | 'threshold';
export type DispatchContinuationMode = 'manual' | 'confirm' | 'automatic';

export interface DispatchProjectDefaults {
  channel: DispatchChannel;
  mode: DispatchMode;
  threshold: number;
  concurrency: number;
  continuation: DispatchContinuationMode;
}

export interface DispatchSessionOverrides {
  channel?: DispatchChannel;
  mode?: DispatchMode;
  threshold?: number;
  concurrency?: number;
  continuation?: DispatchContinuationMode;
}

export interface DispatchSessionState {
  overrides: DispatchSessionOverrides;
  paused: boolean;
  releasedAnnotationIds: string[];
  awaitingConfirmationIds: string[];
  flowActive: boolean;
  lastDispatchError: string | null;
}

export interface EffectiveDispatchConfig extends DispatchProjectDefaults {
  paused: boolean;
}

export interface QueueSummary {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  archived: number;
}

export interface DispatchQueueAnalysis {
  queuedIds: string[];
  unreleasedWaitingIds: string[];
  inFlightIds: string[];
  awaitingConfirmationIds: string[];
  releasableIds: string[];
  capacityRemaining: number;
}

export type AnnotationDispatchStage =
  | 'waiting'
  | 'awaiting_confirmation'
  | 'dispatching'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'archived';

export interface AnnotationDispatchView {
  stage: AnnotationDispatchStage;
  statusLabel: string;
  statusDetail?: string;
  nextAction: string;
}

export const DEFAULT_DISPATCH_PROJECT_DEFAULTS: DispatchProjectDefaults = {
  channel: 'auto',
  mode: 'manual',
  threshold: 3,
  concurrency: 3,
  continuation: 'automatic',
};

export const DEFAULT_DISPATCH_SESSION_STATE: DispatchSessionState = {
  overrides: {},
  paused: false,
  releasedAnnotationIds: [],
  awaitingConfirmationIds: [],
  flowActive: false,
  lastDispatchError: null,
};

export function normalizeThreshold(value: number | undefined): number {
  if (!Number.isFinite(value))
    return DEFAULT_DISPATCH_PROJECT_DEFAULTS.threshold;
  return Math.max(1, Math.min(10, Math.round(value as number)));
}

export function normalizeConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DISPATCH_PROJECT_DEFAULTS.concurrency;
  }
  return Math.max(1, Math.min(10, Math.round(value as number)));
}

function isChannel(value: unknown): value is DispatchChannel {
  return (
    value === 'auto' ||
    value === 'codex' ||
    value === 'claude' ||
    value === 'queue_only'
  );
}

function isMode(value: unknown): value is DispatchMode {
  return value === 'manual' || value === 'immediate' || value === 'threshold';
}

function isContinuationMode(value: unknown): value is DispatchContinuationMode {
  return value === 'manual' || value === 'confirm' || value === 'automatic';
}

export function normalizeProjectDefaults(
  input: Partial<DispatchProjectDefaults> | null | undefined,
): DispatchProjectDefaults {
  return {
    channel: isChannel(input?.channel)
      ? input.channel
      : DEFAULT_DISPATCH_PROJECT_DEFAULTS.channel,
    mode: isMode(input?.mode)
      ? input.mode
      : DEFAULT_DISPATCH_PROJECT_DEFAULTS.mode,
    threshold: normalizeThreshold(input?.threshold),
    concurrency: normalizeConcurrency(input?.concurrency),
    continuation: isContinuationMode(input?.continuation)
      ? input.continuation
      : DEFAULT_DISPATCH_PROJECT_DEFAULTS.continuation,
  };
}

export function normalizeSessionOverrides(
  input: Partial<DispatchSessionOverrides> | null | undefined,
): DispatchSessionOverrides {
  return {
    channel: isChannel(input?.channel) ? input.channel : undefined,
    mode: isMode(input?.mode) ? input.mode : undefined,
    threshold:
      input?.threshold === undefined
        ? undefined
        : normalizeThreshold(input.threshold),
    concurrency:
      input?.concurrency === undefined
        ? undefined
        : normalizeConcurrency(input.concurrency),
    continuation: isContinuationMode(input?.continuation)
      ? input.continuation
      : undefined,
  };
}

export function mergeDispatchConfig(
  projectDefaults: DispatchProjectDefaults,
  session: DispatchSessionState,
): EffectiveDispatchConfig {
  return {
    channel: session.overrides.channel ?? projectDefaults.channel,
    mode: session.overrides.mode ?? projectDefaults.mode,
    threshold: session.overrides.threshold ?? projectDefaults.threshold,
    concurrency: session.overrides.concurrency ?? projectDefaults.concurrency,
    continuation:
      session.overrides.continuation ?? projectDefaults.continuation,
    paused: session.paused,
  };
}

export function summarizeQueue(annotations: Annotation[]): QueueSummary {
  const summary: QueueSummary = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    archived: 0,
  };

  for (const annotation of annotations) {
    switch (annotation.metadata.status) {
      case 'queued':
        summary.waiting += 1;
        break;
      case 'claimed':
      case 'processing':
        summary.active += 1;
        break;
      case 'processed':
        summary.completed += 1;
        break;
      case 'failed':
        summary.failed += 1;
        break;
      case 'archived':
        summary.archived += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function analyzeDispatchQueue(
  annotations: Annotation[],
  options: {
    releasedAnnotationIds: string[];
    awaitingConfirmationIds: string[];
    concurrency: number;
  },
): DispatchQueueAnalysis {
  const queuedIds: string[] = [];
  const processingIds: string[] = [];
  const liveIds = new Set<string>();

  for (const annotation of annotations) {
    const id = annotation.metadata.id;
    liveIds.add(id);

    if (annotation.metadata.status === 'queued') {
      queuedIds.push(id);
    }

    if (annotation.metadata.status === 'processing') {
      processingIds.push(id);
    }

    if (annotation.metadata.status === 'claimed') {
      processingIds.push(id);
    }
  }

  const locallyReleasedIds = options.releasedAnnotationIds.filter((id) => {
    const annotation = annotations.find((entry) => entry.metadata.id === id);
    return (
      liveIds.has(id) &&
      (annotation?.metadata.status === 'queued' ||
        annotation?.metadata.status === 'claimed' ||
        annotation?.metadata.status === 'processing')
    );
  });
  const serverReleasedIds = annotations
    .filter(
      (annotation) =>
        annotation.metadata.status === 'queued' &&
        Boolean(annotation.dispatch?.assignedAt),
    )
    .map((annotation) => annotation.metadata.id);
  const releasedActiveIds = Array.from(
    new Set([...locallyReleasedIds, ...serverReleasedIds]),
  );

  const awaitingConfirmationIds = options.awaitingConfirmationIds.filter(
    (id) => {
      const annotation = annotations.find((entry) => entry.metadata.id === id);
      return liveIds.has(id) && annotation?.metadata.status === 'queued';
    },
  );

  const inFlightIds = Array.from(
    new Set([...processingIds, ...releasedActiveIds]),
  );

  const unreleasedWaitingIds = queuedIds.filter(
    (id) =>
      !releasedActiveIds.includes(id) && !awaitingConfirmationIds.includes(id),
  );

  const capacityRemaining = Math.max(
    0,
    normalizeConcurrency(options.concurrency) - inFlightIds.length,
  );

  return {
    queuedIds,
    unreleasedWaitingIds,
    inFlightIds,
    awaitingConfirmationIds,
    releasableIds: unreleasedWaitingIds.slice(0, capacityRemaining),
    capacityRemaining,
  };
}

export function getAnnotationDispatchView(
  annotation: Annotation,
  options: {
    releasedAnnotationIds: string[];
    awaitingConfirmationIds: string[];
  },
): AnnotationDispatchView {
  const id = annotation.metadata.id;
  const status = annotation.metadata.status;

  if (status === 'queued') {
    if (options.awaitingConfirmationIds.includes(id)) {
      return {
        stage: 'awaiting_confirmation',
        statusLabel: 'Wartet auf Freigabe',
        statusDetail: 'Dieser Auftrag startet erst nach deiner Freigabe.',
        nextAction: 'Freigeben oder weiter sammeln',
      };
    }

    if (
      options.releasedAnnotationIds.includes(id) ||
      annotation.dispatch?.assignedAt
    ) {
      return {
        stage: 'dispatching',
        statusLabel: 'Freigegeben',
        statusDetail:
          'PinFlow hat diesen Auftrag freigegeben und wartet auf Uebernahme.',
        nextAction: 'Warten bis ein Agent oder Runner uebernimmt',
      };
    }

    return {
      stage: 'waiting',
      statusLabel: 'In Warteliste',
      statusDetail: 'Dieser Auftrag wird nach deiner Versandregel gestartet.',
      nextAction: 'Warten bis die Versandregel greift oder manuell senden',
    };
  }

  if (status === 'claimed') {
    return {
      stage: 'claimed',
      statusLabel: 'Uebernommen',
      statusDetail: 'Ein Agent hat den Auftrag uebernommen.',
      nextAction: 'Warten, Agent hat uebernommen',
    };
  }

  if (status === 'processing') {
    return {
      stage: 'processing',
      statusLabel: 'In Bearbeitung',
      statusDetail: 'Der Agent arbeitet gerade an diesem Auftrag.',
      nextAction: 'Warten, Agent arbeitet',
    };
  }

  if (status === 'processed') {
    const verificationStatus = annotation.verification?.status;
    const nextAction =
      verificationStatus === 'verified'
        ? 'Archivieren oder weiterarbeiten'
        : verificationStatus === 'uncertain'
          ? 'Erneut pruefen oder Quelle oeffnen'
          : verificationStatus === 'unable'
            ? 'Fehler ansehen oder erneut pruefen'
            : 'Pruefen';

    return {
      stage: 'completed',
      statusLabel: 'Erledigt',
      statusDetail: 'Die Agent-Antwort liegt vor.',
      nextAction,
    };
  }

  if (status === 'failed') {
    return {
      stage: 'failed',
      statusLabel: 'Fehlgeschlagen',
      statusDetail: annotation.metadata.errorDetails
        ? `Fehler: ${annotation.metadata.errorDetails}`
        : 'Dieser Auftrag braucht Nacharbeit oder einen neuen Versuch.',
      nextAction: 'Fehler ansehen oder erneut senden',
    };
  }

  if (status === 'archived') {
    return {
      stage: 'archived',
      statusLabel: 'Archiviert',
      statusDetail: 'Dieser Auftrag liegt nur noch im Verlauf.',
      nextAction: 'Keine Aktion noetig',
    };
  }

  return {
    stage: 'waiting',
    statusLabel: status,
    nextAction: 'Status pruefen',
  };
}
