import fs from 'fs'
import path from 'path'
import process from 'process'

/**
 * Default realistic browser headers to perfectly emulate browser requests
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0'

/**
 * Normalizes session cookie token to ensure valid JSESSIONID header formatting
 * @param {string} cookie
 * @returns {string}
 */
export const normalizeCookie = (cookie) => {
  if (!cookie || typeof cookie !== 'string') return ''
  const trimmed = cookie.trim()
  if (!trimmed) return ''
  if (!trimmed.includes('=')) {
    return `JSESSIONID=${trimmed}`
  }
  return trimmed
}

/**
 * Checks if a share_id is empty, uninitialized, or unset ("0", "", null, undefined, or whitespace)
 * @param {any} shareId
 * @returns {boolean}
 */
export const isShareIdEmpty = (shareId) => {
  if (shareId === null || shareId === undefined) return true
  if (typeof shareId === 'number') return shareId === 0
  if (typeof shareId !== 'string') return true
  const trimmed = shareId.trim()
  return trimmed === '' || trimmed === '0'
}

/**
 * Cleans API key by removing accidental prefixes or whitespace
 * @param {string} apiKey
 * @returns {string}
 */
export const sanitizeApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') return ''
  return apiKey
    .trim()
    .replace(/^(?:;?\s*api_key\s*=\s*)/i, '')
    .trim()
}

/**
 * Sanitizes a shared ID string by removing URL prefixes, query parameters, matrix parameters, and trailing slashes
 * @param {string|number|null|undefined} shareId
 * @returns {string}
 */
export const sanitizeSharedId = (shareId) => {
  if (shareId === null || shareId === undefined) return ''
  const str = String(shareId).trim()
  if (!str || str === '0') return ''
  const withoutParams = str.split(/[;?#]/)[0].trim()
  const cleaned = withoutParams
    .replace(/^(?:https?:\/\/[^/]+)?(?:\/v2\/api\/share\/public\/|\/public\/|\/share\/|\/)/i, '')
    .replace(/\/+$/, '')
    .trim()
  return cleaned === '0' ? '' : cleaned
}

/**
 * Extracts and sanitizes shared_id from Location header or response data
 * @param {string|null|undefined} locationHeader
 * @param {any} [responseData]
 * @returns {string}
 */
export const extractSharedId = (locationHeader, responseData) => {
  if (locationHeader && typeof locationHeader === 'string') {
    const withoutParams = locationHeader.split(/[;?#]/)[0].trim()
    const match = withoutParams.match(/(?:public\/|share\/|\/)?([a-zA-Z0-9_-]+)\/?$/i)
    if (
      match &&
      match[1] &&
      !['public', 'share', 'private', 'api', 'v2'].includes(match[1].toLowerCase())
    ) {
      const id = sanitizeSharedId(match[1])
      if (id) return id
    }
  }

  if (responseData && typeof responseData === 'object') {
    const targetObj = responseData.data || responseData.share || responseData.result || responseData
    const rawId =
      targetObj.shared_id ||
      targetObj.share_id ||
      targetObj.id ||
      targetObj.sharedId ||
      responseData.shared_id ||
      responseData.share_id ||
      responseData.id ||
      responseData.sharedId
    if (rawId !== undefined && rawId !== null) {
      const id = sanitizeSharedId(rawId)
      if (id) return id
    }
  }

  return ''
}

/**
 * Builds standard browser request headers for TeraCloud Web API
 * @param {string} host
 * @param {string} cookie
 * @param {string} [userAgent]
 * @returns {Record<string, string>}
 */
export const buildBrowserHeaders = (host, cookie, userAgent = DEFAULT_USER_AGENT) => {
  const normalizedCookie = normalizeCookie(cookie)
  const headers = {
    'Host': host,
    'User-Agent': userAgent,
    'Accept': 'application/json',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': `https://${host}/browser/`,
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-GPC': '1',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Connection': 'keep-alive',
  }

  if (normalizedCookie) {
    headers.Cookie = normalizedCookie
  }

  return headers
}

/**
 * Generates human-like randomized jitter delay
 * @param {number} minMs
 * @param {number} maxMs
 * @returns {Promise<void>}
 */
export const sleepWithJitter = (minMs, maxMs) => {
  const delay = Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Internal helper to execute HTTP requests with exponential backoff and jitter on 429/5xx or network failures
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {object} [config]
 * @param {number} [config.maxRetries=3]
 * @param {number} [config.baseBackoffMs=2000]
 * @param {number} [config.maxBackoffMs=30000]
 * @param {boolean} [config.logRetries=true]
 * @returns {Promise<Response>}
 */
export const fetchWithRetry = async (
  url,
  options = {},
  { maxRetries = 3, baseBackoffMs = 2000, maxBackoffMs = 30000, logRetries = true } = {}
) => {
  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options)
      const statusCode = response.status

      // 429 Too Many Requests or 5xx Server Error are retryable
      if (statusCode === 429 || statusCode >= 500) {
        attempt++
        if (attempt <= maxRetries) {
          const retryAfter = response.headers.get('retry-after')
          const jitter = Math.random() * Math.min(1000, baseBackoffMs)
          let backoff = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempt) + jitter)
          if (retryAfter) {
            const retrySec = Number.parseInt(retryAfter, 10)
            if (!Number.isNaN(retrySec) && retrySec > 0) {
              backoff = Math.max(backoff, retrySec * 1000 + 500)
            }
          }

          if (logRetries) {
            const endpoint = url.split(';')[0]
            console.warn(
              `⚠️ 遭遇狀態碼 ${statusCode} (${options.method || 'GET'} ${endpoint})，將在 ${(backoff / 1000).toFixed(1)} 秒後進行第 ${attempt}/${maxRetries} 次重試...`
            )
          }
          await new Promise((r) => setTimeout(r, backoff))
          continue
        }
      }

      return response
    } catch (err) {
      attempt++
      if (attempt <= maxRetries) {
        const jitter = Math.random() * Math.min(1000, baseBackoffMs)
        const backoff = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempt) + jitter)
        if (logRetries) {
          console.warn(
            `⚠️ 網路請求異常 (${err.message})，將在 ${(backoff / 1000).toFixed(1)} 秒後重試 (${attempt}/${maxRetries})...`
          )
        }
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      throw err
    }
  }
  throw new Error(`已達最大重試次數 (${maxRetries})`)
}

