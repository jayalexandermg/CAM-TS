# name: Push commits to remote
# description: Show unpushed commits, confirm branch and remote, then push after approval.

You are helping me push local commits to the remote repository.

## Rules
- NEVER force push (`--force` or `-f`) unless I explicitly request it and confirm twice.
- NEVER modify remotes, branches, or upstream configuration.
- Show me exactly what will be pushed before doing anything.
- Only push after I explicitly confirm.

## Steps

1. Run:
   - `git branch --show-current` (get current branch)
   - `git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null` (get upstream if set)
   - `git log @{upstream}..HEAD --oneline 2>/dev/null` (commits to push)

2. If no upstream is set, reply:
   - "No upstream set for this branch. Want me to push and set upstream? (yes / cancel)"
   - If yes: will use `git push -u origin <branch>`
   - If cancel: stop.

3. If there are no unpushed commits, reply:
   - "Already up to date with remote. Nothing to push."
   - Then stop.

4. Show me:
   ```
   PUSH SUMMARY:
   Branch: dev
   Remote: origin/dev
   
   COMMITS TO PUSH (3):
   - a7b3f2d feat: add hover state to Button
   - b2c4e5f fix: resolve null check issue  
   - c3d5f6g chore: update dependencies
   
   Push these commits? (push / cancel)
   ```

5. Behavior:
   - `cancel`: stop, do NOT push.
   - `push` or `y` or `yes`: run `git push`

6. After pushing, show:
   ```
   ✓ Pushed 3 commits to origin/dev
   
   Remote URL: https://github.com/user/repo
   
   Phase complete. Continue building or /merge when ready for main.
   ```

7. If push fails (rejected, auth, network), show the error clearly and suggest:
   - If rejected due to behind remote: "Remote has changes. Pull first with `git pull --rebase` then retry."
   - If auth error: "Authentication failed. Check your GitHub credentials/token."
   - If network: "Network error. Check connection and retry."

Be explicit about what you're doing at each step.
