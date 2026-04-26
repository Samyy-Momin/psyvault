import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore'
import { createUserError } from '../lib/errors'
import { db } from '../lib/firebase'
import { getAuthToken } from './auth'
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
  const title = input.title?.trim()
  const author = input.author?.trim() || ''
  const category = input.category?.trim()
  const publicId = input.public_id || input.filePublicId || extractPublicIdFromUrl(input.fileUrl)

  if (!title || !category || !input.fileUrl || !input.imageUrl?.trim() || !publicId) {
    throw createUserError('Upload failed. Please try again.')
  }

  return {
    title,
    author,
    title_lowercase: title.toLowerCase(),
    author_lowercase: author.toLowerCase(),
    category,
    subcategory: category,
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

export async function deleteBookViaFunction({ bookId, publicId }) {
  const token = await getAuthToken()
  const response = await fetch('/.netlify/functions/delete-book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bookId,
      public_id: publicId,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw createUserError('Please sign in again.')
    }

    throw createUserError('Failed to delete book')
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
