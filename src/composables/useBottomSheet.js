import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'

export const useBottomSheet = (initialSheetHeight = 0.4) => {
  const { smAndUp } = useDisplay()

  const sheetContent = ref(null) // Can be 'filter', 'deck', or other specific content
  const isSheetOpen = computed({
    get: () => sheetContent.value !== null,
    set: (value) => {
      if (!value) {
        sheetContent.value = null
      }
    },
  })

  const sheetHeight = ref(window.innerHeight * initialSheetHeight)
  const isDragging = ref(false)
  let startY = 0
  let initialDragHeight = 0

  const startDrag = (event) => {
    isDragging.value = true
    const touch = event.touches ? event.touches[0] : event
    startY = touch.clientY
    initialDragHeight = sheetHeight.value
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('touchmove', onDrag)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchend', stopDrag)
  }

  const onDrag = (event) => {
    if (!isDragging.value) return
    const touch = event.touches ? event.touches[0] : event
    const deltaY = startY - touch.clientY
    const newHeight = initialDragHeight + deltaY
    const maxHeight = window.innerHeight * 0.9
    const minHeight = window.innerHeight * 0.2
    sheetHeight.value = Math.max(minHeight, Math.min(newHeight, maxHeight))
  }

  const stopDrag = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchend', stopDrag)
  }

  watch(isSheetOpen, (isOpen) => {
    if (isOpen) {
      sheetHeight.value = window.innerHeight * initialSheetHeight
    }
  })

  // Close bottom sheet when resizing to desktop
  watch(smAndUp, (isDesktop) => {
    if (isDesktop && isSheetOpen.value) {
      isSheetOpen.value = false
    }
  })

  return {
    sheetContent,
    isSheetOpen,
    sheetHeight,
    startDrag,
    smAndUp, // Expose smAndUp for external use if needed
  }
}
