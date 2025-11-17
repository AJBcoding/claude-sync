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
