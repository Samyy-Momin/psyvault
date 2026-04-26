import { Link } from 'react-router-dom'

function renderHighlightedContent(content) {
  if (!Array.isArray(content)) {
    return content
  }

  return content.map((part) => {
    if (typeof part === 'string') {
      return part
    }

    return (
      <mark key={part.key} className="search-highlight">
        {part.text}
      </mark>
    )
  })
}

function BookCard({ book, titleContent, authorContent }) {
  return (
    <article className="book-card">
      <Link to={`/reader/${book.id}`} className="book-card-link" aria-label={`Open ${book.title}`}>
        {book.imageUrl ? (
          <img
            className="book-cover"
            src={book.imageUrl}
            alt={`${book.title} cover`}
            loading="lazy"
          />
        ) : (
          <div className="book-cover book-cover-fallback" aria-hidden="true" />
        )}

        <div className="book-body">
          <h3 className="book-title">{renderHighlightedContent(titleContent || book.title)}</h3>
          <div className="book-meta-row">
            <p className="book-author">
              {renderHighlightedContent(authorContent || book.author || 'Unknown author')}
            </p>
            <span className="book-category-badge">{book.category}</span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default BookCard
