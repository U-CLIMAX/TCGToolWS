import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import zlib from 'zlib'
import { Document, Charset } from 'flexsearch'
import { seriesMap } from '../src/maps/series-map.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CARD_DATA_DIR = path.join(__dirname, '../src/assets/card-data')
const OUTPUT_DIR = path.join(__dirname, '../public')

console.log('🔍 Starting to build card index...')

// --- FlexSearch 配置與生成函式 ---
const createIndexConfig = () => ({
  tokenize: 'forward',
  encoder: Charset.CJK,
  document: {
    id: 'index',
    index: ['name', 'effect', 'id'],
  },
})

/**
 * 建立並儲存 FlexSearch 索引檔案
 * @param {string} game - 遊戲代號 (ws/wsr)
 * @param {Array} cards - 卡片資料陣列
 * @param {string} hash - 資料版本 hash
 * @returns {Promise<Object>} - 回傳索引檔案對照表 { field: filename }
 */
const buildAndSaveSearchIndex = async (game, cards, hash) => {
  console.log(`     - Building FlexSearch index for ${cards.length} cards...`)
  const index = new Document(createIndexConfig())

  cards.forEach((card, idx) => {
    index.add({
      index: idx,
      name: card.name || '',
      effect: card.effect || '',
      id: card.id || '',
    })
  })

  const indexFiles = {}

  await new Promise((resolve) => {
    index.export((key, data) => {
      const filename = `${game}_index_${key}.${hash}.json`
      const filePath = path.join(OUTPUT_DIR, filename)

      fs.writeFileSync(filePath, data || '')
      indexFiles[key] = filename
    })
    resolve()
  })

  console.log(`     - Search Index built and saved: ${Object.keys(indexFiles).join(', ')}`)
  return indexFiles
}

// Build prefix map
const prefixToGameMap = new Map()
Object.values(seriesMap).forEach((series) => {
  if (series.prefixes && Array.isArray(series.prefixes)) {
    series.prefixes.forEach((prefix) => {
      prefixToGameMap.set(prefix.toLowerCase(), series.game)
    })
  }
})

// 讀取所有 JSON 檔案
const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))
console.log(`📁 Found ${files.length} card data files.`)

const cardsByGame = {
  ws: [],
  wsr: [],
  wsc: [],
}

let totalCardCount = 0

files.forEach((filename) => {
  const filePath = path.join(CARD_DATA_DIR, filename)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const cardIdPrefix = filename.replace('.json', '')
  const prefix = filename.split('-')[0].toLowerCase()
  const game = prefixToGameMap.get(prefix) || 'ws'

  if (!cardsByGame[game]) {
    cardsByGame[game] = []
  }

  // 轉換資料結構：從 { "ID": {...} } 變成陣列
  for (const baseId in content) {
    const cardData = content[baseId]
    const { all_cards, ...baseCardData } = cardData

    if (all_cards && Array.isArray(all_cards)) {
      const minIdLength = all_cards.length > 0 ? Math.min(...all_cards.map((c) => c.id.length)) : 0

      all_cards.forEach((cardVersion) => {
        // 如果只有一張卡且最後是英文 -> 強制 false (代表是異圖)
        const lastChar = cardVersion.id.slice(-1)
        const isLastCharLetter =
          (lastChar >= 'A' && lastChar <= 'Z') || (lastChar >= 'a' && lastChar <= 'z')

        // 判斷卡號是否等於最短長度
        const isShortestLength = cardVersion.id.length === minIdLength

        const isLowest = all_cards.length === 1 && isLastCharLetter ? false : isShortestLength

        cardsByGame[game].push({
          ...baseCardData,
          ...cardVersion,
          baseId,
          cardIdPrefix,
          isLowestRarity: isLowest,
        })
        totalCardCount++
      })
    }
  }
})

console.log(`     - Processed a total of ${totalCardCount} cards.`)
console.log(
  `     - WS: ${cardsByGame.ws.length}, WSR: ${cardsByGame.wsr.length}, WSC: ${cardsByGame.wsc.length}`
)

