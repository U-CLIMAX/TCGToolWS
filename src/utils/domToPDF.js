import { formatEffectToHtml } from '@/utils/cardEffectFormatter'
import { jsPDF } from 'jspdf'
import { snapdom } from '@zumer/snapdom'

const createPrintStyles = () => {
  const style = document.createElement('style')
  style.id = 'deck-print-styles'
  style.innerHTML = `
    #pdf-render-content {
      display: grid;
      grid-template-columns: repeat(3, 6.3cm);
      gap: 4mm;
      justify-content: center;
      background: white;
      padding: 1cm 0;
      box-sizing: border-box;
    }

    .pdf-card-print {
      width: 6.3cm;
      height: 8.8cm;
      position: relative;
      display: block;
      break-inside: avoid;
      border-radius: 2mm;
      overflow: hidden;
      font-family: system-ui, sans-serif;
      font-size: 7pt;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    }
  `
  return style
}

const createCardElement = (card) => {
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

  if (card.type != '高潮卡') {
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
      icon.style.verticalAlign = '-0.15em'
      icon.style.display = 'inline-block'
    })

    overlay.appendChild(effectText)
    cardElement.appendChild(overlay)
  }

  cardElement.appendChild(img)

  return cardElement
}

export const convertDeckToPDF = async (cards, name) => {
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
        const cardElement = createCardElement(card)
        renderContent.appendChild(cardElement)
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

  renderContent.style.width = `${pageWidth}pt`

  try {
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * cardsPerPage
      const endIndex = startIndex + cardsPerPage

      allCards.forEach((card, index) => {
        card.style.display = index >= startIndex && index < endIndex ? 'block' : 'none'
      })

      await new Promise((resolve) => requestAnimationFrame(resolve))

      const options = {
        width: pageWidth,
        height: pageHeight,
        dpr: window.devicePixelRatio,
        scale: 2,
      }

      const imgData = await snapdom.toWebp(renderContent, options)

      if (i > 0) {
        pdf.addPage()
      }
      pdf.addImage(imgData, 'WEBP', 0, 0, pageWidth, pageHeight)
    }

    const pdfBlob = pdf.output('blob')
    const blobUrl = URL.createObjectURL(pdfBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = `${name || 'deck'}.pdf`
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
