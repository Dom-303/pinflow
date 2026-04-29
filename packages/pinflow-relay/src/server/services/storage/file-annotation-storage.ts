/**
 * FileAnnotationStorage - Disk-based implementation of AnnotationStorageProvider.
 *
 * Stores annotations as JSON files organized by status:
 *   <baseDir>/{queued,claimed,processing,processed,failed,archived}/<id>.json
 */
import type { Annotation, AnnotationStatus } from '@pinflow/core';
import { migrateAnnotation } from '@pinflow/core';
import {
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
  constructor(private readonly baseDir: string) {}

  async initialize(statuses: readonly AnnotationStatus[]): Promise<void> {
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
    return null;
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
    return false;
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
    return [];
  }

  async countByStatus(status: AnnotationStatus): Promise<number> {
    const statusDir = path.join(this.baseDir, status);
    if (existsSync(statusDir)) {
      return readdirSync(statusDir).filter((f) => f.endsWith('.json')).length;
    }
    return 0;
  }

  private getFilePath(id: string, status: AnnotationStatus): string {
    return path.join(this.baseDir, status, `${id}.json`);
  }
}
