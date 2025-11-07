import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'

// 定義吸附點 (相對於視窗頂部的距離)
const SNAP_POINTS = {
  FULL: 0.12, // 完全展開 (大部份螢幕)
  LARGE: 0.4, // 展開更多 (60% 螢幕)
  DEFAULT: 0.6, // 預設展開 (40% 螢幕)
  PEEK: 0.9, // 縮起 (只露出 header + 一點點)
  CLOSED: 1.0, // 完全關閉
}

export const useBottomSheet = () => {
  const { smAndUp } = useDisplay()

  const sheetContent = ref(null) // 'filter', 'deck', or null
  const isSheetOpen = computed({
    get: () => sheetContent.value !== null,
    set: (value) => {
      if (!value) {
        sheetContent.value = null
      }
    },
  })

  // 核心狀態: Y 軸位移 (以百分比表示，相對於視窗高度)
  const sheetTranslateYPercent = ref(SNAP_POINTS.CLOSED)
  const isDragging = ref(false)

  // 計算實際的像素值和內容高度
  const sheetTranslateY = computed(() => {
    return window.innerHeight * sheetTranslateYPercent.value
  })

  // 計算內容區域實際可用高度 (用於 v-card-text)
  const sheetContentHeight = computed(() => {
    const availableHeight = window.innerHeight * (1 - sheetTranslateYPercent.value)
    // 減去 header 高度 (64px)
    return Math.max(0, availableHeight - 64)
  })

  let startY = 0
  let initialDragPercent = 0

  const startDrag = (event) => {
    isDragging.value = true
    const touch = event.touches ? event.touches[0] : event
    startY = touch.clientY
    initialDragPercent = sheetTranslateYPercent.value

    window.addEventListener('mousemove', onDrag, { passive: false })
    window.addEventListener('touchmove', onDrag, { passive: false })
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchend', stopDrag)
  }

  const onDrag = (event) => {
    if (!isDragging.value) return

    // 防止頁面滾動
    event.preventDefault()

    const touch = event.touches ? event.touches[0] : event
    const deltaY = touch.clientY - startY
    const deltaPercent = deltaY / window.innerHeight

    // 計算新的位置百分比
    let newPercent = initialDragPercent + deltaPercent

    // 限制在邊界內 (允許稍微超出,產生橡皮筋效果)
    const MIN_PERCENT = SNAP_POINTS.FULL - 0.05

    if (newPercent < MIN_PERCENT) {
      // 橡皮筋效果: 超出上邊界時減緩
      const overflow = MIN_PERCENT - newPercent
      newPercent = MIN_PERCENT - overflow * 0.3
    }

    sheetTranslateYPercent.value = newPercent
  }

  // Helper function to find the closest snap point from a given array
  const findClosestSnap = (targetPercent, snapPoints) => {
    if (!snapPoints || snapPoints.length === 0) {
      return null
    }
    return snapPoints.reduce((prev, curr) =>
      Math.abs(curr - targetPercent) < Math.abs(prev - targetPercent) ? curr : prev,
    )
  }

  const stopDrag = () => {
    if (!isDragging.value) return

    isDragging.value = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchend', stopDrag)

    const currentPercent = sheetTranslateYPercent.value
    const dragDelta = currentPercent - initialDragPercent

    const sortedSnaps = [
      SNAP_POINTS.FULL,
      SNAP_POINTS.LARGE,
      SNAP_POINTS.DEFAULT,
      SNAP_POINTS.PEEK,
    ].sort((a, b) => a - b)

    if (currentPercent > (SNAP_POINTS.PEEK + SNAP_POINTS.CLOSED) / 2) {
      isSheetOpen.value = false
      return
    }

    const startingSnap = findClosestSnap(initialDragPercent, sortedSnaps)
    const startingSnapIndex = sortedSnaps.indexOf(startingSnap)
    const dragThreshold = 0.03 // User must drag at least 3% of the screen height
    let finalSnap = startingSnap

    if (dragDelta < -dragThreshold) {
      // Swiped Up: Find the closest snap among points *above* the starting one
      const potentialSnaps = sortedSnaps.slice(0, startingSnapIndex)
      const closest = findClosestSnap(currentPercent, potentialSnaps)
      if (closest !== null) {
        finalSnap = closest
      }
    } else if (dragDelta > dragThreshold) {
      // Swiped Down: Find the closest snap among points *below* the starting one
      const potentialSnaps = sortedSnaps.slice(startingSnapIndex + 1)
      const closest = findClosestSnap(currentPercent, potentialSnaps)
      if (closest !== null) {
        finalSnap = closest
      }
    } else {
      // Minor Drag: Find the closest snap among *all* points
      finalSnap = findClosestSnap(currentPercent, sortedSnaps)
    }

    sheetTranslateYPercent.value = finalSnap
  }

  // 監聽開關狀態
  watch(
    isSheetOpen,
    (isOpen) => {
      if (isOpen) {
        // 打開時設置為預設高度
        sheetTranslateYPercent.value = SNAP_POINTS.DEFAULT
      } else {
        // 關閉時設置為完全關閉（視窗外）
        sheetTranslateYPercent.value = SNAP_POINTS.CLOSED
      }
    },
    { immediate: true }
  )

  // Close bottom sheet when resizing to desktop
  watch(smAndUp, (isDesktop) => {
    if (isDesktop && isSheetOpen.value) {
      isSheetOpen.value = false
    }
  })

  return {
    sheetContent,
    isSheetOpen,
    sheetTranslateY,
    sheetContentHeight,
    isDragging,
    startDrag,
    smAndUp,
  }
}
