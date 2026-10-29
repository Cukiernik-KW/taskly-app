import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useDeleteTodoMutation } from './useDeleteTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { remove: vi.fn() } }))

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

it('removes the deleted task from the cache', async () => {
  const client = createClient()
  const remaining = { ...todoFixture, id: 2 }
  client.setQueryData(todoKeys.list, [todoFixture, remaining])
  vi.mocked(todosApi.remove).mockResolvedValue(undefined)

  const { result } = renderHook(() => useDeleteTodoMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync(todoFixture.id)
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(todosApi.remove).toHaveBeenCalledWith(todoFixture.id)
  expect(client.getQueryData(todoKeys.list)).toEqual([remaining])
})

it('leaves the cache untouched when there is no cached list yet', async () => {
  const client = createClient()
  vi.mocked(todosApi.remove).mockResolvedValue(undefined)

  const { result } = renderHook(() => useDeleteTodoMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync(todoFixture.id)
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(client.getQueryData(todoKeys.list)).toBeUndefined()
})
