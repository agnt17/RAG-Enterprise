# Branch Protection & CI/CD Setup Guide

This guide explains how to set up branch protection rules on GitHub to prevent accidental direct pushes to main and ensure all code passes CI checks before merging.

## Table of Contents
1. [Overview](#overview)
2. [GitHub Branch Protection Rules](#github-branch-protection-rules)
3. [CI Pipeline Explained](#ci-pipeline-explained)
4. [Pre-commit Hooks](#pre-commit-hooks)
5. [Workflow for Developers](#workflow-for-developers)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Why Branch Protection?

Without branch protection, anyone with write access can:
- Push directly to `main` (bypassing code review)
- Merge broken code to production
- Accidentally delete or overwrite critical code

Branch protection ensures:
- ✅ All changes go through Pull Requests
- ✅ CI checks must pass before merge
- ✅ Code reviews are required
- ✅ Main branch stays stable

### Architecture

```
Developer Workflow:
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. Create Feature Branch                                        │
│     git checkout -b feature/my-feature                           │
│                        │                                         │
│                        ▼                                         │
│  2. Make Changes & Commit                                        │
│     (Pre-commit hooks run automatically)                         │
│                        │                                         │
│                        ▼                                         │
│  3. Push to GitHub                                               │
│     git push origin feature/my-feature                           │
│                        │                                         │
│                        ▼                                         │
│  4. Create Pull Request                                          │
│     (CI Pipeline runs automatically)                             │
│                        │                                         │
│                        ▼                                         │
│  5. CI Checks Pass + Code Review Approved                        │
│                        │                                         │
│                        ▼                                         │
│  6. Merge to Main                                                │
│     (Protected - only mergeable if checks pass)                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## GitHub Branch Protection Rules

### Step 1: Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Branches** in the left sidebar
4. Under "Branch protection rules", click **Add rule**

### Step 2: Configure the Rule

**Branch name pattern:** `main`

**Enable these settings:**

#### ✅ Require a pull request before merging
- **Require approvals:** 1 (or more for larger teams)
- **Dismiss stale pull request approvals when new commits are pushed:** ✅
- **Require review from code owners:** ✅ (if you have CODEOWNERS file)

#### ✅ Require status checks to pass before merging
- **Require branches to be up to date before merging:** ✅
- **Status checks that are required:**
  - `All Checks Passed ✅` (from our CI workflow)
  
  *Note: You'll need to push a PR first for these checks to appear.*

#### ✅ Require conversation resolution before merging
This ensures all review comments are addressed.

#### ✅ Do not allow bypassing the above settings
Even admins must follow the rules.

#### ❌ Allow force pushes
Keep this disabled - force pushing rewrites history.

#### ❌ Allow deletions
Keep this disabled - prevent accidental branch deletion.

### Step 3: Save the Rule

Click **Create** or **Save changes**.

### Visual Example

```
Branch protection rule for: main

[✅] Require a pull request before merging
    [✅] Require approvals: 1
    [✅] Dismiss stale approvals when new commits are pushed
    
[✅] Require status checks to pass before merging
    [✅] Require branches to be up to date before merging
    Required checks:
    - All Checks Passed ✅
    
[✅] Require conversation resolution before merging

[✅] Do not allow bypassing the above settings

[ ] Allow force pushes
[ ] Allow deletions
```

---

## CI Pipeline Explained

Our CI pipeline (`.github/workflows/ci.yml`) runs these jobs:

### Job 1: Backend Lint (Python)
**What it does:** Checks Python code for style issues and potential bugs.
**Why:** Catches issues like unused imports, syntax errors, formatting inconsistencies.

```yaml
backend-lint:
  - Installs ruff (fast Python linter)
  - Runs: ruff check . --output-format=github
  - Runs: ruff format --check .
```

### Job 2: Backend Tests (pytest)
**What it does:** Runs automated tests for API endpoints.
**Why:** Ensures registration, login, and other endpoints work correctly.

```yaml
backend-test:
  - Installs dependencies + pytest
  - Runs: pytest tests/ -v --cov=.
  - Fails if coverage < 50%
```

### Job 3: Frontend Lint (ESLint)
**What it does:** Checks React/JS code for issues.
**Why:** Catches React hook violations, unused variables, etc.

```yaml
frontend-lint:
  - Installs npm dependencies
  - Runs: npm run lint
```

### Job 4: Frontend Build (Vite)
**What it does:** Compiles the frontend for production.
**Why:** Catches import errors, TypeScript issues, build failures.

```yaml
frontend-build:
  - Runs: npm run build
  - Uploads build artifacts
```

### Job 5: Security Scan
**What it does:** Checks for known vulnerabilities in dependencies.
**Why:** Catches security issues in packages.

```yaml
security-scan:
  - Runs: pip-audit on backend
  - Runs: npm audit on frontend
```

### Job 6: All Checks Passed
**What it does:** Summary job that passes only if ALL other jobs pass.
**Why:** Single status check for branch protection.

---

## Pre-commit Hooks

Pre-commit hooks run locally BEFORE your code reaches GitHub.

### Installation

```bash
# Install pre-commit
pip install pre-commit

# Install hooks (run in repo root)
pre-commit install
pre-commit install --hook-type commit-msg
```

### What Hooks Run

| Hook | Purpose |
|------|---------|
| `no-commit-to-branch` | Blocks direct commits to main |
| `check-added-large-files` | Warns about files > 500KB |
| `detect-private-key` | Catches accidental secret commits |
| `ruff` | Lints and fixes Python code |
| `eslint` | Lints JavaScript/React code |
| `commitizen` | Enforces commit message format |

### Manual Run

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run ruff --all-files
```

---

## Workflow for Developers

### Standard Development Flow

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/add-user-settings

# 3. Make your changes
# ... edit files ...

# 4. Stage and commit (pre-commit hooks run automatically)
git add .
git commit -m "feat(settings): add user profile settings"

# 5. Push to GitHub
git push origin feature/add-user-settings

# 6. Create Pull Request on GitHub
# - CI checks run automatically
# - Request review from teammate
# - Address review comments
# - Merge when approved and checks pass
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(auth): add Google OAuth login
fix(payment): correct GST calculation
docs(readme): add deployment instructions
test(api): add user registration tests
```

---

## Troubleshooting

### "Pre-commit hook failed"

**Issue:** Commit blocked by pre-commit hook.

**Solution:**
```bash
# See what failed
pre-commit run --all-files

# Auto-fix what can be fixed
pre-commit run ruff --all-files

# Then stage the fixes
git add .
git commit -m "your message"
```

### "CI check failed"

**Issue:** GitHub Actions workflow failed.

**Solution:**
1. Click on the failed check in your PR
2. Read the error message
3. Fix locally and push again

### "Branch is out of date"

**Issue:** Main has new commits since you branched.

**Solution:**
```bash
# Update your branch
git fetch origin
git rebase origin/main
# or
git merge origin/main

# Push updated branch
git push origin your-branch --force-with-lease
```

### "Required status check is missing"

**Issue:** Branch protection requires a check that hasn't run yet.

**Solution:**
Push at least one PR first. The status checks appear after the workflow runs once.

---

## Quick Reference

### Commands

```bash
# Create feature branch
git checkout -b feature/name

# Commit with conventional format
git commit -m "feat(scope): description"

# Run pre-commit manually
pre-commit run --all-files

# Update branch from main
git fetch && git rebase origin/main
```

### Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline definition |
| `.pre-commit-config.yaml` | Pre-commit hooks config |
| `backend/pyproject.toml` | Python linter (ruff) config |
| `frontend/eslint.config.js` | JS linter (ESLint) config |

### Status Checks Required

- `All Checks Passed ✅` - Summary of all CI jobs

---

*Last updated: April 2026*
