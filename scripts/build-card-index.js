import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import zlib from 'zlib'
import { Document } from 'flexsearch'
import { seriesMap } from '../src/maps/series-map.js'
import { normalizeSearchText } from '../src/utils/searchNormalize.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CARD_DATA_DIR = path.join(__dirname, '../src/assets/card-data')
const OUTPUT_DIR = path.join(__dirname, '../public')

// 腳本邏輯版本
const BUILD_LOGIC_VERSION = 'v7'
const CHUNK_SIZE = 512 * 1024 // 512 KB
const NON_LOWEST_RARITIES = new Set(['AGR'])

const COLOR_MAP = ['紫色', '红色', '绿色', '蓝色', '黄色']
const TYPE_MAP = ['事件卡', '角色卡', '高潮卡']
const COLOR_INDEX_MAP = new Map(COLOR_MAP.map((c, i) => [c, i]))
const TYPE_INDEX_MAP = new Map(TYPE_MAP.map((t, i) => [t, i]))

const createIndexMap = (arr) => new Map(arr.map((item, idx) => [item, idx]))
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 判斷是否為最低罕貴度版本
 */
const isLowestRarityCard = (cardVersion, minIdLength) => {
  if (NON_LOWEST_RARITIES.has(cardVersion.rarity)) return false
  const id = cardVersion.id || ''
  const lastChar = id.slice(-1)
  if (lastChar >= 'A' && lastChar <= 'Z') return false
  return id.length === minIdLength
}

/**
 * 在 Map 中建立雙向無向邊關聯
 */
const addBidirectionalLink = (map, a, b) => {
  let sa = map.get(a)
  if (!sa) map.set(a, (sa = new Set()))
  sa.add(b)

  let sb = map.get(b)
  if (!sb) map.set(b, (sb = new Set()))
  sb.add(a)
}

console.log('🔍 Starting to build card index...')

// --- FlexSearch 配置與生成函式 ---
const createIndexConfig = () => ({
  tokenize: 'forward',
  encoder: {
    split: '',
    encode: normalizeSearchText,
  },
  document: {
    id: 'index',
    index: ['name', 'effect', 'id'],
  },
})

/**
 * 建立並儲存 FlexSearch 索引檔案
 * @param {string} game - 遊戲代號 (ws/wsr/wsc)
 * @param {Array} cards - 卡片資料陣列
 * @param {string} hash - 資料版本 hash
 * @returns {Promise<Object>} - 回傳索引檔案對照表 { field: filename }
 */
const buildAndSaveSearchIndex = async (game, cards, hash) => {
  console.log(`     - Building FlexSearch index for ${cards.length} cards...`)
  const index = new Document(createIndexConfig())

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx]
    index.add({
      index: idx,
      name: card.name || '',
      effect: card.effect || '',
      id: card.id || '',
    })
  }

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

// 建立 prefix -> game 對應表
const prefixToGameMap = new Map()
for (const series of Object.values(seriesMap)) {
  if (Array.isArray(series.prefixes)) {
    for (const prefix of series.prefixes) {
      prefixToGameMap.set(prefix.toLowerCase(), series.game)
    }
  }
}

// 讀取所有 JSON 檔案並依遊戲分組
const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))
console.log(`📁 Found ${files.length} card data files.`)

const rawFilesByGame = {
  ws: [],
  wsr: [],
  wsc: [],
}

for (const filename of files) {
  const filePath = path.join(CARD_DATA_DIR, filename)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const cardIdPrefix = filename.replace('.json', '')
  const prefix = filename.split('-')[0].toLowerCase()
  const game = prefixToGameMap.get(prefix) || 'ws'

  if (!rawFilesByGame[game]) {
    rawFilesByGame[game] = []
  }

  rawFilesByGame[game].push({ content, cardIdPrefix, prefix })
}

/**
 * 處理單一遊戲的 rawFiles（建立連結、平行卡、統計篩選選項並展開卡片）
 * @param {Array<{content: Object, cardIdPrefix: string, prefix: string}>} rawFiles
 * @param {string} game
 * @returns {{ cards: Array<Object>, filterOptions: Object }}
 */
