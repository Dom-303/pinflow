/**
 * ManifestReader - Reads manifest entries for PinFlow Relay
 *
 * Provides fast element ID to source location resolution.
 * Maintains full entry map for O(1) lookups.
 */
import { existsSync, readFileSync, statSync, watchFile, unwatchFile } from 'fs';
import path from 'path';
import { PATHS, type ManifestEntry } from '@pinflow/core';

import { ManifestEntrySchema } from '@pinflow/core';
import { z } from 'zod';

/**
 * Result of resolving a data-ds ID to its source location
 */
export const ManifestResolveResultSchema = z.object({
  success: z.boolean().describe('Whether the ID was found in the manifest'),
  entry: ManifestEntrySchema.optional().describe(
    'Resolved manifest entry (present when success=true)',
  ),
  resolveTimeMs: z.number().describe('Time taken to resolve in milliseconds'),
  cacheHit: z
    .boolean()
    .describe('Whether the result came from the in-memory index'),
  error: z.string().optional().describe('Error message when success=false'),
});

/**
 * Aggregate statistics for the ManifestReader
 */
export const ManifestReaderStatsSchema = z.object({
  entryCount: z.number().describe('Total manifest entries loaded'),
  fileCount: z.number().describe('Number of unique source files indexed'),
  componentCount: z
    .number()
    .describe('Number of unique component names indexed'),
  lastUpdated: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of last manifest reload'),
  cacheHitRate: z
    .number()
    .describe('Ratio of cache hits to total resolve calls (0-1)'),
});

/**
 * Event emitted when the manifest file changes on disk
 */
export const ManifestUpdateEventSchema = z.object({
  type: z.literal('manifest:updated'),
  data: z.object({
    entryCount: z.number().describe('Total entries after reload'),
    changedFiles: z
      .array(z.string())
      .describe('File paths added or removed since previous load'),
  }),
});

export type ManifestResolveResult = z.infer<typeof ManifestResolveResultSchema>;
export type ManifestReaderStats = z.infer<typeof ManifestReaderStatsSchema>;
export type ManifestUpdateEvent = z.infer<typeof ManifestUpdateEventSchema>;
export type ManifestFreshnessStatus = 'fresh' | 'stale' | 'unknown';

export interface ManifestFreshness {
  status: ManifestFreshnessStatus;
  stale: boolean;
  reason:
    | 'source_newer_than_manifest'
    | 'source_not_found'
    | 'manifest_not_found'
    | 'source_not_on_disk'
    | 'manifest_fresh';
  sourceFile: string;
  sourceMtimeMs?: number;
  manifestMtimeMs?: number;
  checkedAt: string;
  repairHint?: string;
}

export type SourceMatchConfidence = 'high' | 'medium' | 'low';
export type SourceMatchStrategy =
  | 'exact_line_and_column'
  | 'exact_line'
  | 'nearest_column_same_line'
  | 'nearest_within_tolerance';

export interface SourcePositionCandidate {
  entry: ManifestEntry;
  lineDistance: number;
  columnDistance: number | null;
  confidence: SourceMatchConfidence;
  strategy: SourceMatchStrategy;
}

/**
 * Listener for manifest events
 */
export type ManifestEventListener = (event: ManifestUpdateEvent) => void;

/**
 * ManifestReader - Fast element ID resolution
 */
export class ManifestReader {
  private readonly manifestPath: string;
  private readonly entries: Map<string, ManifestEntry> = new Map();
  private readonly fileIndex: Map<string, Set<string>> = new Map();
  private readonly componentIndex: Map<string, Set<string>> = new Map();
  private readonly listeners: Set<ManifestEventListener> = new Set();
  private lastUpdated: string | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;
  private fileWatcher: ReturnType<typeof watchFile> | null = null;

  constructor(private readonly workspaceRoot: string) {
    this.manifestPath = path.join(workspaceRoot, PATHS.MANIFEST_FILE);
  }

  /**
   * Initialize the reader by loading existing entries
   */
  initialize(): void {
    this.loadEntries();
    this.startWatching();
  }

  /**
   * Resolve an element ID to its source location
   *
   * @param dataDs - The data-ds ID to resolve
   * @returns Resolution result with timing info
   */
  resolve(dataDs: string): ManifestResolveResult {
    const startTime = performance.now();
    const entry = this.entries.get(dataDs);
    const resolveTimeMs = performance.now() - startTime;

    if (entry) {
      this.cacheHits++;
      return {
        success: true,
        entry,
        resolveTimeMs,
        cacheHit: true,
      };
    }

    this.cacheMisses++;
    return {
      success: false,
      resolveTimeMs,
      cacheHit: false,
      error: 'Entry not found',
    };
  }

  /**
   * Get manifest statistics
   */
  getStats(): ManifestReaderStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 1;