/**
 * Requests private share from TeraCloud API for a specific file with full lifecycle:
 * 1. Query existing share (GET)
 * 2. If 404, automatically create share (POST) -> 201 Created with Location /public/<shared_id>
 * 3. Activate public share (PATCH) -> 200/204
 * 4. Retrieve complete metadata (GET)
 *
 * @param {object} params
 * @param {string} params.fileName - File name (e.g. "[cn]gfq-sz12.zip")
 * @param {string} params.apiKey - TeraCloud API Key
 * @param {string} [params.cookie] - TeraCloud session cookie
 * @param {string} [params.host] - TeraCloud Host
 * @param {string} [params.userAgent] - Browser User-Agent
 * @param {number} [params.maxRetries] - Max retry count
 * @returns {Promise<{ success: boolean, sharedId?: string, fileName?: string, raw?: any, error?: string, statusCode?: number }>}
 */
export const fetchTeraCloudPrivateShare = async ({
  fileName,
  apiKey,
  cookie = '',
  host = 'seto.teracloud.jp',
  userAgent = DEFAULT_USER_AGENT,
  maxRetries = 3,
}) => {
  if (!fileName) {
    return { success: false, error: '檔案名稱不能為空' }
  }

  const cleanApiKey = sanitizeApiKey(apiKey)
  if (!cleanApiKey) {
    return { success: false, error: '缺少 TeraCloud API Key' }
  }

  const cleanFileName = path.basename(fileName.trim())
  const encodedFileName = encodeURIComponent(cleanFileName)
  const privateUrl = `https://${host}/v2/api/share/private/${encodedFileName};api_key=${cleanApiKey}`
  const baseHeaders = buildBrowserHeaders(host, cookie, userAgent)
  const retryOpts = { maxRetries }

  try {
    // ------------------------------------------------------------------
    // Step 1: Query existing share (GET /v2/api/share/private/<fileName>)
    // ------------------------------------------------------------------
    const getRes = await fetchWithRetry(
      privateUrl,
      { method: 'GET', headers: baseHeaders },
      retryOpts
    )

    let sharedId = ''

    if (getRes.status === 200) {
      const data = await getRes.json().catch(() => ({}))

      if (
        data.exists === false ||
        data.exists === 'false' ||
        data.exists === 0 ||
        data.exists === '0'
      ) {
        return {
          success: false,
          statusCode: 200,
          raw: data,
          error: `檔案在 TeraCloud 上標記為不存在 (exists: false): "${cleanFileName}"`,
        }
      }

      if (data.delete_flag === 1 || data.delete_flag === '1') {
        return {
          success: false,
          statusCode: 200,
          raw: data,
          error: `檔案在 TeraCloud 上已被刪除 (delete_flag: 1): "${cleanFileName}"`,
        }
      }

      sharedId = extractSharedId(null, data)

      // If share already exists and is active (active_state === 1 or not explicitly 0/'0'/false)
      const isExplicitlyInactive =
        data.active_state === 0 ||
        data.active_state === '0' ||
        data.active_state === false ||
        data.active_state === 'false'

      if (sharedId && !isExplicitlyInactive) {
        return {
          success: true,
          statusCode: 200,
          sharedId,
          fileName: data.file_name || cleanFileName,
          raw: data,
        }
      }

      // If sharedId exists but is inactive, proceed to Step 3 to activate it
    } else if (getRes.status === 401) {
      return {
        success: false,
        statusCode: 401,
        error:
          '401 未授權: API Key 或 Session Cookie (JSESSIONID) 已失效或無效。請確認 --cookie 與 --api-key 參數。',
      }
    } else if (getRes.status === 403) {
      return {
        success: false,
        statusCode: 403,
        error: '403 禁止存取: 權限不足，請檢查 API Key 或帳號權限。',
      }
    } else if (getRes.status !== 404) {
      const errText = await getRes.text().catch(() => '')
      return {
        success: false,
        statusCode: getRes.status,
        error: `HTTP ${getRes.status}: ${errText || getRes.statusText}`,
      }
    }

    // ------------------------------------------------------------------
    // Step 2: If share does not exist (404), create it via POST
    // ------------------------------------------------------------------
    if (!sharedId) {
      const postRes = await fetchWithRetry(
        privateUrl,
        { method: 'POST', headers: baseHeaders },
        retryOpts
      )

      if (
        postRes.status === 201 ||
        postRes.status === 200 ||
        postRes.status === 204 ||
        postRes.status === 303
      ) {
        const locationHeader = postRes.headers.get('location')
        let postData = {}
        if (postRes.status !== 204) {
          postData = await postRes.json().catch(() => ({}))
        }
        sharedId = extractSharedId(locationHeader, postData)

        if (!sharedId) {
          return {
            success: false,
            statusCode: postRes.status,
            error: `建立分享成功 (HTTP ${postRes.status})，但未從 Location 標頭 (${locationHeader}) 或回應中解析出有效的 shared_id`,
          }
        }
      } else if (postRes.status === 401) {
        return {
          success: false,
          statusCode: 401,
          error:
            '401 未授權: API Key 或 Session Cookie (JSESSIONID) 已失效或無效。請確認 --cookie 與 --api-key 參數。',
        }
      } else if (postRes.status === 403) {
        return {
          success: false,
          statusCode: 403,
          error: '403 禁止存取: 權限不足，請檢查 API Key 或帳號權限。',
        }
      } else if (postRes.status === 404) {
        return {
          success: false,
          statusCode: 404,
          error: `404 檔案不存在: TeraCloud 儲存區找不到檔案 "${cleanFileName}"，無法建立分享。請確認檔案已上傳至 WebDAV 根目錄。`,
        }
      } else {
        const errText = await postRes.text().catch(() => '')
        return {
          success: false,
          statusCode: postRes.status,
          error: `建立分享失敗 (HTTP ${postRes.status}): ${errText || postRes.statusText}`,
        }
      }
    }

    // ------------------------------------------------------------------
    // Step 3: Activate public share (PATCH /v2/api/share/public/<shared_id>)
    // ------------------------------------------------------------------
    const patchUrl = `https://${host}/v2/api/share/public/${encodeURIComponent(sharedId)};api_key=${cleanApiKey}`
    const patchHeaders = {
      ...baseHeaders,
      'Content-Type': 'application/json',
    }
    const patchBody = JSON.stringify({
      shared_id: sharedId,
      permission: 1,
      active_state: 1,
      acl_type: 0,
      keyword: '',
      description: '',
    })

    const patchRes = await fetchWithRetry(
      patchUrl,
      {
        method: 'PATCH',
        headers: patchHeaders,
        body: patchBody,
      },
      retryOpts
    )

    if (patchRes.status !== 200 && patchRes.status !== 201 && patchRes.status !== 204) {
      if (patchRes.status === 401) {
        return {
          success: false,
          statusCode: 401,
          error:
            '401 未授權: API Key 或 Session Cookie (JSESSIONID) 已失效或無效。請確認 --cookie 與 --api-key 參數。',
        }
      }
      if (patchRes.status === 403) {
        return {
          success: false,
          statusCode: 403,
          error: '403 禁止存取: 啟用分享權限不足，請檢查 API Key 或帳號權限。',
        }
      }
      const errText = await patchRes.text().catch(() => '')
      return {
        success: false,
        statusCode: patchRes.status,
        error: `啟用分享失敗 (HTTP ${patchRes.status}): ${errText || patchRes.statusText}`,
      }
    }

    // ------------------------------------------------------------------
    // Step 4: Follow-up GET to retrieve full metadata (ContentLength, LastModified, etc.)
    // ------------------------------------------------------------------
    const finalGetRes = await fetchWithRetry(
      privateUrl,
      { method: 'GET', headers: baseHeaders },
      retryOpts
    )

    if (finalGetRes.status === 200) {
      const finalData = await finalGetRes.json().catch(() => ({}))
      return {
        success: true,
        statusCode: 200,
        sharedId,
        fileName: finalData.file_name || cleanFileName,
        raw: finalData,
      }
    }

    // Fallback if final GET returns non-200 but creation & activation succeeded
    return {
      success: true,
      statusCode: 200,
      sharedId,
      fileName: cleanFileName,
      raw: {
        shared_id: sharedId,
        file_name: cleanFileName,
        active_state: 1,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: `網路連線或請求失敗: ${err.message}`,
    }
  }
}

/**
 * Safely writes JSON data to a file using an atomic replace technique with Windows fallback
 * @param {string} filePath
 * @param {any} data
 */
export const safeWriteJsonFile = (filePath, data) => {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`
  const content = JSON.stringify(data, null, 2)
  fs.writeFileSync(tempPath, content, 'utf-8')
  try {
    fs.renameSync(tempPath, filePath)
  } catch (err) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {
      throw err
    }
  }
}

/**
 * Parses CLI arguments and environment variables supporting both space and equals syntax
 * @returns {object}
 */
export const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    apiKey: sanitizeApiKey(process.env.TERACLOUD_API_KEY || ''),
    cookie: normalizeCookie(process.env.TERACLOUD_COOKIE || process.env.JSESSIONID || ''),
    host: process.env.TERACLOUD_HOST || 'seto.teracloud.jp',
    manifest: path.resolve('./public/card-images-manifest.json'),
    force: false,
    dryRun: false,
    filterFolder: null,
    singleFile: null,
    delayMin: 800,
    delayMax: 1600,
    maxRetries: 3,
    userAgent: process.env.TERACLOUD_USER_AGENT || DEFAULT_USER_AGENT,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    let key = arg
    let val = undefined

    if (arg.includes('=')) {
      const splitIdx = arg.indexOf('=')
      key = arg.slice(0, splitIdx)
      val = arg.slice(splitIdx + 1)
    }

    const getNextVal = () => {
      if (val !== undefined) return val
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        return args[++i]
      }
      return ''
    }

    if (key === '--api-key' || key === '-k') {
      options.apiKey = sanitizeApiKey(getNextVal())
    } else if (key === '--cookie' || key === '-c' || key === '--session') {
      options.cookie = normalizeCookie(getNextVal())
    } else if (key === '--host') {
      options.host = getNextVal() || options.host
    } else if (key === '--manifest' || key === '-m') {
      const p = getNextVal()
      if (p) options.manifest = path.resolve(p)
    } else if (key === '--force') {
      options.force = true
    } else if (key === '--dry-run') {
      options.dryRun = true
    } else if (key === '--folder' || key === '-f') {
      const folderList = getNextVal()
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      options.filterFolder = new Set(folderList)
    } else if (key === '--single') {
      options.singleFile = getNextVal() || null
    } else if (key === '--delay') {
      const d = Number.parseInt(getNextVal(), 10)
      if (!Number.isNaN(d) && d >= 0) {
        options.delayMin = d
        options.delayMax = Math.max(d, options.delayMax)
      }
    } else if (key === '--delay-min') {
      const d = Number.parseInt(getNextVal(), 10)
      if (!Number.isNaN(d) && d >= 0) options.delayMin = d
    } else if (key === '--delay-max') {
      const d = Number.parseInt(getNextVal(), 10)
      if (!Number.isNaN(d) && d >= 0) options.delayMax = d
    } else if (key === '--retries') {
      const r = Number.parseInt(getNextVal(), 10)
      if (!Number.isNaN(r) && r >= 0) options.maxRetries = r
    } else if (key === '--user-agent') {
      options.userAgent = getNextVal() || options.userAgent
    } else if (key === '--help' || key === '-h') {
      options.help = true
    }
  }

  return options
}

/**
 * Prints CLI usage instructions
 */
const printHelp = () => {
  console.log(`
📦 TeraCloud 分享連結自動生成與同步工具 (sync-teracloud-shares.js)

使用方式:
  node scripts/sync-teracloud-shares.js --api-key <KEY> [選項]

選項:
  -k, --api-key <KEY>     TeraCloud API Key (亦可設定 TERACLOUD_API_KEY 環境變數)
  -c, --cookie <COOKIE>   Session Cookie (JSESSIONID=...，亦可設定 TERACLOUD_COOKIE 環境變數)
  --host <HOST>           TeraCloud 主機名稱 (預設: seto.teracloud.jp)
  -m, --manifest <PATH>   manifest 檔案路徑 (預設: ./public/card-images-manifest.json)
  -f, --folder <FOLDERS>  指定要更新的子目錄/包名稱 (多個以逗號隔開)
  --single <FILENAME>     直接對單一檔案查詢/建立分享 (如 "[cn]gfq-sz12.zip")
  --force                 強制重新獲取 share_id (即使 manifest 中已存在)
  --dry-run               模擬執行，不實際寫入 manifest 檔案
  --delay-min <MS>        請求間隨機延遲最小值 (毫秒，預設: 800)
  --delay-max <MS>        請求間隨機延遲最大值 (毫秒，預設: 1600)
  --retries <COUNT>       遇到 429/網路錯誤時的最大重試次數 (預設: 3)
  -h, --help              顯示此幫助訊息

範例:
  1. 針對所有尚未填入 share_id (為空或 '0') 的包自動獲取並更新:
     node scripts/sync-teracloud-shares.js --api-key d7a4e811... --cookie 1na6d5j...

  2. 指定特定子目錄包並強制更新:
     node scripts/sync-teracloud-shares.js -k d7a4... -c 1na6... -f [cn]gfq-sz12,5hy-w101 --force

  3. 快速測試單一檔案分享:
     node scripts/sync-teracloud-shares.js -k d7a4... -c 1na6... --single [cn]gfq-sz12.zip
`)
}

/**
 * Synchronizes TeraCloud shares into the manifest file
 * @param {object} options
 */
export const syncTeraCloudShares = async (options = {}) => {
  const {
    apiKey,
    cookie,
    host = 'seto.teracloud.jp',
    manifest: manifestPath = path.resolve('./public/card-images-manifest.json'),
    force = false,
    dryRun = false,
    filterFolder = null,
    delayMin = 800,
    delayMax = 1600,
    maxRetries = 3,
    userAgent = DEFAULT_USER_AGENT,
  } = options

  if (!apiKey) {
    console.error('❌ 錯誤: 必須提供 --api-key 參數或設定 TERACLOUD_API_KEY 環境變數。')
    console.error('使用 --help 檢視完整用法說明。')
    return { success: false, updatedCount: 0, failedCount: 0 }
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ 錯誤: 找不到 manifest 檔案: ${manifestPath}`)
    return { success: false, updatedCount: 0, failedCount: 0 }
  }

  let manifestData
  try {
    manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch (err) {
    console.error(`❌ 解析 manifest 失敗: ${err.message}`)
    return { success: false, updatedCount: 0, failedCount: 0 }
  }

  const packages = manifestData.packages || manifestData.folders || manifestData.series || {}
  const allFolderKeys = Object.keys(packages).sort()

  // Determine target folders: automatically scan all empty/unshared packages (or force all if --force)
  let targetFolders = []
  if (filterFolder) {
    for (const f of filterFolder) {
      const cleanF = f.replace(/\.zip$/i, '')
      const matchedKey =
        allFolderKeys.find(
          (k) => k.toLowerCase() === f.toLowerCase() || k.toLowerCase() === cleanF.toLowerCase()
        ) || cleanF
      const entry = packages[matchedKey]
      const empty = isShareIdEmpty(entry?.share_id)
      if (force || empty) {
        targetFolders.push(matchedKey)
      }
    }
  } else {
    targetFolders = allFolderKeys.filter((folder) => {
      const entry = packages[folder]
      return force || isShareIdEmpty(entry?.share_id)
    })
  }

  console.log('====================================================')
  console.log('🌐 TeraCloud 分享連結 (share_id) 自動同步工具')
  console.log(`📁 Manifest 路徑: ${manifestPath}`)
  console.log(`📡 主機名稱: ${host}`)
  console.log(`🔑 API Key: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`)
  console.log(
    `🍪 Cookie: ${cookie ? '已設定 (JSESSIONID)' : '⚠️ 未設定 (部分 API 端點可能要求驗證)'}`
  )
  console.log(`🎯 總包數: ${allFolderKeys.length} | 待處理: ${targetFolders.length}`)
  if (force) console.log('⚡ 已啟用 --force (強制重新獲取所有指定的 share_id)')
  if (dryRun) console.log('🔍 已啟用 --dry-run (僅模擬，不修改 manifest 檔案)')
  console.log('====================================================\n')

  if (targetFolders.length === 0) {
    console.log('✨ 沒有需要更新 share_id 的分包項目！')
    if (filterFolder && !force) {
      console.log('💡 若要強制重新獲取已存在 share_id 的子目錄，請加上 --force 參數。')
    }
    return { success: true, updatedCount: 0, failedCount: 0 }
  }

  let updatedCount = 0
  let failedCount = 0
  const failedFolders = []

  for (let i = 0; i < targetFolders.length; i++) {
    const folder = targetFolders[i]
    const fileName = `${folder}.zip`
    const progress = `[${i + 1}/${targetFolders.length}]`

    console.log(`${progress} 🚀 正在請求/建立分享 [${folder}] (${fileName})...`)

    const result = await fetchTeraCloudPrivateShare({
      fileName,
      apiKey,
      cookie,
      host,
      userAgent,
      maxRetries,
    })

    if (result.success && result.sharedId) {
      updatedCount++
      console.log(`  └─ ✅ 成功獲取 share_id: ${result.sharedId}`)

      if (!dryRun) {
        if (!manifestData.packages) {
          manifestData.packages = {}
        }
        const rawSize = Number(
          result.raw?.ContentLength ||
            result.raw?.size ||
            result.raw?.file_size ||
            result.raw?.content_length ||
            0
        )
        if (!manifestData.packages[folder]) {
          manifestData.packages[folder] = {
            share_id: result.sharedId,
            size: rawSize,
            sha256: '',
            source_hash: '',
            card_count: 0,
            updated_at: Math.floor(Date.now() / 1000),
          }
        } else {
          manifestData.packages[folder].share_id = result.sharedId
          manifestData.packages[folder].updated_at = Math.floor(Date.now() / 1000)
          if (rawSize > 0 && !manifestData.packages[folder].size) {
            manifestData.packages[folder].size = rawSize
          }
        }

        // Recalculate totals across all packages
        let totalImages = 0
        let totalSize = 0
        for (const pkg of Object.values(manifestData.packages)) {
          totalImages += (pkg.card_count || 0) * 2
          totalSize += pkg.size || 0
        }
        manifestData.total_packages = Object.keys(manifestData.packages).length
        manifestData.total_images = totalImages
        manifestData.total_size = totalSize
        if (manifestData.generated_at !== undefined) {
          manifestData.generated_at = Math.floor(Date.now() / 1000)
        }

        // Save progress after each successful share to ensure resiliency
        safeWriteJsonFile(manifestPath, manifestData)
      }
    } else {
      failedCount++
      failedFolders.push({ folder, error: result.error || '未知錯誤' })
      console.error(`  └─ ❌ 失敗: ${result.error || '無法獲取 share_id'}`)
    }

    // Human-like jitter delay between requests (except after the last one)
    if (i < targetFolders.length - 1) {
      await sleepWithJitter(delayMin, delayMax)
    }
  }

  console.log('\n====================================================')
  console.log('🎉 同步處理完成！')
  console.log(
    `📊 統計: 成功 ${updatedCount} 個, 失敗 ${failedCount} 個 (待處理共 ${targetFolders.length} 個)`
  )
  if (!dryRun) {
    console.log(`💾 Manifest 已更新並保存: ${manifestPath}`)
  } else {
    console.log(`🔍 Dry-run 模擬結束，未寫入檔案。`)
  }
  console.log('====================================================')

  if (failedFolders.length > 0) {
    console.log('\n⚠️  失敗清單：')
    for (const item of failedFolders) {
      console.log(`  • [${item.folder}]: ${item.error}`)
    }
    console.log('')
  }

  return {
    success: failedCount === 0,
    updatedCount,
    failedCount,
    failedFolders,
  }
}

