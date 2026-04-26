import QuoteCard from './QuoteCard'
import { QUOTE_BACKGROUND_OPTIONS, getQuoteCardProps } from '../lib/quoteUtils'

function QuoteModal({
  isOpen,
  quoteText,
  onQuoteTextChange,
  readerName,
  onReaderNameChange,
  bookTitle,
  authorName,
  backgroundStyle,
  onBackgroundStyleChange,
  onClose,
  onGenerate,
  onEdit,
  generatedImageUrl,
  isGenerating,
  actionError,
  onDownload,
  onCopy,
  onShare,
  copySupported,
  shareSupported,
  captureRef,
}) {
  if (!isOpen) {
    return null
  }

  const hasGeneratedImage = Boolean(generatedImageUrl)

  const quoteCardProps = getQuoteCardProps({
    text: quoteText,
    authorName,
    readerName,
    bookTitle,
    backgroundStyle,
  })

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel quote-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="quote-modal-title" className="section-title">
              {hasGeneratedImage ? 'Quote Ready' : 'Create Quote'}
            </h2>
            <p className="modal-subtitle">
              {hasGeneratedImage
                ? 'Your image is ready to download, copy, or share.'
                : 'Turn this selection into a shareable image.'}
            </p>
          </div>
          <button type="button" className="button" onClick={onClose}>Cancel</button>
        </div>

        <div className={`quote-modal-stage ${hasGeneratedImage ? 'is-result' : 'is-editing'}`}>
          {!hasGeneratedImage ? (
            <>
              <div className="quote-modal-grid quote-stage-panel">
                <div className="field">
                  <label htmlFor="quote-text">Selected text</label>
                  <textarea
                    id="quote-text"
                    className="textarea"
                    value={quoteText}
                    onChange={(event) => onQuoteTextChange(event.target.value)}
                  />
                </div>

                <div className="quote-modal-meta">
                  <div className="field">
                    <label htmlFor="quote-reader-name">Your Name (optional)</label>
                    <input
                      id="quote-reader-name"
                      className="input"
                      type="text"
                      placeholder="e.g. Sami Momin"
                      value={readerName}
                      onChange={(event) => onReaderNameChange(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Book title</label>
                    <div className="quote-modal-value panel">{bookTitle || 'Untitled book'}</div>
                  </div>

                  <div className="field">
                    <label>Author</label>
                    <div className="quote-modal-value panel">{authorName || 'Unknown author'}</div>
                  </div>

                  <fieldset className="quote-style-fieldset">
                    <legend>Background</legend>
                    <div className="quote-style-options">
                      {QUOTE_BACKGROUND_OPTIONS.map((option) => (
                        <label key={option.value} className="quote-style-option">
                          <input
                            type="radio"
                            name="quote-background"
                            value={option.value}
                            checked={backgroundStyle === option.value}
                            onChange={() => onBackgroundStyleChange(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="quote-preview-wrap quote-stage-panel">
                <QuoteCard {...quoteCardProps} preview />
              </div>

              <div className="modal-actions quote-stage-panel">
                <button
                  type="button"
                  className="button"
                  disabled={isGenerating || !quoteText.trim()}
                  onClick={onGenerate}
                >
                  {isGenerating ? 'Generating…' : 'Generate Image'}
                </button>
              </div>
            </>
          ) : null}

          {hasGeneratedImage ? (
            <div className="quote-output quote-stage-panel">
              <img className="quote-output-image" src={generatedImageUrl} alt="Generated quote" />
              <div className="quote-output-actions">
                <button type="button" className="button" onClick={onDownload}>
                  Download Image
                </button>
                <button type="button" className="button" onClick={onCopy} disabled={!copySupported}>
                  Copy Image
                </button>
                <button type="button" className="button" onClick={onShare} disabled={!shareSupported}>
                  Share
                </button>
                <button type="button" className="button" onClick={onEdit}>
                  Edit Quote
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {actionError ? <div className="status status-error">{actionError}</div> : null}

        <div className="quote-capture-surface" aria-hidden="true">
          <QuoteCard {...quoteCardProps} captureRef={captureRef} />
        </div>
      </section>
    </div>
  )
}

export default QuoteModal
