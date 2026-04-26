import { createUserError } from '../lib/errors'
import { validatePdfFile } from '../lib/validation'

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function buildCloudinaryAsset(url, uploadedAsset) {
  const secureUrl = uploadedAsset?.secure_url || url
  const publicId = uploadedAsset?.public_id || extractPublicIdFromUrl(secureUrl)

  return {
    fileUrl: secureUrl,
    public_id: publicId,
    filePublicId: publicId,
    fileResourceType: 'raw',
  }
}

export function extractPublicIdFromUrl(url) {
  if (!url) {
    return ''
  }

  const decodedUrl = decodeURIComponent(url)
  const uploadIndex = decodedUrl.indexOf('/upload/')

  if (uploadIndex === -1) {
    return ''
  }

  const path = decodedUrl.slice(uploadIndex + '/upload/'.length)
  const normalizedPath = path.replace(/^v\d+\//, '')
  return normalizedPath.replace(/\.[^.]+$/, '')
}

export async function uploadPdfToCloudinary(file) {
  if (!cloudName || !uploadPreset) {
    throw createUserError('Upload failed. Please try again.')
  }

  validatePdfFile(file)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('resource_type', 'raw')
  formData.append('folder', 'psyvault/books')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok || !data.secure_url) {
    throw createUserError('Upload failed. Please try again.')
  }

  return data
}
