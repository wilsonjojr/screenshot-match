<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture

- All app data lives in browser LocalStorage via `src/lib/planner/store.tsx` (single provider + actions); components never touch localStorage directly — keeps persistence centralized and versioned.
- Goal progress for open goals is always derived from records in `src/lib/planner/logic.ts`; closed goals keep a `finalProgress` snapshot — so edits/deletions update active goals but never rewrite history.
- `reconcile()` runs after every state change and every minute to auto-close goals and create deduplicated notifications.
- tsconfig drops exactOptionalPropertyTypes / noUncheckedIndexedAccess / noPropertyAccessFromIndexSignature to keep form code simple.
