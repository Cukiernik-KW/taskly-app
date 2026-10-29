import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it } from 'vitest'
import { todoKeys } from '../api/queryKeys'
import { useTodosBusy } from './useTodosBusy'

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function createClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } })
}

it('is idle when no task mutation is in flight', () => {
  const { result } = renderHook(() => useTodosBusy(), {
    wrapper: wrapperFor(createClient()),
  })
  expect(result.current).toBe(false)
})

it('reports busy while a tracked mutation is pending, then idle once it settles', async () => {
  const client = createClient()
  let resolveMutation: () => void = () => {}
  const { result: busy } = renderHook(() => useTodosBusy(), {
    wrapper: wrapperFor(client),
  })
  const { result: mutation } = renderHook(
    () =>
      useMutation({
        mutationKey: todoKeys.update,
        mutationFn: () =>
          new Promise<void>((resolve) => {
            resolveMutation = resolve
          }),
      }),
    { wrapper: wrapperFor(client) },
  )

  act(() => {
    mutation.current.mutate()
  })
  await waitFor(() => expect(busy.current).toBe(true))

  await act(async () => {
    resolveMutation()
  })
  await waitFor(() => expect(busy.current).toBe(false))
})
