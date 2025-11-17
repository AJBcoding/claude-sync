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
