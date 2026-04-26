import { createUserError } from './errors'

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

export function validatePdfFile(file) {
  if (!file) {
    throw createUserError('Please select a PDF file.')
  }

  if (file.type !== 'application/pdf') {
    throw createUserError('Invalid file type')
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw createUserError('Invalid file type')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw createUserError('PDF must be 10MB or smaller.')
  }
}

export function requireTrimmedValue(value, message) {
  if (!value?.trim()) {
    throw createUserError(message)
  }

  return value.trim()
}