/**
 * Main execution entrypoint
 */
const main = async () => {
  const options = parseArgs()

  if (options.help) {
    printHelp()
    return
  }

  // Handle single file mode
  if (options.singleFile) {
    let targetFile = options.singleFile
    console.log(`🔍 正在查詢/建立單一檔案分享: ${targetFile}`)
    let result = await fetchTeraCloudPrivateShare({
      fileName: targetFile,
      apiKey: options.apiKey,
      cookie: options.cookie,
      host: options.host,
      userAgent: options.userAgent,
      maxRetries: options.maxRetries,
    })

    // If 404 and targetFile doesn't have an extension, try appending .zip
    if (!result.success && result.statusCode === 404 && !targetFile.includes('.')) {
      console.log(`ℹ️  未找到 "${targetFile}"，嘗試查詢/建立 "${targetFile}.zip"...`)
      targetFile = `${targetFile}.zip`
      result = await fetchTeraCloudPrivateShare({
        fileName: targetFile,
        apiKey: options.apiKey,
        cookie: options.cookie,
        host: options.host,
        userAgent: options.userAgent,
        maxRetries: options.maxRetries,
      })
    }

    if (result.success) {
      console.log('✅ 分享建立成功！')
      console.log(`  • 檔案名稱: ${result.fileName}`)
      console.log(`  • shared_id: ${result.sharedId}`)
      console.log(`  • 完整資料:`, JSON.stringify(result.raw, null, 2))
    } else {
      console.error(`❌ 分享建立失敗: ${result.error}`)
      process.exit(1)
    }
    return
  }

  const result = await syncTeraCloudShares(options)
  if (!result.success && result.failedCount > 0 && result.updatedCount === 0) {
    process.exit(1)
  }
}

// Only execute CLI runner if executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith('sync-teracloud-shares.js') ||
    process.argv[1].endsWith('sync-teracloud-shares'))
) {
  main().catch((err) => {
    console.error('❌ 執行過程發生未預期錯誤:', err)
    process.exit(1)
  })
}
