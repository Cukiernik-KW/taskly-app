---
name: analyze-pr-diff
description: List and classify the files changed in a pull request (backend / frontend / other) and locate the existing tests related to each one. Use at the start of any PR-driven test or review task.
---

# Analyze a PR diff

## 1. List the changes

```sh
git diff --name-status BASE_SHA...HEAD_SHA
git diff BASE_SHA...HEAD_SHA -- <path>      # per file, only when you need the hunks
git log --oneline BASE_SHA..HEAD_SHA        # intent of the change
```

Use the three-dot form so you see only what the PR introduced, not what landed on the base branch since.

## 2. Classify every file

| Class | Pattern | Default action |
|---|---|---|
| backend source | `backend/app/**/*.py` | test unless excluded from coverage |
| backend test | `backend/tests/**` | review, may need update |
| frontend source | `frontend/src/**/*.{ts,tsx}` (not `*.test.*`) | test unless excluded from coverage |
| frontend test | `frontend/src/**/*.test.{ts,tsx}` | review, may need update |
| other | docs, CSS, configs, CI, lockfiles, `*.stories.tsx`, `types.ts`, `index.ts` | skip |

Coverage exclusions are listed in `backend/pyproject.toml` (`[tool.coverage.run] omit`) and `frontend/vite.config.ts` (`coverage.exclude`). Files excluded there (schemas, models, barrels, design system, …) are skipped.

Deleted files: remove or update their now-orphaned tests only if those tests import them.

## 3. Find related tests

- Backend: tests mirror the package path. `backend/app/features/todos/router.py` → `backend/tests/features/todos/test_router.py`. Also check `backend/tests/conftest.py` for existing fixtures.
- Frontend: tests sit next to the source. `Foo.tsx` → `Foo.test.tsx`, `foo.ts` → `foo.test.ts`.
- Use `Grep` for the changed symbol names to find indirect tests (for example, a component that renders the changed one).

## Output (keep it in your notes)

For each file: path, class, changed symbols, related test file (or "none"), and the planned action: `add` / `update` / `skip: <reason>`.
