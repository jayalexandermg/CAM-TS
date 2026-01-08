---
description: Merge current branch into main with step-by-step confirmation
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git checkout:*), Bash(git pull:*), Bash(git merge:*), Bash(git push:*)
---

You are helping me merge my working branch into main. This is a milestone operation—be careful and confirm at each step.

## Rules
- NEVER force anything.
- NEVER delete branches without explicit request.
- Confirm at EACH major step—do not chain operations without approval.
- If conflicts arise, stop and help me resolve them before continuing.
- This command is for merging INTO main only.

## Steps

1. Run:
   - `git branch --show-current` (confirm current branch)
   - `git status --porcelain` (check for uncommitted changes)

2. If there are uncommitted changes, reply:
   - "You have uncommitted changes. Commit or stash them first before merging."
   - Show the files.
   - Then stop.

3. If already on main, reply:
   - "You're already on main. Switch to your dev branch first, or specify what to merge."
   - Then stop.

4. Show merge preview:
   ```
   MERGE PREVIEW:
   From: dev
   Into: main

   COMMITS TO MERGE (12):
   - a1b2c3d feat: phase 3 complete - user auth
   - ... (list all)

   Step 1: Switch to main and pull latest
   Proceed? (yes / cancel)
   ```

5. If I confirm Step 1, run:
   - `git checkout main`
   - `git pull origin main`
   - Show result and ask:
   ```
   ✓ On main, pulled latest.

   Step 2: Merge dev into main
   Proceed? (yes / cancel)
   ```

6. If I confirm Step 2, run:
   - `git merge dev`

   If merge conflicts occur:
   - List conflicted files
   - Say: "Conflicts detected. Resolve these files, then run `git add <file>` for each, and tell me when ready to continue."
   - Stop and wait.

   If merge succeeds:
   ```
   ✓ Merged dev into main (no conflicts)

   Step 3: Push main to remote
   Proceed? (yes / cancel)
   ```

7. If I confirm Step 3, run:
   - `git push origin main`
   - Show result:
   ```
   ✓ Main pushed to origin.

   MERGE COMPLETE:
   - dev has been merged into main
   - Remote is up to date

   Optional: switch back to dev? (yes / no)
   ```

8. If I say yes to switching back:
   - `git checkout dev`
   - "Back on dev. Ready for next phase."

Be explicit about what you're doing at each step. This is a critical operation—clarity over speed.
