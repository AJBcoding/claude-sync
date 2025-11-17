// tests/metadata.test.ts
import { SyncMetadata } from '../src/metadata';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('SyncMetadata', () => {
  const testDir = '/tmp/claude-sync-test';
  const metadataPath = join(testDir, '.sync-metadata.json');

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

  test('creates new metadata file', () => {
    const metadata = new SyncMetadata(metadataPath);
    metadata.save();

    expect(existsSync(metadataPath)).toBe(true);
  });

  test('tracks file hashes', () => {
    const metadata = new SyncMetadata(metadataPath);
    metadata.setFileHash('skill.md', 'abc123');
    metadata.save();

    const loaded = new SyncMetadata(metadataPath);
    expect(loaded.getFileHash('skill.md')).toBe('abc123');
  });

  test('detects modified files', () => {
    const metadata = new SyncMetadata(metadataPath);
    metadata.setFileHash('skill.md', 'abc123');

    expect(metadata.hasChanged('skill.md', 'abc123')).toBe(false);
    expect(metadata.hasChanged('skill.md', 'def456')).toBe(true);
  });

  test('removes file hash', () => {
    const metadata = new SyncMetadata(metadataPath);
    metadata.setFileHash('skill.md', 'abc123');
    metadata.removeFile('skill.md');

    expect(metadata.getFileHash('skill.md')).toBeUndefined();
  });
});