const processRawCardData = (rawFiles, game) => {
  const fetchedCards = []
  const productNamesSet = new Set()
  const traitsSet = new Set()
  const raritiesSet = new Set()
  const soulsSet = new Set()
  const levelsSet = new Set()
  const costsSet = new Set()
  const powersSet = new Set()

  // 1. 建立基礎索引 (baseId -> 所有 card.id, prefix -> baseCards)
  const baseIdToAllIds = new Map()
  const baseCards = []
  const prefixToBaseCards = new Map()

  for (const file of rawFiles) {
    for (const baseId in file.content) {
      const cardData = file.content[baseId]
      const allCards = cardData.all_cards || []
      const ids = allCards.map((c) => c.id)

      baseIdToAllIds.set(baseId, ids)
      const baseCard = { baseId, cardData, cardIdPrefix: file.cardIdPrefix }
      baseCards.push(baseCard)

      let pList = prefixToBaseCards.get(file.prefix)
      if (!pList) prefixToBaseCards.set(file.prefix, (pList = []))
      pList.push(baseCard)
    }
  }

  // 2. 根據 seriesMap 各系列 prefixes 在系列內建立雙向連結
  const baseLinks = new Map()
  const targetSeriesList = Object.values(seriesMap).filter(
    (s) => s.game === game && Array.isArray(s.prefixes)
  )

  for (const series of targetSeriesList) {
    const seriesBaseCards = series.prefixes.flatMap(
      (p) => prefixToBaseCards.get(p.toLowerCase()) || []
    )
    if (seriesBaseCards.length === 0) continue

    const seriesNameToBaseIds = new Map()
    for (const { baseId, cardData } of seriesBaseCards) {
      if (cardData.name) {
        let s = seriesNameToBaseIds.get(cardData.name)
        if (!s) seriesNameToBaseIds.set(cardData.name, (s = new Set()))
        s.add(baseId)
      }
    }
    if (seriesNameToBaseIds.size === 0) continue

    const namesPattern = [...seriesNameToBaseIds.keys()].map(escapeRegex).join('|')
    const nameMatcherRegex = new RegExp(`[「｢](${namesPattern})[」｣]`, 'g')

    for (const { baseId, cardData } of seriesBaseCards) {
      const effectText = cardData.effect || ''
      if (!effectText) continue

      const matches = effectText.matchAll(nameMatcherRegex)
      for (const match of matches) {
        const foundName = match[1]
        const sourceBaseIds = seriesNameToBaseIds.get(foundName)
        if (sourceBaseIds) {
          for (const sourceBaseId of sourceBaseIds) {
            addBidirectionalLink(baseLinks, baseId, sourceBaseId)
          }
        }
      }
    }
  }

  // 3. 展開卡片版本並直接注入 link 與 parallelCards
  for (const { baseId, cardData, cardIdPrefix } of baseCards) {
    if (cardData.product_name) productNamesSet.add(cardData.product_name)
    if (Array.isArray(cardData.trait)) {
      for (const t of cardData.trait) traitsSet.add(t)
    }

    const levelValue = cardData.level === '-' ? 0 : cardData.level
    if (typeof levelValue === 'number') levelsSet.add(levelValue)

    const costValue = cardData.cost === '-' ? 0 : cardData.cost
    if (typeof costValue === 'number') costsSet.add(costValue)

    if (typeof cardData.power === 'number') powersSet.add(cardData.power)

    const soulValue = cardData.soul === '-' ? 0 : cardData.soul
    if (typeof soulValue === 'number') soulsSet.add(soulValue)

    const allCards = cardData.all_cards
    if (Array.isArray(allCards) && allCards.length > 0) {
      let minIdLength = Infinity
      for (let i = 0; i < allCards.length; i++) {
        const len = allCards[i].id ? allCards[i].id.length : 0
        if (len < minIdLength) minIdLength = len
      }
      if (minIdLength === Infinity) minIdLength = 0

      const isLowestList = new Array(allCards.length)
      const highRarityCardIds = []
      const lowestRarityCardIds = []

      for (let i = 0; i < allCards.length; i++) {
        const cv = allCards[i]
        const isLowest = isLowestRarityCard(cv, minIdLength)
        isLowestList[i] = isLowest
        if (isLowest) {
          lowestRarityCardIds.push(cv.id)
        } else {
          highRarityCardIds.push(cv.id)
        }
      }

      const linkedBaseIds = baseLinks.get(baseId)
      const fullLinkedIds = linkedBaseIds
        ? [...linkedBaseIds].flatMap((bId) => baseIdToAllIds.get(bId) || [])
        : []

      const { all_cards: _ignored, ...baseCardData } = cardData

      for (let i = 0; i < allCards.length; i++) {
        const cardVersion = allCards[i]
        if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)
        const isLowest = isLowestList[i]

        fetchedCards.push({
          ...baseCardData,
          ...cardVersion,
          baseId,
          cardIdPrefix,
          isLowestRarity: isLowest,
          link: fullLinkedIds,
          parallelCards: isLowest ? highRarityCardIds : lowestRarityCardIds,
        })
      }
    }
  }

  const filterOptions = {
    productNames: [...productNamesSet],
    traits: [...traitsSet],
    rarities: [...raritiesSet].sort(),
    souls: [...soulsSet].sort((a, b) => a - b),
    levels: [...levelsSet].sort((a, b) => a - b),
    costs: [...costsSet].sort((a, b) => a - b),
    powers: [...powersSet].sort((a, b) => a - b),
  }

  return { cards: fetchedCards, filterOptions }
}