// 卡片連結處理函式
const processCardLinks = (cards) => {
  cards.forEach((card) => (card.link = []))

  // 建立卡片名稱 -> Set[baseId] 的映射
  const nameToCardBaseIds = new Map()
  for (const card of cards) {
    if (!nameToCardBaseIds.has(card.name)) {
      nameToCardBaseIds.set(card.name, new Set())
    }
    nameToCardBaseIds.get(card.name).add(card.baseId)
  }

  // 建立 baseId -> 代表卡片 的映射，用於減少效果文的掃描次數
  const baseIdToRepCard = new Map()
  for (const card of cards) {
    if (!baseIdToRepCard.has(card.baseId)) {
      baseIdToRepCard.set(card.baseId, card)
    }
  }

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const allNamesPattern = [...nameToCardBaseIds.keys()].map(escapeRegex).join('|')
  const nameMatcherRegex = new RegExp(`「(${allNamesPattern})」`, 'g')

  // Stage 1: One-Way Link Detection (僅掃描唯一卡片)
  const oneWayLinks = new Map()
  for (const targetCard of baseIdToRepCard.values()) {
    const effectText = targetCard.effect || ''
    if (!effectText) continue

    const matches = effectText.matchAll(nameMatcherRegex)
    const targetBaseId = targetCard.baseId

    for (const match of matches) {
      const foundName = match[1]
      const sourceBaseIds = nameToCardBaseIds.get(foundName)
      if (sourceBaseIds) {
        if (!oneWayLinks.has(targetBaseId)) {
          oneWayLinks.set(targetBaseId, new Set())
        }
        const targetLinks = oneWayLinks.get(targetBaseId)
        for (const sourceBaseId of sourceBaseIds) {
          targetLinks.add(sourceBaseId)
        }
      }
    }
  }

  // Stage 2: Create Bidirectional Links (在小型的 Map 上操作)
  const bidirectionalLinks = new Map()
  for (const [targetId, sourceIds] of oneWayLinks.entries()) {
    for (const sourceId of sourceIds) {
      if (!bidirectionalLinks.has(targetId)) bidirectionalLinks.set(targetId, new Set())
      bidirectionalLinks.get(targetId).add(sourceId)
      if (!bidirectionalLinks.has(sourceId)) bidirectionalLinks.set(sourceId, new Set())
      bidirectionalLinks.get(sourceId).add(targetId)
    }
  }

  // Stage 3: Apply Links to All Cards (一次性賦值)
  for (const card of cards) {
    const links = bidirectionalLinks.get(card.baseId)
    if (links) {
      card.link = [...links]
    }
  }

  // Final Step: Convert baseIds in links to full card IDs
  const baseIdToFullIdsMap = new Map()
  for (const card of cards) {
    if (!baseIdToFullIdsMap.has(card.baseId)) {
      baseIdToFullIdsMap.set(card.baseId, [])
    }
    baseIdToFullIdsMap.get(card.baseId).push(card.id)
  }

  for (const card of cards) {
    if (card.link && Array.isArray(card.link) && card.link.length > 0) {
      card.link = card.link.flatMap((linkBaseId) => baseIdToFullIdsMap.get(linkBaseId) || [])
    }
  }

  return cards
}

// 資料優化
const collectValueMaps = (cards) => {
  const colorSet = new Set()
  const typeSet = new Set()
  const traitSet = new Set()

  cards.forEach((card) => {
    if (card.color) colorSet.add(card.color)
    if (card.type) typeSet.add(card.type)
    if (card.trait && Array.isArray(card.trait)) {
      card.trait.forEach((t) => traitSet.add(t))
    }
  })

  return {
    colorMap: [...colorSet].sort(),
    typeMap: [...typeSet].sort(),
    traitMap: [...traitSet].sort(),
  }
}

