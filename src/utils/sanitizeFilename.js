import sanitize from 'sanitize-filename'

export const normalizeFileName = (name) => {
  let deckName = sanitize(name) || 'image'
  deckName = deckName.replace(/\./g, '_')

  return deckName
}
