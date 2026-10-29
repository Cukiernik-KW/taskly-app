---
name: write-frontend-tests
description: Write Vitest + React Testing Library unit tests for React/TypeScript code following this repo's conventions (module-boundary mocks, mocked http layer, renderHook for hooks, React Query wrapper). Use when adding or updating frontend tests.
---

# Writing frontend tests (Vitest + Testing Library)

Read `frontend/src/test/setup.ts`, `frontend/src/test/todoFixture.ts` and the closest existing `*.test.tsx` **before** writing anything.

## Conventions in this repo

- Test file sits next to the source: `Foo.tsx` → `Foo.test.tsx`.
- Import test APIs explicitly: `import { beforeEach, describe, expect, it, vi } from 'vitest'` (no globals).
- Top-level `it('does X when Y', ...)`. Sentences describe user-visible behaviour.
- Reuse `todoFixture` and spread overrides: `{ ...todoFixture, completed: true }`.
- Query by role or label (`screen.getByRole('button', { name: /save/i })`) and drive interaction with `userEvent.setup()`.

## Mocking

- **HTTP layer**: never hit `fetch` from component or hook tests. Mock the module:
  `vi.mock('../../../lib/http', () => ({ request: vi.fn() }))` and use `vi.mocked(request).mockResolvedValue(...)`.
- **Testing `lib/http.ts` itself**: stub the global with `vi.stubGlobal('fetch', vi.fn())` and build responses with `new Response(JSON.stringify(body), { status })`.
- **Design system**: `vi.mock('../../design-system', () => import('../../design-system/mocks'))` (async factory, because `vi.mock` is hoisted).
- **Child components and hooks** in page-level tests: mock them by module path with `vi.fn()` and set return values per test.
- Call `vi.clearAllMocks()` in `beforeEach` when mocks keep state between tests.

## Hooks

- Plain hooks: `renderHook(() => useX())`, then `act(() => result.current.fn())`.
- React Query hooks: wrap them in a fresh client for each test so cache state never leaks:
  ```tsx
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ```
  Mock `todosApi` (or `request`), then assert on `client.getQueryData(key)` after `await waitFor(() => expect(result.current.isSuccess).toBe(true))`.
- Timers: `vi.useFakeTimers()` and `vi.advanceTimersByTime()`, then restore with `vi.useRealTimers()`.

## Known pitfalls

- Long input (hundreds of characters): `await user.click(field); await user.paste(text)`. `user.type` sends one keystroke per character, times out, and the still-running test leaks into the next one.
- `<input type="date">` sanitizes invalid values (e.g. `2026-02-30`) to `''`, so invalid-date branches can't be reached through the UI. Test them at the validator level instead.

## What to cover

Rendering for each meaningful state (loading, empty, error, data), user interactions and the callbacks or API calls they trigger (with exact arguments), conditional branches, and error messages. Don't snapshot styled-components output, and don't test the design system.
