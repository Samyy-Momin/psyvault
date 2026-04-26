import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  limit,
} from 'firebase/firestore'
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
  await addDoc(quotesCollection, {
    text: input.text.trim(),
    writer: input.writer.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateQuote(id, input) {
  await updateDoc(doc(db, 'quotes', id), {
    text: input.text.trim(),
    writer: input.writer.trim(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteQuote(id) {
  await deleteDoc(doc(db, 'quotes', id))
}
