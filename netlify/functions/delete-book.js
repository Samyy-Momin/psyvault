/* global process */
import { v2 as cloudinary } from 'cloudinary'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed.' }),
    }
  }

  try {
    const { public_id: publicId, bookId } = JSON.parse(event.body || '{}')

    if (!publicId || !bookId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'public_id and bookId are required.' }),
      }
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error('Missing Cloudinary environment variables.')
    }

    await cloudinary.api.delete_resources([publicId], {
      resource_type: 'raw',
      type: 'upload',
    })

    const adminApp = getFirebaseAdminApp()
    const firestore = getFirestore(adminApp)
    await firestore.collection('books').doc(bookId).delete()

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, bookId }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Unable to delete book.',
      }),
    }
  }
}
