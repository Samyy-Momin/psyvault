import { Link } from 'react-router-dom'

function StickyQuotes({ quotes }) {
  return (
    <aside className="sticky-quotes panel" aria-label="Quotes preview">
      <div className="sticky-quotes-header">
        <h2 className="section-title">Quotes</h2>
        <Link to="/quotes" className="sticky-quotes-link">
          View all →
        </Link>
      </div>

      <div className="sticky-quotes-list">
        {quotes.map((quote) => (
          <article key={quote.id} className="sticky-quote-item">
            <p className="sticky-quote-text">{quote.text}</p>
            <p className="sticky-quote-writer">{quote.writer}</p>
          </article>
        ))}
      </div>
    </aside>
  )
}

export default StickyQuotes
