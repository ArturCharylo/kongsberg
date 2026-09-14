import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { textApi } from '../api'

vi.mock('../api', () => ({
  textApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}))

const mockedApi = vi.mocked(textApi)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('App', () => {
  it('loads, displays and removes texts', async () => {
    const user = userEvent.setup()
    mockedApi.list.mockResolvedValue([{ id: 1, content: 'Existing' }])
    mockedApi.remove.mockResolvedValue(undefined)
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(await screen.findByText('Existing')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Usuń tekst: Existing' }))
    await waitFor(() => expect(screen.queryByText('Existing')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Wróć' }))
    expect(screen.getByRole('heading', { name: 'Dodaj tekst' })).toBeInTheDocument()
  })

  it('adds a created text', async () => {
    const user = userEvent.setup()
    mockedApi.list.mockResolvedValue([{ id: 2, content: 'New text' }])
    mockedApi.create.mockResolvedValue({ id: 2, content: 'New text' })
    render(<App />)

    await user.type(screen.getByRole('textbox'), 'New text')
    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(await screen.findByText('New text')).toBeInTheDocument()
  })

  it('displays load and submit errors', async () => {
    const user = userEvent.setup()
    mockedApi.list.mockRejectedValue(new Error('Load failed'))
    mockedApi.create.mockRejectedValue(new Error('Save failed'))
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Load failed')
    await user.click(screen.getByRole('button', { name: 'Wróć' }))
    await user.type(screen.getByRole('textbox'), 'bad')
    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
  })
})
