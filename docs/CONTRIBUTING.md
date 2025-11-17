# Contributing to Claude Skills Auto-Sync

Thank you for your interest in contributing to Claude Skills Auto-Sync! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Style](#code-style)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/claude-sync.git
   cd claude-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Link for local development** (optional)
   ```bash
   npm link
   ```

   This creates a global symlink to your local development version, allowing you to test `claude-sync` commands globally.

### Development Scripts

```bash
npm run build        # Compile TypeScript to JavaScript
npm run dev          # Watch mode - recompile on changes
npm test             # Run all tests
npm run lint         # Check code style
```

## Project Structure

```
claude-sync/
├── src/                    # Source code
│   ├── cli.ts             # CLI interface and commands
│   ├── config.ts          # Configuration management
│   ├── registry.ts        # Repository registry
│   ├── sync.ts            # Core sync engine
│   ├── hasher.ts          # File hashing utility
│   ├── metadata.ts        # Sync metadata tracking
│   ├── plugin-scanner.ts  # Plugin discovery
│   ├── hooks.ts           # Shell hook management
│   └── git.ts             # Git integration helpers
├── tests/                  # Test files
│   ├── config.test.ts
│   ├── registry.test.ts
│   ├── sync.test.ts
│   └── ...
├── dist/                   # Compiled output (gitignored)
├── docs/                   # Documentation
├── DESIGN.md              # Architecture documentation
├── README.md              # User documentation
└── package.json           # Project configuration
```

### Module Overview

- **cli.ts**: Command-line interface using Commander.js
- **config.ts**: Loads/saves configuration from `~/.claude/sync-config.json`
- **registry.ts**: Manages registered repositories
- **sync.ts**: Core synchronization logic with conflict detection
- **hasher.ts**: SHA256 file hashing for change detection
- **metadata.ts**: Tracks file hashes to detect local modifications
- **plugin-scanner.ts**: Auto-discovers plugin skills using fast-glob
- **hooks.ts**: Installs/uninstalls shell hooks
- **git.ts**: Git operations (staging, status checks)

## Testing

### Running Tests

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npm test -- tests/config.test.ts
```

Run tests in watch mode:
```bash
npm test -- --watch
```

### Test Coverage

All features should have corresponding tests. Test files should mirror the structure of source files:
- `src/config.ts` → `tests/config.test.ts`
- `src/sync.ts` → `tests/sync.test.ts`

### Writing Tests

We use Jest for testing. Follow the existing test patterns:

```typescript
import { MyClass } from '../src/my-module';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('MyClass', () => {
  const testDir = '/tmp/claude-sync-test';

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  test('does something useful', () => {
    // Arrange
    const instance = new MyClass();

    // Act
    const result = instance.doSomething();

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Test Guidelines

1. **Isolation**: Tests should not depend on each other
2. **Cleanup**: Always clean up test files in `afterEach`
3. **Coverage**: Test both success and error cases
4. **Clarity**: Use descriptive test names that explain what is being tested

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode (enabled in `tsconfig.json`)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow existing patterns for consistency

### Style Rules

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (except in JSON)
- **Semicolons**: Always use semicolons
- **Line length**: Prefer lines under 100 characters
- **Naming**:
  - Classes: PascalCase (`FileHasher`)
  - Functions/variables: camelCase (`syncRepositories`)
  - Constants: UPPER_SNAKE_CASE (`CONFIG_PATH`)

### Linting

Run the linter to check code style:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

### Documentation

- Add JSDoc comments for public APIs
- Keep comments concise and focused on "why" not "what"
- Update README.md if adding user-facing features
- Update DESIGN.md if changing architecture

Example JSDoc:
```typescript
/**
 * Computes SHA256 hash of a file's contents.
 * Used for detecting file changes during sync.
 *
 * @param filePath - Absolute path to file
 * @returns Hexadecimal hash string
 */
hashFile(filePath: string): string {
  // implementation
}
```

## Development Workflow

### Test-Driven Development (TDD)

We follow TDD for new features:

1. **Write a failing test**
   ```bash
   npm test -- tests/new-feature.test.ts
   ```

2. **Write minimal code to pass**
   ```bash
   npm run dev  # Watch mode
   ```

3. **Refactor if needed**

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Adding a New Feature

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Write tests first**
   ```bash
   # Create tests/my-feature.test.ts
   npm test
   ```

3. **Implement the feature**
   ```bash
   # Create src/my-feature.ts
   npm run dev  # Watch mode
   ```

4. **Ensure all tests pass**
   ```bash
   npm test
   npm run build
   ```

5. **Update documentation**
   - Update README.md with usage examples
   - Add JSDoc comments to public APIs
   - Update DESIGN.md if architecture changed

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

### Commit Message Format

Follow conventional commits format:

```
<type>: <description>

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

Examples:
```
feat: add plugin exclusion configuration
fix: handle detached HEAD state correctly
docs: update troubleshooting section
test: add coverage for sync conflict detection
refactor: simplify file hashing logic
chore: update dependencies
```

## Submitting Changes

### Pull Request Process

1. **Ensure your code is ready**
   - All tests pass (`npm test`)
   - Code builds without errors (`npm run build`)
   - No linting errors (`npm run lint`)
   - Documentation is updated

2. **Push your branch**
   ```bash
   git push origin feature/my-new-feature
   ```

3. **Create a pull request**
   - Use GitHub's interface to create a PR
   - Provide a clear description of changes
   - Reference any related issues
   - Include screenshots/examples if applicable

4. **Address review feedback**
   - Make requested changes
   - Push updates to your branch
   - Respond to reviewer comments

5. **Wait for approval and merge**
   - PRs require at least one approval
   - Maintainers will merge when ready

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Code builds without errors
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main branch
- [ ] PR description is clear and complete

## Common Development Tasks

### Testing Changes Locally

Test your changes in a real project:

```bash
# Build and link
npm run build
npm link

# Navigate to a test project
cd ~/test-project

# Test commands
claude-sync register
claude-sync run --verbose
claude-sync status
```

### Debugging

Add console.log statements or use Node.js debugger:

```typescript
// Add to code
console.log('Debug:', someVariable);

// Or use debugger statement
debugger;
```

Run with debugger:
```bash
node --inspect-brk dist/cli.js run
```

### Manual Testing Checklist

Before submitting a PR, manually test:

- [ ] Register a repository
- [ ] Sync skills (run command)
- [ ] Check status
- [ ] List repositories
- [ ] Unregister repository
- [ ] Install hooks
- [ ] Test automatic sync on cd
- [ ] Uninstall hooks
- [ ] Test with plugins
- [ ] Test conflict detection
- [ ] Test git staging

## Release Process

(For maintainers only)

1. **Update version in package.json**
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**
   - Document all changes since last release
   - Group by type (Features, Fixes, Breaking Changes)

3. **Build and test**
   ```bash
   npm run build
   npm test
   ```

4. **Create release tag**
   ```bash
   git push origin main --tags
   ```

5. **Publish to npm**
   ```bash
   npm publish
   ```

## Getting Help

- Review [DESIGN.md](../DESIGN.md) for architecture details
- Check [README.md](../README.md) for usage information
- Open an issue for questions or problems
- Join discussions on GitHub

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Questions?

If you have questions about contributing, please open an issue with the "question" label.

Thank you for contributing to Claude Skills Auto-Sync!
