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
