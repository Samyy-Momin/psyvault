import { useEffect, useRef, useState } from 'react'
import BookCard from '../components/BookCard'
import HomeHeader from '../components/HomeHeader'
import StickyQuotes from '../components/StickyQuotes'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { ALL_CATEGORIES } from '../lib/constants'
import { highlightMatchedText, runBookSearch } from '../lib/search'
import { getBooksPage } from '../services/books'
import { getCategories } from '../services/categories'
import { getQuotePreviews } from '../services/quotes'

function HomePage() {
  const [books, setBooks] = useState([])
  const [filteredBooks, setFilteredBooks] = useState([])
  const [quotes, setQuotes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const requestKeyRef = useRef('')
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
        console.error('Firestore fetch error:', loadError)
        if (active) {
          setError(loadError.message || 'Unable to load PsyVault right now.')
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
      setFilteredBooks([])
      setLastDoc(null)
      setHasMore(true)
      setLoading(true)
      setError('')

      try {
        const page = await getBooksPage({
          cursor: null,
        })

        console.log('Books fetched:', page.books)
        setBooks(page.books)
        setFilteredBooks(page.books)
        setLastDoc(page.lastDoc)
        setHasMore(page.hasMore)
      } catch (err) {
        console.error('Firestore fetch error:', err)
        setBooks([])
        setFilteredBooks([])
        setError(err.message || 'Failed to load books')
      } finally {
        requestKeyRef.current = ''
        setLoading(false)
      }
    }

    loadFirstPage()
  }, [selectedCategory])

  useEffect(() => {
    const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase()

    if (!normalizedSearchQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredBooks(books)
      return
    }

    const results = runBookSearch(books, normalizedSearchQuery).map((result) => {
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

    setFilteredBooks(results)
  }, [debouncedSearchQuery, books])

  async function handleLoadMore() {
    if (loading || !hasMore || !lastDoc) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const page = await getBooksPage({
        cursor: lastDoc,
      })

      setBooks((current) => [...current, ...page.books])
      setLastDoc(page.lastDoc)
      setHasMore(page.hasMore)
    } catch (err) {
      console.error('Firestore fetch error:', err)
      setError(err.message || 'Failed to load books')
    } finally {
      setLoading(false)
    }
  }

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
                  disabled={loading}
                  onClick={handleLoadMore}
                >
                  {loading ? 'Loading…' : 'Load more'}
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
