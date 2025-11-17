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
