import { computed, unref } from 'vue'

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const imageBlurUrl = import.meta.env.VITE_BLUR_IMAGE_BASE_URL

export const useCardImage = (cardIDPrefix, cardId) => {
  const cardFileInfo = computed(() => {
    const prefix = unref(cardIDPrefix)
    const id = unref(cardId)

    if (!id || typeof id !== 'string') {
      return null
    }

    return {
      prefix,
      filename: id.replace('/', '-'),
    }
  })

  const base = computed(() => {
    const info = cardFileInfo.value
    if (!info) return null

    return `${imageBaseUrl}/${info.prefix}/${info.filename}.webp`
  })

  const blur = computed(() => {
    const info = cardFileInfo.value
    if (!info) return null

    return `${imageBlurUrl}/${info.prefix}/${info.filename}.webp`
  })

  return { base, blur }
}

export const getCardUrls = (prefix, id) => {
  if (!id) return { base: null, blur: null }
  const filename = id.replace('/', '-')
  return {
    base: `${imageBaseUrl}/${prefix}/${filename}.webp`,
    blur: `${imageBlurUrl}/${prefix}/${filename}.webp`,
  }
}
