// src/sync.ts
import { FileHasher } from './hasher';
import { SyncMetadata } from './metadata';
import fg from 'fast-glob';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, relative, dirname } from 'path';

export interface SyncResult {
  copied: number;
  updated: number;
  skipped: number;
  skippedFiles: string[];
}

export class SkillSyncer {
  constructor(
    private hasher: FileHasher,
    private metadata: SyncMetadata
  ) {}

  sync(sourceDir: string, targetDir: string): SyncResult {
    const result: SyncResult = {
      copied: 0,
      updated: 0,
      skipped: 0,
      skippedFiles: []
    };

    // Find all .md files in source
    const sourceFiles = fg.sync('**/*.md', { cwd: sourceDir, absolute: false });

    for (const relPath of sourceFiles) {
      const sourcePath = join(sourceDir, relPath);
      const targetPath = join(targetDir, relPath);
      const sourceHash = this.hasher.hashFile(sourcePath);

      if (!existsSync(targetPath)) {
        // New file - copy it
        this.copyFile(sourcePath, targetPath);
        this.metadata.setFileHash(relPath, sourceHash);
        result.copied++;
      } else {
        // File exists - check if locally modified
        const targetHash = this.hasher.hashFile(targetPath);
        const lastSyncHash = this.metadata.getFileHash(relPath);

        if (lastSyncHash === targetHash) {
          // Not modified locally - safe to update
          if (sourceHash !== targetHash) {
            this.copyFile(sourcePath, targetPath);
            this.metadata.setFileHash(relPath, sourceHash);
            result.updated++;
          }
        } else {
          // Modified locally - skip
          result.skipped++;
          result.skippedFiles.push(relPath);
        }
      }
    }

    this.metadata.save();
    return result;
  }

  private copyFile(source: string, target: string): void {
    const targetDir = dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    copyFileSync(source, target);
  }
}