const applyValueOptimizations = (cards, maps) => {
  return cards.map((card) => {
    const optimized = { ...card }

    // Color -> Index
    if (optimized.color) {
      optimized.color = maps.colorMap.indexOf(optimized.color)
    }

    // Type -> Index
    if (optimized.type) {
      optimized.type = maps.typeMap.indexOf(optimized.type)
    }

    // Trait -> Array of Indices
    if (optimized.trait && Array.isArray(optimized.trait)) {
      optimized.trait = optimized.trait.map((t) => maps.traitMap.indexOf(t))
    }

    // isLowestRarity -> 0/1
    optimized.isLowestRarity = optimized.isLowestRarity ? 1 : 0

    // Power -> Value / 500
    if (typeof optimized.power === 'number') {
      optimized.power = optimized.power / 500
    }

    return optimized
  })
}

// 將物件陣列轉換為「Schema + 陣列」結構
const transformToColumnar = (cards) => {
  if (!cards || cards.length === 0) return { keys: [], data: [] }

  // 抓出第一張卡片的所有 keys，作為基礎順序
  const baseKeys = Object.keys(cards[0])

  const allPossibleKeys = new Set(baseKeys)
  cards.forEach((card) => {
    Object.keys(card).forEach((key) => allPossibleKeys.add(key))
  })
  const extraKeys = [...allPossibleKeys].filter((k) => !baseKeys.includes(k))
  const finalKeys = [...baseKeys, ...extraKeys]

  console.log(`     - Schema detected: ${finalKeys.length} columns.`)

  const data = cards.map((card) => {
    return finalKeys.map((key) => {
      const val = card[key]
      return val === undefined ? null : val
    })
  })
  return { keys: finalKeys, data: data }
}

