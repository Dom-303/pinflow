import type {
  RunnerHeartbeatRequestBody,
  RunnerSession,
  RunnerSnapshot,
} from '../../schema.js';

const DEFAULT_STALE_AFTER_MS = 15_000;

export class RunnerSessionService {
  private readonly sessions = new Map<string, RunnerSession>();

  constructor(
    private readonly options: {
      now?: () => number;
      staleAfterMs?: number;
    } = {},
  ) {}

  heartbeat(body: RunnerHeartbeatRequestBody): RunnerSession {
    const session: RunnerSession = {
      runnerId: body.runnerId,
      provider: body.provider,
      label: body.label,
      status: body.status,
      currentAnnotationId: body.currentAnnotationId,
      pid: body.pid,
      lastSeenAt: new Date(this.now()).toISOString(),
    };

    this.sessions.set(session.runnerId, session);
    return session;
  }

  getSnapshot(): RunnerSnapshot {
    this.pruneStaleSessions();

    const sessions = Array.from(this.sessions.values()).sort((a, b) =>
      a.runnerId.localeCompare(b.runnerId),
    );

    return {
      connected: sessions.length > 0,
      activeCount: sessions.length,
      sessions,
    };
  }

  private pruneStaleSessions(): void {
    const cutoff = this.now() - (this.options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS);

    for (const [runnerId, session] of this.sessions.entries()) {
      if (Date.parse(session.lastSeenAt) < cutoff) {
        this.sessions.delete(runnerId);
      }
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
