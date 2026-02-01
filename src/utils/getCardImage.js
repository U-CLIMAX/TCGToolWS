const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const imageBlurUrl = import.meta.env.VITE_BLUR_IMAGE_BASE_URL

export const getCardUrls = (prefix, id) => {
  if (!id) return { base: null, blur: null }
  const filename = id.replace('/', '-')
  return {
    base: `${imageBaseUrl}/${prefix}/${filename}.webp`,
    blur: `${imageBlurUrl}/${prefix}/${filename}.webp`,
  }
}
