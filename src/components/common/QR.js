import { generate } from 'lean-qr'
import { toSvgDataURL } from 'lean-qr/extras/svg'
import { makeVueSvgComponent } from 'lean-qr/extras/vue'
import { h, defineComponent } from 'vue'

const QR = defineComponent(makeVueSvgComponent({ h }, generate, toSvgDataURL))
export default QR
