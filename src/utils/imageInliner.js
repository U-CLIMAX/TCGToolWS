const svgTemplateCache = new Map()
const MAX_DATA_URL_CACHE_SIZE = 60
const dataUrlCache = new Map()

/**
 * 将远端资源 URL 异步转为 Base64 Data URL，带内存 LRU 缓存与并发去重
 * @param {string} src - 原始资源 URL
 * @returns {Promise<string>} Data URL 或原始 src（失败时回退）
 */
export const fetchAsDataUrl = async (src) => {
  if (!src || src.startsWith('data:')) return src
  if (dataUrlCache.has(src)) {
    const dataUrl = await dataUrlCache.get(src)
    dataUrlCache.delete(src)
    dataUrlCache.set(src, Promise.resolve(dataUrl))
    return dataUrl
  }

  const promise = (async () => {
    try {
      const res = await fetch(src)
      if (!res.ok) return src
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(src)
        reader.readAsDataURL(blob)
      })
    } catch {
      return src
    }
  })()

  dataUrlCache.set(src, promise)
  if (dataUrlCache.size > MAX_DATA_URL_CACHE_SIZE) {
    dataUrlCache.delete(dataUrlCache.keys().next().value)
  }

  return promise
}

/**
 * 判断 URL 是否为 SVG 资源
 * @param {string} src - 图片资源路径或 Data URL
 * @returns {boolean}
 */
export const isSvgUrl = (src) => {
  if (!src) return false
  if (src.startsWith('data:image/svg+xml')) return true
  try {
    const url = new URL(src, window.location.href)
    return url.pathname.toLowerCase().endsWith('.svg')
  } catch {
    return src.toLowerCase().includes('.svg')
  }
}

/**
 * 获取并解析 SVG 为可复用的 DOM 元素模板（带 Promise 内存缓存与请求去重）
 * @param {string} src - SVG 资源地址
 * @returns {Promise<SVGElement>}
 */
const fetchSvgTemplate = async (src) => {
  if (svgTemplateCache.has(src)) {
    return svgTemplateCache.get(src)
  }

  const promise = (async () => {
    let svgText = ''
    if (src.startsWith('data:image/svg+xml')) {
      const commaIndex = src.indexOf(',')
      const meta = src.slice(0, commaIndex)
      const content = src.slice(commaIndex + 1)
      svgText = meta.includes('base64') ? atob(content) : decodeURIComponent(content)
    } else {
      const res = await fetch(src)
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching SVG: ${src}`)
      svgText = await res.text()
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) throw new Error(`No root <svg> found in: ${src}`)

    // 确保具备 viewBox
    if (!svg.getAttribute('viewBox')) {
      const w = svg.getAttribute('width')
      const h = svg.getAttribute('height')
      if (w && h) {
        svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`)
      }
    }

    // 移除硬编码宽高，依赖 CSS / style 自适应
    svg.removeAttribute('width')
    svg.removeAttribute('height')

    return svg
  })().catch((err) => {
    svgTemplateCache.delete(src)
    throw err
  })

  svgTemplateCache.set(src, promise)
  return promise
}

/**
 * 将离屏容器中的 <img> 标签进行内联化处理：
 * 1. SVG 格式的 <img> 直接转换为内联 <svg> DOM 节点，避免嵌套图片异步栅格化竞态
 * 2. 其余位图（.webp, .png, .jpg）转换为 Base64 Data URL 避免跨域阻断
 *
 * @param {HTMLElement} container - 待处理的离屏 DOM 容器
 * @returns {Promise<void>}
 */
export const inlineDomImages = async (container) => {
  if (!container) return

  const imgElements =
    container.tagName === 'IMG' ? [container] : Array.from(container.querySelectorAll('img'))
  if (imgElements.length === 0) return

  await Promise.all(
    imgElements.map(async (img) => {
      const src = img.src || img.getAttribute('src')
      if (!src) return

      if (isSvgUrl(src)) {
        try {
          const template = await fetchSvgTemplate(src)
          const svgClone = template.cloneNode(true)

          // 复制原 img 的 class 与 style
          if (img.className) {
            svgClone.setAttribute('class', img.className)
          }
          if (img.style.cssText) {
            svgClone.style.cssText = img.style.cssText
          }
          svgClone.style.width = svgClone.style.width || 'auto'

          img.replaceWith(svgClone)
          return
        } catch (err) {
          console.warn(`[inlineDomImages] Failed to inline SVG from ${src}:`, err)
        }
      }

      // 非 SVG 或 SVG 处理异常时，转为 Base64 Data URL
      if (!src.startsWith('data:')) {
        const dataUrl = await fetchAsDataUrl(src)
        img.setAttribute('src', dataUrl)
      }
    })
  )
}
