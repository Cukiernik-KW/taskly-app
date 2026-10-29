import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useCreateTodoMutation } from './useCreateTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { create: vi.fn() } }))

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

it('prepends the created task and drops any stale duplicate from the cache', async () => {
  const client = createClient()
  const stale = { ...todoFixture, id: 7, title: 'Old copy' }
  client.setQueryData(todoKeys.list, [stale])
  const created = { ...todoFixture, id: 7, title: 'Plan the sprint' }
  vi.mocked(todosApi.create).mockResolvedValue(created)

  const { result } = renderHook(() => useCreateTodoMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync(todoFixture)
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(todosApi.create).toHaveBeenCalledWith(todoFixture)
  expect(client.getQueryData(todoKeys.list)).toEqual([created])
})