const processGameData = async (game, cards) => {
  console.log(`\n🚀 Processing ${game.toUpperCase()} data...`)
  const manifestFile = path.join(OUTPUT_DIR, `card-db-manifest-${game}.json`)

  const productNamesSet = new Set()
  const traitsSet = new Set()
  const raritiesSet = new Set()
  const soulsSet = new Set()
  let minCost = Infinity,
    maxCost = -Infinity,
    minPower = Infinity,
    maxPower = -Infinity

  cards.forEach((card) => {
    if (card.product_name) productNamesSet.add(card.product_name)
    if (card.trait && Array.isArray(card.trait)) card.trait.forEach((t) => traitsSet.add(t))
    if (card.rarity) raritiesSet.add(card.rarity)
    let soulValue = card.soul === '-' ? 0 : card.soul
    if (typeof soulValue === 'number') soulsSet.add(soulValue)
    if (typeof card.cost === 'number') {
      minCost = Math.min(minCost, card.cost)
      maxCost = Math.max(maxCost, card.cost)
    }
    if (typeof card.power === 'number') {
      minPower = Math.min(minPower, card.power)
      maxPower = Math.max(maxPower, card.power)
    }
  })

  // 計算基礎卡片資料的 hash，這步不包含 link
  const cardDataContent = JSON.stringify(cards)
  const hash = crypto.createHash('sha256').update(cardDataContent).digest('hex').substring(0, 8)
  const version = `v${hash}`

  console.log(`     - Data Hash: ${hash}`)

  // 檢測內容變化，並判斷是否需要重新產生檔案
  try {
    const nowManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
    if (version === nowManifest.version && nowManifest.schema && nowManifest.valueMaps) {
      console.log('⏭️ The content has not changed, skip...')
      return
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    console.log('⚒️ Manifest file not found, start creating files...')
  }

  // 處理卡片連結
  console.log('     - Processing card links...')
  processCardLinks(cards)

  const indexFiles = await buildAndSaveSearchIndex(game, cards, hash)

  // 建立篩選選項
  const filterOptions = {
    productNames: [...productNamesSet],
    traits: [...traitsSet],
    rarities: [...raritiesSet].sort(),
    souls: [...soulsSet].sort((a, b) => a - b),
    costRange: {
      min: minCost === Infinity ? 0 : minCost,
      max: maxCost === -Infinity ? 0 : maxCost,
    },
    powerRange: {
      min: minPower === Infinity ? 0 : Math.floor(minPower / 500) * 500,
      max: maxPower === -Infinity ? 0 : maxPower,
    },
  }

  console.log('     - Collecting value maps and optimizing data...')
  const valueMaps = collectValueMaps(cards)
  const optimizedCards = applyValueOptimizations(cards, valueMaps)
  console.log('     - Converting to Columnar (Array of Arrays) format...')
  const { keys: schemaKeys, data: rowsData } = transformToColumnar(optimizedCards)

  const output = {
    filterOptions,
    cards: rowsData,
    version,
  }

  // 將最終 output 物件轉換為 JSON 字串以供壓縮
  const content = JSON.stringify(output)

  // 進行 brotli 壓縮
  const brotliOptions = {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_LGWIN]: zlib.constants.BROTLI_MAX_WINDOW_BITS,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(content),
    },
  }
  const zippedContent = zlib.brotliCompressSync(content, brotliOptions)
  const totalSizeMB = (zippedContent.length / 1024 / 1024).toFixed(2)

  // --- 分片邏輯 ---
  const CHUNK_SIZE = 512 * 1024 // 512 KB
  const chunkCount = Math.ceil(zippedContent.length / CHUNK_SIZE)
  const chunkFiles = []
  let singleFileName = null

  if (chunkCount <= 1) {
    // 單一檔案模式
    singleFileName = `${game}_cards_db.${hash}.bin`
    const singleFilePath = path.join(OUTPUT_DIR, singleFileName)
    fs.writeFileSync(singleFilePath, zippedContent)
    console.log(`📦 Total size: ${totalSizeMB} MB, no splitting needed.`)
    console.log(`     - Created file: ${singleFileName}`)
  } else {
    // 分片模式
    console.log(
      `📦 Total size: ${totalSizeMB} MB, splitting into ${chunkCount} chunks of ~512 KB...`
    )

    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE
      const end = start + CHUNK_SIZE
      const chunk = zippedContent.subarray(start, end)

      const chunkFileName = `${game}_cards_db.${hash}.part${i + 1}.bin`
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
  }

  // 建立 manifest 檔案
  const manifest = {
    version,
    hash,
    chunked: chunkCount > 1,
    totalSize: `${totalSizeMB} MB`,
    cardCount: cards.length,
    schema: schemaKeys,
    valueMaps: valueMaps,
    indexFiles: indexFiles,
  }

  if (chunkCount > 1) {
    manifest.chunks = chunkFiles
  } else {
    manifest.fileName = singleFileName
  }

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))
  console.log(`     - Manifest file created: ${manifestFile}`)

  // 清理舊的帶 hash 的檔案（包括舊的單體檔案、舊分片、以及舊的索引檔）
  const currentFiles = chunkCount > 1 ? chunkFiles : [singleFileName]
  const currentIndexFiles = Object.values(indexFiles)
  const allCurrentFiles = [...currentFiles, ...currentIndexFiles]

  const oldFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => {
    const isGameDb = f.startsWith(`${game}_cards_db.`) && f.endsWith('.bin')
    const isGameIndex = f.startsWith(`${game}_index_`) && f.endsWith('.json')
    return (isGameDb || isGameIndex) && !allCurrentFiles.includes(f)
  })

  oldFiles.forEach((oldFile) => {
    const oldFilePath = path.join(OUTPUT_DIR, oldFile)
    fs.unlinkSync(oldFilePath)
    console.log(`     - Deleted old file: ${oldFile}`)
  })
}

;(async () => {
  await processGameData('ws', cardsByGame.ws)
  await processGameData('wsr', cardsByGame.wsr)
  await processGameData('wsc', cardsByGame.wsc)

  console.log('✨ Done!')
})()
