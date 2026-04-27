import {
  API_PATHS,
  PinFlowError,
  PinFlowErrorCode,
  HTTP_STATUS,
} from '@pinflow/core';
import { ManifestReader } from '@pinflow/manifest';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  QueryBySourceCandidateSchema,
  QueryBySourceRequest,
  QueryBySourceRequestSchema,
  QueryBySourceResponse,
  QueryBySourceResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import type { WSServer } from '../../ws-server.js';
import type { ManifestEntry } from '@pinflow/core';
import type { z } from 'zod';

type QueryBySourceCandidate = z.infer<typeof QueryBySourceCandidateSchema>;
type QueryBySourceReason = NonNullable<
  QueryBySourceResponse['reasons']
>[number];

export class QueryBySourceRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_RESOLVE_BY_SOURCE;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(
    private readonly manifestReader: ManifestReader,
    private readonly wsServer: WSServer,
  ) {}

  static register({
    app,
    manifestReader,
    wsServer,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
    wsServer: WSServer;
  }): void {
    const route = new QueryBySourceRoute(manifestReader, wsServer);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: QueryBySourceRequest;
      Reply: QueryBySourceResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: QueryBySourceRequestSchema,
        response: {
          200: QueryBySourceResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: QueryBySourceRequest }>,
    reply: FastifyReply<{
      Reply: QueryBySourceResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { file, line, column, tolerance, includeRuntime } = request.body;
      const stats = this.manifestReader.getStats();
      const manifest = {
        entryCount: stats.entryCount,
        fileCount: stats.fileCount,
        componentCount: stats.componentCount,
        lastUpdated: stats.lastUpdated,
      };
      const reasons: QueryBySourceReason[] = [];

      // Position-based manifest lookup
      const sourceCandidates = this.manifestReader.getEntriesByPosition(
        file,
        line,
        column,
        tolerance,
      );
      const candidates = sourceCandidates.map((candidate) =>
        this.toCandidate(candidate),
      );
      const bestCandidate = candidates[0];
      const entry = sourceCandidates[0]?.entry;

      if (!entry) {
        const pathCandidates = this.manifestReader.getMatchingFilePaths(file);
        if (pathCandidates.length > 1) {
          reasons.push('ambiguous_source_path', 'manifest_entry_not_found');
          return reply.status(HTTP_STATUS.OK).send({
            found: false,
            manifest,
            candidates,
            pathCandidates,
            reasons,
          });
        }

        if (stats.entryCount === 0) {
          reasons.push('manifest_empty');
        }
        reasons.push(
          this.manifestReader.getEntriesByFile(file).length > 0
            ? 'source_line_not_found'
            : 'file_not_in_manifest',
        );
        reasons.push('manifest_entry_not_found');

        return reply.status(HTTP_STATUS.OK).send({
          found: false,
          manifest,
          candidates,
          reasons,
        });
      }

      if (candidates.length > 1) {
        reasons.push('ambiguous_source_match');
      }

      const response: QueryBySourceResponse = {
        found: true,
        entryId: entry.id,
        sourceLocation: {
          file: entry.file,
          start: entry.start,
          end: entry.end,
          tagName: entry.tagName,
          componentName: entry.componentName,
        },
        manifest,
        match: bestCandidate
          ? {
              confidence: bestCandidate.confidence,
              strategy: bestCandidate.strategy,
              lineDistance: bestCandidate.lineDistance,
              columnDistance: bestCandidate.columnDistance,
            }
          : undefined,
        candidates,
        reasons,
      };

      // Optional runtime query via WS
      if (includeRuntime) {
        const clientCount = this.wsServer.getClientCount();
        response.browserConnected = clientCount > 0;
        response.browser = {
          connected: response.browserConnected,
          clientCount,
        };
        if (response.browserConnected) {
          const wsResult = await this.wsServer.requestContext(entry.id);
          if (wsResult) {
            response.runtime = {
              rendered: wsResult.rendered ?? false,
              elementFound: wsResult.elementFound,
              contextCaptured: wsResult.contextCaptured,
              componentProps: wsResult.context?.componentProps,
              componentState: wsResult.context?.componentState,
              domSnapshot: wsResult.elementInfo,
            };
            if (wsResult.error) {
              response.error = wsResult.error;
              reasons.push(
                wsResult.success === false
                  ? 'capture_failed'
                  : 'runtime_timeout',
              );
            }
            if (wsResult.rendered === false) {
              reasons.push('element_not_rendered');
            }
          } else {
            reasons.push('runtime_timeout');
          }
        } else {
          reasons.push('browser_not_connected');
        }
      } else {
        reasons.push('runtime_not_requested');
      }

      return reply.status(HTTP_STATUS.OK).send(response);
    } catch (error: unknown) {
      if (error instanceof PinFlowError) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          ...error.toProblemDetails(),
          error: error.message,
        });
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: PinFlowErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }

  private toCandidate(candidate: {
    entry: ManifestEntry;
    confidence: QueryBySourceCandidate['confidence'];
    strategy: QueryBySourceCandidate['strategy'];
    lineDistance: number;
    columnDistance: number | null;
  }): QueryBySourceCandidate {
    return {
      entryId: candidate.entry.id,
      confidence: candidate.confidence,
      strategy: candidate.strategy,
      lineDistance: candidate.lineDistance,
      columnDistance: candidate.columnDistance,
      sourceLocation: this.toSourceLocation(candidate.entry),
    };
  }

  private toSourceLocation(entry: ManifestEntry) {
    return {
      file: entry.file,
      start: entry.start,
      end: entry.end,
      tagName: entry.tagName,
      componentName: entry.componentName,
    };
  }
}
