import { render, screen } from '@testing-library/react'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { AppProviders } from './AppProviders'
import { GlobalStyles } from '../design-system'

vi.mock('../design-system', () => import('../design-system/mocks'))

function ClientProbe({ expected }: { expected: QueryClient }) {
  const client = useQueryClient()
  return <p>{client === expected ? 'matching client' : 'different client'}</p>
}

it('renders the global styles once and the given children', () => {
  render(
    <AppProviders client={new QueryClient()}>
      <p>Application content</p>
    </AppProviders>,
  )
  expect(screen.getByText('Application content')).toBeVisible()
  expect(GlobalStyles).toHaveBeenCalled()
})

it('provides the given query client to descendants', () => {
  const client = new QueryClient()
  render(
    <AppProviders client={client}>
      <ClientProbe expected={client} />
    </AppProviders>,
  )
  expect(screen.getByText('matching client')).toBeVisible()
})

it('falls back to the shared query client when none is provided', async () => {
  const { queryClient } = await import('../lib/queryClient')
  render(
    <AppProviders>
      <ClientProbe expected={queryClient} />
    </AppProviders>,
  )
  expect(screen.getByText('matching client')).toBeVisible()
})