/**
 * 建立字串池與字典表
 * @param {Array<Object>} cards
 * @returns {Object} valueMaps
 */
const buildValueMaps = (cards) => {
  const prefixSet = new Set()
  const effectSet = new Set()

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    if (c.cardIdPrefix) prefixSet.add(c.cardIdPrefix)
    effectSet.add(c.effect || '')
  }

  return {
    colorMap: COLOR_MAP,
    typeMap: TYPE_MAP,
    prefixes: [...prefixSet].sort(),
    effects: [...effectSet],
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
  const { prefixes, effects } = valueMaps
  const { productNames, traits, rarities } = filterOptions

  const prefixIndexMap = createIndexMap(prefixes)
  const effectIndexMap = createIndexMap(effects)
  const prodIndexMap = createIndexMap(productNames)
  const traitIndexMap = createIndexMap(traits)
  const rarityIndexMap = createIndexMap(rarities)

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

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    cols.id.push(c.id || '')
    cols.name.push(c.name || '')
    cols.prod.push(prodIndexMap.get(c.product_name) ?? -1)
    cols.type.push(TYPE_INDEX_MAP.get(c.type) ?? -1)
    cols.level.push(typeof c.level === 'number' ? c.level : null)
    cols.power.push(typeof c.power === 'number' ? c.power / 500 : null)
    cols.cost.push(typeof c.cost === 'number' ? c.cost : null)
    cols.trait.push(
      Array.isArray(c.trait)
        ? c.trait.map((t) => traitIndexMap.get(t)).filter((idx) => idx !== undefined)
        : null
    )
    cols.color.push(COLOR_INDEX_MAP.get(c.color) ?? -1)
    cols.soul.push(typeof c.soul === 'number' ? c.soul : null)
    cols.effect.push(effectIndexMap.get(c.effect || '') ?? -1)
    cols.tsc.push(c.trigger_soul_count || 0)
    cols.rarity.push(rarityIndexMap.get(c.rarity) ?? -1)
    cols.baseId.push(c.baseId === c.id ? '' : c.baseId || '')
    cols.prefix.push(prefixIndexMap.get(c.cardIdPrefix) ?? -1)
    cols.isLowest.push(c.isLowestRarity ? 1 : 0)
    cols.link.push(c.link && c.link.length > 0 ? c.link : null)
    cols.parallel.push(c.parallelCards && c.parallelCards.length > 0 ? c.parallelCards : null)
  }

  return cols
}

const processGameData = async (game, rawFiles) => {
  console.log(`\n🚀 Processing ${game.toUpperCase()} data...`)
  const manifestFile = path.join(OUTPUT_DIR, `card-db-manifest-${game}.json`)

  const { cards, filterOptions } = processRawCardData(rawFiles, game)
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
    indexFiles,
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
