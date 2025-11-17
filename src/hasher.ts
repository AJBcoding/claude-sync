// src/hasher.ts
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export class FileHasher {
  hashFile(filePath: string): string {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
