import { beforeEach, expect, it, vi } from 'vitest'
import { request } from './http'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

it('sends JSON headers and returns the parsed response body', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ id: 1 }), { status: 200 }),
  )
  await expect(request('/todos')).resolves.toEqual({ id: 1 })
  expect(fetch).toHaveBeenCalledWith('/api/todos', {
    headers: { 'Content-Type': 'application/json' },
  })
})

it('merges caller headers and init options with the defaults', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
  const signal = new AbortController().signal
  await request('/todos', {
    method: 'POST',
    signal,
    headers: { Authorization: 'Bearer token' },
  })
  expect(fetch).toHaveBeenCalledWith('/api/todos', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
  })
})

it('returns undefined for a 204 No Content response', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
  await expect(request('/todos/1')).resolves.toBeUndefined()
})

it('raises a connection error when the network request fails', async () => {
  vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(request('/todos')).rejects.toThrow(
    'Cannot connect to the server. Please try again.',
  )
})

it('rethrows the original error when the request was aborted', async () => {
  const abortError = new DOMException('Aborted', 'AbortError')
  vi.mocked(fetch).mockRejectedValue(abortError)
  const controller = new AbortController()
  controller.abort()
  await expect(
    request('/todos', { signal: controller.signal }),
  ).rejects.toBe(abortError)
})

it('reports a specific message for 422 validation failures', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: 'ignored' }), { status: 422 }),
  )
  await expect(request('/todos')).rejects.toThrow(
    'Check the task details: title up to 120 characters, description up to 2000 characters, and a valid due date.',
  )
})

it('surfaces the server detail message for other failures', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: 'Task not found.' }), { status: 404 }),
  )
  await expect(request('/todos/404')).rejects.toThrow('Task not found.')
})

it('falls back to a generic message when the error body has no detail', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('not json', { status: 500 }))
  await expect(request('/todos')).rejects.toThrow(
    'The operation failed. Please try again.',
  )
})
