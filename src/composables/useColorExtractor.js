import { ref, watchEffect } from 'vue'
import { Vibrant, WorkerPipeline } from 'node-vibrant/worker'
import PipelineWorker from 'node-vibrant/worker.worker?worker'

const FALLBACK_COLORS = ['#8CA0A0', '#A7B8B8', '#C1C9C9', '#DADFE0', '#ECEFF0', '#F5F7F7']

Vibrant.use(new WorkerPipeline(PipelineWorker))

export const useColorExtractor = (imageUrl) => {
  const colors = ref([])

  watchEffect((onCleanup) => {
    colors.value = []
    if (!imageUrl.value) return

    let isCanceled = false
    onCleanup(() => {
      isCanceled = true
    })

    Vibrant.from(imageUrl.value)
      .getPalette()
      .then((palette) => {
        if (isCanceled) return

        const colorArray = []

        // 按照特定順序提取色票
        const swatchOrder = [
          'Vibrant',
          'DarkVibrant',
          'LightVibrant',
          'Muted',
          'DarkMuted',
          'LightMuted',
        ]

        for (const name of swatchOrder) {
          if (palette[name]) {
            const [r, g, b] = palette[name].rgb
            colorArray.push(`rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`)
          }
        }

        colors.value = colorArray.length > 0 ? colorArray : FALLBACK_COLORS
      })
      .catch((error) => {
        if (isCanceled) return
        console.error('Color extraction failed:', error)
        colors.value = FALLBACK_COLORS
      })
  })

  return { colors }
}
