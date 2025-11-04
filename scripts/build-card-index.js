import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CARD_DATA_DIR = path.join(__dirname, '../src/assets/card-data')
const OUTPUT_DIR = path.join(__dirname, '../public')
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'card-db-manifest.json')

console.log('🔍 Starting to build card index...')

// 讀取所有 JSON 檔案
const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))
console.log(`📁 Found ${files.length} card data files.`)

const allCards = []
let cardCount = 0

const productNamesSet = new Set()
const traitsSet = new Set()
const raritiesSet = new Set()
let minCost = Infinity,
  maxCost = -Infinity,
  minPower = Infinity,
  maxPower = -Infinity

files.forEach((filename) => {
  const filePath = path.join(CARD_DATA_DIR, filename)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const cardIdPrefix = filename.replace('.json', '')

  // 轉換資料結構：從 { "ID": {...} } 變成陣列
  for (const baseId in content) {
    const cardData = content[baseId]

    // 收集篩選選項
    if (cardData.product_name) productNamesSet.add(cardData.product_name)
    if (cardData.trait && Array.isArray(cardData.trait)) {
      cardData.trait.forEach((t) => traitsSet.add(t))
    }
    if (typeof cardData.cost === 'number') {
      minCost = Math.min(minCost, cardData.cost)
      maxCost = Math.max(maxCost, cardData.cost)
    }
    if (typeof cardData.power === 'number') {
      minPower = Math.min(minPower, cardData.power)
      maxPower = Math.max(maxPower, cardData.power)
    }

    const { all_cards, ...baseCardData } = cardData

    if (all_cards && Array.isArray(all_cards)) {
      all_cards.forEach((cardVersion) => {
        if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)
        allCards.push({
          ...baseCardData,
          ...cardVersion,
          baseId,
          cardIdPrefix,
        })
        cardCount++
      })
    }
  }
})

console.log(`     - Processed a total of ${cardCount} cards.`)

// 計算基礎卡片資料的 hash，這步不包含 link
const cardDataContent = JSON.stringify(allCards)
const hash = crypto.createHash('sha256').update(cardDataContent).digest('hex').substring(0, 8)
const version = `v${hash}`

console.log(`     - Data Hash: ${hash}`)

// 檢測內容變化，並判斷是否需要重新產生檔案
try {
  const nowManifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'))
  if (version === nowManifest.version) {
    console.log('⏭️ The content has not changed, skip the remaining steps...')
    process.exit(0)
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('⚒️ Manifest file not found, start creating files...')
  } else {
    throw error
  }
}

// 處理卡片連結（效果文字中提到的其他卡片）
console.log('     - Processing card links...')

allCards.forEach((card) => (card.link = []))

const nameToCardBaseIds = new Map()
const baseIdToCardsMap = new Map()

for (const card of allCards) {
  if (!nameToCardBaseIds.has(card.name)) {
    nameToCardBaseIds.set(card.name, new Set())
  }
  nameToCardBaseIds.get(card.name).add(card.baseId)

  if (!baseIdToCardsMap.has(card.baseId)) {
    baseIdToCardsMap.set(card.baseId, [])
  }
  baseIdToCardsMap.get(card.baseId).push(card)
}

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const allNamesPattern = [...nameToCardBaseIds.keys()].map(escapeRegex).join('|')
const nameMatcherRegex = new RegExp(`「(${allNamesPattern})」`, 'g')

for (const targetCard of allCards) {
  const effectText = targetCard.effect || ''
  if (!effectText) continue

  const matches = effectText.matchAll(nameMatcherRegex)

  for (const match of matches) {
    const foundName = match[1]
    const sourceBaseIds = nameToCardBaseIds.get(foundName)

    if (sourceBaseIds) {
      for (const sourceBaseId of sourceBaseIds) {
        if (!targetCard.link.includes(sourceBaseId)) {
          targetCard.link.push(sourceBaseId)
        }
        const sourceCardsToUpdate = baseIdToCardsMap.get(sourceBaseId)
        if (sourceCardsToUpdate) {
          for (const sourceCard of sourceCardsToUpdate) {
            if (!sourceCard.link.includes(targetCard.baseId)) {
              sourceCard.link.push(targetCard.baseId)
            }
          }
        }
      }
    }
  }
}

