import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { writeText } from '@/utils/clipboard'
import { useDeckStore } from '@/stores/deck'
import { useDecksGalleryStore } from '@/stores/decksGallery'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { generateDeckKey } from '@/utils/nanoid'
import { getCardUrls } from '@/utils/getCardImage'
import { convertDeckToPDF } from '@/utils/domToPDF'
import { getWebsiteUrl } from '@/utils/api'
import { renderDeckToCanvas } from '@/utils/deckCanvasRenderer.js'

/**
 * Composable for deck exporting, sharing, and image generation.
 */
export const useDeckExport = () => {
  const uiStore = useUIStore()
  const deckStore = useDeckStore()
  const galleryStore = useDecksGalleryStore()
  const { triggerSnackbar } = useSnackbar()
  const { encodeData } = useDeckEncoder()

  // Export & Image Generation State
  const exportDialog = ref(false)
  const imageExportMode = ref('u_climax')
  const generatedImageResult = ref(null)

  // Gallery Sharing State
  const isShareToGalleryDialogVisible = ref(false)
  const shareForm = ref({
    deckName: '',
    includeTournamentInfo: false,
    tournamentType: 'shop',
    participantCount: 'under10',
    placement: 'champion',
    articleLink: '',
  })

  const placementOptions = computed(() => {
    const base = [
      { title: '冠军', value: 'champion' },
      { title: '亚军', value: 'runner_up' },
      { title: '四强', value: 'top4' },
    ]
    if (['circuit', 'wgp', 'bcf'].includes(shareForm.value.tournamentType)) {
      return [...base, { title: '八强', value: 'top8' }, { title: '十六强', value: 'top16' }]
    }
    return base
  })

  // Watch for tournament type changes to reset placement if invalid
  watch(
    () => shareForm.value.tournamentType,
    (newVal) => {
      if (!['circuit', 'wgp', 'bcf'].includes(newVal)) {
        if (['top8', 'top16'].includes(shareForm.value.placement)) {
          shareForm.value.placement = 'champion'
        }
      }
    }
  )

  const handleShareCard = async (deckKey, isLocalDeck) => {
    if (!deckKey || isLocalDeck) {
      triggerSnackbar('无法生成分享链接', 'error')
      return
    }
    const shareUrl = `${getWebsiteUrl()}/share-decks/${deckKey}`
    try {
      await writeText(shareUrl)
      triggerSnackbar('分享链接已复制', 'success')
    } catch (err) {
      console.error('Failed to copy: ', err)
      triggerSnackbar('复制失败', 'error')
    }
  }

  const handleCopyDeckKey = async (deckKey, isLocalDeck) => {
    if (!deckKey || isLocalDeck) {
      triggerSnackbar('无法复制卡组代码', 'error')
      return
    }
    try {
      await writeText(deckKey)
      triggerSnackbar('卡组代码已复制', 'success')
    } catch (err) {
      console.error('Failed to copy: ', err)
      triggerSnackbar('复制失败', 'error')
    }
  }

  const handleShareToDeckGallery = (deck, originalCards) => {
    if (!deck || originalCards.length === 0) {
      triggerSnackbar('卡组内容为空，无法分享', 'error')
      return
    }
    isShareToGalleryDialogVisible.value = true
  }

  const confirmShareToDeckGallery = async (deck, originalCards, formData = null) => {
    if (formData) {
      Object.assign(shareForm.value, formData)
    }
    isShareToGalleryDialogVisible.value = false
    uiStore.setLoading(true)
    try {
      const cardsToEncode = originalCards.reduce((acc, card) => {
        acc[card.id] = {
          id: card.id,
          cardIdPrefix: card.cardIdPrefix,
          product_name: card.product_name,
          level: card.level,
          color: card.color,
          cost: card.cost,
          type: card.type,
          quantity: card.quantity,
        }
        return acc
      }, {})

      // Extract climax cards and deduplicate (keep longest ID)
      const climaxCardsMap = new Map()
      originalCards
        .filter((card) => card.type === '高潮卡')
        .forEach((card) => {
          const existing = climaxCardsMap.get(card.baseId)
          if (!existing || card.id.length > existing.id.length) {
            climaxCardsMap.set(card.baseId, {
              id: card.id,
              cardIdPrefix: card.cardIdPrefix,
            })
          }
        })
      const climaxCardsId = Array.from(climaxCardsMap.values()).slice(0, 3)
      const key = generateDeckKey()
      const data = await encodeData(cardsToEncode)

      await deckStore.saveEncodedDeck(key, data, {
        name: shareForm.value.deckName || deck.name,
        seriesId: deck.seriesId,
        game_type: deck.game_type,
        coverCardId: deck.coverCardId,
        climaxCardsId: climaxCardsId,
        isDeckGallery: true,
        tournamentType: shareForm.value.includeTournamentInfo
          ? shareForm.value.tournamentType
          : null,
        participantCount: shareForm.value.includeTournamentInfo
          ? shareForm.value.participantCount
          : null,
        placement: shareForm.value.includeTournamentInfo ? shareForm.value.placement : null,
        articleLink: shareForm.value.articleLink || null,
      })
      triggerSnackbar('已成功分享到卡组广场！', 'success')
      return true
    } catch (error) {
      console.error('❌ 分享失败:', error)
      triggerSnackbar(error.message || '分享失败', 'error')
      return false
    } finally {
      uiStore.setLoading(false)
    }
  }

  const openExportDialog = (deck) => {
    if (!deck) {
      triggerSnackbar('无法导出，卡组数据缺失。', 'error')
      return
    }
    if (generatedImageResult.value?.src) {
      URL.revokeObjectURL(generatedImageResult.value.src)
    }
    generatedImageResult.value = null
    exportDialog.value = true
  }

  /**
   * 渲染並生成卡組匯出圖片
   * @param {Object} params
   * @param {Object|Array} params.cards - 卡牌集合或列表
   * @param {string} [params.deckName] - 卡組名稱
   * @param {string} [params.deckKey] - 卡組代碼
   * @param {boolean} [params.isLocal=false] - 是否為本地/廣場卡組
   * @param {'u_climax'|'tts'} [params.mode='u_climax'] - 導出模式
   * @param {boolean} [params.includeQrCode=true] - 是否生成二維碼
   * @param {number} [params.scale=2] - 渲染倍率
   * @returns {Promise<{ src: string, width: number, height: number, blob: Blob, format: 'png' }|null>}
   */
  const handleGenerateDeckImage = async ({
    cards,
    deckName = '',
    deckKey = '',
    isLocal = false,
    mode = 'u_climax',
    includeQrCode = true,
    scale = 2,
  }) => {
    const rawCards = cards ? (Array.isArray(cards) ? cards : Object.values(cards)) : []
    if (rawCards.length === 0) {
      triggerSnackbar('无法生成图片，卡组数据缺失。', 'error')
      return null
    }

    imageExportMode.value = mode
    uiStore.setLoading(true)

    try {
      if (generatedImageResult.value?.src) {
        URL.revokeObjectURL(generatedImageResult.value.src)
      }

      const result = await renderDeckToCanvas({
        cards: rawCards,
        deckName: deckName ? deckName.trim() : 'deck',
        deckKey: isLocal ? '' : deckKey,
        mode,
        includeQrCode: Boolean(includeQrCode && !isLocal),
        scale,
      })

      generatedImageResult.value = result
      return result
    } catch (error) {
      console.error('生成图片失败:', error)
      triggerSnackbar('生成图片失败，请稍后再试。', 'error')
      return null
    } finally {
      uiStore.setLoading(false)
    }
  }

  const handleDownloadDeckPDF = async (originalCards, deckName, language) => {
    uiStore.setLoading(true)
    try {
      const cardsWithImages = originalCards.map((card) => {
        const { base } = getCardUrls(card.cardIdPrefix, card.id)
        return {
          ...card,
          imgUrl: base,
        }
      })

      await convertDeckToPDF(cardsWithImages, deckName, language)
    } catch (error) {
      console.error('生成PDF失败:', error)
      triggerSnackbar('生成PDF失败，请稍后再试。', 'error')
    } finally {
      uiStore.setLoading(false)
    }
  }

  const updateGalleryDeckMetadata = async (key, metadata) => {
    uiStore.setLoading(true)
    try {
      await galleryStore.updateDeckMetadata(key, metadata)
      triggerSnackbar('已更新分享信息！', 'success')
      return true
    } catch (error) {
      console.error('❌ 更新失败:', error)
      triggerSnackbar(error.message || '更新失败', 'error')
      return false
    } finally {
      uiStore.setLoading(false)
    }
  }

  const copyArticleLink = async (link) => {
    if (!link) {
      triggerSnackbar('没有链接', 'error')
      return
    }
    try {
      await writeText(link)
      triggerSnackbar('复制成功!', 'success')
    } catch (err) {
      console.error('Failed to copy: ', err)
      triggerSnackbar('复制失败', 'error')
    }
  }

  return {
    exportDialog,
    imageExportMode,
    generatedImageResult,
    isShareToGalleryDialogVisible,
    shareForm,
    placementOptions,
    handleShareCard,
    handleCopyDeckKey,
    handleShareToDeckGallery,
    confirmShareToDeckGallery,
    updateGalleryDeckMetadata,
    copyArticleLink,
    openExportDialog,
    handleGenerateDeckImage,
    handleDownloadDeckPDF,
  }
}