    return {
      entryCount: this.entries.size,
      fileCount: this.fileIndex.size,
      componentCount: this.componentIndex.size,
      lastUpdated: this.lastUpdated,
      cacheHitRate,
    };
  }

  /**
   * Get all entries for a file
   *
   * @param filePath - File path to look up
   * @returns Array of manifest entries in the file
   */
  getEntriesByFile(filePath: string): ManifestEntry[] {
    const ids = this.fileIndex.get(this.normalizeFilePath(filePath));
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entries.get(id))
      .filter((e): e is ManifestEntry => e !== undefined);
  }

  /**
   * Compare a manifest entry's source file mtime against the manifest file mtime.
   *
   * This is intentionally filesystem-based rather than inferred from cache state:
   * agents need an inspectable reason when source changed after the manifest was
   * generated, but PinFlow should avoid pretending unknown freshness is stale.
   */
  getFreshnessForFile(filePath: string): ManifestFreshness {
    const sourceFile = this.normalizeFilePath(filePath);
    const checkedAt = new Date().toISOString();

    if (!existsSync(this.manifestPath)) {
      return {
        status: 'unknown',
        stale: false,
        reason: 'manifest_not_found',
        sourceFile,
        checkedAt,
        repairHint: 'Start PinFlow in the app so it can generate a manifest.',
      };
    }

    const absoluteSourcePath = path.isAbsolute(sourceFile)
      ? sourceFile
      : path.join(this.workspaceRoot, sourceFile);

    if (!existsSync(absoluteSourcePath)) {
      return {
        status: 'unknown',
        stale: false,
        reason: 'source_not_found',
        sourceFile,
        manifestMtimeMs: statSync(this.manifestPath).mtimeMs,
        checkedAt,
        repairHint:
          'Check that the source file path is correct for the app root connected to PinFlow.',
      };
    }

    const manifestMtimeMs = statSync(this.manifestPath).mtimeMs;
    const sourceMtimeMs = statSync(absoluteSourcePath).mtimeMs;

    if (sourceMtimeMs > manifestMtimeMs) {
      return {
        status: 'stale',
        stale: true,
        reason: 'source_newer_than_manifest',
        sourceFile,
        sourceMtimeMs,
        manifestMtimeMs,
        checkedAt,
        repairHint:
          'Restart or refresh the dev server so PinFlow can rebuild the manifest for the changed source file.',
      };
    }

    return {
      status: 'fresh',
      stale: false,
      reason: 'manifest_fresh',
      sourceFile,
      sourceMtimeMs,
      manifestMtimeMs,
      checkedAt,
    };
  }

  /**
   * Find manifest file paths that could match a user/agent supplied path.
   *
   * Exact manifest paths always win. Otherwise a path can match by suffix, which
   * lets agents send app-root-relative paths in monorepos. Multiple matches are
   * returned so callers can avoid guessing.
   */
  getMatchingFilePaths(filePath: string): string[] {
    const normalized = this.normalizeSlashes(filePath);
    if (this.fileIndex.has(normalized)) {
      return [normalized];
    }

    const workspaceRelative = this.toWorkspaceRelativePath(filePath);
    if (workspaceRelative && this.fileIndex.has(workspaceRelative)) {
      return [workspaceRelative];
    }

    const suffix = workspaceRelative ?? normalized;
    return Array.from(this.fileIndex.keys())
      .filter((indexedPath) => indexedPath.endsWith(`/${suffix}`))
      .sort();
  }

  /**
   * Get all entries for a component
   *
   * @param componentName - Component name to look up
   * @returns Array of manifest entries for the component
   */
  getEntriesByComponent(componentName: string): ManifestEntry[] {
    const ids = this.componentIndex.get(componentName);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.entries.get(id))
      .filter((e): e is ManifestEntry => e !== undefined);
  }

  /**
   * Find a manifest entry by source file position.
   *
   * Algorithm:
   * 1. Look up entries by file path via fileIndex.
   * 2. Filter to entries within `tolerance` lines of the target line.
   * 3. Pick the closest match by line distance, then column distance.
   *
   * @param filePath - Source file path (relative to project root)
   * @param line - Target line number (1-indexed)
   * @param column - Optional target column number (0-indexed)
   * @param tolerance - Maximum line distance to consider (default: 0 = exact line only)
   * @returns Best matching entry, or null if none found
   */
  getEntryByPosition(
    filePath: string,
    line: number,
    column?: number,
    tolerance = 0,
  ): ManifestEntry | null {
    return (
      this.getEntriesByPosition(filePath, line, column, tolerance)[0]?.entry ??
      null
    );
  }

  /**
   * Find manifest entries by source file position.
   *
   * Returns all candidates within `tolerance`, sorted by line distance and then
   * column distance. This keeps ambiguity visible for callers that need an
   * agent-safe answer while preserving getEntryByPosition() for compatibility.
   */
  getEntriesByPosition(
    filePath: string,
    line: number,
    column?: number,
    tolerance = 0,
  ): SourcePositionCandidate[] {
    const ids = this.fileIndex.get(this.normalizeFilePath(filePath));
    if (!ids || ids.size === 0) {
      return [];
    }

    const candidates: SourcePositionCandidate[] = [];

    for (const id of ids) {
      const entry = this.entries.get(id);
      if (!entry || entry.start.line === null) {
        continue;
      }

      const lineDist = Math.abs(entry.start.line - line);
      if (lineDist > tolerance) {
        continue;
      }

      const columnDistance =
        column !== undefined && entry.start.column !== null
          ? Math.abs(entry.start.column - column)
          : null;

      candidates.push({
        entry,
        lineDistance: lineDist,
        columnDistance,
        ...this.getSourceMatchQuality(lineDist, columnDistance, column),
      });
    }

    return candidates.sort((a, b) => {
      if (a.lineDistance !== b.lineDistance) {
        return a.lineDistance - b.lineDistance;
      }

      const aColumn = a.columnDistance ?? Infinity;
      const bColumn = b.columnDistance ?? Infinity;
      return aColumn - bColumn;
    });
  }

  private getSourceMatchQuality(
    lineDistance: number,
    columnDistance: number | null,
    requestedColumn?: number,
  ): Pick<SourcePositionCandidate, 'confidence' | 'strategy'> {
    if (lineDistance === 0 && requestedColumn !== undefined) {
      if (columnDistance === 0) {
        return {
          confidence: 'high',
          strategy: 'exact_line_and_column',
        };
      }

      return {
        confidence: 'medium',
        strategy: 'nearest_column_same_line',
      };
    }

    if (lineDistance === 0) {
      return {
        confidence: 'high',
        strategy: 'exact_line',
      };
    }

    return {
      confidence: 'low',
      strategy: 'nearest_within_tolerance',
    };
  }

  private normalizeFilePath(filePath: string): string {
    const matches = this.getMatchingFilePaths(filePath);
    return matches.length === 1 ? matches[0] : this.normalizeSlashes(filePath);
  }

  private toWorkspaceRelativePath(filePath: string): string | null {
    if (!path.isAbsolute(filePath)) {
      return null;
    }

    const relativePath = path.relative(this.workspaceRoot, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return null;
    }

    return this.normalizeSlashes(relativePath);
  }

  private normalizeSlashes(filePath: string): string {
    return filePath.split(path.sep).join(path.posix.sep);
  }

  /**
   * Reload entries from disk
   */
  reload(): void {
    const previousFiles = new Set(this.fileIndex.keys());
    this.loadEntries();
    const currentFiles = new Set(this.fileIndex.keys());

    // Compute changed files
    const changedFiles: string[] = [];
    for (const file of currentFiles) {
      if (!previousFiles.has(file)) {
        changedFiles.push(file);
      }
    }
    for (const file of previousFiles) {
      if (!currentFiles.has(file)) {
        changedFiles.push(file);
      }
    }

    this.emit({
      type: 'manifest:updated',
      data: {
        entryCount: this.entries.size,
        changedFiles,
      },
    });
  }

  /**
   * Subscribe to manifest events
   *
   * @param listener - Event listener callback
   * @returns Unsubscribe function
   */
  onEvent(listener: ManifestEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Stop watching for changes and clean up
   */
  close(): void {
    this.stopWatching();
  }

  private loadEntries(): void {
    this.entries.clear();
    this.fileIndex.clear();
    this.componentIndex.clear();

    if (!existsSync(this.manifestPath)) {
      return;
    }

    const content = readFileSync(this.manifestPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Pass 1: Parse all entries and determine latest fileHash per file
    const allEntries: ManifestEntry[] = [];
    const latestFileHash = new Map<string, string>();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ManifestEntry;
        allEntries.push(entry);
        if (entry.fileHash) {
          latestFileHash.set(entry.file, entry.fileHash);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Pass 2: Only index entries with latest fileHash (or no fileHash for legacy)
    for (const entry of allEntries) {
      const latestHash = latestFileHash.get(entry.file);
      if (!latestHash || !entry.fileHash || entry.fileHash === latestHash) {
        this.addEntry(entry);
      }
    }

    this.lastUpdated = new Date().toISOString();
  }

  private addEntry(entry: ManifestEntry): void {
    const { id, file, componentName } = entry;

    // Primary entry map
    this.entries.set(id, entry);

    // File index
    let fileSet = this.fileIndex.get(file);
    if (!fileSet) {
      fileSet = new Set();
      this.fileIndex.set(file, fileSet);
    }
    fileSet.add(id);

    // Component index
    if (componentName) {
      let componentSet = this.componentIndex.get(componentName);
      if (!componentSet) {
        componentSet = new Set();
        this.componentIndex.set(componentName, componentSet);
      }
      componentSet.add(id);
    }
  }

  private startWatching(): void {
    // watchFile uses stat-polling, so it works even if the file doesn't exist yet.
    // When the file is created, curr.mtime will differ from prev.mtime (epoch 0),
    // triggering the initial load.
    this.fileWatcher = watchFile(
      this.manifestPath,
      { interval: 500 },
      (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          this.reload();
        }
      },
    );
  }

  private stopWatching(): void {
    if (this.fileWatcher) {
      unwatchFile(this.manifestPath);
      this.fileWatcher = null;
    }
  }

  private emit(event: ManifestUpdateEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
