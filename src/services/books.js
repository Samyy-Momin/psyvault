import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { buildCloudinaryAsset, extractPublicIdFromUrl } from './cloudinary'

const booksCollection = collection(db, 'books')
const BOOKS_PAGE_SIZE = 10

function mapBook(docSnapshot) {
  const data = docSnapshot.data()
  const category = data.category || data.subcategory || ''
  const publicId = data.public_id || data.filePublicId || extractPublicIdFromUrl(data.fileUrl)

  return {
    id: docSnapshot.id,
    ...data,
    category,
    subcategory: category,
    public_id: publicId,
    filePublicId: publicId,
    fileResourceType: data.fileResourceType || 'raw',
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
  }
}

function buildBookPayload(input) {
  const title = input.title.trim()
  const author = input.author?.trim() || ''
  const publicId = input.public_id || input.filePublicId || extractPublicIdFromUrl(input.fileUrl)

  return {
    title,
    author,
    title_lowercase: title.toLowerCase(),
    author_lowercase: author.toLowerCase(),
    category: input.category,
    subcategory: input.category,
    imageUrl: input.imageUrl?.trim() || '',
    fileUrl: input.fileUrl,
    public_id: publicId,
    filePublicId: publicId,
    fileResourceType: 'raw',
  }
}

function buildBooksPageQuery({ cursor }) {
  const constraints = []

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  constraints.push(limit(BOOKS_PAGE_SIZE))

  return query(booksCollection, ...constraints)
}

export async function getBooksPage({ cursor = null } = {}) {
  const booksQuery = buildBooksPageQuery({ cursor })
  const snapshot = await getDocs(booksQuery)
  const docs = snapshot.docs

  return {
    books: docs.map(mapBook),
    lastDoc: docs.at(-1) || null,
    hasMore: docs.length === BOOKS_PAGE_SIZE,
  }
}

export async function getBooks() {
  const booksQuery = query(booksCollection, limit(10))
  const snapshot = await getDocs(booksQuery)
  return snapshot.docs.map(mapBook)
}

export async function getBookById(id) {
  const snapshot = await getDoc(doc(db, 'books', id))

  if (!snapshot.exists()) {
    return null
  }

  return mapBook(snapshot)
}

export async function createBook(input) {
  const payload = {
    ...buildBookPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const createdDoc = await addDoc(booksCollection, payload)
  return createdDoc.id
}

export async function updateBook(id, input) {
  const payload = {
    ...buildBookPayload(input),
    updatedAt: serverTimestamp(),
  }

  await updateDoc(doc(db, 'books', id), payload)
}

export async function deleteBook(id) {
  await deleteDoc(doc(db, 'books', id))
}

export async function deleteBookViaFunction({ bookId, publicId }) {
  const response = await fetch('/.netlify/functions/delete-book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookId,
      public_id: publicId,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Unable to delete this book.')
  }

  return data
}

export async function replaceBookPdf(book, uploadedAsset) {
  const nextAsset = buildCloudinaryAsset(uploadedAsset?.secure_url, uploadedAsset)

  await updateBook(book.id, {
    ...book,
    ...nextAsset,
  })

  return nextAsset
}
