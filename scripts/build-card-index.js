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

// 腳本邏輯版本
const BUILD_LOGIC_VERSION = 'v4'

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

// 讀取所有 JSON 檔案並依遊戲分組
const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))
console.log(`📁 Found ${files.length} card data files.`)

const rawFilesByGame = {
  ws: [],
  wsr: [],
  wsc: [],
}

files.forEach((filename) => {
  const filePath = path.join(CARD_DATA_DIR, filename)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const cardIdPrefix = filename.replace('.json', '')
  const prefix = filename.split('-')[0].toLowerCase()
  const game = prefixToGameMap.get(prefix) || 'ws'

  if (!rawFilesByGame[game]) {
    rawFilesByGame[game] = []
  }

  rawFilesByGame[game].push({ content, cardIdPrefix })
})

const NON_LOWEST_RARITIES = ['AGR']

/**
 * 處理單一遊戲的 rawFiles（建立連結、平行卡、統計篩選選項並展開卡片）
 * @param {Array<{content: Object, cardIdPrefix: string}>} rawFiles
 * @returns {{ cards: Array<Object>, filterOptions: Object }}
 */
const processRawCardData = (rawFiles) => {
  const fetchedCards = []
  const productNamesSet = new Set()
  const traitsSet = new Set()
  const raritiesSet = new Set()
  const soulsSet = new Set()
  const levelsSet = new Set()
  let minCost = Infinity,
    maxCost = -Infinity,
    minPower = Infinity,
    maxPower = -Infinity

  // 1. 建立基礎索引 (名稱 -> baseIds, baseId -> 所有 card.id)
  const nameToBaseIds = new Map()
  const baseIdToAllIds = new Map()
  const baseCards = []

  for (const file of rawFiles) {
    for (const baseId in file.content) {
      const cardData = file.content[baseId]
      const allCards = cardData.all_cards || []
      const ids = allCards.map((c) => c.id)

      baseIdToAllIds.set(baseId, ids)
      if (cardData.name) {
        if (!nameToBaseIds.has(cardData.name)) {
          nameToBaseIds.set(cardData.name, new Set())
        }
        nameToBaseIds.get(cardData.name).add(baseId)
      }

      baseCards.push({ baseId, cardData, cardIdPrefix: file.cardIdPrefix })
    }
  }

  // 2. 在 Base Card 層級建立雙向連結
  const baseLinks = new Map()
  if (nameToBaseIds.size > 0) {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const allNamesPattern = [...nameToBaseIds.keys()].map(escapeRegex).join('|')
    const nameMatcherRegex = new RegExp(`[「｢](${allNamesPattern})[」｣]`, 'g')

    for (const { baseId, cardData } of baseCards) {
      const effectText = cardData.effect || ''
      if (!effectText) continue

      const matches = effectText.matchAll(nameMatcherRegex)
      for (const match of matches) {
        const foundName = match[1]
        const sourceBaseIds = nameToBaseIds.get(foundName)
        if (sourceBaseIds) {
          for (const sourceBaseId of sourceBaseIds) {
            if (!baseLinks.has(baseId)) baseLinks.set(baseId, new Set())
            if (!baseLinks.has(sourceBaseId)) baseLinks.set(sourceBaseId, new Set())
            baseLinks.get(baseId).add(sourceBaseId)
            baseLinks.get(sourceBaseId).add(baseId)
          }
        }
      }
    }
  }

  // 3. 展開卡片版本並直接注入 link 與 parallelCards
  for (const { baseId, cardData, cardIdPrefix } of baseCards) {
    if (cardData.product_name) productNamesSet.add(cardData.product_name)
    if (cardData.trait && Array.isArray(cardData.trait)) {
      cardData.trait.forEach((t) => traitsSet.add(t))
    }

    const levelValue = cardData.level === '-' ? 0 : cardData.level
    if (typeof levelValue === 'number') {
      levelsSet.add(levelValue)
    }

    if (typeof cardData.cost === 'number') {
      minCost = Math.min(minCost, cardData.cost)
      maxCost = Math.max(maxCost, cardData.cost)
    }
    if (typeof cardData.power === 'number') {
      minPower = Math.min(minPower, cardData.power)
      maxPower = Math.max(maxPower, cardData.power)
    }
    const soulValue = cardData.soul === '-' ? 0 : cardData.soul
    if (typeof soulValue === 'number') {
      soulsSet.add(soulValue)
    }

    const { all_cards, ...baseCardData } = cardData
    if (all_cards && Array.isArray(all_cards)) {
      const minIdLength = all_cards.length > 0 ? Math.min(...all_cards.map((c) => c.id.length)) : 0

      const isLowestFn = (cardVersion) => {
        const lastChar = cardVersion.id.slice(-1)
        const isLastCharUpper = lastChar >= 'A' && lastChar <= 'Z'
        const isShortestLength = cardVersion.id.length === minIdLength
        return NON_LOWEST_RARITIES.includes(cardVersion.rarity)
          ? false
          : isLastCharUpper
            ? false
            : isShortestLength
      }

      const highRarityCardIds = all_cards.filter((c) => !isLowestFn(c)).map((c) => c.id)
      const lowestRarityCardIds = all_cards.filter((c) => isLowestFn(c)).map((c) => c.id)

      const linkedBaseIds = baseLinks.get(baseId)
      const fullLinkedIds = linkedBaseIds
        ? [...linkedBaseIds].flatMap((bId) => baseIdToAllIds.get(bId) || [])
        : []

      all_cards.forEach((cardVersion) => {
        if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)
        const isLowest = isLowestFn(cardVersion)

        fetchedCards.push({
          ...baseCardData,
          ...cardVersion,
          baseId,
          cardIdPrefix,
          isLowestRarity: isLowest,
          link: fullLinkedIds,
          parallelCards: isLowest ? highRarityCardIds : lowestRarityCardIds,
        })
      })
    }
  }

  const filterOptions = {
    productNames: [...productNamesSet],
    traits: [...traitsSet],
    rarities: [...raritiesSet].sort(),
    souls: [...soulsSet].sort((a, b) => a - b),
    levels: [...levelsSet].sort((a, b) => a - b),
    costRange: {
      min: minCost === Infinity ? 0 : minCost,
      max: maxCost === -Infinity ? 0 : maxCost,
    },
    powerRange: {
      min: minPower === Infinity ? 0 : Math.floor(minPower / 500) * 500,
      max: maxPower === -Infinity ? 0 : maxPower,
    },
  }

  return { cards: fetchedCards, filterOptions }
}

