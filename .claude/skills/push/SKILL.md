---
name: push
description: Stage everything, write one commit message derived from the actual diff, commit, and push to origin/main. Use this whenever the user says "push", "/push", "commit and push", "bunu push'la", "commit at ve gönder", or otherwise asks to ship the current working-tree changes. Invoking this skill IS the user's explicit authorization to commit and push — do not stop to ask again.
---

# push

Ship the current working tree in one shot: stage → read the diff → write one honest commit message → commit → push.

Invoking this skill is the explicit commit+push approval that the global rules require. Asking "commit atayım mı?" after the user already ran `/push` is just friction — go.

## Steps

Run these in the repo root. If the user pointed at several repo directories, run the whole sequence for each one independently — one repo having no changes must not stop the others, and each repo gets its own message derived from its own diff.

1. `git status --porcelain` — if empty, report "no changes" for this repo and stop here.
2. `git add -A`
3. Read what you're about to commit: `git diff --cached --stat` for the shape, then `git diff --cached` on the meaningful hunks. Skip lockfiles, build output, and generated noise — you need enough to name the change, not to review it.
4. `git commit -m "<message>"` using the rules below.
5. `git push origin main`

If the push is rejected as non-fast-forward, stop and tell the user. Never `--force`, never `--force-with-lease`, never rebase your way around it — someone else's commits are on the remote and only the user can decide what happens to them. The commit is already made locally, so nothing is lost by stopping.

If a pre-commit hook fails, stop and report why. Don't reach for `--no-verify`.

## Commit message rules

Format: `type: short summary`, lowercase type, from: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `config`.

The summary has to describe what actually changed, read off the diff — that's the whole point of step 3. "update files" or "various fixes" tells a future reader nothing and wastes the one chance this commit had to explain itself.

English, imperative, under ~70 chars.

No body. The exception is a diff that genuinely spans several unrelated areas — then add 2-4 `- ` bullets, one per area. A body on a single-purpose commit is noise.

**Examples**

- Diff: theme composable gains a system-preference watcher, settings page gets a toggle → `feat: follow system theme preference`
- Diff: null guard added where `patient.name` was read on quick-process → `fix: null patient name on quick-process`
- Diff: version bumped in package.json and app config → `chore: bump version to 0.2.7`
- Diff: colors moved from hardcoded hex to CSS custom properties across 6 components → `refactor: move component colors to design tokens`

## Report

One line per repo:

```
upkept → feat: follow system theme preference → pushed
```

Use `skipped` when there was nothing to commit. If nothing changed in any repo, just say so in one line.
