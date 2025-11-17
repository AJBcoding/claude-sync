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