const baseIdToFullIdsMap = new Map()
for (const card of allCards) {
  if (!baseIdToFullIdsMap.has(card.baseId)) {
    baseIdToFullIdsMap.set(card.baseId, [])
  }
  baseIdToFullIdsMap.get(card.baseId).push(card.id)
}

for (const card of allCards) {
  if (card.link && Array.isArray(card.link) && card.link.length > 0) {
    card.link = card.link.flatMap((linkBaseId) => baseIdToFullIdsMap.get(linkBaseId) || [])
  }
}

// 建立篩選選項
const filterOptions = {
  productNames: [...productNamesSet],
  traits: [...traitsSet],
  rarities: [...raritiesSet].sort(),
  costRange: {
    min: minCost === Infinity ? 0 : minCost,
    max: maxCost === -Infinity ? 0 : maxCost,
  },
  powerRange: {
    min: minPower === Infinity ? 0 : Math.floor(minPower / 500) * 500,
    max: maxPower === -Infinity ? 0 : maxPower,
  },
}

// 建立最終輸出
const output = {
  filterOptions,
  cards: allCards,
}

// 加入版本號到輸出
output.version = version

// 將最終 output 物件轉換為 JSON 字串以供壓縮
const content = JSON.stringify(output)

// 進行 gzip 壓縮
const gzippedContent = zlib.gzipSync(content)
const totalSizeMB = (gzippedContent.length / 1024 / 1024).toFixed(2)

// --- 分片邏輯 ---
const CHUNK_SIZE = 512 * 1024 // 512 KB
const chunkCount = Math.ceil(gzippedContent.length / CHUNK_SIZE)
const chunkFiles = []

console.log(
  `📦 Total size: ${totalSizeMB} MB, splitting into ${chunkCount} chunks of ~256 KB...`
)

for (let i = 0; i < chunkCount; i++) {
  const start = i * CHUNK_SIZE
  const end = start + CHUNK_SIZE
  const chunk = gzippedContent.subarray(start, end)

  const chunkFileName = `all_cards_db.${hash}.part${i + 1}.bin`
  const chunkFilePath = path.join(OUTPUT_DIR, chunkFileName)

  fs.writeFileSync(chunkFilePath, chunk)
  chunkFiles.push(chunkFileName)
  console.log(
    `     - Created chunk ${i + 1}/${chunkCount}: ${chunkFileName} (${(
      chunk.length / 1024
    ).toFixed(2)} KB)`
  )
}
console.log('💾 Index chunks created.')

// 建立 manifest 檔案
const manifest = {
  version,
  hash,
  chunked: true,
  chunks: chunkFiles,
  totalSize: `${totalSizeMB} MB`,
  cardCount,
  filterOptions: {
    productCount: filterOptions.productNames.length,
    traitCount: filterOptions.traits.length,
    rarityCount: filterOptions.rarities.length,
    costRange: filterOptions.costRange,
    powerRange: filterOptions.powerRange,
  },
}

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2))
console.log(`     - Manifest file created: ${MANIFEST_FILE}`)

// 清理舊的帶 hash 的檔案（包括舊的單體檔案和舊分片）
const oldFiles = fs
  .readdirSync(OUTPUT_DIR)
  .filter((f) => f.startsWith('all_cards_db.') && f.endsWith('.bin') && !chunkFiles.includes(f))

oldFiles.forEach((oldFile) => {
  const oldFilePath = path.join(OUTPUT_DIR, oldFile)
  fs.unlinkSync(oldFilePath)
  console.log(`     - Deleted old file: ${oldFile}`)
})

console.log('✨ Done!')
