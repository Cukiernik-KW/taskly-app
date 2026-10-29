import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../test/todoFixture'
import { useNotice } from '../../hooks/useNotice'
import type { Todo } from './types'
import { useTodoFilters } from './hooks/useTodoFilters'
import { useTodosBusy } from './hooks/useTodosBusy'
import { useTodosQuery } from './hooks/useTodosQuery'
import { useUpdateTodoMutation } from './hooks/useUpdateTodoMutation'
import { TodosPage } from './TodosPage'

vi.mock('../../design-system', () => import('../../design-system/mocks'))
vi.mock('../../hooks/useNotice', () => ({ useNotice: vi.fn() }))
vi.mock('./hooks/useTodoFilters', () => ({ useTodoFilters: vi.fn() }))
vi.mock('./hooks/useTodosBusy', () => ({ useTodosBusy: vi.fn() }))
vi.mock('./hooks/useTodosQuery', () => ({ useTodosQuery: vi.fn() }))
vi.mock('./hooks/useUpdateTodoMutation', () => ({
  useUpdateTodoMutation: vi.fn(),
}))
vi.mock('./components/TodosHeader', () => ({
  TodosHeader: ({
    disabled,
    onCreate,
  }: {
    disabled: boolean
    onCreate: () => void
  }) => (
    <>
      <h1>Tasks</h1>
      <button disabled={disabled} onClick={onCreate}>
        New task
      </button>
    </>
  ),
}))
vi.mock('./components/TodoFilters', () => ({ TodoFilters: () => null }))
vi.mock('./components/TodoList', () => ({
  TodoList: ({
    todos,
    onToggle,
    onEdit,
    onDelete,
  }: {
    todos: Todo[]
    onToggle: (todo: Todo) => void
    onEdit: (todo: Todo) => void
    onDelete: (todo: Todo) => void
  }) => (
    <div>
      <p>Task list</p>
      {todos.map((todo) => (
        <div key={todo.id}>
          <button onClick={() => onToggle(todo)}>Toggle {todo.title}</button>
          <button onClick={() => onEdit(todo)}>Edit {todo.title}</button>
          <button onClick={() => onDelete(todo)}>Delete {todo.title}</button>
        </div>
      ))}
    </div>
  ),
}))
vi.mock('./components/TodoEditor', () => ({
  TodoEditor: ({
    todo,
    onClose,
    onSaved,
  }: {
    todo: Todo | 'new'
    onClose: () => void
    onSaved: (message: string) => void
  }) => (
    <div>
      <p>Editor open for {todo === 'new' ? 'new task' : todo.title}</p>
      <button onClick={onClose}>Close editor</button>
      <button onClick={() => onSaved('Saved from editor.')}>
        Save in editor
      </button>
    </div>
  ),
}))
vi.mock('./components/DeleteTodoDialog', () => ({
  DeleteTodoDialog: ({
    todo,
    onClose,
    onDeleted,
  }: {
    todo: Todo
    onClose: () => void
    onDeleted: () => void
  }) => (
    <div>
      <p>Confirm delete {todo.title}</p>
      <button onClick={onClose}>Close delete dialog</button>
      <button onClick={onDeleted}>Confirm delete</button>
    </div>
  ),
}))
vi.mock('../../components/SuccessNotice', () => ({
  SuccessNotice: ({ message }: { message: string }) => <p>Notice: {message}</p>,
}))

