import { ref } from 'vue'
import { getGPUTier } from 'detect-gpu'

// Use a true singleton pattern here to ensure the check only ever runs once.
const isHardwareAccelerated = ref(null) // null: unknown, true: yes, false: no
let hasChecked = false

export const useHardwareAcceleration = () => {
  const check = async () => {
    // Make the check function async
    if (hasChecked || typeof window === 'undefined') {
      return
    }
    hasChecked = true

    try {
      const gpu = await getGPUTier()

      if (gpu && gpu.tier >= 2) {
        // Tier 2 or higher generally indicates good GPU support
        isHardwareAccelerated.value = true
        console.log('Hardware acceleration check: Passed (detect-gpu tier >= 2).', gpu)
      } else {
        isHardwareAccelerated.value = false
        console.log(
          'Hardware acceleration check: Failed (detect-gpu tier < 2 or no GPU info).',
          gpu
        )
      }
    } catch (e) {
      isHardwareAccelerated.value = false
      console.error('Hardware acceleration check: Failed with error using detect-gpu.', e)
    }
  }

  // The check only runs on the client and only once.
  if (isHardwareAccelerated.value === null) {
    check()
  }

  return { isHardwareAccelerated }
}
