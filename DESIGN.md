# Claude Skills Auto-Sync Design

**Date:** 2025-11-17
**Status:** Approved

## Problem Statement

Managing Claude skills across multiple repositories is cumbersome:
- 51 custom user skills in `~/.claude/skills/`
- 32 plugin skills from superpowers in `~/.claude/plugins/cache/superpowers/skills/`
- Need to manually copy/update skills to each project's `.claude/skills/` directory
- Skills must be committed to git for Claude Code online handoff
- Working across 5+ active repositories simultaneously
- New skills added regularly, keeping everything in sync is tedious

## Solution Overview

Build an automatic skills synchronization system that:
- Monitors central skill sources (`~/.claude/skills/` and plugin directories)
- Automatically syncs skills to registered project repositories
- Triggers on shell hooks (cd into repo, Claude Code start)
- Stages changes but doesn't auto-commit
- Detects and preserves local skill modifications
- Handles plugin discovery automatically

## Architecture

### Components

**1. Central Skill Sources**
- `~/.claude/skills/` - Git repository containing custom skills (source of truth)
- `~/.claude/plugins/cache/*/skills/` - Plugin-provided skills (auto-discovered)

**2. Sync Manager (`claude-sync` CLI)**
- Tracks registered repositories in `~/.claude/sync-config.json`
- Performs file synchronization with conflict detection
- Fast execution (<1 second typical)
- Handles git staging operations

**3. Shell Integration**
- Hooks on `cd` into registered repos
- Integration with Claude Code CLI startup
- Optional pre-commit hook for safety

### Data Flow

```
~/.claude/skills/ (git repo)
         ↓
    [user edits & commits]
         ↓
~/.claude/plugins/cache/*/skills/
         ↓
    [shell hook triggers]
         ↓
   claude-sync runs
         ↓
  .claude/skills/ in project repos
         ↓
    [git stage changes]
         ↓
  [user commits when ready]
```

## Repository Registration

### Auto-Registration
- First use of Claude Code CLI in a repo triggers auto-registration
- Creates `.claude/skills/` directory if needed
- Adds repo path to sync config

### Manual Control
```bash
claude-sync register      # Register current repo
claude-sync unregister    # Remove current repo
claude-sync list          # Show all registered repos
claude-sync status        # Show sync state of current repo
```

### Config Structure

**`~/.claude/sync-config.json`:**
```json
{
  "repos": [
    {
      "path": "/Users/you/projects/myapp",
      "registered": "2025-11-17T10:00:00Z",
      "lastSync": "2025-11-17T11:20:00Z"
    }
  ],
  "sources": {
    "userSkills": "~/.claude/skills",
    "pluginScanPath": "~/.claude/plugins/cache/*/skills",
    "excludePlugins": [],
    "customPluginPaths": []
  }
}
```

## Sync Logic

### Process Flow

**For each registered repository:**

1. **Collect source skills**
   - Scan `~/.claude/skills/**/*.md`
   - Auto-discover plugin directories matching `~/.claude/plugins/cache/*/skills`
   - Build complete source file list with hashes

