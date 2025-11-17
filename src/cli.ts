#!/usr/bin/env node

import { Command } from 'commander';
import { Config } from './config';
import { RepoRegistry } from './registry';
import { SkillSyncer } from './sync';
import { FileHasher } from './hasher';
import { SyncMetadata } from './metadata';
import { PluginScanner } from './plugin-scanner';
import { HookManager } from './hooks';
import { GitHelper } from './git';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

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

      if (!options.quiet) {
        console.log(`\nSyncing ${repoPath}...`);
      }

      const hasher = new FileHasher();
      const metadataPath = join(repoPath, '.claude/.sync-metadata.json');
      const metadata = new SyncMetadata(metadataPath);
      const syncer = new SkillSyncer(hasher, metadata);

      // Ensure .gitignore exists
      syncer.ensureGitignore(repoPath);

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
    } catch (error) {
      console.error(`✗ Failed to sync ${repoPath}: ${error}`);
      if (options.verbose) {
        console.error(error);
      }
    }
  }
}

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

program.parse();
