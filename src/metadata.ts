// src/metadata.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';

interface MetadataFormat {
  files: Record<string, { hash: string; syncedAt: string }>;
  lastSync: string;
}

export class SyncMetadata {
  private data: MetadataFormat;

  constructor(private metadataPath: string) {
    if (existsSync(metadataPath)) {
      this.data = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    } else {
      this.data = { files: {}, lastSync: new Date().toISOString() };
    }
  }

  setFileHash(relPath: string, hash: string): void {
    this.data.files[relPath] = {
      hash,
      syncedAt: new Date().toISOString()
    };
  }

  getFileHash(relPath: string): string | undefined {
    return this.data.files[relPath]?.hash;
  }

  hasChanged(relPath: string, currentHash: string): boolean {
    const stored = this.getFileHash(relPath);
    return stored !== currentHash;
  }

  removeFile(relPath: string): void {
    delete this.data.files[relPath];
  }

  save(): void {
    this.data.lastSync = new Date().toISOString();
    writeFileSync(this.metadataPath, JSON.stringify(this.data, null, 2));
  }

  getAllFiles(): string[] {
    return Object.keys(this.data.files);
  }
}
