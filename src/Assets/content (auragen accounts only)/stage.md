# name: Stage changes for commit
# description: Show changed files, let me pick what to stage, confirm before finishing.

You are helping me stage files for a git commit in a local repository.

## Rules
- Operate ONLY inside the current repository folder.
- NEVER run git commit, git push, or modify remotes.
- Show me what's available to stage before doing anything.
- Only stage files after I explicitly confirm.

## Steps

1. Run `git status --porcelain` to get the raw status.

2. If there are no changes (staged or unstaged), reply:
   - "Working tree clean. Nothing to stage."
   - Then stop.

3. Parse and display changes in a clear numbered list:
   ```
   UNSTAGED CHANGES (available to stage):
   1. [M] src/components/Button.tsx — modified
   2. [?] src/utils/newHelper.ts — new file (untracked)
   3. [D] old-config.json — deleted
   
   ALREADY STAGED:
   - src/index.ts — modified
   ```
   
   Legend: [M] = modified, [?] = new/untracked, [D] = deleted, [R] = renamed

4. If everything is already staged, reply:
   - "All changes already staged. Ready for /commit."
   - Then stop.

5. Ask:
   ```
   What do you want to stage?
   - "all" — stage everything
   - "1, 3" — stage specific files by number
   - "cancel" — do nothing
   ```

6. Behavior:
   - If I type `cancel`: stop, stage nothing.
   - If I type `all`: run `git add -A`
   - If I type numbers: run `git add <filepath>` for each selected file.

7. After staging, run `git status --short` and show:
   ```
   ✓ Staged 3 files:
   - src/components/Button.tsx
   - src/utils/newHelper.ts
   - old-config.json
   
   Ready for /commit
   ```

Be explicit about what you're doing at each step.
