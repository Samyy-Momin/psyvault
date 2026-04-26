import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BookCard from '../components/BookCard'
import HomeHeader from '../components/HomeHeader'
import StickyQuotes from '../components/StickyQuotes'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { ALL_CATEGORIES } from '../lib/constants'
import { getErrorMessage } from '../lib/errors'
import { highlightMatchedText, runBookSearch } from '../lib/search'
import { getBooksPage } from '../services/books'
import { getCategories } from '../services/categories'
import { getQuotePreviews } from '../services/quotes'

function HomePage() {
  const [books, setBooks] = useState([])
  const [quotes, setQuotes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const requestKeyRef = useRef(false)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)

  useEffect(() => {
    let active = true

    async function loadStaticContent() {
      try {
        const [nextQuotes, nextCategories] = await Promise.all([
          getQuotePreviews(2),
          getCategories(),
        ])

        if (active) {
          setQuotes(nextQuotes)
          setCategories(nextCategories)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Something went wrong'))
        }
      }
    }

    loadStaticContent()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    async function loadFirstPage() {
      const requestKey = 'books'

      if (requestKeyRef.current === requestKey) {
        return
      }

      requestKeyRef.current = requestKey
      setBooks([])
      setLastDoc(null)
      setHasMore(true)
      setLoading(true)
      setError('')

      try {
        const page = await getBooksPage({
          cursor: null,
        })

        setBooks(page.books)
        setLastDoc(page.lastDoc)
        setHasMore(page.hasMore)
      } catch (err) {
        setBooks([])
        setError(getErrorMessage(err, 'Failed to load books'))
      } finally {
        requestKeyRef.current = false
        setLoading(false)
      }
    }

    loadFirstPage()
  }, [])

  const filteredBooks = useMemo(() => {
    const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase()
    const categoryBooks =
      selectedCategory === ALL_CATEGORIES
        ? books
        : books.filter((book) => book.category === selectedCategory)

    if (!normalizedSearchQuery) {
      return categoryBooks
    }

    return runBookSearch(categoryBooks, normalizedSearchQuery).map((result) => {
      const titleMatch = result.matches?.find((match) => match.key === 'title')
      const authorMatch = result.matches?.find((match) => match.key === 'author')

      return {
        ...result.item,
        titleContent: highlightMatchedText(result.item.title, titleMatch?.indices),
        authorContent: highlightMatchedText(
          result.item.author || 'Unknown author',
          authorMatch?.indices,
        ),
      }
    })
  }, [books, debouncedSearchQuery, selectedCategory])

  const handleLoadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !lastDoc) {
      return
    }

    setLoadingMore(true)
    setError('')

    try {
      const page = await getBooksPage({
        cursor: lastDoc,
      })

      setBooks((current) => [...current, ...page.books])
      setLastDoc(page.lastDoc)
      setHasMore(page.hasMore)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load books'))
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, lastDoc, loading, loadingMore])

  const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase()

  return (
    <main className="page-shell home-page">
      <section className="home-content">
        <HomeHeader
          categories={categories}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
        />

        {loading && books.length === 0 ? <div className="status">Loading books…</div> : null}
        {!loading && error ? <div className="status status-error">{error}</div> : null}

        {!loading && !error ? (
          filteredBooks.length > 0 ? (
            <>
              <section className="book-grid" aria-label="Book collection">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    titleContent={book.titleContent || book.title}
                    authorContent={book.authorContent || book.author || 'Unknown author'}
                  />
                ))}
              </section>

              {!normalizedSearchQuery && hasMore ? (
                <button
                  type="button"
                  className="button load-more-button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              ) : null}
            </>
          ) : (
            <div className="empty-state panel">
              <h2 className="section-title">
                {normalizedSearchQuery ? 'No books match your search' : 'No books available'}
              </h2>
            </div>
          )
        ) : null}
      </section>

      {!loading && !error && quotes.length > 0 ? <StickyQuotes quotes={quotes} /> : null}
    </main>
  )
}

export default HomePage
