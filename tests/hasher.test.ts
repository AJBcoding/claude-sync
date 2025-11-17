// tests/hasher.test.ts
import { FileHasher } from '../src/hasher';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('FileHasher', () => {
  const testDir = '/tmp/claude-sync-test';
  const hasher = new FileHasher();

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('computes hash for file', () => {
    const filePath = join(testDir, 'test.md');
    writeFileSync(filePath, 'test content');

    const hash = hasher.hashFile(filePath);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA256 hex length
  });

  test('same content produces same hash', () => {
    const file1 = join(testDir, 'file1.md');
    const file2 = join(testDir, 'file2.md');
    writeFileSync(file1, 'same content');
    writeFileSync(file2, 'same content');

    expect(hasher.hashFile(file1)).toBe(hasher.hashFile(file2));
  });

  test('different content produces different hash', () => {
    const file1 = join(testDir, 'file1.md');
    const file2 = join(testDir, 'file2.md');
    writeFileSync(file1, 'content A');
    writeFileSync(file2, 'content B');

    expect(hasher.hashFile(file1)).not.toBe(hasher.hashFile(file2));
  });
});
