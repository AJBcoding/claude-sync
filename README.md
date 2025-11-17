# Claude Skills Auto-Sync

Automatic synchronization of Claude skills across project repositories.

## Problem

Managing Claude skills across multiple repositories is cumbersome:
- 50+ custom skills need to be copied to each project
- Plugin skills (like superpowers) must be included in each repo
- Skills must be committed to git for Claude Code online handoff
- Keeping everything in sync manually is tedious and error-prone

## Solution

`claude-sync` automatically syncs your Claude skills to project repositories:
- ✅ Automatic sync via shell hooks (triggers on `cd`)
- ✅ Preserves local skill modifications
- ✅ Auto-discovers plugin skills
- ✅ Fast (<1 second) and lightweight
- ✅ Stages changes but lets you control commits

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Git installed and available in PATH
- Bash or Zsh shell (for automatic sync hooks)

### Install from npm

```bash
npm install -g @claude/sync-skills
```

### Verify Installation

```bash
claude-sync --version
```

## Quick Start

### 1. Initialize Your Skills Directory

First, make your user skills directory a git repository (if not already):

```bash
cd ~/.claude/skills
git init
git add .
git commit -m "Initial skills"
```

### 2. Install Shell Hooks (Recommended)

Install shell hooks for automatic syncing when you change directories:

```bash
claude-sync install-hooks
```

Then restart your shell or run:
```bash
source ~/.zshrc   # for zsh
source ~/.bashrc  # for bash
```

### 3. Register Your Projects

Navigate to any project and register it:

```bash
cd ~/projects/myapp
claude-sync register
```

Now skills will automatically sync when you `cd` into this directory!

## How It Works

1. Your `~/.claude/skills/` becomes a git repository (source of truth)
2. Plugin skills are auto-discovered from `~/.claude/plugins/cache/*/skills/`
3. Shell hooks trigger sync when you `cd` into registered repos
4. Skills are copied to `.claude/skills/` in each project
5. Changes are staged automatically (you commit when ready)

## Usage

### Register Repositories

Register the current directory for automatic syncing:

```bash
cd ~/projects/myapp
claude-sync register
```

Output:
```
✓ Registered /Users/you/projects/myapp
```

### Check Registration Status

Check if the current directory is registered:

```bash
claude-sync status
```

Output:
```
✓ Repository is registered
  Registered: 2025-11-17T10:30:00.000Z
  Last sync: 2025-11-17T12:45:00.000Z
```

### List All Registered Repositories

See all repositories configured for syncing:

```bash
claude-sync list
```

Output:
```
Registered repositories (3):

  /Users/you/projects/myapp
    Registered: 2025-11-17T10:30:00.000Z
    Last sync: 2025-11-17T12:45:00.000Z

  /Users/you/projects/another-project
    Registered: 2025-11-17T11:15:00.000Z
    Last sync: 2025-11-17T13:20:00.000Z
```

### Manual Sync

Sync the current repository manually:

```bash
claude-sync run
```

Output:
```
Syncing /Users/you/projects/myapp...
✓ Synced 47 skills (2 new, 1 updated)
```

### Sync All Repositories

Sync all registered repositories at once:

```bash
claude-sync run --all
```

### Verbose Output

Get detailed information about what's being synced:

```bash
claude-sync run --verbose
```

Output:
```
Syncing /Users/you/projects/myapp...
✓ Synced 47 skills (2 new, 1 updated)
  Staged changes in git
  User skills: /Users/you/.claude/skills
  Plugins: superpowers, custom-plugin
```

### Quiet Mode

Run sync with minimal output (useful for automated hooks):

```bash
claude-sync run --quiet
```

Only errors and warnings will be shown.

### Unregister a Repository

Remove the current directory from syncing:

```bash
claude-sync unregister
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `claude-sync register` | Register current repo for syncing |
| `claude-sync unregister` | Remove current repo from sync |
| `claude-sync list` | Show all registered repos |
| `claude-sync status` | Show sync state of current repo |
| `claude-sync run` | Manually sync current repo |
| `claude-sync run --all` | Sync all registered repos |
| `claude-sync run --verbose` | Sync with detailed output |
| `claude-sync run --quiet` | Sync with minimal output |
| `claude-sync install-hooks` | Install shell integration |
| `claude-sync uninstall-hooks` | Remove shell integration |
| `claude-sync is-registered` | Check if repo is registered (for scripts) |
| `claude-sync --version` | Show version number |
| `claude-sync --help` | Show help information |

## Features

### Conflict Detection

Local skill modifications are never overwritten. If you modify a skill in a project, it won't be updated during sync:

```bash
Syncing /Users/you/projects/myapp...
✓ Synced 45 skills (0 new, 0 updated)
⚠ Skipped 2 files (locally modified):
  - my-custom-skill.md
  - superpowers/debugging-workflow.md
```

### Plugin Discovery

Plugins installed in `~/.claude/plugins/cache/` are automatically discovered and synced:

```bash
# Plugins are organized by name
.claude/skills/
  superpowers/
    brainstorming.md
    systematic-debugging.md
  custom-plugin/
    my-skill.md
```

### Fast Sync

File hashing ensures only changed files are processed:
- Unchanged files are skipped (no copy operation)
- Only new or modified files are synced
- Typical sync time: <1 second

### Git Integration

Changes are automatically staged but never committed:

```bash
$ claude-sync run
✓ Synced 47 skills (2 new, 1 updated)

