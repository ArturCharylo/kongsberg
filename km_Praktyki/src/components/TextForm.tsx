import { useState } from 'react'

type TextFormProps = {
  onSubmit: (content: string) => Promise<void>
  onShowList: () => void
  disabled?: boolean
}

export function TextForm({ onSubmit, onShowList, disabled = false }: TextFormProps) {
  const [content, setContent] = useState('')

  const submit = async () => {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    try {
      await onSubmit(trimmedContent)
      setContent('')
    } catch {
      // The parent displays the API error next to the form.
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <>
      <p className="intro">Wpisz wiadomość, którą chcesz zachować na liście.</p>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Przykładowy tekst 1"
        aria-label="Treść tekstu"
        rows={3}
        disabled={disabled}
      />
      <div className="actions">
      <button
        type="button"
        onClick={() => void submit()}
        disabled={disabled}
      >
        Wyślij
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={onShowList}
      >
        Lista
      </button>
      </div>
    </>
  )
}
