import Fuse from 'fuse.js'

const fuseOptions = {
  keys: ['title', 'author'],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeMatches: true,
}

function mergeRanges(indices) {
  if (!indices?.length) {
    return []
  }

  const sorted = [...indices].sort((a, b) => a[0] - b[0])
  const merged = [sorted[0]]

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]
    const previous = merged[merged.length - 1]

    if (current[0] <= previous[1] + 1) {
      previous[1] = Math.max(previous[1], current[1])
    } else {
      merged.push([...current])
    }
  }

  return merged
}

export function highlightMatchedText(value, indices = []) {
  if (!value) {
    return value
  }

  const mergedRanges = mergeRanges(indices)

  if (mergedRanges.length === 0) {
    return value
  }

  const parts = []
  let lastIndex = 0

  mergedRanges.forEach(([start, end], rangeIndex) => {
    if (start > lastIndex) {
      parts.push(value.slice(lastIndex, start))
    }

    parts.push({
      key: `${start}-${end}-${rangeIndex}`,
      text: value.slice(start, end + 1),
    })

    lastIndex = end + 1
  })

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex))
  }

  return parts
}

export function runBookSearch(books, query) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return books.map((book) => ({
      item: book,
      matches: [],
    }))
  }

  const fuse = new Fuse(books, fuseOptions)
  return fuse.search(normalizedQuery)
}
