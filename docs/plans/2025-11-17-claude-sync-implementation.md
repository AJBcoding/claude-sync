# Claude Skills Auto-Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automatic skills synchronization tool that syncs Claude skills from central sources (~/.claude/skills and plugins) to registered project repositories via shell hooks.

**Architecture:** CLI tool with five core modules: config management, repository registry, file sync engine with conflict detection, CLI interface, and shell hook installer. Uses file hashing for change detection and git staging for version control integration.

**Tech Stack:** TypeScript/Node.js, fast-glob for file discovery, native crypto for hashing, commander for CLI, native fs/child_process for file/git operations.

---

## Task 1: Config Management Module

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

**Step 1: Write failing test for config initialization**

```typescript
// tests/config.test.ts
import { Config } from '../src/config';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

describe('Config', () => {
  const testConfigDir = join(homedir(), '.claude-test');
  const testConfigPath = join(testConfigDir, 'sync-config.json');

  beforeEach(() => {
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true });
    }
    mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true });
    }
  });

  test('creates default config if none exists', () => {
    const config = new Config(testConfigPath);
    const data = config.load();

    expect(data.repos).toEqual([]);
    expect(data.sources.userSkills).toBe(join(homedir(), '.claude/skills'));
    expect(data.sources.pluginScanPath).toBe(join(homedir(), '.claude/plugins/cache/*/skills'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL with "Cannot find module '../src/config'"

**Step 3: Write minimal Config class**

```typescript
// src/config.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface SyncConfig {
  repos: Array<{
    path: string;
    registered: string;
    lastSync?: string;
  }>;
  sources: {
    userSkills: string;
    pluginScanPath: string;
    excludePlugins: string[];
    customPluginPaths: string[];
  };
}

export class Config {
  constructor(private configPath: string) {}

  load(): SyncConfig {
    if (!existsSync(this.configPath)) {
      return this.createDefault();
    }
    const data = readFileSync(this.configPath, 'utf-8');
    return JSON.parse(data);
  }

