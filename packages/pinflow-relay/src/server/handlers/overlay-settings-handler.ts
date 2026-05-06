/**
 * HTTP handler for GET /api/overlay-settings.
 * Returns the current settings cache for seed-on-connect.
 *
 * @module @pinflow/relay/server/handlers/overlay-settings-handler
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OverlaySettingsService } from '../services/overlay-settings-service.js';

export interface OverlaySettingsHandlerDeps {
  readonly service: OverlaySettingsService;
}

export function createOverlaySettingsHandler(deps: OverlaySettingsHandlerDeps) {
  return async (_req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const settings = deps.service.getSettings();
    await reply.code(200).type('application/json').send(settings);
  };
}
