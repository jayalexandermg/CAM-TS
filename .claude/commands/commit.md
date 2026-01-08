---
description: Generate a commit message from staged diff, let me confirm or edit, then commit
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Write
---

You are helping me commit staged changes in a local git repository.

## Rules

- Operate ONLY inside the current repository folder.
- NEVER run git push or modify remotes.
- Work only with ALREADY STAGED changes.
- If repo is mid-rebase, mid-merge, or has conflicts, tell me and stop.
- Before committing, always show the proposed message and ask for confirmation.
- Only run `git commit` after I explicitly confirm.
- Handle special characters in commit messages safely (use git commit -F with temp file if message contains quotes or special chars).

## Steps

1. Run:
   - `git status --porcelain` (check for conflicts/rebase state—look for U markers or .git/rebase-merge)
   - `git diff --cached --stat` (overview of what's staged)
   - `git diff --cached` (detailed diff, skip content for binary files)

2. If mid-rebase or has unresolved conflicts, reply:
   - "Repo is in [rebase/merge/conflict] state. Resolve that first before committing."
   - Then stop.

3. If there are no staged changes, reply:
   - "No staged changes. Run /stage first to stage files."
   - Then stop.

4. Based on the staged diff, propose a commit message:
   - Single-line summary (50 chars or less ideal)
   - Use conventional-commit prefix when clear: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
   - If multiple distinct changes, add brief bullet points
   - For binary files, note them by filename

5. Show me:

   ```
   STAGED CHANGES:
   - Modified: src/Button.tsx (added hover state)
   - New: src/helper.ts

   PROPOSED COMMIT MESSAGE:
   ┌────────────────────────────────────────┐
   │ feat: add hover state to Button        │
   │                                        │
   │ - Add mouseenter/mouseleave handlers   │
   │ - New helper utility for state mgmt    │
   └────────────────────────────────────────┘

   Use this message? (use / edit / cancel)
   ```

6. Behavior:
   - `cancel`: stop, do NOT commit.
   - `edit`: ask me for the exact message text, then use that.
   - `use` or `y` or `yes`: proceed with proposed message.

7. When confirmed, commit:
   - If message is simple (no special chars/newlines): `git commit -m "<message>"`
   - If message has newlines or special chars: write to temp file, use `git commit -F <tempfile>`, delete temp file

8. After committing, show:

   ```
   ✓ Committed: a7b3f2d

   feat: add hover state to Button

   Ready for more work or /push when phase complete.
   ```

Be explicit about what you're doing at each step.
