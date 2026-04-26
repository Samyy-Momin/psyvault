import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuotes } from '../services/quotes'

function QuotesPage() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadQuotes() {
      try {
        setLoading(true)
        const nextQuotes = await getQuotes()

        if (active) {
          setQuotes(nextQuotes)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load quotes.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadQuotes()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="page-shell quotes-page">
      <header className="quotes-page-header">
        <Link to="/" className="quotes-back" aria-label="Back to home">
          <ArrowLeft size={16} strokeWidth={2} />
        </Link>
        <h1 className="library-title">Quotes</h1>
      </header>

      {loading ? <div className="status">Loading quotes…</div> : null}
      {!loading && error ? <div className="status status-error">{error}</div> : null}

      {!loading && !error ? (
        <section className="quotes-list">
          {quotes.map((quote) => (
            <article key={quote.id} className="quote-card">
              <p className="quote-text">{quote.text}</p>
              <p className="quote-writer">{quote.writer}</p>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  )
}

export default QuotesPage
