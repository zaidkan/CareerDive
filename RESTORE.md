# CareerDive archive — 2026-11-10

Repository: https://github.com/zaidkan/CareerDive

All archive branches are under `archive/2026-11-10/`. Existing remote branches, including `main`, were not changed.
`archive-manifest.json` maps original branches, stashes, recovered history, and every worktree to exact commits.

## Restore code

```sh
git clone https://github.com/zaidkan/CareerDive.git CareerDive
cd CareerDive
git switch --create resume-main --track origin/archive/2026-11-10/snapshot/main
```

This snapshot preserves the formerly modified local main and additional ignored project documents/media. Its base is the original local main, intentionally not merged with newer remote main.

The other formerly dirty worktree is preserved independently:

```sh
git worktree add ../CareerDive-presentation -b resume-presentation origin/archive/2026-11-10/snapshot/chore-repo-presentation
```

Its actual original branch was `fix/recover-pending-session`. Worktree folder names did not always match branch names.
For any other checkout, use its `restore_branch` from the manifest with `git worktree add`.
Every original branch tip is preserved verbatim under `archive/2026-11-10/local/`.
Stash commits retain their original parent structure; recover with `git stash apply origin/<archive stash branch>`.
Recovered refs preserve additional local commit history without merging unrelated feature branches.

## Dependencies and private configuration

Use Node 24 or later and the package-manager version recorded in `package.json` (current main: pnpm 11.5.3).
Run `pnpm install --frozen-lockfile` in a restored checkout. Dependencies and build caches were not uploaded.
Production `.env.production.local` files and project-local agent state were deliberately not made public.
Those files have a separate, permissions-restricted local backup. Consult the local archival report for its location.
The public source and history can be reconstructed from GitHub; private credentials must be supplied separately.
