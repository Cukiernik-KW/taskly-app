import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNotice } from './useNotice'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('starts without a notice and exposes a notification callback', () => {
  const { result } = renderHook(() => useNotice())
  expect(result.current.message).toBe('')
  expect(result.current.notify).toEqual(expect.any(Function))
})

it('shows the notified message and clears it after 4 seconds', () => {
  const { result } = renderHook(() => useNotice())
  act(() => {
    result.current.notify('Task deleted.')
  })
  expect(result.current.message).toBe('Task deleted.')
  act(() => {
    vi.advanceTimersByTime(3999)
  })
  expect(result.current.message).toBe('Task deleted.')
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(result.current.message).toBe('')
})

it('restarts the timeout when a new notice replaces the current one', () => {
  const { result } = renderHook(() => useNotice())
  act(() => {
    result.current.notify('First notice.')
  })
  act(() => {
    vi.advanceTimersByTime(3000)
  })
  act(() => {
    result.current.notify('Second notice.')
  })
  act(() => {
    vi.advanceTimersByTime(3999)
  })
  expect(result.current.message).toBe('Second notice.')
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(result.current.message).toBe('')
})
