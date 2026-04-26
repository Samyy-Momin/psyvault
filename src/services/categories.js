import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore'
import { createUserError } from '../lib/errors'
import { db } from '../lib/firebase'
import { DEFAULT_CATEGORIES } from '../lib/constants'

const categoriesCollection = collection(db, 'categories')
const CATEGORIES_PAGE_SIZE = 10
const CATEGORIES_LIST_LIMIT = 50

function normalizeCategoryName(name) {
  return name.trim().replace(/\s+/g, ' ')
}

function mapCategory(docSnapshot) {
  const data = docSnapshot.data()

  return {
    id: docSnapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
  }
}

async function findCategoryByNormalizedName(normalizedName) {
  const snapshot = await getDocs(
    query(
      categoriesCollection,
      where('normalizedName', '==', normalizedName.toLowerCase()),
      limit(1),
    ),
  )

  return snapshot.docs[0] ? mapCategory(snapshot.docs[0]) : null
}

export async function getCategories() {
  const categoriesQuery = query(
    categoriesCollection,
    orderBy('name', 'asc'),
    limit(CATEGORIES_LIST_LIMIT),
  )
  const snapshot = await getDocs(categoriesQuery)

  if (snapshot.empty) {
    return DEFAULT_CATEGORIES.map((name) => ({
      id: `default-${name}`,
      name,
      normalizedName: normalizeCategoryName(name).toLowerCase(),
      isDefault: true,
    }))
  }

  return snapshot.docs.map(mapCategory)
}

export async function getCategoriesPage({ cursor = null } = {}) {
  const constraints = [orderBy('name', 'asc')]

  if (cursor) {
    constraints.push(startAfter(cursor))
  }

  constraints.push(limit(CATEGORIES_PAGE_SIZE))

  const snapshot = await getDocs(query(categoriesCollection, ...constraints))
  const docs = snapshot.docs

  return {
    categories: docs.map(mapCategory),
    lastDoc: docs.at(-1) || null,
    hasMore: docs.length === CATEGORIES_PAGE_SIZE,
  }
}

export async function ensureCategoriesSeeded() {
  const snapshot = await getDocs(query(categoriesCollection, limit(1)))

  if (!snapshot.empty) {
    return getCategories()
  }

  await Promise.all(
    DEFAULT_CATEGORIES.map((name) => {
      const normalizedName = normalizeCategoryName(name)

      return addDoc(categoriesCollection, {
        name: normalizedName,
        normalizedName: normalizedName.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }),
  )

  return getCategories()
}

export async function createCategory(name) {
  const normalizedName = normalizeCategoryName(name)

  if (!normalizedName) {
    throw createUserError('Category name is required.')
  }

  const duplicate = await findCategoryByNormalizedName(normalizedName)

  if (duplicate) {
    throw createUserError('Category already exists.')
  }

  const createdDoc = await addDoc(categoriesCollection, {
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return createdDoc.id
}

export async function updateCategory(id, name) {
  const normalizedName = normalizeCategoryName(name)

  if (!normalizedName) {
    throw createUserError('Category name is required.')
  }

  const duplicate = await findCategoryByNormalizedName(normalizedName)

  if (duplicate && duplicate.id !== id) {
    throw createUserError('Category already exists.')
  }

  await updateDoc(doc(db, 'categories', id), {
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id))
}
