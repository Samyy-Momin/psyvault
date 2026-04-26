/* global process */
import { v2 as cloudinary } from 'cloudinary'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables.')
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
  }
}

async function verifyRequest(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice('Bearer '.length).trim()

  if (!token) {
    return null
  }

  const adminApp = getFirebaseAdminApp()
  const auth = getAuth(adminApp)
  return auth.verifyIdToken(token)
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  try {
    const decodedToken = await verifyRequest(event)

    if (!decodedToken?.uid) {
      return jsonResponse(401, { error: 'Unauthorized.' })
    }

    const { public_id: publicId, bookId } = JSON.parse(event.body || '{}')

    if (
      typeof publicId !== 'string' ||
      typeof bookId !== 'string' ||
      !publicId.trim() ||
      !bookId.trim()
    ) {
      return jsonResponse(400, { error: 'Invalid request.' })
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error('Missing Cloudinary environment variables.')
    }

    await cloudinary.api.delete_resources([publicId.trim()], {
      resource_type: 'raw',
      type: 'upload',
    })

    const adminApp = getFirebaseAdminApp()
    const firestore = getFirestore(adminApp)
    await firestore.collection('books').doc(bookId.trim()).delete()

    return jsonResponse(200, { success: true, bookId: bookId.trim() })
  } catch {
    return jsonResponse(500, { error: 'Unable to delete book.' })
  }
}
