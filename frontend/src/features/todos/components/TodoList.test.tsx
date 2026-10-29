import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import type { Todo } from '../types'
import { TodoList } from './TodoList'

vi.mock('../../../design-system', () => import('../../../design-system/mocks'))
vi.mock('./TodoEmptyState', () => ({
  TodoEmptyState: () => <p>Empty task list</p>,
}))
vi.mock('./TodoItem', () => ({
  TodoItem: ({
    todo,
    onToggle,
    onEdit,
    onDelete,
  }: {
    todo: Todo
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
  }) => (
    <li>
      {todo.title}
      <button onClick={onToggle}>Toggle {todo.title}</button>
      <button onClick={onEdit}>Edit {todo.title}</button>
      <button onClick={onDelete}>Delete {todo.title}</button>
    </li>
  ),
}))

const baseProps = {
  hasTodos: false,
  failed: false,
  busy: false,
  onCreate: vi.fn(),
  onToggle: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

it('shows loading feedback before showing an empty list', () => {
  const props = { ...baseProps, todos: [] }
  const { rerender } = render(<TodoList {...props} loading />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading your tasks…')
  expect(screen.queryByText('Empty task list')).not.toBeInTheDocument()
  rerender(<TodoList {...props} loading={false} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText('Empty task list')).toBeVisible()
})

it('shows an unavailable message when loading failed and there are no cached tasks', () => {
  render(<TodoList {...baseProps} todos={[]} loading={false} failed />)
  expect(
    screen.getByRole('heading', {
      name: 'The task list is temporarily unavailable',
    }),
  ).toBeVisible()
  expect(screen.queryByText('Empty task list')).not.toBeInTheDocument()
})

it('still lists cached tasks when a background refresh fails', () => {
  render(
    <TodoList
      {...baseProps}
      todos={[todoFixture]}
      hasTodos
      loading={false}
      failed
    />,
  )
  expect(screen.getByText(todoFixture.title)).toBeVisible()
  expect(
    screen.queryByRole('heading', {
      name: 'The task list is temporarily unavailable',
    }),
  ).not.toBeInTheDocument()
})

it('forwards task actions to the matching callback', async () => {
  const user = userEvent.setup()
  const onToggle = vi.fn()
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <TodoList
      {...baseProps}
      todos={[todoFixture]}
      hasTodos
      loading={false}
      onToggle={onToggle}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  )
  await user.click(
    screen.getByRole('button', { name: `Toggle ${todoFixture.title}` }),
  )
  await user.click(
    screen.getByRole('button', { name: `Edit ${todoFixture.title}` }),
  )
  await user.click(
    screen.getByRole('button', { name: `Delete ${todoFixture.title}` }),
  )
  expect(onToggle).toHaveBeenCalledWith(todoFixture)
  expect(onEdit).toHaveBeenCalledWith(todoFixture)
  expect(onDelete).toHaveBeenCalledWith(todoFixture)
})
