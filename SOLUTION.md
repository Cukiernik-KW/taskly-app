# Solution: unit-test agent and PR workflow

A custom Claude Code agent (`test-writer`) with five reusable skills writes and runs unit tests. It is used in two ways:

- **Coverage mode (one-off, local):** filled the existing gaps. Backend went from 21 tests and 42% coverage to 51 tests and 100%. Frontend went from 18 tests and 47.7% line coverage to 83 tests and 98.7%.
- **PR mode (automated):** a GitHub Actions workflow runs the agent on labelled pull requests, re-runs the tests independently, commits the generated tests and reports in the PR.

## 1. Main technical decisions

| Decision | Rationale |
|---|---|
| **Claude Code + `anthropics/claude-code-action`** | The agent, skills and tool permissions are plain files in the repo (`.claude/`). The same agent runs locally (`claude --agent test-writer`) and in CI with identical flags. |
| **One agent, five small skills** | Each skill does one job (analyse diff, write backend tests, write frontend tests, run and fix, report). The agent composes them. Only the "conventions" sections are repo-specific, so the skills port to other repos. |
| **The agent only writes files** | It writes test files and `agent-report.md`, nothing else. Committing, pushing and commenting are deterministic workflow steps, so the LLM is never trusted with side effects. |
| **Independent verification** | After the agent finishes, the workflow re-runs both full suites with coverage. The PR comment separates *verified results* from the *agent's own claims*. The job fails if the verified run fails. |
| **"Don't bend the test" rule** | If the source contradicts its obvious intent, the agent keeps the correct assertion, marks it `xfail(strict=True)` / `it.fails` and reports a *suspected bug*. It never edits application code. |
| **Opt-in label `ai-tests`** | Every run consumes model usage, so a human decides which PRs get it. |

### Security

- **`pull_request`, not `pull_request_target`.** The workflow and code come from the PR context, and fork PRs never receive secrets. The job additionally skips PRs whose head repository isn't this repository, so forks get neither secrets nor a write token. First-time contributors also need approval before any workflow runs.
- **Least privilege.** Top-level `permissions: {}`. The job gets only `contents: write` (push the test commit) and `pull-requests: write` (sticky comment). The action uses the workflow's short-lived `GITHUB_TOKEN`, not the Claude GitHub App, so no `id-token` permission is needed and nothing posts as `claude[bot]`.
- **Tool allowlist.** The agent can use `Read/Edit/Write/Glob/Grep/Skill` and only these Bash commands: `git diff|log|status`, `python -m pytest`, `npm --prefix frontend test` and `npm --prefix frontend run typecheck`. Deny rules block `git commit/push`, `gh`, web access and edits to `.github/`, `.claude/` and `backend/app/`.
- **The agent can't commit or push.** Checkout uses `persist-credentials: false`, so no token is left in `.git/config`. The push step passes the token explicitly.
- **The prompt is not the security boundary.** A scope-guard step reverts every change outside `backend/tests/**/*.py` and `frontend/src/**/*.test.ts(x)` before verification. The commit step adds only those paths. (During development the agent once created a stray `backend/_tmp_check.py`; this guard exists because of that.)
- **Prompt injection.** Only base and head SHAs go into the prompt, never the PR title or body. Agent instructions say PR content is data. The action itself restores `.claude/` from the base branch, so a PR can't modify the agent, its skills or its permissions.
- **Script injection.** Step outputs that may contain agent-chosen strings (for example, reverted file names) reach shell scripts through `env`, never through inline `${{ }}` expressions.
- **No loops.** Pushes made with `GITHUB_TOKEN` don't trigger workflows, and the job also skips `github-actions[bot]`.
- **Bounded cost and time.** `--max-turns 40`, `timeout-minutes: 20`, and per-PR `concurrency` with `cancel-in-progress`. Concurrency is set at job level, so skipped runs can't cancel a real one.
- **Supply chain.** All actions are pinned to commit SHAs (version in a comment).

## 2. Running the PR workflow

Prerequisites:

1. Repository secret `CLAUDE_CODE_OAUTH_TOKEN`, generated with `claude setup-token`. To use an API key instead, set `ANTHROPIC_API_KEY` and swap the action input to `anthropic_api_key`.
2. Label `ai-tests` (`gh label create ai-tests`).
3. Actions enabled. No GitHub App installation is needed.

Usage: open a PR from a branch of this repository and add the `ai-tests` label. The workflow runs on `opened`, `synchronize`, `reopened` and `labeled` while the label is present. Result: an optional commit `test: add generated unit tests` by `github-actions[bot]` on the PR branch, one sticky comment (marker `<!-- ai-tests-report -->`, updated in place), and a pass/fail check.

Locally (the same agent and permissions as in CI):

```sh
echo "PR mode. BASE_SHA=<sha> HEAD_SHA=<sha> ..." | claude -p --agent test-writer --model sonnet \
  --allowedTools "Read,Edit,Write,Glob,Grep,Skill,Bash(git diff:*),Bash(python -m pytest:*),Bash(npm --prefix frontend test:*)"
```

## 3. Agent and skills

