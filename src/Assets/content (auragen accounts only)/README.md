# Git Workflow Commands for Claude Code

A set of approval-gated git commands for solo founders who want checkpoint discipline without memorizing git syntax.

## Installation

### Option 1: Copy the folder

1. Copy the `.claude` folder into your project root
2. Open Claude Code in your project
3. Commands are ready to use

### Option 2: Manual setup

```bash
# In your project root
mkdir -p .claude/commands

# Copy each .md file into .claude/commands/
```

## Commands

| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `/stage` | After finishing work | Pick files → stage them |
| `/commit` | After staging | Generate message → confirm → commit |
| `/push` | Phase complete + tests pass | Show commits → confirm → push |
| `/merge` | Phase 4 and 6 milestones | Step-by-step merge dev → main |

## Your Workflow

```
Step done → /stage → /commit (repeat per step)
Phase done → run tests → /push
Phase 4 or 6 → /push → /merge
```

## Safety Model

- **Every command shows you what it will do before doing it**
- **Every destructive operation requires explicit confirmation**
- **No command will push, merge, or force anything without your approval**

## Quick Reference

### /stage
```
Shows changed files → You pick (all / numbers / cancel) → Stages selected
```

### /commit  
```
Reads staged diff → Proposes message → You approve (use / edit / cancel) → Commits
```

### /push
```
Shows unpushed commits → You confirm (push / cancel) → Pushes to remote
```

### /merge
```
Step 1: Switch to main, pull latest (confirm)
Step 2: Merge dev into main (confirm)
Step 3: Push main to remote (confirm)
Optional: Switch back to dev
```

## Troubleshooting

**Commands not showing up?**
- Make sure files are in `.claude/commands/` (not `.claude/command/`)
- Make sure files end in `.md`
- Make sure you're in the right project directory

**Merge conflicts?**
- The /merge command will stop and tell you which files have conflicts
- Resolve manually, run `git add <file>` for each, then tell Claude to continue

## Recommended Git Setup

**Branches:** Just `dev` and `main`
- All work happens on `dev`
- Merge to `main` at phase 4 and phase 6

**Branch protection (optional):**
- GitHub → Settings → Branches → Add rule for `main`
- Enable "Require pull request before merging"

**PRs:** Only at merge-to-main milestones (phase 4, phase 6)
