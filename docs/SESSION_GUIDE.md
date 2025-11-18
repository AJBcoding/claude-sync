# Claude Skills Auto-Sync - Complete Usage Guide

This guide covers everything you need to know about managing your Claude skills across multiple repositories.

## Table of Contents
- [Quick Start](#quick-start)
- [Daily Workflow](#daily-workflow)
- [How It Works](#how-it-works)
- [Managing Skills](#managing-skills)
- [Managing Repositories](#managing-repositories)
- [Shell Hooks - Pros & Cons](#shell-hooks---pros--cons)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Initial Setup (One Time)

1. **Install the tool:**
   ```bash
   cd ~/PycharmProjects/claude-sync
   npm install
   npm link
   ```

2. **Register your repositories:**
   ```bash
   cd ~/path/to/your/project
   claude-sync register
   ```

3. **Sync skills:**
   ```bash
   claude-sync run --all
   ```

### Your Current Setup

**Skill Sources:**
- User skills: `~/.claude/skills/` (30 skills, 57 files)
- Plugin skills: `~/.claude/plugins/cache/superpowers/skills/` (21 skills, 32 files)

**Registered Repositories (7):**
1. fitbod-project
2. hearing-test-tracker
3. KCRWscrape
4. knowledge-extraction-suite
5. Python419
6. Sticky To Do
7. Claude Skill Eval

**Total synced per repo:** 88 markdown files (50 SKILL.md + 38 supporting docs)

---

## Daily Workflow

### Updating Skills and Syncing to All Projects

This is the **recommended workflow** without shell hooks:

```bash
# 1. Edit your skills
cd ~/.claude/skills
vim skill-name/SKILL.md

# 2. Commit changes to skills repository
git add .
git commit -m "Update skill description"

# 3. Sync to all registered projects
claude-sync run --all

# 4. Commit changes in each project (if tracking skills in git)
cd ~/path/to/project
git add .claude/skills
git commit -m "sync: update skills from central repository"
git push
```

### Adding a New Repository

```bash
cd ~/path/to/new/project
claude-sync register
claude-sync run
```

**Important:** Registration is **manual** - new repositories are NOT automatically detected.

---

## How It Works

### Architecture

```
~/.claude/skills/                    # Central repository (source of truth)
├── skill-1/SKILL.md
├── skill-2/SKILL.md
└── ...

~/.claude/plugins/cache/             # Plugin skills (auto-discovered)
└── superpowers/skills/
    ├── brainstorming/SKILL.md
    └── ...

~/projects/my-app/.claude/skills/    # Synced copy
├── skill-1/SKILL.md                 # Synced from central
├── skill-2/SKILL.md
├── superpowers/                     # Synced from plugins
└── .sync-metadata.json              # Sync state (gitignored)
```

### Conflict Detection System

The tool uses **three-way comparison** to detect local modifications:

1. **Source hash** - SHA256 of file in `~/.claude/skills/`
2. **Target hash** - SHA256 of current file in project
3. **Last sync hash** - Stored in `.sync-metadata.json`

**Logic:**
- If `target_hash == last_sync_hash` → Safe to update (you haven't modified it)
- If `target_hash != last_sync_hash` → **SKIP** (preserves your local changes)
- If no metadata → **SKIP** (can't verify, plays it safe)

**Example:**
```bash
# You edit a skill locally
vim .claude/skills/my-skill/SKILL.md

# Next sync will skip this file
claude-sync run
# Output: ⚠ Skipped 1 file (locally modified)
```

### What Gets Synced

**Included:**
- All `.md` files from `~/.claude/skills/`
- All `.md` files from plugin directories
- `.claude/.gitignore` (creates it if missing)

**Excluded (gitignored):**
- `.claude/.sync-metadata.json` (sync state, machine-specific)

**Git Integration:**
- Synced files are automatically staged (`git add`)
- You commit and push when ready
- Works with detached HEAD (warns but doesn't stage)

---

## Managing Skills

### Skill Repository Structure

```bash
~/.claude/skills/
├── skill-name/
│   ├── SKILL.md              # Main skill file (required)
│   ├── examples.md           # Optional supporting docs
│   └── reference.md
└── another-skill/
    └── SKILL.md
```

**Best Practices:**
- ✅ One skill per directory
- ✅ Main file must be named `SKILL.md`
- ✅ Skills directory must be a git repository
- ✅ Commit changes before syncing

### Renaming Skills

We standardized 4 skills from custom names to `SKILL.md`:
- `documenting-sessions/documenting-sessions.md` → `SKILL.md`
- `managing-handoffs/managing-handoffs.md` → `SKILL.md`
- `managing-imports/managing-imports.md` → `SKILL.md`
- `project-status/project-status.md` → `SKILL.md`

**To rename more:**
```bash
cd ~/.claude/skills/skill-name
mv old-name.md SKILL.md
git add .
git commit -m "Standardize skill file naming"
claude-sync run --all
```

### Validating Your Skills Repository

```bash
# Check which directories have SKILL.md
for dir in ~/.claude/skills/*/; do
  dirname=$(basename "$dir")
  if [ -f "$dir/SKILL.md" ]; then
    echo "✓ $dirname"
  else
    echo "✗ $dirname - NO SKILL.md"
  fi
done
```

**Invalid directories found:**
- `career/` - Just a README (documentation, not a skill)
- `shared/` - Empty directory

These won't sync and should be cleaned up.

---

## Managing Repositories

### Checking Registration Status

```bash
# List all registered repos
claude-sync list

# Check if current directory is registered
claude-sync is-registered

# See current status
claude-sync status
```

### Unregistering a Repository

```bash
cd ~/path/to/project
claude-sync unregister
```

**Note:** This removes from config but doesn't delete the `.claude/skills/` directory.

### Fixing Skipped File Issues

If you see many "skipped files" warnings, it means files exist locally but aren't tracked in metadata.

**Solution 1: Clean Re-sync** (recommended if files are identical):
```bash
cd ~/path/to/project

# Backup first
cp -r .claude/skills .claude/skills.backup

# Clean sync
rm -rf .claude/skills
rm .claude/.sync-metadata.json
claude-sync run

# Verify
ls .claude/skills/
```

**Solution 2: Accept the status quo** (if files rarely change):
- Plugin skills will continue to auto-sync
- User skills with conflicts won't update
- Manually update when needed

---

## Shell Hooks - Pros & Cons

### What Shell Hooks Do

Automatically run `claude-sync run --quiet` **every time** you `cd` into a registered git repository.

### Installation

```bash
# Install hooks
claude-sync install-hooks

# Reload shell
source ~/.zshrc  # or ~/.bashrc

# Uninstall anytime
claude-sync uninstall-hooks
```

### How They Work

The hook adds this to your `.zshrc` or `.bashrc`:

```bash
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent 2>/dev/null; then
    claude-sync run --quiet
  fi
}
autoload -U add-zsh-hook
add-zsh-hook chpwd _claude_sync_on_cd
```

**Triggers on:**
- Every `cd` command
- Only in registered git repositories

---

### Pros & Cons

#### ✅ Advantages

1. **Zero Manual Work**
   - Never run sync commands manually
   - Skills always up-to-date automatically

2. **Transparent**
   - Runs quietly in background
   - Files update without you noticing

3. **Easy to Try**
   - One command to install
   - One command to uninstall

4. **Handles Multiple Machines**
   - Great if syncing across laptops/desktops
   - Each machine auto-syncs on entry

#### ❌ Disadvantages

1. **Performance Impact**
   - Runs checks on **every `cd`** (even non-git dirs)
   - Adds ~100-500ms delay when entering registered repos
   - Noticeable with 50+ skills

2. **Silent File Modifications**
   - Files change without explicit action
   - Could be surprising mid-workflow
   - No chance to review changes first

3. **Git Workflow Disruption**
   - Auto-stages files during git operations
   - Can clutter `git status` output
   - Timing could conflict with rebases/merges

4. **Error Noise**
   - Sync failures show errors on every `cd`
   - Network/permission issues become repetitive
   - The `--quiet` flag doesn't suppress errors

5. **Loss of Control**
   - Can't choose when to sync
   - All-or-nothing (can't skip one repo)
   - No way to "save this for later"

6. **Limited Value for Small Setups**
   - With 6-7 repos, manual sync is easy
   - `claude-sync run --all` takes seconds
   - Hooks add complexity without much benefit

---

### Recommendation Matrix

| Your Situation | Recommendation |
|----------------|----------------|
| **6-7 repositories** | ❌ Don't use hooks |
| **Update skills monthly** | ❌ Don't use hooks |
| **20+ repositories** | ✅ Consider hooks |
| **Update skills daily** | ✅ Consider hooks |
| **Multiple machines** | ✅ Consider hooks |
| **Solo developer** | ❌ Don't use hooks |
| **Team environment** | ✅ Consider hooks |

### Our Recommendation: Don't Use Hooks

**Why:**
1. You have only 7 repositories
2. Manual sync is fast: `claude-sync run --all`
3. Skills don't update frequently
4. More control over when changes happen
5. Easier to debug issues
6. Can always add hooks later

**Alternative workflow:**
```bash
# Update skills as needed
cd ~/.claude/skills && vim skill/SKILL.md
git commit -m "Update skill"

# Sync when ready
claude-sync run --all

# Commit to projects when convenient
```

**When to reconsider:**
- Repository count exceeds 15
- Updating skills becomes daily routine
- You frequently forget to sync
- Working across multiple machines regularly

---

## Common Commands

### Daily Operations

```bash
# Sync current repository
claude-sync run

# Sync all registered repositories
claude-sync run --all

# Sync with detailed output
claude-sync run --verbose

# Sync silently (only errors)
claude-sync run --quiet
```

### Repository Management

```bash
# Register current directory
claude-sync register

# Unregister current directory
claude-sync unregister

# List all registered repos
claude-sync list

# Check registration status
claude-sync status

# Check if registered (for scripts)
claude-sync is-registered
claude-sync is-registered --silent
```

### Shell Hooks

```bash
# Install hooks
claude-sync install-hooks

# Uninstall hooks
claude-sync uninstall-hooks
```

### Configuration Location

All config stored in: `~/.claude/sync-config.json`

```json
{
  "repos": [
    {
      "path": "/Users/you/project",
      "registered": "2025-11-17T21:35:02.348Z",
      "lastSync": "2025-11-18T19:28:31.508Z"
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

---

## Troubleshooting

### Issue: "Skipped files (locally modified)"

**Cause:** Files exist in project but aren't tracked in `.sync-metadata.json`

**Solution 1 - Clean Re-sync:**
```bash
cd ~/project
cp -r .claude/skills .claude/skills.backup  # Backup first!
rm -rf .claude/skills
rm .claude/.sync-metadata.json
claude-sync run
```

**Solution 2 - Accept it:**
- Plugin skills still sync
- User skills with conflicts won't update
- Manually update when needed

---

### Issue: Git push rejected (remote has changes)

**Cause:** Remote repository has commits you don't have locally

**Solution:**
```bash
cd ~/project
git pull --rebase
git push
```

---

### Issue: Command not found: claude-sync

**Cause:** Tool not linked globally

**Solution:**
```bash
cd ~/PycharmProjects/claude-sync
npm link
```

---

### Issue: Skills not syncing to new repository

**Cause:** Repository not registered

**Solution:**
```bash
cd ~/new/project
claude-sync register
claude-sync run
```

**Remember:** Registration is manual - new repos aren't auto-detected.

---

### Issue: .sync-metadata.json showing in git status

**Cause:** Gitignore file missing or incorrect

**Solution:**
```bash
cd ~/project
cat .claude/.gitignore
# Should contain: .sync-metadata.json

# If missing, sync will recreate it:
rm .claude/.gitignore
claude-sync run
```

---

### Issue: Sync is slow

**Possible causes:**
1. Large number of skills (50+)
2. Network issues (if reading from network drive)
3. Disk I/O bottleneck

**Solutions:**
- Use `--quiet` flag to reduce output
- Check if skills directory is on local disk
- Consider reducing number of synced files

---

### Issue: Want to exclude certain skills

**Current limitation:** No built-in way to exclude individual skills

**Workaround:**
1. Move skills out of `~/.claude/skills/` temporarily
2. Sync to all repos
3. Move skills back

**Future enhancement:** Could add `excludeSkills` config option

---

## Best Practices

### ✅ Do

1. **Keep skills in git**
   - Your `~/.claude/skills/` should be a git repository
   - Commit before syncing

2. **Standardize naming**
   - Use `SKILL.md` for all main skill files
   - Use lowercase, hyphenated directory names

3. **Review before committing**
   - Check `git status` after sync
   - Review changes before pushing

4. **Backup before major operations**
   - Before clean re-sync
   - Before force push

5. **Use descriptive commit messages**
   ```bash
   git commit -m "sync: update skills from central repository

   - Rename 4 skills to standard naming
   - Add new skills: developing-with-swift
   - Remove outdated supporting files"
   ```

### ❌ Don't

1. **Don't modify skills in projects directly**
   - Always edit in `~/.claude/skills/`
   - Projects are sync targets, not sources

2. **Don't commit `.sync-metadata.json`**
   - It's machine-specific state
   - Should be gitignored automatically

3. **Don't force push without checking**
   - Could lose remote changes
   - Use `git pull --rebase` first

4. **Don't install hooks without understanding them**
   - Read the pros/cons section
   - Consider your workflow first

5. **Don't forget to sync after skill updates**
   - Changes in `~/.claude/skills/` won't propagate automatically
   - Run `claude-sync run --all` periodically

---

## Quick Reference Card

```bash
# Most common workflow
cd ~/.claude/skills && vim skill/SKILL.md
git commit -m "Update skill"
claude-sync run --all

# Register new project
cd ~/new/project && claude-sync register && claude-sync run

# Fix "skipped files" issue
cd ~/project && rm -rf .claude/skills .claude/.sync-metadata.json && claude-sync run

# See what's registered
claude-sync list

# Manual sync when needed
claude-sync run --all
```

---

## Project Structure Reference

```
claude-sync/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── config.ts           # Configuration management
│   ├── registry.ts         # Repository registry
│   ├── sync.ts             # Core sync engine
│   ├── metadata.ts         # Sync state tracking
│   ├── hasher.ts           # SHA256 file hashing
│   ├── plugin-scanner.ts   # Plugin discovery
│   ├── git.ts              # Git operations
│   └── hooks.ts            # Shell hook management
├── docs/
│   ├── SESSION_GUIDE.md    # This file
│   ├── CONTRIBUTING.md
│   └── plans/
├── package.json
└── README.md
```

---

## Summary

**Core Concept:** One source of truth (`~/.claude/skills/`) synced to many projects

**Key Features:**
- ✅ Conflict detection (preserves local changes)
- ✅ Git integration (auto-staging)
- ✅ Plugin support (auto-discovery)
- ✅ Safe by default (skips when uncertain)

**Recommended Workflow:**
1. Edit skills in `~/.claude/skills/`
2. Commit to skills repository
3. Run `claude-sync run --all`
4. Commit and push to project repos

**Not Recommended:** Shell hooks (for your setup size)

**Questions?** Check the troubleshooting section or review the source code in `src/`.

---

*Last updated: 2025-11-18*
*Session with: claude-sonnet-4-5*
