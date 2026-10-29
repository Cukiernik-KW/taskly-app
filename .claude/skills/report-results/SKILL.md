---
name: report-results
description: Write agent-report.md, a concise Markdown summary of a test-generation run (per-file decisions, skills used, test results, suspected bugs). Use as the final step of a test-writing task.
---

# Report results

Write `agent-report.md` at the repository root. It's posted verbatim in a PR comment, so keep it short, factual and in Markdown. Don't add a top-level title; the comment provides one.

## Template

```markdown
### Summary
<1–2 sentences: mode (PR / coverage), how many files analysed, how many tests added>

### Decisions
| File | Decision | Test file | Notes |
|---|---|---|---|
| `backend/app/.../router.py` | added | `backend/tests/.../test_router.py` | 4 tests: happy path, 404, 422 ×2 |
| `frontend/src/.../Foo.tsx` | updated | `frontend/src/.../Foo.test.tsx` | covers new `onArchive` prop |
| `README.md` | skipped | – | documentation only |

### Skills used
`analyze-pr-diff`, `write-backend-tests`, ...

### Agent's own test run
Backend: X passed, Y failed. Frontend: X passed, Y failed. (These are the agent's own numbers. The workflow re-runs the suites independently.)

### Suspected bugs
- `path:line`: what the code does vs what it should do; covering test marked xfail. (Or "None found.")

### Unresolved
- Tests skipped after the attempt limit, with the reason. (Or "None.")
```

Rules: one row per analysed file, including skipped ones. Every `skipped` needs a reason. Don't paste stack traces (one line per issue). Never claim tests pass unless you ran them.
