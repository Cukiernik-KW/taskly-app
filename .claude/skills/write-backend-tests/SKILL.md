---
name: write-backend-tests
description: Write pytest unit tests for FastAPI/SQLAlchemy backend code following this repo's conventions (dependency-overridden repository mock, mocked Session, parametrized validation cases). Use when adding or updating backend tests.
---

# Writing backend tests (pytest)

Read `backend/tests/conftest.py`, `backend/tests/mocks.py` and the closest existing test file **before** writing anything. Match their style.

## Conventions in this repo

- Location mirrors the source: `backend/app/<pkg>/<mod>.py` → `backend/tests/<pkg>/test_<mod>.py` (add `__init__.py` to new test packages).
- Plain `def test_<behaviour>()` functions, no classes. Names describe behaviour: `test_update_returns_404_for_missing_task`.
- **No real database.** Isolation comes from mocks:
  - API/router tests use the `client` fixture (router mounted on a bare `FastAPI()`, `get_repository` overridden) and the `repository_mock` fixture (`create_autospec(TodoRepository)`, so calls are checked against the real signature).
  - Repository tests pass `Mock(spec=Session)` to the repository and assert on `session.add/commit/refresh/get/delete` calls. Compare SQL with `statement.compare(expected)`.
- Reuse fixtures `todo_values`, `todo`, `model_factory`. Add a new fixture to `conftest.py` only if two or more test files need it.
- Use `@pytest.mark.parametrize` for input-validation tables.
- Time-dependent code: assert on type and timezone, or patch the clock. Never assert on `datetime.now()` directly.

## What to cover per changed unit

1. **Happy path**: status code, response body (`model_dump(mode="json")`), and the exact repository call (`assert_called_once_with`).
2. **Validation**: boundary values (empty or whitespace, max length, max length + 1, wrong enum, invalid date). Assert `422` **and** that the repository was never called.
3. **Errors**: not-found → `404` with the detail message; path params `<= 0` → `422`.
4. **Edge cases**: partial updates (`exclude_unset`), empty lists, ordering, `None` handling.

One behaviour per test. Prefer a few sharp assertions over many vague ones. Don't test framework behaviour (Pydantic itself, FastAPI routing).
