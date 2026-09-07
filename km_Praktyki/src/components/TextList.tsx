import type { TextItem } from '../types'

type TextListProps = {
  items: TextItem[]
  onRemove: (id: number) => Promise<void>
  disabled?: boolean
}

export function TextList({ items, onRemove, disabled = false }: TextListProps) {
  return (
    <div className="text-list" aria-live="polite">
      {items.length > 0 ? (
        items.map((item) => (
          <div className="text-item" key={item.id}>
            <span>{item.content}</span>
            <button
              type="button"
              className="remove-button"
              aria-label={`Usuń tekst: ${item.content}`}
              onClick={() => void onRemove(item.id)}
              disabled={disabled}
            >
              ×
            </button>
          </div>
        ))
      ) : (
        <p className="empty-list">Lista jest pusta.</p>
      )}
    </div>
  )
}