function mockDefaultHooks({
  todos = [] as Todo[],
  busy = false,
  mutateAsync = vi.fn(),
  notify = vi.fn(),
}: {
  todos?: Todo[]
  busy?: boolean
  mutateAsync?: ReturnType<typeof vi.fn>
  notify?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(useTodosQuery).mockReturnValue({
    data: todos,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useTodosQuery>)
  vi.mocked(useUpdateTodoMutation).mockReturnValue({
    error: null,
    reset: vi.fn(),
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateTodoMutation>)
  vi.mocked(useTodosBusy).mockReturnValue(busy)
  vi.mocked(useNotice).mockReturnValue({ message: '', notify })
  vi.mocked(useTodoFilters).mockReturnValue({
    filter: 'all',
    search: '',
    sort: 'newest',
    visible: todos,
    setFilter: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
  })
}

it('displays a query failure and resets mutation errors before retrying', async () => {
  const user = userEvent.setup()
  const refetch = vi.fn().mockResolvedValue(undefined)
  const reset = vi.fn()
  vi.mocked(useTodosQuery).mockReturnValue({
    data: [],
    isPending: false,
    isFetching: false,
    isError: true,
    error: new Error('The server is unavailable.'),
    refetch,
  } as unknown as ReturnType<typeof useTodosQuery>)
  vi.mocked(useUpdateTodoMutation).mockReturnValue({
    error: null,
    reset,
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof useUpdateTodoMutation>)
  vi.mocked(useTodosBusy).mockReturnValue(false)
  vi.mocked(useNotice).mockReturnValue({ message: '', notify: vi.fn() })
  vi.mocked(useTodoFilters).mockReturnValue({
    filter: 'all',
    search: '',
    sort: 'newest',
    visible: [],
    setFilter: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
  })
  render(<TodosPage />)
  expect(screen.getByTestId('alert')).toHaveTextContent(
    'The server is unavailable.',
  )
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
  expect(reset).toHaveBeenCalledTimes(1)
  expect(reset.mock.invocationCallOrder[0]).toBeLessThan(
    refetch.mock.invocationCallOrder[0],
  )
})

it('shows a completion notice after toggling an active task to complete', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  const mutateAsync = vi.fn().mockResolvedValue({ ...todoFixture, completed: true })
  mockDefaultHooks({ todos: [todoFixture], mutateAsync, notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Toggle ${todoFixture.title}` }),
  )
  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      id: todoFixture.id,
      input: { completed: true },
    }),
  )
  expect(notify).toHaveBeenCalledWith('Another task complete. Well done!')
})

it('shows an active notice after toggling a completed task back to active', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  const completedTodo = { ...todoFixture, completed: true }
  const mutateAsync = vi.fn().mockResolvedValue({ ...completedTodo, completed: false })
  mockDefaultHooks({ todos: [completedTodo], mutateAsync, notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Toggle ${completedTodo.title}` }),
  )
  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      id: completedTodo.id,
      input: { completed: false },
    }),
  )
  expect(notify).toHaveBeenCalledWith('Task marked as active.')
})

it('does not notify when the toggle mutation fails', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  const mutateAsync = vi.fn().mockRejectedValue(new Error('Update failed.'))
  mockDefaultHooks({ todos: [todoFixture], mutateAsync, notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Toggle ${todoFixture.title}` }),
  )
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
  expect(notify).not.toHaveBeenCalled()
})

it('ignores a toggle request while the page is busy', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  const mutateAsync = vi.fn()
  mockDefaultHooks({ todos: [todoFixture], busy: true, mutateAsync, notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Toggle ${todoFixture.title}` }),
  )
  expect(mutateAsync).not.toHaveBeenCalled()
  expect(notify).not.toHaveBeenCalled()
})

it('opens the editor to create a task and closes it without saving', async () => {
  const user = userEvent.setup()
  mockDefaultHooks()
  render(<TodosPage />)
  expect(screen.queryByText('Editor open for new task')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'New task' }))
  expect(screen.getByText('Editor open for new task')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Close editor' }))
  expect(screen.queryByText('Editor open for new task')).not.toBeInTheDocument()
})

it('opens the editor for an existing task and notifies after saving', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  mockDefaultHooks({ todos: [todoFixture], notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Edit ${todoFixture.title}` }),
  )
  expect(screen.getByText(`Editor open for ${todoFixture.title}`)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Save in editor' }))
  expect(notify).toHaveBeenCalledWith('Saved from editor.')
  expect(
    screen.queryByText(`Editor open for ${todoFixture.title}`),
  ).not.toBeInTheDocument()
})

it('opens the delete dialog and notifies after the task is deleted', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  mockDefaultHooks({ todos: [todoFixture], notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Delete ${todoFixture.title}` }),
  )
  expect(screen.getByText(`Confirm delete ${todoFixture.title}`)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
  expect(notify).toHaveBeenCalledWith('Task deleted.')
  expect(
    screen.queryByText(`Confirm delete ${todoFixture.title}`),
  ).not.toBeInTheDocument()
})

it('closes the delete dialog without notifying when cancelled', async () => {
  const user = userEvent.setup()
  const notify = vi.fn()
  mockDefaultHooks({ todos: [todoFixture], notify })
  render(<TodosPage />)
  await user.click(
    screen.getByRole('button', { name: `Delete ${todoFixture.title}` }),
  )
  await user.click(screen.getByRole('button', { name: 'Close delete dialog' }))
  expect(notify).not.toHaveBeenCalled()
  expect(
    screen.queryByText(`Confirm delete ${todoFixture.title}`),
  ).not.toBeInTheDocument()
})
