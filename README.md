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

## Quick Start

```bash
# Install
npm install -g @claude/sync-skills

# Initialize your skills as a git repo
cd ~/.claude/skills
git init
git add .
git commit -m "Initial skills"

# Install shell hooks
claude-sync install-hooks

# Register a project
cd ~/projects/myapp
claude-sync register
```

## How It Works

1. Your `~/.claude/skills/` becomes a git repository (source of truth)
2. Plugin skills are auto-discovered from `~/.claude/plugins/cache/*/skills/`
3. Shell hooks trigger sync when you `cd` into registered repos
4. Skills are copied to `.claude/skills/` in each project
5. Changes are staged (you commit when ready)

## Commands

```bash
claude-sync register           # Register current repo for syncing
claude-sync unregister         # Remove current repo
claude-sync list               # Show all registered repos
claude-sync status             # Show sync state of current repo
claude-sync run                # Manually sync current repo
claude-sync run --all          # Sync all registered repos
claude-sync install-hooks      # Install shell integration
claude-sync uninstall-hooks    # Remove shell integration
```

## Features

- **Conflict Detection**: Local skill modifications are never overwritten
- **Plugin Discovery**: Automatically finds and syncs plugin skills
- **Fast**: File hashing skips unchanged files
- **Safe**: Stages changes but never auto-commits
- **Flexible**: Manual and automatic modes

## Documentation

See [DESIGN.md](DESIGN.md) for complete architecture and implementation details.

## License

MIT
