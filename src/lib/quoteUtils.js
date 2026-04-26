const QUOTE_BRANDING = 'Powered by PsyVault'

export const QUOTE_BACKGROUND_OPTIONS = [
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
]

export function normalizeSelectedText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function buildQuoteFilename(bookTitle) {
  const normalizedTitle = (bookTitle || 'psyvault-quote')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${normalizedTitle || 'psyvault-quote'}-quote.png`
}

export function getQuoteCardProps({
  text,
  authorName,
  readerName,
  bookTitle,
  backgroundStyle,
}) {
  return {
    quoteText: text,
    authorName: authorName?.trim() || 'Unknown author',
    readerName: readerName?.trim() || '',
    bookTitle: bookTitle?.trim() || 'Untitled book',
    backgroundStyle: backgroundStyle === 'white' ? 'white' : 'black',
    branding: QUOTE_BRANDING,
  }
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return response.blob()
}

export function canCopyImageToClipboard() {
  return Boolean(window.ClipboardItem && navigator.clipboard?.write)
}

export async function copyImageToClipboard(dataUrl) {
  if (!canCopyImageToClipboard()) {
    throw new Error('Copying images is not supported in this browser.')
  }

  const blob = await dataUrlToBlob(dataUrl)
  await navigator.clipboard.write([
    new window.ClipboardItem({
      [blob.type]: blob,
    }),
  ])
}

export function canShareImage() {
  return Boolean(navigator.share && window.File)
}

export async function shareImage(dataUrl, filename, shareText) {
  if (!canShareImage()) {
    throw new Error('Sharing is not supported in this browser.')
  }

  const blob = await dataUrlToBlob(dataUrl)
  const file = new window.File([blob], filename, { type: blob.type || 'image/png' })
  const sharePayload = {
    title: 'PsyVault Quote',
    text: shareText,
    files: [file],
  }

  if (navigator.canShare && !navigator.canShare({ files: sharePayload.files })) {
    throw new Error('Sharing images is not supported in this browser.')
  }

  await navigator.share(sharePayload)
}
