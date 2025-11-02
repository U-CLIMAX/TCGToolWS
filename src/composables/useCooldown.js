import { ref, computed, onUnmounted } from 'vue'

export const useCooldown = (durationSeconds = 60) => {
  const cooldownEndTime = ref(0)
  const remainingSeconds = ref(0)
  let timer = null

  const isCoolingDown = computed(() => remainingSeconds.value > 0)
  const cooldownText = computed(() => {
    return isCoolingDown.value ? `(${remainingSeconds.value}s)` : ''
  })

  const updateRemaining = () => {
    const now = Date.now()
    const remaining = Math.ceil((cooldownEndTime.value - now) / 1000)
    remainingSeconds.value = Math.max(0, remaining)

    if (remainingSeconds.value === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const startCooldown = () => {
    cooldownEndTime.value = Date.now() + durationSeconds * 1000
    updateRemaining()
    if (!timer) {
      timer = setInterval(updateRemaining, 1000)
    }
  }

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  return {
    isCoolingDown,
    cooldownText,
    startCooldown,
  }
}