| Path | Role |
|---|---|
| `.claude/agents/test-writer.md` | The agent: inputs (PR or coverage mode), hard rules (write scope, no side effects, no bending tests, max 2 fix attempts, exact commands), and the procedure |
| `.claude/skills/analyze-pr-diff/` | `git diff base...head`, classify files (backend / frontend / other), map them to existing tests, apply coverage exclusions |
| `.claude/skills/write-backend-tests/` | pytest conventions: router tested via dependency override and `create_autospec` repository mock, repository tested with `Mock(spec=Session)`, parametrised validation |
| `.claude/skills/write-frontend-tests/` | Vitest and Testing Library: module-boundary mocks, http-layer mocking, `renderHook` with a fresh `QueryClient`, known pitfalls |
| `.claude/skills/run-and-fix-tests/` | Exact commands, failure classification (test bug vs source bug), attempt limit |
| `.claude/skills/report-results/` | Format of `agent-report.md` (decisions per file, skills used, results, suspected bugs) |
| `.github/workflows/ai-tests.yml` | Orchestration: agent → scope guard → verification → commit → comment → status |

During a run the action starts Claude Code with `--agent test-writer`. The agent loads skills on demand through the `Skill` tool, following its procedure: analyse the diff, establish a baseline, write tests, run and fix them, report.

## 4. Example run

**Demo: [PR #2](https://github.com/Cukiernik-KW/taskly-app/pull/2)** adds a "Clear completed" feature: `DELETE /api/todos/completed`, repository method, API client, mutation hook and header button. It ships without tests.

| Run | Agent | Verified backend | Verified frontend |
|---|---|---|---|
| [1st run](https://github.com/Cukiernik-KW/taskly-app/actions/runs/40917351956), commit `deb272e` | 22 turns. Added tests for repository, router, API client, hook and header. Skipped `schemas.py` and `queryKeys.ts` as covered indirectly | 53 passed, 100% | 78 passed, **9 failed** |
| [2nd run](https://github.com/Cukiernik-KW/taskly-app/actions/runs/40918266012), commit `c868216` | 16 turns. The baseline found existing `TodosPage` tests broken by the feature ("No QueryClient set"), so it **updated** `TodosPage.test.tsx` and added notice, error and busy-guard tests | 53 passed, **100%** | 91 passed, 0 failed, **98.79%** |

Skills used: `analyze-pr-diff`, `write-backend-tests`, `write-frontend-tests`, `run-and-fix-tests`, `report-results`. Suspected bugs: none.

Between the runs, the verified results (9 ❌, red check) and the agent's own report exposed two gaps. The agent didn't update tests broken by the change, and it tried a blocked command form (`npx vitest`). Both were fixed in the agent definition (mandatory baseline run, exact commands only), not in the workflow.

[PR #1](https://github.com/Cukiernik-KW/taskly-app/pull/1) is the same feature. It was merged prematurely while the CI token was being debugged, then reverted. Its runs are kept on purpose: the agent failed to start (`401 Invalid bearer token`), yet the workflow still verified the suites, posted the failure reason and failed the check.

## 5. Assumptions

- Unit tests only. No database, browser or network: backend tests mock the repository or session, frontend tests mock the http layer.
- Only same-repository PRs from people with write access are processed. Fork PRs are skipped by design.
- Generated tests are a proposal. A human reviews the bot commit before merging, and the demo PR is intentionally left open.
- Coverage targets follow the existing exclusions in `backend/pyproject.toml` and `frontend/vite.config.ts` (schemas, models, design system, barrels).

## 6. Limitations

- **Nondeterminism.** Two runs on the same diff can produce different tests. The turn budget (40) is a heuristic from observed runs (16–22 turns per small PR), and the comment reports `turns used` so it can be calibrated.
- **Cost per run.** Each run consumes model usage (a subscription quota here). The label opt-in and the turn and time limits bound it.
- **Test quality.** Coverage proves code was executed, not that assertions are meaningful. The agent can write weak tests that still pass.
- **Bot commits don't trigger CI.** That's intentional (no loops), but other required checks won't re-run on the bot commit without a manual re-run.
- **Workflow changes on `main` don't reach open PRs** until their merge ref is refreshed (for example by updating the branch).
- **False-positive scope warning.** The action restores `.claude/` from the base branch, and the scope guard reports this as reverted out-of-scope changes when the PR branch is behind `main`. The outcome is still correct.
- **Authentication.** A personal subscription OAuth token is fine for a demo, not for a team.

## 7. Production version

- Organisation Anthropic API key (or workload identity federation) with a spend limit, rotation and per-repo budgets, instead of a personal token.
- A dedicated GitHub App with fine-grained permissions instead of `GITHUB_TOKEN`, so bot commits can trigger CI and be signed.
- Mutation testing (mutmut, Stryker) on generated tests to measure assertion quality, with weak tests rejected automatically.
- Per-repo config (`.claude/test-writer.yml`): test paths, commands, coverage thresholds, turn budget. That way the same agent and skills serve every repo.
- Re-run only the affected test files for large repos, and add coverage diff on changed lines only.
- Telemetry (turns, cost, accept/revert rate of bot commits) to tune prompts and budgets.
- Reliably filter `.claude/` restore noise out of the scope guard. Optionally post suspected bugs as inline review comments.
