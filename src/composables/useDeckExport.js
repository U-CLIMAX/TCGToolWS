import { ref, computed, watch, nextTick } from 'vue'
import * as clipboard from 'clipboard-polyfill'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { generateDeckKey } from '@/utils/nanoid'
import { getCardUrls } from '@/utils/getCardImage'
import { convertDeckToPDF } from '@/utils/domToPDF'

/**
 * Composable for deck exporting, sharing, and image generation.
 */
export function useDeckExport() {
  const uiStore = useUIStore()
  const deckStore = useDeckStore()
  const { triggerSnackbar } = useSnackbar()
  const { encodeData } = useDeckEncoder()

  // Export & Image Generation State
  const renderShareImage = ref(false)
  const exportDialog = ref(false)
  const imageExportMode = ref('u_climax')
  const generatedImageResult = ref(null)
  const isGenerationTriggered = ref(false)

  // Gallery Sharing State
  const isShareToGalleryDialogVisible = ref(false)
  const shareForm = ref({
    includeTournamentInfo: false,
    tournamentType: 'shop',
    participantCount: 'under10',
    placement: 'champion',
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
    const shareUrl = `${window.location.origin}/share-decks/${deckKey}`
    try {
      await clipboard.writeText(shareUrl)
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
      await clipboard.writeText(deckKey)
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

  const confirmShareToDeckGallery = async (deck, originalCards) => {
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
        name: deck.name,
        seriesId: deck.seriesId,
        game_type: deck.game_type,
        coverCardId: deck.coverCardId,
        climaxCardsId: climaxCardsId,
        isDeckGallery: true,
        tournamentType: shareForm.value.includeTournamentInfo ? shareForm.value.tournamentType : null,
        participantCount: shareForm.value.includeTournamentInfo
          ? shareForm.value.participantCount
          : null,
        placement: shareForm.value.includeTournamentInfo ? shareForm.value.placement : null,
      })
      triggerSnackbar('已成功分享到卡组广场！', 'success')
    } catch (error) {
      console.error('❌ 分享失败:', error)
      triggerSnackbar(error.message || '分享失败', 'error')
    } finally {
      uiStore.setLoading(false)
    }
  }

  const openExportDialog = (deck) => {
    if (!deck) {
      triggerSnackbar('无法导出，卡组数据缺失。', 'error')
      return
    }
    generatedImageResult.value = null
    exportDialog.value = true
  }

  const handleGenerateDeckImage = async (deck, mode = 'u_climax') => {
    if (!deck) {
      triggerSnackbar('无法生成图片，卡组数据缺失。', 'error')
      return
    }
    generatedImageResult.value = null
    imageExportMode.value = mode

    uiStore.setLoading(true)
    renderShareImage.value = true
    await nextTick()
    isGenerationTriggered.value = true
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

  return {
    renderShareImage,
    exportDialog,
    imageExportMode,
    generatedImageResult,
    isGenerationTriggered,
    isShareToGalleryDialogVisible,
    shareForm,
    placementOptions,
    handleShareCard,
    handleCopyDeckKey,
    handleShareToDeckGallery,
    confirmShareToDeckGallery,
    openExportDialog,
    handleGenerateDeckImage,
    handleDownloadDeckPDF,
  }
}