/**
 * 建立字串池與字典表
 * @param {Array<Object>} cards
 * @returns {Object} valueMaps
 */
const buildValueMaps = (cards) => {
  const colorMap = ['紫色', '红色', '绿色', '蓝色', '黄色']
  const typeMap = ['事件卡', '角色卡', '高潮卡']
  const prefixes = [...new Set(cards.map((c) => c.cardIdPrefix).filter(Boolean))].sort()
  const effects = [...new Set(cards.map((c) => c.effect || ''))]

  return {
    colorMap,
    typeMap,
    prefixes,
    effects,
  }
}

/**
 * 將卡片資料轉換為 Column-Oriented 結構
 * @param {Array<Object>} cards
 * @param {Object} valueMaps
 * @param {Object} filterOptions
 * @returns {Object} cols
 */
const transformToColumnarStructure = (cards, valueMaps, filterOptions) => {
  const { colorMap, typeMap, prefixes, effects } = valueMaps
  const { productNames, traits, rarities } = filterOptions

  const prefixIndexMap = new Map()
  prefixes.forEach((p, i) => prefixIndexMap.set(p, i))

  const effectIndexMap = new Map()
  effects.forEach((e, i) => effectIndexMap.set(e, i))

  const prodIndexMap = new Map()
  productNames.forEach((p, i) => prodIndexMap.set(p, i))

  const traitIndexMap = new Map()
  traits.forEach((t, i) => traitIndexMap.set(t, i))

  const rarityIndexMap = new Map()
  rarities.forEach((r, i) => rarityIndexMap.set(r, i))

  const cols = {
    id: [],
    name: [],
    prod: [],
    type: [],
    level: [],
    power: [],
    cost: [],
    trait: [],
    color: [],
    soul: [],
    effect: [],
    tsc: [],
    rarity: [],
    baseId: [],
    prefix: [],
    isLowest: [],
    link: [],
    parallel: [],
  }

  cards.forEach((c) => {
    cols.id.push(c.id || '')
    cols.name.push(c.name || '')
    cols.prod.push(
      c.product_name && prodIndexMap.has(c.product_name) ? prodIndexMap.get(c.product_name) : -1
    )
    cols.type.push(c.type && typeMap.indexOf(c.type) >= 0 ? typeMap.indexOf(c.type) : -1)
    cols.level.push(typeof c.level === 'number' ? c.level : null)
    cols.power.push(typeof c.power === 'number' ? c.power / 500 : null)
    cols.cost.push(typeof c.cost === 'number' ? c.cost : null)
    cols.trait.push(
      Array.isArray(c.trait)
        ? c.trait.map((t) => traitIndexMap.get(t)).filter((idx) => idx !== undefined)
        : null
    )
    cols.color.push(c.color ? colorMap.indexOf(c.color) : -1)
    cols.soul.push(typeof c.soul === 'number' ? c.soul : null)
    cols.effect.push(effectIndexMap.has(c.effect || '') ? effectIndexMap.get(c.effect || '') : -1)
    cols.tsc.push(c.trigger_soul_count || 0)
    cols.rarity.push(c.rarity && rarityIndexMap.has(c.rarity) ? rarityIndexMap.get(c.rarity) : -1)
    cols.baseId.push(c.baseId === c.id ? '' : c.baseId || '')
    cols.prefix.push(
      c.cardIdPrefix && prefixIndexMap.has(c.cardIdPrefix) ? prefixIndexMap.get(c.cardIdPrefix) : -1
    )
    cols.isLowest.push(c.isLowestRarity ? 1 : 0)
    cols.link.push(c.link && c.link.length > 0 ? c.link : null)
    cols.parallel.push(c.parallelCards && c.parallelCards.length > 0 ? c.parallelCards : null)
  })

  return cols
}

