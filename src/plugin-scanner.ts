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
