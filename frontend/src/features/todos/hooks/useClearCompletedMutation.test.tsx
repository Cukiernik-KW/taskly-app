import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useClearCompletedMutation } from './useClearCompletedMutation'

vi.mock('../api/todos', () => ({ todosApi: { clearCompleted: vi.fn() } }))

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

it('removes completed tasks from the cache', async () => {
  const client = createClient()
  const open = { ...todoFixture, id: 1, completed: false }
  const done = { ...todoFixture, id: 2, completed: true }
  client.setQueryData(todoKeys.list, [open, done])
  vi.mocked(todosApi.clearCompleted).mockResolvedValue({ deleted: 1 })

  const { result } = renderHook(() => useClearCompletedMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync()
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(client.getQueryData(todoKeys.list)).toEqual([open])
})

it('leaves the cache untouched when no list is cached', async () => {
  const client = createClient()
  vi.mocked(todosApi.clearCompleted).mockResolvedValue({ deleted: 0 })
  const { result } = renderHook(() => useClearCompletedMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync()
  })
  expect(client.getQueryData(todoKeys.list)).toBeUndefined()
})
