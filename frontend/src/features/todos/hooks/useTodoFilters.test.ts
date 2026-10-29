import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import type { Todo } from '../types'
import { useTodoFilters } from './useTodoFilters'

const todos: Todo[] = [
  {
    ...todoFixture,
    id: 1,
    title: 'Plan the sprint',
    priority: 'medium',
    completed: false,
    created_at: '2026-10-01T12:00:00Z',
  },
  {
    ...todoFixture,
    id: 2,
    title: 'Ship the release',
    priority: 'high',
    completed: true,
    created_at: '2026-10-02T12:00:00Z',
  },
]

it('defaults to showing every task sorted by newest first', () => {
  const { result } = renderHook(() => useTodoFilters(todos))
  expect(result.current.filter).toBe('all')
  expect(result.current.search).toBe('')
  expect(result.current.sort).toBe('newest')
  expect(result.current.visible).toEqual([todos[1], todos[0]])
})

it('recomputes the visible tasks as the filter, search and sort change', () => {
  const { result } = renderHook(() => useTodoFilters(todos))

  act(() => result.current.setFilter('completed'))
  expect(result.current.visible).toEqual([todos[1]])

  act(() => result.current.setFilter('all'))
  act(() => result.current.setSearch('sprint'))
  expect(result.current.visible).toEqual([todos[0]])

  act(() => result.current.setSearch(''))
  act(() => result.current.setSort('priority'))
  expect(result.current.visible).toEqual([todos[1], todos[0]])
})
