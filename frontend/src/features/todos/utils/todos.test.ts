import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  isOverdue,
  priorityLabels,
  selectTodos,
  validateTodo,
} from './todos'
import type { Todo, TodoInput } from '../types'

const base: Todo = {
  id: 1,
  title: 'Sprint plan',
  description: '',
  priority: 'medium',
  completed: false,
  due_date: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

describe('selectTodos', () => {
  it('combines status with a case-insensitive search in the description', () => {
    const matching = { ...base, description: 'Discuss the API' }
    const todos = [
      matching,
      { ...matching, id: 2, completed: true },
      { ...base, id: 3 },
    ]
    expect(selectTodos(todos, 'active', ' api ', 'newest')).toEqual([matching])
  })

  it('sorts by priority without changing the source array', () => {
    const high: Todo = { ...base, id: 2, priority: 'high' }
    const todos = [base, high]
    expect(selectTodos(todos, 'all', '', 'priority')).toEqual([high, base])
    expect(todos).toEqual([base, high])
  })

  it('sorts by due date, pushing tasks without a due date to the end', () => {
    const dueSoon = { ...base, id: 2, due_date: '2026-10-05' }
    const dueLater = { ...base, id: 3, due_date: '2026-10-20' }
    const noDueDate = { ...base, id: 4, due_date: null }
    const todos = [noDueDate, dueLater, dueSoon]
    expect(selectTodos(todos, 'all', '', 'due')).toEqual([
      dueSoon,
      dueLater,
      noDueDate,
    ])
  })

  it('sorts by creation date, newest first, breaking ties by id', () => {
    const older = { ...base, id: 2, created_at: '2026-09-01T12:00:00Z' }
    const newer = { ...base, id: 3, created_at: '2026-10-10T12:00:00Z' }
    expect(selectTodos([older, newer], 'all', '', 'newest')).toEqual([
      newer,
      older,
    ])
  })
})

describe('validateTodo', () => {
  const validInput: TodoInput = {
    title: 'Plan the sprint',
    description: 'Some notes',
    priority: 'medium',
    due_date: '2026-10-15',
    completed: false,
  }

  it('reports no errors for a valid task', () => {
    expect(validateTodo(validInput)).toEqual({})
  })

  it('requires a non-blank title', () => {
    expect(validateTodo({ ...validInput, title: '   ' }).title).toBe(
      'Enter a task title.',
    )
  })

  it('rejects a title longer than 120 characters', () => {
    expect(
      validateTodo({ ...validInput, title: 'x'.repeat(121) }).title,
    ).toBe('The title must be at most 120 characters.')
  })

  it('rejects a description longer than 2000 characters', () => {
    expect(
      validateTodo({ ...validInput, description: 'x'.repeat(2001) })
        .description,
    ).toBe('The description must be at most 2000 characters.')
  })

  it('rejects a due date that is not a real calendar date', () => {
    expect(
      validateTodo({ ...validInput, due_date: '2026-02-30' }).due_date,
    ).toBe('Enter a valid date.')
  })

  it('rejects a due date that is not in ISO format', () => {
    expect(
      validateTodo({ ...validInput, due_date: '10/15/2026' }).due_date,
    ).toBe('Enter a valid date.')
  })

  it('allows an empty due date', () => {
    expect(validateTodo({ ...validInput, due_date: null }).due_date).toBeUndefined()
  })
})

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-29T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is true for an incomplete task with a due date in the past', () => {
    expect(isOverdue({ ...base, due_date: '2026-10-28' })).toBe(true)
  })

  it('is false once the task is completed', () => {
    expect(isOverdue({ ...base, due_date: '2026-10-28', completed: true })).toBe(
      false,
    )
  })

  it('is false when there is no due date', () => {
    expect(isOverdue({ ...base, due_date: null })).toBe(false)
  })

  it('is false for a due date that is today or in the future', () => {
    expect(isOverdue({ ...base, due_date: '2026-10-29' })).toBe(false)
    expect(isOverdue({ ...base, due_date: '2026-10-30' })).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats an ISO date as a short, human-readable date', () => {
    expect(formatDate('2026-10-01')).toBe('1 Oct 2026')
  })
})

describe('priorityLabels', () => {
  it('maps each priority to its display label', () => {
    expect(priorityLabels).toEqual({
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    })
  })
})
