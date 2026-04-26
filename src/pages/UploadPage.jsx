import { useEffect, useState } from 'react'
import { createBook } from '../services/books'
import { buildCloudinaryAsset, uploadPdfToCloudinary } from '../services/cloudinary'
import { ensureCategoriesSeeded } from '../services/categories'
import { createQuote } from '../services/quotes'

function createEmptyBookForm(defaultCategory) {
  return {
    id: crypto.randomUUID(),
    title: '',
    author: '',
    category: defaultCategory,
    imageUrl: '',
    pdfFile: null,
  }
}

function UploadPage() {
  const [activeTab, setActiveTab] = useState('books')
  const [categories, setCategories] = useState([])
  const [bookForms, setBookForms] = useState([])
  const [quoteForm, setQuoteForm] = useState({ text: '', writer: '' })
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateDeviceState = () => setIsMobileDevice(mediaQuery.matches)

    updateDeviceState()
    mediaQuery.addEventListener('change', updateDeviceState)

    return () => {
      mediaQuery.removeEventListener('change', updateDeviceState)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCategories() {
      try {
        const nextCategories = await ensureCategoriesSeeded()

        if (active) {
          setCategories(nextCategories)
          setBookForms([createEmptyBookForm(nextCategories[0]?.name || '')])
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load categories.')
        }
      }
    }

    loadCategories()

    return () => {
      active = false
    }
  }, [])

  function updateBookForm(id, key, value) {
    setBookForms((current) =>
      current.map((form) => (form.id === id ? { ...form, [key]: value } : form)),
    )
  }

  function addBookForm() {
    setBookForms((current) => [
      ...current,
      createEmptyBookForm(categories[0]?.name || current[0]?.category || ''),
    ])
  }

  function removeBookForm(id) {
    setBookForms((current) =>
      current.length === 1 ? current : current.filter((form) => form.id !== id),
    )
  }

  async function handleBookSubmit(event) {
    event.preventDefault()
    const incompleteForm = bookForms.find((form) => !form.title || !form.imageUrl || !form.pdfFile)

    if (incompleteForm) {
      setError('Each book needs title, image URL, and PDF.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      for (const form of bookForms) {
        const uploadedAsset = await uploadPdfToCloudinary(form.pdfFile)
        const asset = buildCloudinaryAsset(uploadedAsset.secure_url, uploadedAsset)

        await createBook({
          title: form.title,
          author: form.author,
          category: form.category,
          imageUrl: form.imageUrl,
          ...asset,
        })
      }

      setBookForms([createEmptyBookForm(categories[0]?.name || '')])
      setSuccess(`${bookForms.length} ${bookForms.length === 1 ? 'book' : 'books'} uploaded.`)
    } catch (submitError) {
      setError(submitError.message || 'Unable to upload books.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuoteSubmit(event) {
    event.preventDefault()

    if (!quoteForm.text.trim() || !quoteForm.writer.trim()) {
      setError('Quote and writer are required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      await createQuote(quoteForm)
      setQuoteForm({ text: '', writer: '' })
      setSuccess('Quote uploaded.')
    } catch (submitError) {
      setError(submitError.message || 'Unable to upload quote.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isMobileDevice) {
    return (
      <main className="page-shell upload-layout">
        <section className="upload-panel panel">
          <h1 className="section-title">Upload is desktop only.</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell admin-page">
      <div className="tabs-row">
        <button
          type="button"
          className={`tab-button ${activeTab === 'books' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          Upload Books
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'quotes' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('quotes')}
        >
          Upload Quotes
        </button>
      </div>

      {error ? <div className="status status-error">{error}</div> : null}
      {success ? <div className="status status-success">{success}</div> : null}

      {activeTab === 'books' ? (
        <section className="upload-panel panel">
          <form className="upload-form" onSubmit={handleBookSubmit}>
            <div className="upload-header">
              <button type="button" className="button" onClick={addBookForm}>
                + Add another book
              </button>
            </div>

            {bookForms.map((form, index) => (
              <section key={form.id} className="upload-book panel">
                <div className="upload-book-header">
                  <span className="badge">Book {index + 1}</span>
                  {bookForms.length > 1 ? (
                    <button type="button" className="button" onClick={() => removeBookForm(form.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="upload-book-grid">
                  <div className="field">
                    <label htmlFor={`book-title-${form.id}`}>Title</label>
                    <input
                      id={`book-title-${form.id}`}
                      className="input"
                      type="text"
                      value={form.title}
                      onChange={(event) => updateBookForm(form.id, 'title', event.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`book-author-${form.id}`}>Author</label>
                    <input
                      id={`book-author-${form.id}`}
                      className="input"
                      type="text"
                      value={form.author}
                      onChange={(event) => updateBookForm(form.id, 'author', event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`book-category-${form.id}`}>Category</label>
                    <select
                      id={`book-category-${form.id}`}
                      className="select"
                      value={form.category}
                      onChange={(event) => updateBookForm(form.id, 'category', event.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor={`book-image-${form.id}`}>Image URL</label>
                    <input
                      id={`book-image-${form.id}`}
                      className="input"
                      type="url"
                      value={form.imageUrl}
                      onChange={(event) => updateBookForm(form.id, 'imageUrl', event.target.value)}
                      required
                    />
                  </div>

                  <div className="field upload-file-field">
                    <label htmlFor={`book-pdf-${form.id}`}>PDF</label>
                    <input
                      id={`book-pdf-${form.id}`}
                      className="file-input"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) =>
                        updateBookForm(form.id, 'pdfFile', event.target.files?.[0] || null)
                      }
                      required
                    />
                  </div>
                </div>
              </section>
            ))}

            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload books'}
            </button>
          </form>
        </section>
      ) : (
        <section className="upload-panel panel">
          <form className="upload-form" onSubmit={handleQuoteSubmit}>
            <div className="field">
              <label htmlFor="quote-text">Quote</label>
              <textarea
                id="quote-text"
                className="textarea"
                rows="6"
                value={quoteForm.text}
                onChange={(event) =>
                  setQuoteForm((current) => ({ ...current, text: event.target.value }))
                }
                required
              />
            </div>

            <div className="field">
              <label htmlFor="quote-writer">Writer</label>
              <input
                id="quote-writer"
                className="input"
                type="text"
                value={quoteForm.writer}
                onChange={(event) =>
                  setQuoteForm((current) => ({ ...current, writer: event.target.value }))
                }
                required
              />
            </div>

            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload quote'}
            </button>
          </form>
        </section>
      )}
    </main>
  )
}

export default UploadPage