const processGameData = async (game, rawFiles) => {
  console.log(`\n🚀 Processing ${game.toUpperCase()} data...`)
  const manifestFile = path.join(OUTPUT_DIR, `card-db-manifest-${game}.json`)

  const { cards, filterOptions } = processRawCardData(rawFiles)
  console.log(`     - Processed a total of ${cards.length} cards.`)

  // 計算卡片資料的 hash
  const cardDataContent = JSON.stringify(cards) + BUILD_LOGIC_VERSION
  const hash = crypto.createHash('sha256').update(cardDataContent).digest('hex').substring(0, 8)
  const version = `v${hash}`

  console.log(`     - Data Hash: ${hash}`)

  // 檢測內容變化，並判斷是否需要重新產生檔案
  try {
    const nowManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
    if (version === nowManifest.version) {
      console.log('⏭️ The content has not changed, skip...')
      return
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    console.log('⚒️ Manifest file not found, start creating files...')
  }

  const indexFiles = await buildAndSaveSearchIndex(game, cards, hash)

  console.log('     - Building value maps and transforming to columnar structure...')
  const valueMaps = buildValueMaps(cards)
  const cols = transformToColumnarStructure(cards, valueMaps, filterOptions)

  const output = {
    filterOptions,
    valueMaps,
    cols,
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
  await processGameData('ws', rawFilesByGame.ws)
  await processGameData('wsr', rawFilesByGame.wsr)
  await processGameData('wsc', rawFilesByGame.wsc)

  console.log('✨ Done!')
})()