  save(config: SyncConfig): void {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  private createDefault(): SyncConfig {
    const config: SyncConfig = {
      repos: [],
      sources: {
        userSkills: join(homedir(), '.claude/skills'),
        pluginScanPath: join(homedir(), '.claude/plugins/cache/*/skills'),
        excludePlugins: [],
        customPluginPaths: []
      }
    };
    this.save(config);
    return config;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add config management module

- Create default config with user skills and plugin paths
- Load/save config from ~/.claude/sync-config.json
- Test coverage for config initialization"
```

---

## Task 2: Repository Registry Module

**Files:**
- Create: `src/registry.ts`
- Create: `tests/registry.test.ts`

**Step 1: Write failing test for repo registration**

```typescript
// tests/registry.test.ts
import { RepoRegistry } from '../src/registry';
import { Config } from '../src/config';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

describe('RepoRegistry', () => {
  const testConfigDir = join(homedir(), '.claude-test');
  const testConfigPath = join(testConfigDir, 'sync-config.json');
  let config: Config;
  let registry: RepoRegistry;

  beforeEach(() => {
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true });
    }
    mkdirSync(testConfigDir, { recursive: true });
    config = new Config(testConfigPath);
    registry = new RepoRegistry(config);
  });

  afterEach(() => {
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true });
    }
  });

  test('registers a new repository', () => {
    const repoPath = '/Users/test/myproject';
    registry.register(repoPath);

    const registered = registry.list();
    expect(registered).toHaveLength(1);
    expect(registered[0].path).toBe(repoPath);
    expect(registered[0].registered).toBeDefined();
  });

  test('does not register duplicate repos', () => {
    const repoPath = '/Users/test/myproject';
    registry.register(repoPath);
    registry.register(repoPath);

    expect(registry.list()).toHaveLength(1);
  });

  test('unregisters a repository', () => {
    const repoPath = '/Users/test/myproject';
    registry.register(repoPath);
    registry.unregister(repoPath);

    expect(registry.list()).toHaveLength(0);
  });

  test('checks if repo is registered', () => {
    const repoPath = '/Users/test/myproject';
    expect(registry.isRegistered(repoPath)).toBe(false);

    registry.register(repoPath);
    expect(registry.isRegistered(repoPath)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/registry.test.ts`
Expected: FAIL with "Cannot find module '../src/registry'"

**Step 3: Write RepoRegistry class**

```typescript
// src/registry.ts
import { Config, SyncConfig } from './config';

export class RepoRegistry {
  constructor(private config: Config) {}

  register(repoPath: string): void {
    const data = this.config.load();

    // Check if already registered
    if (data.repos.some(r => r.path === repoPath)) {
      return;
    }

    data.repos.push({
      path: repoPath,
      registered: new Date().toISOString()
    });

    this.config.save(data);
  }

  unregister(repoPath: string): void {
    const data = this.config.load();
    data.repos = data.repos.filter(r => r.path !== repoPath);
    this.config.save(data);
  }

  list(): Array<{ path: string; registered: string; lastSync?: string }> {
    const data = this.config.load();
    return data.repos;
  }

  isRegistered(repoPath: string): boolean {
    const data = this.config.load();
    return data.repos.some(r => r.path === repoPath);
  }

  updateLastSync(repoPath: string): void {
    const data = this.config.load();
    const repo = data.repos.find(r => r.path === repoPath);
    if (repo) {
      repo.lastSync = new Date().toISOString();
      this.config.save(data);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/registry.ts tests/registry.test.ts
git commit -m "feat: add repository registry module

- Register/unregister repos for syncing
- Check if repo is registered
- Track last sync time
- Prevent duplicate registrations"
```

---

## Task 3: File Hashing Utility

**Files:**
- Create: `src/hasher.ts`
- Create: `tests/hasher.test.ts`

**Step 1: Write failing test for file hashing**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/hasher.test.ts`
Expected: FAIL with "Cannot find module '../src/hasher'"

**Step 3: Write FileHasher class**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/hasher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hasher.ts tests/hasher.test.ts
git commit -m "feat: add file hashing utility

- Compute SHA256 hash of file contents
- Support hashing string content directly
- Used for change detection in sync"
```

---

## Task 4: Sync Metadata Management

**Files:**
- Create: `src/metadata.ts`
- Create: `tests/metadata.test.ts`

**Step 1: Write failing test for metadata tracking**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/metadata.test.ts`
Expected: FAIL with "Cannot find module '../src/metadata'"

**Step 3: Write SyncMetadata class**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/metadata.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/metadata.ts tests/metadata.test.ts
git commit -m "feat: add sync metadata tracking

- Store file hashes and sync timestamps
- Detect local modifications
- Persist to .sync-metadata.json
- Used for conflict detection"
```

---

## Task 5: Plugin Discovery

**Files:**
- Create: `src/plugin-scanner.ts`
- Create: `tests/plugin-scanner.test.ts`

**Step 1: Write failing test for plugin discovery**

```typescript
// tests/plugin-scanner.test.ts
import { PluginScanner } from '../src/plugin-scanner';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('PluginScanner', () => {
  const testDir = '/tmp/claude-sync-test/plugins';

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

  test('discovers plugin skill directories', () => {
    // Create fake plugin structure
    mkdirSync(join(testDir, 'cache/plugin1/skills'), { recursive: true });
    mkdirSync(join(testDir, 'cache/plugin2/skills'), { recursive: true });
    writeFileSync(join(testDir, 'cache/plugin1/skills/skill1.md'), 'skill content');
    writeFileSync(join(testDir, 'cache/plugin2/skills/skill2.md'), 'skill content');

    const scanner = new PluginScanner();
    const plugins = scanner.findPlugins(join(testDir, 'cache/*/skills'));

    expect(plugins).toHaveLength(2);
    expect(plugins[0].name).toBe('plugin1');
    expect(plugins[1].name).toBe('plugin2');
  });

  test('returns empty array when no plugins found', () => {
    const scanner = new PluginScanner();
    const plugins = scanner.findPlugins('/nonexistent/path/*/skills');

    expect(plugins).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/plugin-scanner.test.ts`
Expected: FAIL with "Cannot find module '../src/plugin-scanner'"

**Step 3: Write PluginScanner class**

```typescript
// src/plugin-scanner.ts
import fg from 'fast-glob';
import { basename, dirname, join } from 'path';
import { existsSync } from 'fs';

export interface Plugin {
  name: string;
  skillsPath: string;
}

export class PluginScanner {
  findPlugins(scanPattern: string): Plugin[] {
    try {
      // Expand glob pattern to find skill directories
      const paths = fg.sync(scanPattern, { onlyDirectories: true, absolute: true });

      return paths.map(skillsPath => {
        // Extract plugin name from path
        // e.g., /path/cache/superpowers/skills -> superpowers
        const pluginName = basename(dirname(skillsPath));
        return {
          name: pluginName,
          skillsPath
        };
      });
    } catch (error) {
      return [];
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/plugin-scanner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin-scanner.ts tests/plugin-scanner.test.ts
git commit -m "feat: add plugin discovery scanner

- Auto-discover plugins from cache directory
- Extract plugin names and skill paths
- Use fast-glob for efficient scanning"
```

---

## Task 6: Core Sync Engine

**Files:**
- Create: `src/sync.ts`
- Create: `tests/sync.test.ts`

**Step 1: Write failing test for basic sync**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/sync.test.ts`
Expected: FAIL with "Cannot find module '../src/sync'"

**Step 3: Write SkillSyncer class**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/sync.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sync.ts tests/sync.test.ts
git commit -m "feat: add core sync engine

- Copy new skills to target directory
- Update modified skills safely
- Skip locally modified files
- Track sync results (copied/updated/skipped)"
```

---

## Task 7: CLI Interface - Basic Commands

**Files:**
- Modify: `src/cli.ts`
- Add dependency: `commander` package

**Step 1: Install commander**

Run: `npm install commander`

**Step 2: Write CLI scaffolding**

```typescript
// src/cli.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { Config } from './config';
import { RepoRegistry } from './registry';
import { join, resolve } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.claude/sync-config.json');

const program = new Command();

program
  .name('claude-sync')
  .description('Automatic synchronization of Claude skills across repositories')
  .version('0.1.0');

program
  .command('register')
  .description('Register current repository for syncing')
  .action(() => {
    const repoPath = resolve(process.cwd());
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);

    registry.register(repoPath);
    console.log(`✓ Registered ${repoPath}`);
  });

program
  .command('unregister')
  .description('Remove current repository from sync')
  .action(() => {
    const repoPath = resolve(process.cwd());
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);

    registry.unregister(repoPath);
    console.log(`✓ Unregistered ${repoPath}`);
  });

program
  .command('list')
  .description('Show all registered repositories')
  .action(() => {
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);
    const repos = registry.list();

    if (repos.length === 0) {
      console.log('No repositories registered');
      return;
    }

    console.log(`\nRegistered repositories (${repos.length}):\n`);
    repos.forEach(repo => {
      console.log(`  ${repo.path}`);
      console.log(`    Registered: ${repo.registered}`);
      if (repo.lastSync) {
        console.log(`    Last sync: ${repo.lastSync}`);
      }
      console.log();
    });
  });

program
  .command('status')
  .description('Show sync status of current repository')
  .action(() => {
    const repoPath = resolve(process.cwd());
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);

    if (registry.isRegistered(repoPath)) {
      const repos = registry.list();
      const repo = repos.find(r => r.path === repoPath);
      console.log('✓ Repository is registered');
      console.log(`  Registered: ${repo?.registered}`);
      if (repo?.lastSync) {
        console.log(`  Last sync: ${repo.lastSync}`);
      }
    } else {
      console.log('✗ Repository is not registered');
      console.log('  Run "claude-sync register" to enable syncing');
    }
  });

program.parse();
```

**Step 3: Test CLI manually**

Run: `npm run build && node dist/cli.js list`
Expected: "No repositories registered"

**Step 4: Test registration**

Run:
```bash
npm run build
node dist/cli.js register
node dist/cli.js list
```
Expected: Current directory listed

**Step 5: Commit**

```bash
git add src/cli.ts package.json package-lock.json
git commit -m "feat: add basic CLI commands

- register/unregister repositories
- list all registered repos
- show status of current repo
- Use commander for CLI parsing"
```

---

## Task 8: CLI - Sync Command

**Files:**
- Modify: `src/cli.ts`

**Step 1: Add sync command to CLI**

```typescript
// Add to src/cli.ts after other commands

import { SkillSyncer } from './sync';
import { FileHasher } from './hasher';
import { SyncMetadata } from './metadata';
import { PluginScanner } from './plugin-scanner';
import { existsSync } from 'fs';

program
  .command('run')
  .description('Sync skills to current repository')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Show only errors and warnings')
  .option('-a, --all', 'Sync all registered repositories')
  .action((options) => {
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);

    let repos: string[];

    if (options.all) {
      repos = registry.list().map(r => r.path);
      if (repos.length === 0) {
        console.log('No repositories registered');
        return;
      }
    } else {
      const repoPath = resolve(process.cwd());
      if (!registry.isRegistered(repoPath)) {
        console.error('✗ Repository not registered. Run "claude-sync register" first.');
        process.exit(1);
      }
      repos = [repoPath];
    }

    syncRepositories(repos, config, registry, options);
  });

function syncRepositories(
  repos: string[],
  config: Config,
  registry: RepoRegistry,
  options: { verbose?: boolean; quiet?: boolean }
): void {
  const configData = config.load();
  const scanner = new PluginScanner();

  // Discover plugins
  const plugins = scanner.findPlugins(configData.sources.pluginScanPath);

  for (const repoPath of repos) {
    if (!options.quiet) {
      console.log(`\nSyncing ${repoPath}...`);
    }

    const hasher = new FileHasher();
    const metadataPath = join(repoPath, '.claude/.sync-metadata.json');
    const metadata = new SyncMetadata(metadataPath);
    const syncer = new SkillSyncer(hasher, metadata);

    let totalCopied = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allSkippedFiles: string[] = [];

    // Sync user skills
    if (existsSync(configData.sources.userSkills)) {
      const result = syncer.sync(
        configData.sources.userSkills,
        join(repoPath, '.claude/skills')
      );
      totalCopied += result.copied;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      allSkippedFiles.push(...result.skippedFiles);
    }

    // Sync plugin skills
    for (const plugin of plugins) {
      if (configData.sources.excludePlugins.includes(plugin.name)) {
        continue;
      }

      const result = syncer.sync(
        plugin.skillsPath,
        join(repoPath, '.claude/skills', plugin.name)
      );
      totalCopied += result.copied;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      allSkippedFiles.push(...result.skippedFiles.map(f => `${plugin.name}/${f}`));
    }

    // Update last sync time
    registry.updateLastSync(repoPath);

    // Report results
    if (!options.quiet) {
      const total = totalCopied + totalUpdated;
      console.log(`✓ Synced ${total} skills (${totalCopied} new, ${totalUpdated} updated)`);

      if (totalSkipped > 0) {
        console.log(`⚠ Skipped ${totalSkipped} files (locally modified):`);
        allSkippedFiles.forEach(f => console.log(`  - ${f}`));
      }
    }

    if (options.verbose) {
      console.log(`  User skills: ${configData.sources.userSkills}`);
      console.log(`  Plugins: ${plugins.map(p => p.name).join(', ')}`);
    }
  }
}
```

**Step 2: Build and test**

Run:
```bash
npm run build
node dist/cli.js run
```
Expected: Error if not registered, or sync output if registered

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add sync command to CLI

- Sync user skills and plugin skills
- Support --all flag for all repos
- Support --verbose and --quiet flags
- Report sync results with warnings
- Update last sync timestamp"
```

---

## Task 9: CLI - Git Staging Integration

**Files:**
- Create: `src/git.ts`
- Modify: `src/cli.ts`

**Step 1: Write Git helper class**

```typescript
// src/git.ts
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export class GitHelper {
  isGitRepo(repoPath: string): boolean {
    return existsSync(join(repoPath, '.git'));
  }

  isClean(repoPath: string, relativePath: string): boolean {
    try {
      const status = execSync(
        `git status --porcelain "${relativePath}"`,
        { cwd: repoPath, encoding: 'utf-8' }
      );
      return status.trim() === '';
    } catch {
      return false;
    }
  }

  stageFiles(repoPath: string, relativePath: string): void {
    try {
      execSync(`git add "${relativePath}"`, { cwd: repoPath });
    } catch (error) {
      throw new Error(`Failed to stage files: ${error}`);
    }
  }

  isDetachedHead(repoPath: string): boolean {
    try {
      const output = execSync('git symbolic-ref -q HEAD', {
        cwd: repoPath,
        encoding: 'utf-8'
      });
      return false; // Has symbolic ref, not detached
    } catch {
      return true; // No symbolic ref, detached
    }
  }
}
```

**Step 2: Integrate git staging into sync**

```typescript
// Modify syncRepositories function in src/cli.ts

// Add at top of file
import { GitHelper } from './git';

// Inside syncRepositories, after sync completes:

    // Stage files in git if repo is clean
    const git = new GitHelper();
    if (git.isGitRepo(repoPath)) {
      if (git.isDetachedHead(repoPath)) {
        if (!options.quiet) {
          console.log('⚠ Repo in detached HEAD state - files updated but not staged');
        }
      } else {
        try {
          git.stageFiles(repoPath, '.claude/skills');
          if (options.verbose) {
            console.log('  Staged changes in git');
          }
        } catch (error) {
          console.error(`⚠ Failed to stage files: ${error}`);
        }
      }
    }
```

**Step 3: Build and test**

Run:
```bash
npm run build
node dist/cli.js run
git status  # Should show .claude/skills staged
```

**Step 4: Commit**

```bash
git add src/git.ts src/cli.ts
git commit -m "feat: add git staging integration

- Stage synced files automatically
- Detect detached HEAD state
- Skip staging in special git states
- Report git operations in verbose mode"
```

---

## Task 10: Shell Hook Installation

**Files:**
- Create: `src/hooks.ts`
- Modify: `src/cli.ts`

**Step 1: Write HookManager class**

```typescript
// src/hooks.ts
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const HOOK_MARKER_START = '# Claude Skills Auto-Sync - START';
const HOOK_MARKER_END = '# Claude Skills Auto-Sync - END';

const ZSH_HOOK = `
${HOOK_MARKER_START}
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent 2>/dev/null; then
    claude-sync run --quiet
  fi
}
autoload -U add-zsh-hook 2>/dev/null
add-zsh-hook chpwd _claude_sync_on_cd 2>/dev/null
${HOOK_MARKER_END}
`;

const BASH_HOOK = `
${HOOK_MARKER_START}
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent 2>/dev/null; then
    claude-sync run --quiet
  fi
}
PROMPT_COMMAND="_claude_sync_on_cd; \${PROMPT_COMMAND}"
${HOOK_MARKER_END}
`;

export class HookManager {
  install(): void {
    const shell = process.env.SHELL || '';

    if (shell.includes('zsh')) {
      this.installToFile(join(homedir(), '.zshrc'), ZSH_HOOK);
      console.log('✓ Installed hooks to ~/.zshrc');
    } else if (shell.includes('bash')) {
      this.installToFile(join(homedir(), '.bashrc'), BASH_HOOK);
      console.log('✓ Installed hooks to ~/.bashrc');
    } else {
      throw new Error(`Unsupported shell: ${shell}. Only zsh and bash are supported.`);
    }

    console.log('\nRestart your shell or run:');
    console.log('  source ~/.zshrc  (zsh)');
    console.log('  source ~/.bashrc (bash)');
  }

  uninstall(): void {
    const files = [
      join(homedir(), '.zshrc'),
      join(homedir(), '.bashrc')
    ];

    for (const file of files) {
      if (existsSync(file)) {
        const removed = this.removeFromFile(file);
        if (removed) {
          console.log(`✓ Removed hooks from ${file}`);
        }
      }
    }
  }

  private installToFile(rcFile: string, hook: string): void {
    if (!existsSync(rcFile)) {
      writeFileSync(rcFile, hook);
      return;
    }

    const content = readFileSync(rcFile, 'utf-8');

    // Check if already installed
    if (content.includes(HOOK_MARKER_START)) {
      // Remove old version
      this.removeFromFile(rcFile);
    }

    // Append new hook
    appendFileSync(rcFile, '\n' + hook);
  }

  private removeFromFile(rcFile: string): boolean {
    const content = readFileSync(rcFile, 'utf-8');
    const lines = content.split('\n');

    let insideHook = false;
    const filtered = lines.filter(line => {
      if (line.includes(HOOK_MARKER_START)) {
        insideHook = true;
        return false;
      }
      if (line.includes(HOOK_MARKER_END)) {
        insideHook = false;
        return false;
      }
      return !insideHook;
    });

    if (filtered.length !== lines.length) {
      writeFileSync(rcFile, filtered.join('\n'));
      return true;
    }

    return false;
  }
}
```

**Step 2: Add hook commands to CLI**

```typescript
// Add to src/cli.ts

import { HookManager } from './hooks';

program
  .command('install-hooks')
  .description('Install shell hooks for automatic syncing')
  .action(() => {
    try {
      const hooks = new HookManager();
      hooks.install();
    } catch (error) {
      console.error(`✗ ${error}`);
      process.exit(1);
    }
  });

program
  .command('uninstall-hooks')
  .description('Remove shell hooks')
  .action(() => {
    const hooks = new HookManager();
    hooks.uninstall();
  });

program
  .command('is-registered')
  .description('Check if current repo is registered (for hooks)')
  .option('--silent', 'No output, exit code only')
  .action((options) => {
    const repoPath = resolve(process.cwd());
    const config = new Config(CONFIG_PATH);
    const registry = new RepoRegistry(config);

    const registered = registry.isRegistered(repoPath);

    if (!options.silent) {
      console.log(registered ? 'yes' : 'no');
    }

    process.exit(registered ? 0 : 1);
  });
```

**Step 3: Build and test**

Run:
```bash
npm run build
node dist/cli.js install-hooks
```
Expected: Hooks installed to shell rc file

**Step 4: Commit**

```bash
git add src/hooks.ts src/cli.ts
git commit -m "feat: add shell hook installation

- Install hooks to .zshrc or .bashrc
- Trigger sync on cd into registered repos
- Support uninstall
- Add is-registered command for hooks"
```

---

## Task 11: Error Handling & Polish

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/sync.ts`

**Step 1: Add error handling to sync**

```typescript
// Modify syncRepositories in src/cli.ts to wrap in try-catch

function syncRepositories(
  repos: string[],
  config: Config,
  registry: RepoRegistry,
  options: { verbose?: boolean; quiet?: boolean }
): void {
  const configData = config.load();
  const scanner = new PluginScanner();

  // Discover plugins
  let plugins: any[] = [];
  try {
    plugins = scanner.findPlugins(configData.sources.pluginScanPath);
  } catch (error) {
    console.error(`⚠ Failed to scan plugins: ${error}`);
  }

  for (const repoPath of repos) {
    try {
      if (!existsSync(repoPath)) {
        console.error(`✗ Repository not found: ${repoPath}`);
        continue;
      }

      // ... rest of sync logic wrapped in try-catch

    } catch (error) {
      console.error(`✗ Failed to sync ${repoPath}: ${error}`);
      if (options.verbose) {
        console.error(error);
      }
    }
  }
}
```

**Step 2: Add .gitignore check**

```typescript
// Add to src/sync.ts

import { existsSync, readFileSync, appendFileSync } from 'fs';

export class SkillSyncer {
  // ... existing code ...

  ensureGitignore(repoPath: string): void {
    const gitignorePath = join(repoPath, '.claude/.gitignore');
    const metadataEntry = '.sync-metadata.json\n';

    if (!existsSync(gitignorePath)) {
      mkdirSync(dirname(gitignorePath), { recursive: true });
      writeFileSync(gitignorePath, metadataEntry);
      return;
    }

    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.sync-metadata.json')) {
      appendFileSync(gitignorePath, metadataEntry);
    }
  }
}

// Call in syncRepositories before sync:
syncer.ensureGitignore(repoPath);
```

**Step 3: Test error cases**

Run various error scenarios:
```bash
# Test with non-existent repo path
# Test with invalid permissions
# Test with corrupted config
```

**Step 4: Commit**

```bash
git add src/cli.ts src/sync.ts
git commit -m "feat: add error handling and polish

- Wrap sync operations in try-catch
- Handle missing repos gracefully
- Auto-create .claude/.gitignore
- Ensure .sync-metadata.json is ignored
- Improve error messages"
```

---

## Task 12: Update Package.json & Build

**Files:**
- Modify: `package.json`

**Step 1: Update package.json scripts**

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build",
    "postinstall": "echo 'Run: claude-sync install-hooks'"
  }
}
```

**Step 2: Add jest configuration**

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"]
  }
}
```

**Step 3: Install jest dependencies**

Run: `npm install --save-dev jest ts-jest @types/jest`

**Step 4: Build and test everything**

Run:
```bash
npm run build
npm test
```
Expected: All tests pass

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: configure build and test tooling

- Add jest configuration
- Update npm scripts
- Add postinstall message
- Install testing dependencies"
```

---

## Task 13: Documentation & README

**Files:**
- Modify: `README.md`
- Create: `docs/CONTRIBUTING.md`

**Step 1: Update README with usage examples**

Add detailed usage examples, installation instructions, and troubleshooting section to README.md

**Step 2: Create contributing guide**

```markdown
# Contributing to Claude Skills Auto-Sync

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## Testing

All features should have test coverage. Run tests with:

```bash
npm test
```

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs

## Submitting Changes

1. Create a feature branch
2. Make changes with tests
3. Ensure all tests pass
4. Submit pull request
```

**Step 3: Commit**

```bash
git add README.md docs/CONTRIBUTING.md
git commit -m "docs: update README and add contributing guide

- Add detailed usage examples
- Document all CLI commands
- Add troubleshooting section
- Create contributing guidelines"
```

---

## Final Steps

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Build production version**

Run: `npm run build`
Expected: Clean build with no errors

**Step 3: Final commit and push**

```bash
git add .
git commit -m "chore: final polish for v0.1.0 release"
git push origin dev/implementation
```

**Step 4: Review with @superpowers:requesting-code-review**

Use the requesting-code-review skill to verify the implementation meets requirements.

---

## Success Criteria Checklist

- [ ] Config management loads/saves configuration
- [ ] Repository registration tracks repos
- [ ] File hashing detects changes
- [ ] Sync metadata tracks file states
- [ ] Plugin scanner discovers plugins
- [ ] Sync engine copies/updates/skips files correctly
- [ ] CLI commands all work (register, list, status, run, install-hooks)
- [ ] Git staging integration works
- [ ] Shell hooks install correctly
- [ ] Error handling is robust
- [ ] All tests pass
- [ ] Documentation is complete

## Notes

- Follow TDD: test first, then implementation
- Commit after each task completion
- Use exact file paths in all code
- Test edge cases (missing files, permissions, etc.)
- Keep functions small and focused
