import { useEffect, useState } from 'react'
import { textApi } from './api'
import { PagePanel } from './components/PagePanel'
import { TextForm } from './components/TextForm'
import { TextList } from './components/TextList'
import type { TextItem } from './types'
import './App.css'

function App() {
  const [texts, setTexts] = useState<TextItem[]>([])
  const [showList, setShowList] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!showList) {
      return
    }

    const loadTexts = async () => {
      setIsLoading(true)
      setError('')

      try {
        setTexts(await textApi.list())
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Nie udało się pobrać tekstów.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadTexts()
  }, [showList])

  const submitText = async (content: string) => {
    setIsLoading(true)
    setError('')

    try {
      const createdText = await textApi.create(content)
      setTexts((currentTexts) => [...currentTexts, createdText])
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się zapisać tekstu.')
      throw submitError
    } finally {
      setIsLoading(false)
    }
  }

  const removeText = async (id: number) => {
    setIsLoading(true)
    setError('')

    try {
      await textApi.remove(id)
      setTexts((currentTexts) => currentTexts.filter((item) => item.id !== id))
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Nie udało się usunąć tekstu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      {!showList ? (
        <PagePanel eyebrow="Strona główna" title="Dodaj tekst" className="home-panel">
          <TextForm onSubmit={submitText} disabled={isLoading} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="actions">
            <button type="button" className="secondary-button" onClick={() => setShowList(true)}>
              Lista
            </button>
          </div>
        </PagePanel>
      ) : (
        <PagePanel eyebrow="Podstrona listy" title="Lista tekstów" className="list-panel">
          {isLoading && <p className="status-message">Ładowanie...</p>}
          <TextList items={texts} onRemove={removeText} disabled={isLoading} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="button" className="back-button" onClick={() => setShowList(false)}>
            Wróć
          </button>
        </PagePanel>
      )}
    </main>
  )
}

export default App
