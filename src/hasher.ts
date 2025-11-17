// src/hasher.ts
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';

export class FileHasher {
  hashFile(filePath: string): string {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
