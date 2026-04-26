import { Edit3, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../lib/errors'
import { validatePdfFile } from '../lib/validation'
import {
  createCategory,
  deleteCategory,
  ensureCategoriesSeeded,
  getCategoriesPage,
  updateCategory,
} from '../services/categories'
import {
  deleteBookViaFunction,
  getBooksPage,
  replaceBookPdf,
  updateBook,
} from '../services/books'
import { uploadPdfToCloudinary } from '../services/cloudinary'

const DELETE_COOLDOWN_MS = 3_000

function BooksPage() {
  const [categories, setCategories] = useState([])
  const [categoryCursorStack, setCategoryCursorStack] = useState([null])
  const [categoryPageIndex, setCategoryPageIndex] = useState(0)
  const [categoryLastDoc, setCategoryLastDoc] = useState(null)
  const [categoriesHasMore, setCategoriesHasMore] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const [books, setBooks] = useState([])
  const [bookCursorStack, setBookCursorStack] = useState([null])
  const [bookPageIndex, setBookPageIndex] = useState(0)
  const [bookLastDoc, setBookLastDoc] = useState(null)
  const [booksHasMore, setBooksHasMore] = useState(true)
  const [booksLoading, setBooksLoading] = useState(true)
  const [editingBookId, setEditingBookId] = useState('')
  const [editForm, setEditForm] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const deleteCooldownRef = useRef(null)

  useEffect(() => {
    let active = true

    async function seedAndLoad() {
      try {
        setError('')
        await ensureCategoriesSeeded()

        const [categoriesPage, booksPage] = await Promise.all([
          getCategoriesPage(),
          getBooksPage(),
        ])

        if (!active) {
          return
        }

        setCategories(categoriesPage.categories)
        setCategoryLastDoc(categoriesPage.lastDoc)
        setCategoriesHasMore(categoriesPage.hasMore)
        setBooks(booksPage.books)
        setBookLastDoc(booksPage.lastDoc)
        setBooksHasMore(booksPage.hasMore)
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Something went wrong'))
        }
      } finally {
        if (active) {
          setCategoriesLoading(false)
          setBooksLoading(false)
        }
      }
    }

    seedAndLoad()

    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      if (deleteCooldownRef.current) {
        window.clearTimeout(deleteCooldownRef.current)
      }
    },
    [],
  )

  function startDeleteCooldown() {
    setDeleteBlocked(true)

    if (deleteCooldownRef.current) {
      window.clearTimeout(deleteCooldownRef.current)
    }

    deleteCooldownRef.current = window.setTimeout(() => {
      setDeleteBlocked(false)
      deleteCooldownRef.current = null
    }, DELETE_COOLDOWN_MS)
  }

  async function loadCategoriesPage(pageIndex, cursor) {
    setCategoriesLoading(true)
    try {
      const page = await getCategoriesPage({ cursor })
      setCategories(page.categories)
      setCategoryLastDoc(page.lastDoc)
      setCategoriesHasMore(page.hasMore)
      setCategoryPageIndex(pageIndex)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load categories'))
    } finally {
      setCategoriesLoading(false)
    }
  }

  async function loadBooksPage(pageIndex, cursor) {
    setBooksLoading(true)
    try {
      const page = await getBooksPage({ cursor })
      setBooks(page.books)
      setBookLastDoc(page.lastDoc)
      setBooksHasMore(page.hasMore)
      setBookPageIndex(pageIndex)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Failed to load books'))
    } finally {
      setBooksLoading(false)
    }
  }

  function beginBookEdit(book) {
    setEditingBookId(book.id)
    setEditForm({
      title: book.title,
      author: book.author || '',
      category: book.category,
      imageUrl: book.imageUrl || '',
      pdfFile: null,
    })
    setError('')
    setSuccess('')
  }

  function stopBookEdit() {
    setEditingBookId('')
    setEditForm(null)
  }

  async function handleCategoryCreate(event) {
    event.preventDefault()

    try {
      setSubmitting(true)
      await createCategory(newCategory)
      setNewCategory('')
      setCategoryCursorStack([null])
      await loadCategoriesPage(0, null)
      setSuccess('Category added.')
      setError('')
    } catch (createError) {
      setError(getErrorMessage(createError, 'Unable to add category.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCategoryUpdate(id) {
    try {
      setSubmitting(true)
      await updateCategory(id, editingCategoryName)
      setEditingCategoryId('')
      setEditingCategoryName('')
      await loadCategoriesPage(categoryPageIndex, categoryCursorStack[categoryPageIndex] || null)
      setSuccess('Category updated.')
      setError('')
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Unable to update category.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCategoryDelete(category) {
    const shouldDelete = window.confirm(`Delete category "${category.name}"?`)

    if (!shouldDelete) {
      return
    }

    if (deleteBlocked) {
      setError('Please wait before deleting again.')
      return
    }

    try {
      setSubmitting(true)
      await deleteCategory(category.id)
      startDeleteCooldown()
      await loadCategoriesPage(categoryPageIndex, categoryCursorStack[categoryPageIndex] || null)
      setSuccess('Category deleted.')
      setError('')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete category.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBookDelete(book) {
    const shouldDelete = window.confirm(`Delete "${book.title}" permanently?`)

    if (!shouldDelete) {
      return
    }

    if (deleteBlocked) {
      setError('Please wait before deleting again.')
      return
    }

    try {
      setSubmitting(true)
      await deleteBookViaFunction({
        bookId: book.id,
        publicId: book.public_id || book.filePublicId,
      })
      startDeleteCooldown()
      setBooks((current) => current.filter((item) => item.id !== book.id))
      setSuccess('Book deleted.')
      setError('')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Failed to delete book'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBookUpdate(book) {
    if (!editForm) {
      return
    }

    try {
      setSubmitting(true)
      let updatedBook = {
        ...book,
        title: editForm.title.trim(),
        author: editForm.author.trim(),
        category: editForm.category,
        subcategory: editForm.category,
        imageUrl: editForm.imageUrl.trim(),
      }

      if (!updatedBook.title || !updatedBook.category || !updatedBook.imageUrl) {
        throw new Error('Upload failed. Please try again.')
      }

      if (editForm.pdfFile) {
        validatePdfFile(editForm.pdfFile)
        const uploadedAsset = await uploadPdfToCloudinary(editForm.pdfFile)
        const assetPatch = await replaceBookPdf(updatedBook, uploadedAsset)
        updatedBook = {
          ...updatedBook,
          ...assetPatch,
        }
      } else {
        await updateBook(book.id, updatedBook)
      }

      setBooks((current) => current.map((item) => (item.id === book.id ? updatedBook : item)))
      stopBookEdit()
      setSuccess('Book updated.')
      setError('')
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Upload failed, try again'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell admin-page">
      {error ? <div className="status status-error">{error}</div> : null}
      {success ? <div className="status status-success">{success}</div> : null}

      <div className="admin-columns">
        <section className="admin-section panel">
          <div className="admin-section-header">
            <h1 className="section-title">Categories</h1>
          </div>

          <form className="category-create-row" onSubmit={handleCategoryCreate}>
            <input
              className="input"
              type="text"
              placeholder="Add category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            />
            <button type="submit" className="button" disabled={submitting}>
              Add
            </button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="table-cell-text">
                      {editingCategoryId === category.id ? (
                        <input
                          className="input table-input"
                          type="text"
                          value={editingCategoryName}
                          onChange={(event) => setEditingCategoryName(event.target.value)}
                        />
                      ) : (
                        <span className="truncate-single">{category.name}</span>
                      )}
                    </td>
                    <td className="table-actions">
                      {editingCategoryId === category.id ? (
                        <>
                          <button
                            type="button"
                            className="button table-button"
                            disabled={submitting}
                            onClick={() => handleCategoryUpdate(category.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="button table-button"
                            disabled={submitting}
                            onClick={() => {
                              setEditingCategoryId('')
                              setEditingCategoryName('')
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button table-button"
                            disabled={submitting}
                            onClick={() => {
                              setEditingCategoryId(category.id)
                              setEditingCategoryName(category.name)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button table-button"
                            disabled={submitting || category.isDefault}
                            onClick={() => handleCategoryDelete(category)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <button
              type="button"
              className="button table-button"
              disabled={categoriesLoading || categoryPageIndex === 0}
              onClick={() =>
                loadCategoriesPage(
                  categoryPageIndex - 1,
                  categoryCursorStack[categoryPageIndex - 1] || null,
                )
              }
            >
              Prev
            </button>
            <span className="table-page-label">Page {categoryPageIndex + 1}</span>
            <button
              type="button"
              className="button table-button"
              disabled={categoriesLoading || !categoriesHasMore || !categoryLastDoc}
              onClick={async () => {
                const nextIndex = categoryPageIndex + 1
                setCategoryCursorStack((current) => {
                  const next = [...current]
                  next[nextIndex] = categoryLastDoc
                  return next
                })
                await loadCategoriesPage(nextIndex, categoryLastDoc)
              }}
            >
              Next
            </button>
          </div>
        </section>

        <section className="admin-section panel">
          <div className="admin-section-header">
            <h1 className="section-title">Books</h1>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table books-table">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              {books.map((book) => {
                const isEditing = editingBookId === book.id

                return (
                  <tbody key={book.id}>
                    <tr>
                      <td>
                        {book.imageUrl ? (
                          <img className="table-cover" src={book.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <div className="table-cover book-cover-fallback" aria-hidden="true" />
                        )}
                      </td>
                      <td className="table-cell-text">
                        <span className="truncate-double">{book.title}</span>
                      </td>
                      <td className="table-cell-text">
                        <span className="truncate-single">{book.author || 'Unknown author'}</span>
                      </td>
                      <td className="table-cell-text">
                        <span className="truncate-single">{book.category}</span>
                      </td>
                      <td className="table-actions table-actions-icons">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Edit ${book.title}`}
                          disabled={submitting}
                          onClick={() => beginBookEdit(book)}
                        >
                          <Edit3 size={16} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Delete ${book.title}`}
                          disabled={submitting}
                          onClick={() => handleBookDelete(book)}
                        >
                          <Trash2 size={16} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                    {isEditing ? (
                      <tr className="edit-row">
                        <td colSpan="5">
                          <div className="admin-edit-grid">
                            <div className="field">
                              <label htmlFor={`edit-title-${book.id}`}>Title</label>
                              <input
                                id={`edit-title-${book.id}`}
                                className="input"
                                type="text"
                                value={editForm.title}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="field">
                              <label htmlFor={`edit-author-${book.id}`}>Author</label>
                              <input
                                id={`edit-author-${book.id}`}
                                className="input"
                                type="text"
                                value={editForm.author}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    author: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="field">
                              <label htmlFor={`edit-category-${book.id}`}>Category</label>
                              <select
                                id={`edit-category-${book.id}`}
                                className="select"
                                value={editForm.category}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    category: event.target.value,
                                  }))
                                }
                              >
                                {categories.map((category) => (
                                  <option key={category.id} value={category.name}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label htmlFor={`edit-image-${book.id}`}>Image URL</label>
                              <input
                                id={`edit-image-${book.id}`}
                                className="input"
                                type="url"
                                value={editForm.imageUrl}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    imageUrl: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="field admin-edit-wide">
                              <label htmlFor={`edit-pdf-${book.id}`}>PDF re-upload</label>
                              <input
                                id={`edit-pdf-${book.id}`}
                                className="file-input"
                                type="file"
                                accept="application/pdf"
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    pdfFile: event.target.files?.[0] || null,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="table-actions edit-actions">
                            <button
                              type="button"
                              className="button table-button"
                              disabled={submitting}
                              onClick={() => handleBookUpdate(book)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="button table-button"
                              disabled={submitting}
                              onClick={stopBookEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                )
              })}
            </table>
          </div>

          <div className="table-pagination">
            <button
              type="button"
              className="button table-button"
              disabled={booksLoading || bookPageIndex === 0}
              onClick={() =>
                loadBooksPage(bookPageIndex - 1, bookCursorStack[bookPageIndex - 1] || null)
              }
            >
              Prev
            </button>
            <span className="table-page-label">Page {bookPageIndex + 1}</span>
            <button
              type="button"
              className="button table-button"
              disabled={booksLoading || !booksHasMore || !bookLastDoc}
              onClick={async () => {
                const nextIndex = bookPageIndex + 1
                setBookCursorStack((current) => {
                  const next = [...current]
                  next[nextIndex] = bookLastDoc
                  return next
                })
                await loadBooksPage(nextIndex, bookLastDoc)
              }}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

export default BooksPage