$ git status
Changes to be committed:
  modified:   .claude/skills/my-skill.md
  new file:   .claude/skills/new-skill.md
```

This gives you control over when to commit skill updates.

## Configuration

Configuration is stored in `~/.claude/sync-config.json`:

```json
{
  "repos": [
    {
      "path": "/Users/you/projects/myapp",
      "registered": "2025-11-17T10:30:00.000Z",
      "lastSync": "2025-11-17T12:45:00.000Z"
    }
  ],
  "sources": {
    "userSkills": "/Users/you/.claude/skills",
    "pluginScanPath": "/Users/you/.claude/plugins/cache/*/skills",
    "excludePlugins": [],
    "customPluginPaths": []
  }
}
```

### Excluding Plugins

To exclude specific plugins from syncing, add them to `excludePlugins`:

```json
{
  "sources": {
    "excludePlugins": ["unwanted-plugin", "another-plugin"]
  }
}
```

## Troubleshooting

### Skills Not Syncing

**Problem**: Changed a skill but it's not syncing to projects.

**Solutions**:
1. Check if the skill directory is a git repo:
   ```bash
   cd ~/.claude/skills
   git status
   ```
   If not initialized, run:
   ```bash
   git init
   git add .
   git commit -m "Initial skills"
   ```

2. Verify the repository is registered:
   ```bash
   cd ~/projects/myapp
   claude-sync status
   ```

3. Try manual sync:
   ```bash
   claude-sync run --verbose
   ```

### Shell Hooks Not Working

**Problem**: Skills don't sync automatically when changing directories.

**Solutions**:
1. Verify hooks are installed:
   ```bash
   cat ~/.zshrc | grep claude-sync
   ```
   or
   ```bash
   cat ~/.bashrc | grep claude-sync
   ```

2. Reinstall hooks:
   ```bash
   claude-sync uninstall-hooks
   claude-sync install-hooks
   source ~/.zshrc  # or ~/.bashrc
   ```

3. Check if repo is registered:
   ```bash
   claude-sync is-registered
   echo $?  # Should output 0 if registered
   ```

### Skills Marked as "Locally Modified"

**Problem**: Skills are being skipped with "locally modified" warning.

**Explanation**: This is intentional! The tool detected you modified the skill locally and won't overwrite your changes.

**Solutions**:
1. If you want to keep local changes: No action needed
2. If you want to accept source version:
   ```bash
   cd ~/projects/myapp
   git checkout .claude/skills/problem-skill.md
   claude-sync run
   ```

3. If you want to update the source:
   ```bash
   cp ~/projects/myapp/.claude/skills/problem-skill.md ~/.claude/skills/
   cd ~/.claude/skills
   git add problem-skill.md
   git commit -m "Update problem-skill from project"
   ```

### Permission Errors

**Problem**: Getting permission denied errors.

**Solutions**:
1. Check file permissions:
   ```bash
   ls -la ~/.claude/skills
   ```

2. Ensure you own the skills directory:
   ```bash
   sudo chown -R $USER ~/.claude/skills
   ```

3. Check if files are locked or in use

### Git Not Staging Files

**Problem**: Files are synced but not staged in git.

**Solutions**:
1. Check if repo is in detached HEAD state:
   ```bash
   git status
   ```
   If detached, checkout a branch:
   ```bash
   git checkout main
   ```

2. Check if .claude/skills is gitignored:
   ```bash
   cat .gitignore | grep claude
   ```

3. Manually stage if needed:
   ```bash
   git add .claude/skills
   ```

### Sync Metadata Conflicts

**Problem**: `.sync-metadata.json` causing issues.

**Solution**: This file should be gitignored (automatic). If you see it in git:
```bash
cd ~/projects/myapp
git rm --cached .claude/.sync-metadata.json
echo '.sync-metadata.json' >> .claude/.gitignore
git add .claude/.gitignore
git commit -m "Ignore sync metadata"
```

### Plugin Skills Not Appearing

**Problem**: Plugins installed but skills aren't syncing.

**Solutions**:
1. Verify plugin directory structure:
   ```bash
   ls -la ~/.claude/plugins/cache/*/skills
   ```

2. Check if plugin is excluded in config:
   ```bash
   cat ~/.claude/sync-config.json
   ```

3. Try manual sync with verbose output:
   ```bash
   claude-sync run --verbose
   ```

### Multiple Git Worktrees

**Problem**: Using git worktrees and sync behaves unexpectedly.

**Solution**: Each worktree is treated as a separate repository. Register each worktree individually:
```bash
cd ~/projects/myapp/.worktrees/feature-branch
claude-sync register
```

## Best Practices

1. **Keep skills in git**: Always commit your user skills to version control
2. **Review before committing**: Check synced changes before committing to projects
3. **Use meaningful commits**: Commit skill updates separately from code changes
4. **Test skills locally**: Modify skills in projects, test them, then promote to user skills
5. **Regular syncs**: Run `claude-sync run --all` occasionally to ensure all projects are up-to-date

## Documentation

- [DESIGN.md](DESIGN.md) - Complete architecture and implementation details
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development and contribution guidelines

## Support

For issues and feature requests, please open an issue on GitHub.

## License

MIT
