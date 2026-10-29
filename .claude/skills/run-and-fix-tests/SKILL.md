---
name: run-and-fix-tests
description: Run the backend (pytest) and frontend (Vitest) unit tests you touched, read failures, and fix the tests (never the application code) within a strict attempt limit. Use after writing or updating tests.
---

# Run and fix tests

## Commands (run them from the repository root exactly as written; other forms such as `npx vitest` or `cd frontend && ...` may be blocked by the sandbox)

```sh
python -m pytest backend/tests/<path>/test_x.py -q        # one backend file
python -m pytest -q                                       # whole backend suite
npm --prefix frontend test -- src/<path>/X.test.tsx       # one frontend file (path relative to frontend/)
npm --prefix frontend test                                # whole frontend suite
npm --prefix frontend run typecheck                       # Vitest does not type-check; run after frontend changes
```

Run each touched file first, then the whole suite once at the end to catch fixture or mock leakage. After frontend test changes, also run the typecheck: type errors in test files fail the build even when Vitest passes.

## Reading a failure

Classify every failure before changing anything:

| Cause | Fix |
|---|---|
| Test bug (wrong import path, wrong selector, missing `await`, wrong mock shape, typo) | fix the test |
| Mock or fixture leakage between tests | isolate it (fresh fixture, `vi.clearAllMocks`, new `QueryClient`) |
| Source behaves differently from its **documented or obvious intent** | **do not change the assertion.** Mark it `xfail(strict=True)` / `it.fails` with `reason="suspected bug: ..."` and report it |
| Your expectation was simply wrong (the source behaviour is reasonable) | correct the expectation and say so in the report |

Never edit application code, configs or dependencies to make a test pass. Never delete an assertion just to make the run green.

## Attempt limit

At most **2 fix attempts per test file**. If the file still fails after the second attempt, skip the remaining failing cases (`pytest.mark.skip(reason=...)` / `it.skip`) and record them in the report as *unresolved*. Don't loop.

## Done when

All touched files pass (or are explicitly marked xfail or skip with reasons) and the full suites have run once. Record the final passed, failed and skipped counts for the report.