2. **Compare with repo's `.claude/skills/`**
   - **New files** → Copy to repo
   - **Updated files** → Check for local modifications
     - Unmodified (hash matches last sync) → Overwrite
     - Modified locally → Skip and warn
   - **Deleted files** → Log notification (don't auto-delete)
   - **Plugin structure** → Preserve in `.claude/skills/plugin-name/`

3. **Track sync metadata**
   - Store in `.claude/.sync-metadata.json` (gitignored)
   - Contains file hashes from last sync
   - Used to detect local modifications

4. **Git operations**
   - Stage all updated files: `git add .claude/skills/`
   - Skip staging if working directory is dirty in `.claude/skills/`
   - Never auto-commit

### Conflict Detection

**Modified files are preserved:**
```
✓ Synced 80 skills to /Users/you/projects/myapp
⚠ Skipped 3 files (locally modified):
  - .claude/skills/custom-workflow.md
  - .claude/skills/superpowers/tweaked-debugging.md
  - .claude/skills/experimental-feature.md
```

**Deleted files are logged:**
```
ℹ 2 files deleted from central source (still in repo):
  - old-skill.md (delete manually if no longer needed)
  - deprecated-workflow.md
```

## Shell Integration

### Installation

```bash
claude-sync install-hooks
```

Adds to `~/.zshrc` or `~/.bashrc`:

```bash
# Claude Skills Auto-Sync
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent; then
    claude-sync run --quiet
  fi
}

autoload -U add-zsh-hook
add-zsh-hook chpwd _claude_sync_on_cd
```

### Hook Behavior

- **On `cd`:** Runs sync quietly in registered repos (warnings only)
- **Claude Code start:** Built into CLI startup sequence
- **Pre-commit (optional):** Per-repo hook to ensure skills staged

### Performance

- Runs in background (non-blocking)
- File hashing skips unchanged files
- Typical runtime: 100-300ms for 80+ skills
- Only activates in registered repos

### Manual Commands

```bash
claude-sync run              # Sync current repo
claude-sync run --all        # Sync all registered repos
claude-sync run --verbose    # Detailed output
```

## Plugin Discovery

### Auto-Scan Approach

- Scan `~/.claude/plugins/cache/*/skills/` on each sync
- Cache discovered plugins in config for visibility
- Allow manual exclusion via config
- Support custom plugin paths

### Benefits

- New plugins appear automatically
- Plugin updates included immediately
- Removed plugins naturally disappear
- Low overhead (directory scan <100ms)

## Error Handling

### Common Scenarios

**Repo in special state (detached HEAD, rebase):**
- Skip git operations
- Update files only
- Warn user

**Skills directory setup:**
- Ensure `.sync-metadata.json` is gitignored
- Auto-add to `.gitignore` if needed

**Nested repos / monorepos:**
- Respect `.git` boundaries
- Sync to root repo only
- Allow manual submodule registration

**Permission errors:**
- Clear error messages with paths
- Log to `~/.claude/sync.log`
- Disable problematic sources temporarily

**Concurrent syncs:**
- Lock file prevents simultaneous syncs to same repo
- 30-second timeout on stale locks

**Orphaned plugin skills:**
- `claude-sync clean` command to review and remove

**Large repo counts (50+):**
- Progress bar for `--all` operations
- Parallel sync with configurable workers
- Auto-unregister repos unused for 90+ days (optional)

## Initial Setup

### Installation Flow

```bash
# 1. Install sync tool
npm install -g @claude/sync-skills

# 2. Initialize skills as git repo
cd ~/.claude/skills
git init
git add .
git commit -m "Initial commit: my Claude skills"
git remote add origin git@github.com:username/claude-skills.git
git push -u origin main

# 3. Install shell hooks
claude-sync install-hooks

# 4. Register existing projects
cd ~/projects/myapp
claude-sync register  # Auto-syncs on registration
```

### Existing Repos Migration

For repos with existing `.claude/skills/`:
- First sync detects all existing files
- Compares with central sources
- Prompts: "Overwrite all, skip all, or review each?"
- Establishes baseline for future syncs

### Uninstallation

```bash
claude-sync uninstall-hooks   # Remove shell integration
claude-sync unregister --all  # Clear registered repos
npm uninstall -g @claude/sync-skills
```

Repos retain their `.claude/skills/` content (syncing just stops).

## Implementation

### Technology Stack

**Language:** Node.js/TypeScript
- Native to Claude Code ecosystem
- Fast file operations
- Easy shell integration
- Cross-platform support
- Distributable via npm

**Key Dependencies:**
- `fast-glob` - Fast directory scanning
- `glob` - Pattern matching
- `crypto` - File hashing
- Native `fs` and `child_process` - File and git operations

### Project Structure

```
claude-sync/
├── src/
│   ├── cli.ts          # Command-line interface
│   ├── sync.ts         # Core sync logic
│   ├── registry.ts     # Repo registration
│   ├── hooks.ts        # Shell hook installation
│   └── config.ts       # Config management
├── tests/
│   ├── sync.test.ts
│   ├── registry.test.ts
│   └── hooks.test.ts
├── package.json
└── README.md
```

### Development Phases

1. **Core sync engine** (4-6 hours)
   - File hashing and comparison
   - Copy/update logic
   - Conflict detection
   - Metadata tracking

2. **Registration & config** (2-3 hours)
   - Config file management
   - Repo registration
   - Plugin discovery

3. **Shell integration** (2-3 hours)
   - Hook installation
   - Shell rc file modification
   - Claude Code CLI integration

4. **Polish & edge cases** (2-3 hours)
   - Error handling
   - CLI output formatting
   - Documentation

**Total estimate:** 8-12 hours

### Deliverables

1. `claude-sync` CLI tool (npm package)
2. Comprehensive README documentation
3. `~/.claude/skills/` initialized as git repo
4. Shell hooks installed and tested
5. Initial repo registration

## Success Criteria

- Skills sync automatically when entering registered repos
- Local modifications are preserved (never overwritten)
- New skills appear in all repos within seconds of `cd`
- Plugin skills automatically discovered and synced
- Zero manual intervention for day-to-day workflow
- Can hand off to Claude Code online with confidence that skills are current
