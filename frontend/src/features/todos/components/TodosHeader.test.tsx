import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TodosHeader } from './TodosHeader'

vi.mock('../../../design-system', () => import('../../../design-system/mocks'))

it('shows the clear completed action only with completed tasks and a handler', async () => {
  const user = userEvent.setup()
  const onClear = vi.fn()
  const props = { onCreate: vi.fn(), onClearCompleted: onClear }
  const { rerender } = render(
    <TodosHeader disabled={false} completedCount={0} {...props} />,
  )
  expect(screen.queryByRole('button', { name: /Clear completed/ })).toBeNull()
  rerender(<TodosHeader disabled={false} completedCount={2} {...props} />)
  await user.click(
    screen.getByRole('button', { name: /Clear completed \(2\)/ }),
  )
  expect(onClear).toHaveBeenCalledTimes(1)
  rerender(<TodosHeader disabled completedCount={2} {...props} />)
  expect(screen.getByRole('button', { name: /Clear completed/ })).toBeDisabled()
  rerender(<TodosHeader disabled={false} completedCount={2} onCreate={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /Clear completed/ })).toBeNull()
})

it('invokes creation when enabled and blocks it when disabled', async () => {
  const user = userEvent.setup()
  const onCreate = vi.fn()
  const { rerender } = render(
    <TodosHeader disabled={false} onCreate={onCreate} />,
  )
  expect(screen.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  expect(
    screen.getByText('Create, organize, and complete tasks.'),
  ).toBeVisible()
  const button = screen.getByRole('button', { name: 'New task' })
  await user.click(button)
  expect(onCreate).toHaveBeenCalledTimes(1)
  rerender(<TodosHeader disabled onCreate={onCreate} />)
  expect(button).toBeDisabled()
  await user.click(button)
  expect(onCreate).toHaveBeenCalledTimes(1)
})
