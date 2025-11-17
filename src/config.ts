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
