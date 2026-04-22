/**
 * FileAnnotationStorage - Disk-based implementation of AnnotationStorageProvider.
 *
 * Stores annotations as JSON files organized by status:
 *   <baseDir>/{queued,processing,processed,failed,archived}/<id>.json
 */
import type { Annotation, AnnotationStatus } from '@pinflow/core';
import { migrateAnnotation } from '@pinflow/core';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import type { AnnotationStorageProvider } from './annotation-storage.js';

export class FileAnnotationStorage implements AnnotationStorageProvider {
  constructor(
    private readonly baseDir: string,
    private readonly options: { legacyBaseDir?: string } = {},
  ) {}

  async initialize(statuses: readonly AnnotationStatus[]): Promise<void> {
    if (
      this.options.legacyBaseDir &&
      existsSync(this.options.legacyBaseDir) &&
      (!existsSync(this.baseDir) || readdirSync(this.baseDir).length === 0)
    ) {
      cpSync(this.options.legacyBaseDir, this.baseDir, { recursive: true });
    }

    for (const status of statuses) {
      const statusDir = path.join(this.baseDir, status);
      if (!existsSync(statusDir)) {
        mkdirSync(statusDir, { recursive: true });
      }
    }
  }

  async read(id: string, status: AnnotationStatus): Promise<Annotation | null> {
    const filePath = this.getFilePath(id, status);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return migrateAnnotation(JSON.parse(content));
    }

    const legacyFilePath = this.getLegacyFilePath(id, status);
    if (!legacyFilePath || !existsSync(legacyFilePath)) {
      return null;
    }

    const content = readFileSync(legacyFilePath, 'utf-8');
    return migrateAnnotation(JSON.parse(content));
  }

  async write(annotation: Annotation): Promise<void> {
    const filePath = this.getFilePath(
      annotation.metadata.id,
      annotation.metadata.status,
    );
    writeFileSync(filePath, JSON.stringify(annotation, null, 2));
  }

  async remove(id: string, status: AnnotationStatus): Promise<boolean> {
    const filePath = this.getFilePath(id, status);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }

    const legacyFilePath = this.getLegacyFilePath(id, status);
    if (!legacyFilePath || !existsSync(legacyFilePath)) {
      return false;
    }

    unlinkSync(legacyFilePath);
    return true;
  }

  async listByStatus(status: AnnotationStatus): Promise<Annotation[]> {
    const statusDir = path.join(this.baseDir, status);
    if (existsSync(statusDir)) {
      const files = readdirSync(statusDir).filter((f) => f.endsWith('.json'));
      return files.map((file) => {
        const content = readFileSync(path.join(statusDir, file), 'utf-8');
        return migrateAnnotation(JSON.parse(content));
      });
    }

    const legacyStatusDir = this.getLegacyStatusDir(status);
    if (!legacyStatusDir || !existsSync(legacyStatusDir)) {
      return [];
    }

    const files = readdirSync(legacyStatusDir).filter((f) => f.endsWith('.json'));
    return files.map((file) => {
      const content = readFileSync(path.join(legacyStatusDir, file), 'utf-8');
      return migrateAnnotation(JSON.parse(content));
    });
  }

  async countByStatus(status: AnnotationStatus): Promise<number> {
    const statusDir = path.join(this.baseDir, status);
    if (existsSync(statusDir)) {
      return readdirSync(statusDir).filter((f) => f.endsWith('.json')).length;
    }

    const legacyStatusDir = this.getLegacyStatusDir(status);
    if (!legacyStatusDir || !existsSync(legacyStatusDir)) {
      return 0;
    }

    return readdirSync(legacyStatusDir).filter((f) => f.endsWith('.json')).length;
  }

  private getFilePath(id: string, status: AnnotationStatus): string {
    return path.join(this.baseDir, status, `${id}.json`);
  }

  private getLegacyStatusDir(status: AnnotationStatus): string | undefined {
    return this.options.legacyBaseDir
      ? path.join(this.options.legacyBaseDir, status)
      : undefined;
  }

  private getLegacyFilePath(
    id: string,
    status: AnnotationStatus,
  ): string | undefined {
    const legacyStatusDir = this.getLegacyStatusDir(status);
    return legacyStatusDir
      ? path.join(legacyStatusDir, `${id}.json`)
      : undefined;
  }
}
