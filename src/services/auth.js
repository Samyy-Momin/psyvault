import {
  browserLocalPersistence,
  getIdToken,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { createUserError, mapAuthError } from '../lib/errors'
import { auth } from '../lib/firebase'

export async function loginWithEmail(email, password) {
  try {
    await setPersistence(auth, browserLocalPersistence)
    return await signInWithEmailAndPassword(auth, email.trim(), password)
  } catch (error) {
    throw mapAuthError(error)
  }
}

export async function logoutUser() {
  return signOut(auth)
}

export async function getAuthToken() {
  if (!auth.currentUser) {
    throw createUserError('Please sign in again.')
  }

  return getIdToken(auth.currentUser)
}
