import { formatEffectToHtml } from '@/utils/cardEffectFormatter'
import { jsPDF } from 'jspdf'
import { snapdom } from '@zumer/snapdom'

const createPrintStyles = () => {
  const style = document.createElement('style')
  style.id = 'deck-print-styles'
  style.innerHTML = `
    #pdf-render-content {
      position: relative;
      width: 595pt;
      height: 842pt;
      background: white;
      box-sizing: border-box;
    }

    .pdf-card-print {
      width: 6.3cm;
      height: 8.8cm;
      position: absolute;
      display: block;
      overflow: hidden;
      font-family: system-ui, sans-serif;
      font-size: 7pt;
    }
  `
  return style
}

const createCardElement = (card, language) => {
  const cardElement = document.createElement('div')
  cardElement.className = 'pdf-card-print'

  const img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  img.src = card.imgUrl
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'
  img.style.display = 'block'

  const overlay = document.createElement('div')
  overlay.style.position = 'absolute'
  const bottomPercent = card.type === '事件卡' ? '9.51%' : '12.02%'
  overlay.style.bottom = bottomPercent
  overlay.style.left = '3%'
  overlay.style.right = '3%'
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
  overlay.style.color = 'black'
  overlay.style.padding = '2.5%'
  overlay.style.boxSizing = 'border-box'
  overlay.style.borderRadius = '1.5mm'

  if (card.type != '高潮卡' && language === 'zh') {
    const effectText = document.createElement('div')
    const formattedHtml = formatEffectToHtml(card.effect)
    effectText.innerHTML = formattedHtml
    effectText.style.fontSize = '0.9em'
    effectText.style.lineHeight = '1.2'
    effectText.style.wordBreak = 'break-word'
    effectText.style.textAlign = 'justify'

    effectText.querySelectorAll('img').forEach((icon) => {
      let src = icon.getAttribute('src')
      if (src && src.endsWith('.svg')) {
        icon.setAttribute('src', src.replace(/\.svg$/, '.webp'))
      }
      icon.crossOrigin = 'anonymous'
      icon.style.height = '0.9em'
      icon.style.verticalAlign = 'middle'
      icon.style.display = 'inline-block'
    })

    overlay.appendChild(effectText)
    cardElement.appendChild(overlay)
  }

  cardElement.appendChild(img)

  return cardElement
}

// 計算卡片在頁面上的位置（水平和垂直置中）
const calculateCardPosition = (index, cardsOnPage) => {
  const cardWidthPt = 178.58 // 6.3cm = 178.58pt
  const cardHeightPt = 249.45 // 8.8cm = 249.45pt
  const gapPt = 2.83 // 1mm = 2.83pt
  const pageWidth = 595 // A4 寬度
  const pageHeight = 842 // A4 高度

  const cols = 3
  const rows = Math.ceil(cardsOnPage / cols)
  const row = Math.floor(index / cols)
  const col = index % cols

  // 計算總寬度和總高度
  const totalWidth = cols * cardWidthPt + (cols - 1) * gapPt
  const totalHeight = rows * cardHeightPt + (rows - 1) * gapPt

  // 水平和垂直置中
  const startX = (pageWidth - totalWidth) / 2
  const startY = (pageHeight - totalHeight) / 2

  const x = startX + col * (cardWidthPt + gapPt)
  const y = startY + row * (cardHeightPt + gapPt)

  return { x, y }
}

export const convertDeckToPDF = async (cards, name, language) => {
  const oldStyles = document.getElementById('deck-print-styles')
  const oldRenderContainer = document.getElementById('pdf-render-content')

  if (oldStyles) oldStyles.remove()
  if (oldRenderContainer) oldRenderContainer.remove()

  const styleElement = createPrintStyles()
  document.head.appendChild(styleElement)

  const renderContent = document.createElement('div')
  renderContent.id = 'pdf-render-content'
  renderContent.style.position = 'absolute'
  renderContent.style.left = '-9999px'
  renderContent.style.top = '0px'

  document.body.appendChild(renderContent)

  const allCards = []
  try {
    for (const card of cards) {
      if (!card.imgUrl) {
        console.warn('Card is missing imgUrl, skipping:', card.id)
        continue
      }

      const quantity = card.quantity || 1
      for (let i = 0; i < quantity; i++) {
        const cardElement = createCardElement(card, language)
        allCards.push(cardElement)
      }
    }
  } catch (error) {
    console.error('Failed to create card elements:', error)
    renderContent.remove()
    styleElement.remove()
    return
  }

  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const cardsPerPage = 9
  const totalPages = Math.ceil(allCards.length / cardsPerPage)

  try {
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * cardsPerPage
      const endIndex = Math.min(startIndex + cardsPerPage, allCards.length)
      const cardsOnPage = endIndex - startIndex

      // 清空容器
      renderContent.innerHTML = ''

      // 只渲染當前頁的卡片，並設置其位置
      for (let j = startIndex; j < endIndex; j++) {
        const cardElement = allCards[j]
        const pageCardIndex = j - startIndex
        const { x, y } = calculateCardPosition(pageCardIndex, cardsOnPage)

        cardElement.style.left = `${x}pt`
        cardElement.style.top = `${y}pt`

        renderContent.appendChild(cardElement)
      }

      const images = Array.from(renderContent.querySelectorAll('img'))
      const imageLoadPromises = images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve()
            } else {
              image.onload = resolve
              image.onerror = resolve
            }
          })
      )

      await Promise.all(imageLoadPromises)
      // wait for browser to render (100ms + 2rAF)
      await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const options = {
        width: pageWidth,
        height: pageHeight,
        dpr: window.devicePixelRatio,
        quality: 0.6,
        scale: 2,
      }

      const imgData = await snapdom.toJpg(renderContent, options)

      if (i > 0) {
        pdf.addPage()
      }
      pdf.addImage(imgData, 'JPG', 0, 0, pageWidth, pageHeight)
    }

    const pdfBlob = pdf.output('blob')
    const blobUrl = URL.createObjectURL(pdfBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = `${name || 'deck'}_${language}.pdf`
    downloadLink.click()
    URL.revokeObjectURL(blobUrl)

    renderContent.remove()
    styleElement.remove()
  } catch (error) {
    console.error('生成 PDF 時發生錯誤:', error)
    renderContent.remove()
    styleElement.remove()
  }
}
