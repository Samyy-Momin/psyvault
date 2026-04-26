import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Link, useParams } from 'react-router-dom'
import { getBookById } from '../services/books'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
const ZOOM_OPTIONS = [0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5]
const PAGE_BATCH_SIZE = 5

function ReaderPage() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [zoom, setZoom] = useState(1.1)
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false)
  const [orientationMode, setOrientationMode] = useState('portrait')
  const [orientationMessage, setOrientationMessage] = useState('')
  const [visiblePages, setVisiblePages] = useState(PAGE_BATCH_SIZE)
  const [isLoadingMorePages, setIsLoadingMorePages] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === '+' || event.key === '=') {
        setZoom((current) => Math.min(2.2, Number((current + 0.1).toFixed(2))))
      }

      if (event.key === '-') {
        setZoom((current) => Math.max(0.8, Number((current - 0.1).toFixed(2))))
      }

      if (event.key === '0') {
        setZoom(1.1)
      }

      if (event.key === 'Escape') {
        setZoomMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let active = true

    async function loadBook() {
      try {
        setLoading(true)
        setError('')
        const nextBook = await getBookById(id)

        if (!nextBook) {
          throw new Error('This book was not found.')
        }

        if (active) {
          setBook(nextBook)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load the selected book.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadBook()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!pageCount) {
      return undefined
    }

    const sentinel = sentinelRef.current

    if (!sentinel) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return
        }

        setVisiblePages((current) => {
          if (current >= pageCount) {
            setIsLoadingMorePages(false)
            return current
          }

          setIsLoadingMorePages(true)
          return Math.min(current + PAGE_BATCH_SIZE, pageCount)
        })
      },
      {
        rootMargin: '1200px 0px',
      },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [pageCount, visiblePages])

  useEffect(() => {
    if (!isLoadingMorePages) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoadingMorePages(false)
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isLoadingMorePages])

  const pages = useMemo(
    () => Array.from({ length: Math.min(visiblePages, pageCount) }, (_, index) => index + 1),
    [pageCount, visiblePages],
  )

  async function handleOrientationToggle() {
    const nextMode = orientationMode === 'portrait' ? 'landscape' : 'portrait'
    setOrientationMode(nextMode)
    setOrientationMessage('')

    if (!window.screen?.orientation?.lock) {
      if (nextMode === 'landscape') {
        setOrientationMessage('Landscape lock is not available here. Rotate the device manually.')
      }
      return
    }

    try {
      await window.screen.orientation.lock(nextMode)
    } catch (orientationError) {
      if (nextMode === 'landscape') {
        setOrientationMessage(
          'Landscape lock was blocked by this device. You can still rotate manually.',
        )
      } else {
        setOrientationMessage(
          'Portrait lock was blocked by this device. You can still rotate manually.',
        )
      }
      console.error('Orientation lock failed:', orientationError)
    }
  }

  return (
    <main className="reader-page">
      <header className="reader-toolbar">
        <Link to="/" className="reader-back" aria-label="Back to library">
          <ArrowLeft size={16} strokeWidth={2} />
        </Link>
        <div className="reader-title">{book?.title || 'Loading book'}</div>
        <div className="reader-actions">
          <div className="reader-zoom-wrap">
            <button
              type="button"
              className="reader-control"
              onClick={() => setZoomMenuOpen((current) => !current)}
            >
              {Math.round(zoom * 100)}%
            </button>
            {zoomMenuOpen ? (
              <div className="reader-menu" role="menu" aria-label="Zoom levels">
                {ZOOM_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`reader-menu-item ${zoom === option ? 'is-active' : ''}`}
                    onClick={() => {
                      setZoom(option)
                      setZoomMenuOpen(false)
                    }}
                  >
                    {Math.round(option * 100)}%
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" className="reader-control" onClick={handleOrientationToggle}>
            {orientationMode === 'portrait' ? 'Landscape' : 'Portrait'}
          </button>
        </div>
      </header>

      <section className="reader-layout">
        {loading ? <div className="status">Loading reader…</div> : null}
        {!loading && error ? <div className="status status-error">{error}</div> : null}
        {!loading && !error && orientationMessage ? (
          <div className="status">{orientationMessage}</div>
        ) : null}

        {!loading && !error && book ? (
          <div className={`reader-stage ${orientationMode === 'landscape' ? 'is-landscape' : ''}`}>
            <Document
              file={book.fileUrl}
              loading={<div className="status">Preparing PDF document…</div>}
              error={(err) => (
                <div className="status status-error">
                  {err?.message ||
                    'The server responded with an error. Verify the file exists or re-upload the book.'}
                </div>
              )}
              onLoadError={(err) => console.error('PDF Load Error:', err)}
              onLoadSuccess={({ numPages }) => {
                setPageCount(numPages)
                setVisiblePages(PAGE_BATCH_SIZE)
              }}
            >
              <div className="pdf-scroll">
                {pages.map((pageNumber) => (
                  <div key={pageNumber} className="pdf-page">
                    <Page
                      pageNumber={pageNumber}
                      scale={zoom}
                      loading={<div className="pdf-page-fallback">Rendering page {pageNumber}…</div>}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </div>
                ))}

                {visiblePages < pageCount ? (
                  <div ref={sentinelRef} className="pdf-page-fallback">
                    {isLoadingMorePages ? 'Loading more pages…' : 'Scroll to load more pages'}
                  </div>
                ) : null}
              </div>
            </Document>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default ReaderPage
