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
