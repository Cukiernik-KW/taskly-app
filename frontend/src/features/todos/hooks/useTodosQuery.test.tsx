import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { todosApi } from '../api/todos'
import { useTodosQuery } from './useTodosQuery'

vi.mock('../api/todos', () => ({ todosApi: { list: vi.fn() } }))

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

it('fetches the task list using an abort signal from the query', async () => {
  vi.mocked(todosApi.list).mockResolvedValue([todoFixture])
  const { result } = renderHook(() => useTodosQuery(), {
    wrapper: wrapperFor(createClient()),
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([todoFixture])
  expect(todosApi.list).toHaveBeenCalledWith(expect.any(AbortSignal))
})

it('surfaces a query error when the request fails', async () => {
  vi.mocked(todosApi.list).mockRejectedValue(new Error('Network error'))
  const { result } = renderHook(() => useTodosQuery(), {
    wrapper: wrapperFor(createClient()),
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error).toEqual(new Error('Network error'))
})
