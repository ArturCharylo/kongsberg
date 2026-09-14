import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PagePanel } from '../components/PagePanel'
import { TextForm } from '../components/TextForm'
import { TextList } from '../components/TextList'

const item = { id: 1, content: 'Saved text' }

describe('PagePanel', () => {
  it('renders its heading and children', () => {
    render(<PagePanel eyebrow="Section" title="Title"><span>Child</span></PagePanel>)
    expect(screen.getByText('Section')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('Child')).toBeInTheDocument()
  })
})

describe('TextForm', () => {
  it('does not submit blank content and shows the list', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onShowList = vi.fn()
    render(<TextForm onSubmit={onSubmit} onShowList={onShowList} />)

    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(onShowList).toHaveBeenCalledOnce()
  })

  it('submits trimmed content with the button and Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TextForm onSubmit={onSubmit} onShowList={vi.fn()} />)
    const textarea = screen.getByRole('textbox')

    await user.type(textarea, '  Hello  ')
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('Hello')
    expect(textarea).toHaveValue('')
  })

  it('keeps content when submission fails and supports Shift+Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('failed'))
    render(<TextForm onSubmit={onSubmit} onShowList={vi.fn()} />)
    const textarea = screen.getByRole('textbox')

    await user.type(textarea, 'line')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('line\n')
    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    expect(textarea).toHaveValue('line\n')
  })
})

describe('TextList', () => {
  it('renders empty state and items', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<TextList items={[]} onRemove={onRemove} />)
    expect(screen.getByText('Lista jest pusta.')).toBeInTheDocument()

    rerender(<TextList items={[item]} onRemove={onRemove} />)
    await user.click(screen.getByRole('button', { name: 'Usuń tekst: Saved text' }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})
