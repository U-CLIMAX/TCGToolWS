import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const isCN = uiStore.geo.country === 'CN'
const imageBaseUrl = import.meta.env[isCN ? 'VITE_IMAGE_BASE_URL' : 'VITE_IMAGE_GLOBAL_URL']
const imageBlurUrl = import.meta.env[
  isCN ? 'VITE_BLUR_IMAGE_BASE_URL' : 'VITE_BLUR_IMAGE_GLOBAL_URL'
]

export const getCardUrls = (prefix, id) => {
  if (!id) return { base: null, blur: null }
  const filename = id.replace('/', '-')
  return {
    base: `${imageBaseUrl}/${prefix}/${filename}.webp`,
    blur: `${imageBlurUrl}/${prefix}/${filename}.webp`,
  }
}
