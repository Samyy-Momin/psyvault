import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  limit,
} from 'firebase/firestore'
import { createUserError } from '../lib/errors'
import { db } from '../lib/firebase'

const quotesCollection = collection(db, 'quotes')

function mapQuote(docSnapshot) {
  const data = docSnapshot.data()

  return {
    id: docSnapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
  }
}

export async function getQuotes() {
  const quotesQuery = query(quotesCollection, limit(10))
  const snapshot = await getDocs(quotesQuery)
  return snapshot.docs.map(mapQuote)
}

export async function getQuotePreviews(limitCount = 3) {
  const quotesQuery = query(quotesCollection, limit(limitCount))
  const snapshot = await getDocs(quotesQuery)
  return snapshot.docs.map(mapQuote)
}

export async function createQuote(input) {
  const text = input.text?.trim()
  const writer = input.writer?.trim()

  if (!text || !writer) {
    throw createUserError('Quote and writer are required.')
  }

  await addDoc(quotesCollection, {
    text,
    writer,
    bookTitle: input.bookTitle?.trim() || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateQuote(id, input) {
  const text = input.text?.trim()
  const writer = input.writer?.trim()

  if (!text || !writer) {
    throw createUserError('Quote and writer are required.')
  }

  await updateDoc(doc(db, 'quotes', id), {
    text,
    writer,
    updatedAt: serverTimestamp(),
  })
}
