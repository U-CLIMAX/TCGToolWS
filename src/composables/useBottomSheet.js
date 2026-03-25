import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useDisplay } from 'vuetify'

// Snap points relative to viewport top
const SNAP_POINTS = {
  FULL: 0.12, // Fully expanded
  LARGE: 0.4, // Expanded (60% screen)
  DEFAULT: 0.6, // Default (40% screen)
  PEEK: 0.9, // Peek (header only)
  CLOSED: 1.0, // Hidden
}

export const useBottomSheet = (externalSheetContent) => {
  const sheetContent = externalSheetContent || ref(null)
  const { smAndUp } = useDisplay()

  const isAnimatingOut = ref(false)
  const shouldRender = computed(() => sheetContent.value !== null || isAnimatingOut.value)
  const lastKnownContent = ref(sheetContent.value)

  // Core state: Y translation percentage relative to viewport height
  const sheetTranslateYPercent = ref(SNAP_POINTS.CLOSED)
  const isDragging = ref(false)
  const isAnimating = ref(false)

  // Calculate pixel translation and content height
  const sheetTranslateY = computed(() => {
    return window.innerHeight * sheetTranslateYPercent.value
  })

  // Calculate available height for content area (v-card-text)
  const sheetContentHeight = computed(() => {
    const availableHeight = window.innerHeight * (1 - sheetTranslateYPercent.value)
    // Subtract header height (64px)
    return Math.max(0, availableHeight - 64)
  })

  let startY = 0
  let initialDragPercent = 0
  let velocity = 0 // in %/s
  let lastDragEvent = { time: 0, pos: 0 }
  let animationFrameId = null

  const cancelAnimation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isAnimating.value = false
  }

  const cleanupEventListeners = () => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchend', stopDrag)
  }

  const startDrag = (event) => {
    cancelAnimation()
    isDragging.value = true
    const touch = event.touches ? event.touches[0] : event
    startY = touch.clientY
    initialDragPercent = sheetTranslateYPercent.value

    velocity = 0
    lastDragEvent = { time: performance.now(), pos: initialDragPercent }

    window.addEventListener('mousemove', onDrag, { passive: false })
    window.addEventListener('touchmove', onDrag, { passive: false })
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchend', stopDrag)
  }

  const onDrag = (event) => {
    if (!isDragging.value) return

    // Prevent page scrolling
    event.preventDefault()

    const touch = event.touches ? event.touches[0] : event
    const deltaY = touch.clientY - startY
    const deltaPercent = deltaY / window.innerHeight

    // Calculate new position percentage
    let newPercent = initialDragPercent + deltaPercent

    const now = performance.now()
    const deltaTime = now - lastDragEvent.time
    const deltaPos = newPercent - lastDragEvent.pos
    if (deltaTime > 0) {
      velocity = deltaPos / (deltaTime / 1000) // Velocity in %/s
    }
    lastDragEvent = { time: now, pos: newPercent }

    // Constrain within bounds with rubber-banding effect
    const MIN_PERCENT = SNAP_POINTS.FULL - 0.05

    if (newPercent < MIN_PERCENT) {
      // Rubber-banding: slow down beyond top boundary
      const overflow = MIN_PERCENT - newPercent
      newPercent = MIN_PERCENT - overflow * 0.3
    }

    sheetTranslateYPercent.value = newPercent
  }

  const runSpringAnimation = (target) => {
    cancelAnimation()
    isAnimating.value = true

    const stiffness = 200
    const damping = 25
    const mass = 1
    const precision = 0.005

    let lastTime = performance.now()

    const step = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      const currentPos = sheetTranslateYPercent.value
      const displacement = currentPos - target

      if (Math.abs(displacement) < precision && Math.abs(velocity) < precision) {
        sheetTranslateYPercent.value = target
        velocity = 0
        cancelAnimation()
        return
      }

      const springForce = -stiffness * displacement
      const dampingForce = -damping * velocity
      const acceleration = (springForce + dampingForce) / mass

      velocity += acceleration * deltaTime
      const newPos = currentPos + velocity * deltaTime

      sheetTranslateYPercent.value = newPos
      animationFrameId = requestAnimationFrame(step)
    }
    animationFrameId = requestAnimationFrame(step)
  }

  // Helper function to find the closest snap point from a given array
  const findClosestSnap = (targetPercent, snapPoints) => {
    if (!snapPoints || snapPoints.length === 0) {
      return null
    }
    return snapPoints.reduce((prev, curr) =>
      Math.abs(curr - targetPercent) < Math.abs(prev - targetPercent) ? curr : prev
    )
  }

  const stopDrag = () => {
    if (!isDragging.value) return

    isDragging.value = false
    cleanupEventListeners()

    const currentPercent = sheetTranslateYPercent.value
    const dragDelta = currentPercent - initialDragPercent

    const sortedSnaps = [
      SNAP_POINTS.FULL,
      SNAP_POINTS.LARGE,
      SNAP_POINTS.DEFAULT,
      SNAP_POINTS.PEEK,
    ].sort((a, b) => a - b)

    if (currentPercent > (SNAP_POINTS.PEEK + SNAP_POINTS.CLOSED) / 2) {
      sheetContent.value = null
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

    runSpringAnimation(finalSnap)
  }

  // Watch content state
  watch(sheetContent, (newContent, oldContent) => {
    if (newContent) {
      lastKnownContent.value = newContent
    }

    if (newContent && !oldContent) {
      // --- OPENING ---
      cancelAnimation()
      sheetTranslateYPercent.value = SNAP_POINTS.CLOSED
      // Use a double delay to give Firefox's rendering engine time to process the new complex component
      nextTick(() => {
        setTimeout(() => {
          sheetTranslateYPercent.value = SNAP_POINTS.DEFAULT
        }, 0) // A 0ms timeout pushes this to the next event loop cycle, after rendering
      })
    } else if (!newContent && oldContent) {
      // --- CLOSING ---
      cancelAnimation()
      isAnimatingOut.value = true
      sheetTranslateYPercent.value = SNAP_POINTS.CLOSED
      setTimeout(() => {
        isAnimatingOut.value = false
      }, 300) // Must match CSS transition duration
    }
  })

  // Close bottom sheet when resizing to desktop
  watch(smAndUp, (isDesktop) => {
    if (isDesktop && sheetContent.value) {
      sheetContent.value = null // Close directly without animation on resize
    }
  })

  onUnmounted(() => {
    cleanupEventListeners()
    cancelAnimation()
  })

  return {
    shouldRender,
    sheetTranslateY,
    sheetContentHeight,
    isDragging,
    isAnimating,
    startDrag,
    smAndUp,
    lastKnownContent,
  }
}
