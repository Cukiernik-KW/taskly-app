import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useUpdateTodoMutation } from './useUpdateTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { update: vi.fn() } }))

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

it('replaces the matching task in the cache with the saved response', async () => {
  const client = createClient()
  const original = { ...todoFixture, id: 7, title: 'Old title' }
  client.setQueryData(todoKeys.list, [original])
  const saved = { ...todoFixture, id: 7, title: 'New title' }
  vi.mocked(todosApi.update).mockResolvedValue(saved)

  const { result } = renderHook(() => useUpdateTodoMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync({ id: 7, input: { title: 'New title' } })
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(todosApi.update).toHaveBeenCalledWith(7, { title: 'New title' })
  expect(client.getQueryData(todoKeys.list)).toEqual([saved])
})

it('leaves the cache untouched when there is no cached list yet', async () => {
  const client = createClient()
  const saved = { ...todoFixture, id: 7 }
  vi.mocked(todosApi.update).mockResolvedValue(saved)

  const { result } = renderHook(() => useUpdateTodoMutation(), {
    wrapper: wrapperFor(client),
  })
  await act(async () => {
    await result.current.mutateAsync({ id: 7, input: { completed: true } })
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(client.getQueryData(todoKeys.list)).toBeUndefined()
})
