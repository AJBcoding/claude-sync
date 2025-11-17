import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const HOOK_MARKER_START = '# Claude Skills Auto-Sync - START';
const HOOK_MARKER_END = '# Claude Skills Auto-Sync - END';

const ZSH_HOOK = `
${HOOK_MARKER_START}
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent 2>/dev/null; then
    claude-sync run --quiet
  fi
}
autoload -U add-zsh-hook 2>/dev/null
add-zsh-hook chpwd _claude_sync_on_cd 2>/dev/null
${HOOK_MARKER_END}
`;

const BASH_HOOK = `
${HOOK_MARKER_START}
_claude_sync_on_cd() {
  if [ -f ".git/config" ] && claude-sync is-registered --silent 2>/dev/null; then
    claude-sync run --quiet
  fi
}
PROMPT_COMMAND="_claude_sync_on_cd; \${PROMPT_COMMAND}"
${HOOK_MARKER_END}
`;

export class HookManager {
  install(): void {
    const shell = process.env.SHELL || '';

    if (shell.includes('zsh')) {
      this.installToFile(join(homedir(), '.zshrc'), ZSH_HOOK);
      console.log('✓ Installed hooks to ~/.zshrc');
    } else if (shell.includes('bash')) {
      this.installToFile(join(homedir(), '.bashrc'), BASH_HOOK);
      console.log('✓ Installed hooks to ~/.bashrc');
    } else {
      throw new Error(`Unsupported shell: ${shell}. Only zsh and bash are supported.`);
    }

    console.log('\nRestart your shell or run:');
    console.log('  source ~/.zshrc  (zsh)');
    console.log('  source ~/.bashrc (bash)');
  }

  uninstall(): void {
    const files = [
      join(homedir(), '.zshrc'),
      join(homedir(), '.bashrc')
    ];

    for (const file of files) {
      if (existsSync(file)) {
        const removed = this.removeFromFile(file);
        if (removed) {
          console.log(`✓ Removed hooks from ${file}`);
        }
      }
    }
  }

  private installToFile(rcFile: string, hook: string): void {
    if (!existsSync(rcFile)) {
      writeFileSync(rcFile, hook);
      return;
    }

    const content = readFileSync(rcFile, 'utf-8');

    // Check if already installed
    if (content.includes(HOOK_MARKER_START)) {
      // Remove old version
      this.removeFromFile(rcFile);
    }

    // Append new hook
    appendFileSync(rcFile, '\n' + hook);
  }

  private removeFromFile(rcFile: string): boolean {
    const content = readFileSync(rcFile, 'utf-8');
    const lines = content.split('\n');

    let insideHook = false;
    const filtered = lines.filter(line => {
      if (line.includes(HOOK_MARKER_START)) {
        insideHook = true;
        return false;
      }
      if (line.includes(HOOK_MARKER_END)) {
        insideHook = false;
        return false;
      }
      return !insideHook;
    });

    if (filtered.length !== lines.length) {
      writeFileSync(rcFile, filtered.join('\n'));
      return true;
    }

    return false;
  }
}
