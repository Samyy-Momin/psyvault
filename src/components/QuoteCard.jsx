function QuoteCard({
  quoteText,
  authorName,
  readerName = '',
  bookTitle,
  branding = 'Powered by PsyVault',
  backgroundStyle = 'black',
  captureRef = null,
  preview = false,
}) {
  return (
    <article
      ref={captureRef}
      className={`quote-share-card ${preview ? 'is-preview' : 'is-capture'} is-${backgroundStyle}`}
    >
      <p className="quote-share-text">{quoteText}</p>
      <p className="quote-share-author">— {authorName}</p>
      {readerName ? <p className="quote-share-credit">Quote hunted by {readerName}</p> : null}
      <p className="quote-share-book">{bookTitle}</p>
      <p className="quote-share-branding">{branding}</p>
    </article>
  )
}

export default QuoteCard
