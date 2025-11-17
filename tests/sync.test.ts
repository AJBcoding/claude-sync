// tests/sync.test.ts
import { SkillSyncer } from '../src/sync';
import { FileHasher } from '../src/hasher';
import { SyncMetadata } from '../src/metadata';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

describe('SkillSyncer', () => {
  const testDir = '/tmp/claude-sync-test';
  const sourceDir = join(testDir, 'source');
  const targetDir = join(testDir, 'target');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('copies new skills to target', () => {
    writeFileSync(join(sourceDir, 'skill1.md'), 'skill content');

    const hasher = new FileHasher();
    const metadata = new SyncMetadata(join(targetDir, '.sync-metadata.json'));
    const syncer = new SkillSyncer(hasher, metadata);

    const result = syncer.sync(sourceDir, join(targetDir, '.claude/skills'));

    expect(result.copied).toBe(1);
    expect(existsSync(join(targetDir, '.claude/skills/skill1.md'))).toBe(true);
  });

  test('updates modified skills', () => {
    const targetSkillPath = join(targetDir, '.claude/skills/skill1.md');
    mkdirSync(join(targetDir, '.claude/skills'), { recursive: true });
    writeFileSync(targetSkillPath, 'old content');

    const hasher = new FileHasher();
    const metadata = new SyncMetadata(join(targetDir, '.sync-metadata.json'));
    metadata.setFileHash('skill1.md', hasher.hashFile(targetSkillPath));
    metadata.save();

    writeFileSync(join(sourceDir, 'skill1.md'), 'new content');

    const syncer = new SkillSyncer(hasher, metadata);
    const result = syncer.sync(sourceDir, join(targetDir, '.claude/skills'));

    expect(result.updated).toBe(1);
    expect(readFileSync(targetSkillPath, 'utf-8')).toBe('new content');
  });

  test('skips locally modified files', () => {
    const targetSkillPath = join(targetDir, '.claude/skills/skill1.md');
    mkdirSync(join(targetDir, '.claude/skills'), { recursive: true });
    writeFileSync(targetSkillPath, 'original content');

    const hasher = new FileHasher();
    const metadata = new SyncMetadata(join(targetDir, '.sync-metadata.json'));
    metadata.setFileHash('skill1.md', hasher.hashContent('different content'));
    metadata.save();

    writeFileSync(join(sourceDir, 'skill1.md'), 'new source content');

    const syncer = new SkillSyncer(hasher, metadata);
    const result = syncer.sync(sourceDir, join(targetDir, '.claude/skills'));

    expect(result.skipped).toBe(1);
    expect(readFileSync(targetSkillPath, 'utf-8')).toBe('original content');
  });
});
