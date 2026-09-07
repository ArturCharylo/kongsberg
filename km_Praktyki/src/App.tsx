import { useState } from 'react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [texts, setTexts] = useState([
    'Przykładowy tekst 2',
    'Przykładowy tekst 3',
  ])
  const [showList, setShowList] = useState(false)

  const submitText = () => {
    const trimmedText = text.trim()

    if (!trimmedText) {
      return
    }

    setTexts((currentTexts) => [...currentTexts, trimmedText])
    setText('')
  }

  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitText()
    }
  }

  return (
    <main className="app-shell">
      {!showList ? (
        <section className="page-panel home-panel" aria-labelledby="home-title">
          <p className="eyebrow">Strona główna</p>
          <h1 id="home-title">Dodaj tekst</h1>
          <p className="intro">Wpisz wiadomość, którą chcesz zachować na liście.</p>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Przykładowy tekst 1"
            aria-label="Treść tekstu"
            rows={3}
          />
          <div className="actions">
            <button type="button" onClick={submitText}>
              Wyślij
            </button>
            <button type="button" className="secondary-button" onClick={() => setShowList(true)}>
              Lista
            </button>
          </div>
        </section>
      ) : (
        <section className="page-panel list-panel" aria-labelledby="list-title">
          <p className="eyebrow">Podstrona listy</p>
          <h1 id="list-title">Lista tekstów</h1>
          <div className="text-list" aria-live="polite">
            {texts.length > 0 ? (
              texts.map((item, index) => (
                <div className="text-item" key={`${item}-${index}`}>
                  <span>{item}</span>
                  <button
                    type="button"
                    className="remove-button"
                    aria-label={`Usuń tekst: ${item}`}
                    onClick={() => setTexts((currentTexts) => currentTexts.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-list">Lista jest pusta.</p>
            )}
          </div>
          <button type="button" className="back-button" onClick={() => setShowList(false)}>
            Wróć
          </button>
        </section>
      )}
    </main>
  )
}

export default App
