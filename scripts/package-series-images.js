import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import process from 'process'
import os from 'os'
import { execSync } from 'child_process'

/**
 * Parses command line arguments
 * Example: node scripts/package-series-images.js --source E:\CF_R2 --output Z:\
 */
const parseArgs = () => {
  const args = process.argv.slice(2)
  const defaultSource = fs.existsSync('E:/CF_R2') ? 'E:/CF_R2' : './public'
  const defaultManifest = path.resolve('./public/card-images-manifest.json')
  const options = {
    source: defaultSource,
    output: 'Z:/',
    manifest: defaultManifest,
    force: false,
    filterFolder: null,
    statConcurrency: 64,
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

    if (key === '--source') {
      const s = getNextVal()
      if (s) options.source = s
    } else if (key === '--output') {
      const o = getNextVal()
      if (o) options.output = o
    } else if (key === '--manifest' || key === '-m') {
      const m = getNextVal()
      if (m) options.manifest = path.resolve(m)
    } else if (key === '--force') {
      options.force = true
    } else if (key === '--folder' || key === '-f') {
      const folderList = getNextVal()
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      options.filterFolder = new Set(folderList)
    } else if (key === '--concurrency') {
      const c = Number.parseInt(getNextVal(), 10)
      if (!Number.isNaN(c) && c > 0) options.statConcurrency = c
    }
  }

  return options
}

/**
 * Calculates SHA-256 hash of a file on local SSD using a stream to minimize memory usage
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const calculateSha256 = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Fast asynchronous batch stat collection using a worker pool
 * @param {Array<{ sourcePath: string, size?: number }>} fileList
 * @param {number} concurrency
 */
const batchStatFiles = async (fileList, concurrency = 64) => {
  let index = 0
  const worker = async () => {
    while (index < fileList.length) {
      const item = fileList[index++]
      try {
        const stat = await fs.promises.stat(item.sourcePath)
        item.size = stat.size
      } catch {
        item.size = -1
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, fileList.length || 1) }, () =>
    worker()
  )
  await Promise.all(workers)
}

/**
 * Calculates a quick fingerprint hash for a folder's source files (based on relative path and file size)
 * @param {Array<{ zipRelativePath: string, size: number }>} files
 * @returns {string}
 */
const calculateSourceFingerprint = (files) => {
  const hash = crypto.createHash('sha256')
  for (const item of files) {
    hash.update(`${item.zipRelativePath}:${item.size}\n`)
  }
  return hash.digest('hex')
}

/**
 * Creates a ZIP archive using native OS tar / PowerShell in local OS temp directory,
 * then transfers the final zip to the target destination (e.g. WebDAV network drive).
 * @param {string} sourceBaseDir - Base source directory (e.g. E:\CF_R2)
 * @param {string} targetZipPath - Final output zip file path on destination (e.g. Z:\5hy-w101.zip)
 * @param {Array<{ zipRelativePath: string, sourcePath: string }>} files - Files to include
 * @param {string} folderName - Current subfolder name
 * @returns {Promise<{ size: number, sha256: string }>}
 */
const createZipArchive = async (sourceBaseDir, targetZipPath, files, folderName) => {
  const tempDir = os.tmpdir()
  const safeId = folderName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const listFileName = `tcgtoolws_tar_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`
  const listFilePath = path.join(tempDir, listFileName)
  const localTempZip = path.join(
    tempDir,
    `tcgtoolws_pkg_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.zip`
  )

  if (fs.existsSync(localTempZip)) {
    fs.rmSync(localTempZip, { force: true })
  }

  try {
    // Write relative file paths (with forward slashes) to temporary file list
    const fileLines = files.map((f) => f.zipRelativePath.replace(/\\/g, '/')).join('\n')
    fs.writeFileSync(listFilePath, fileLines, 'utf-8')

    let archiveSuccess = false
    try {
      const tarCmd = process.platform === 'win32' ? 'tar.exe' : 'tar'
      execSync(`${tarCmd} -a -c -f "${localTempZip}" -T "${listFilePath}"`, {
        cwd: sourceBaseDir,
        stdio: 'pipe',
      })
      archiveSuccess = true
    } catch (tarErr) {
      console.warn(
        `⚠️ tar 打包失敗 (${tarErr.message})，嘗試降級使用 PowerShell Compress-Archive...`
      )
    }

    if (!archiveSuccess) {
      const stagingDir = path.join(tempDir, `tcgtoolws_stage_${safeId}_${Date.now()}`)
      fs.mkdirSync(stagingDir, { recursive: true })
      try {
        for (const item of files) {
          const dest = path.join(stagingDir, item.zipRelativePath)
          fs.mkdirSync(path.dirname(dest), { recursive: true })
          fs.copyFileSync(item.sourcePath, dest)
        }
        execSync(
          `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${localTempZip}' -Force"`,
          { stdio: 'pipe' }
        )
      } finally {
        if (fs.existsSync(stagingDir)) {
          fs.rmSync(stagingDir, { recursive: true, force: true })
        }
      }
    }

    if (!fs.existsSync(localTempZip)) {
      throw new Error(`壓縮包生成失敗: ${localTempZip} 不存在`)
    }

    // Compute size and SHA-256 directly on local SSD using streaming hash
    const stats = fs.statSync(localTempZip)
    const sha256 = await calculateSha256(localTempZip)

    // Copy finalized zip to target destination (e.g. WebDAV network drive Z:\)
    if (fs.existsSync(targetZipPath)) {
      fs.rmSync(targetZipPath, { force: true })
    }
    fs.copyFileSync(localTempZip, targetZipPath)

    return { size: stats.size, sha256 }
  } finally {
    if (fs.existsSync(listFilePath)) {
      try {
        fs.rmSync(listFilePath, { force: true })
      } catch {
        // ignore
      }
    }
    if (fs.existsSync(localTempZip)) {
      try {
        fs.rmSync(localTempZip, { force: true })
      } catch {
        // ignore
      }
    }
  }
}

const run = async () => {
  const {
    source,
    output,
    manifest: manifestPath,
    force,
    filterFolder,
    statConcurrency,
  } = parseArgs()

  const absoluteSource = path.resolve(source)
  const absoluteOutput = path.resolve(output)

  console.log('====================================================')
  console.log('📦 TCGToolWS 卡圖子目錄分包打包工具 (各子目錄獨立 ZIP)')
  console.log(`📁 來源目錄: ${absoluteSource}`)
  console.log(`🚀 輸出目錄: ${absoluteOutput}`)
  console.log(`📋 清單位置: ${manifestPath}`)
  if (force) console.log('⚡ 已啟用 --force 強制全量重新打包')
  if (filterFolder) console.log(`🎯 指定打包子目錄: ${Array.from(filterFolder).join(', ')}`)
  console.log('====================================================\n')

  const imgDataDir = path.join(absoluteSource, 'ws-image-data')
  const blurImgDataDir = path.join(absoluteSource, 'ws-blur-image-data')

  if (!fs.existsSync(imgDataDir)) {
    console.error(`❌ 找不到卡圖目錄: ${imgDataDir}`)
    console.error('請確認 --source 參數指向包含 ws-image-data 的正確路徑。')
    process.exit(1)
  }

  // Ensure output directory and manifest directory exist
  fs.mkdirSync(absoluteOutput, { recursive: true })
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })

  // Read existing manifest if available
  let existingManifest = null
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      const count = Object.keys(
        existingManifest.packages || existingManifest.folders || existingManifest.series || {}
      ).length
      console.log(`📖 已讀取現有清單: 包含 ${count} 個分包記錄。`)
    } catch {
      console.warn(`⚠️ 清單 ${manifestPath} 解析失敗，將重新建立...`)
    }
  }

  // 1. Scan all subfolder names from image directories
  console.time('🔍 掃描子目錄與卡牌圖片')
  const subfolderSet = new Set()

  if (fs.existsSync(imgDataDir)) {
    fs.readdirSync(imgDataDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .forEach((d) => subfolderSet.add(d.name))
  }

  if (fs.existsSync(blurImgDataDir)) {
    fs.readdirSync(blurImgDataDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .forEach((d) => subfolderSet.add(d.name))
  }

  const allSubfolders = Array.from(subfolderSet).sort()
  console.log(`📁 來源目錄共掃描到 ${allSubfolders.length} 個子目錄。`)

  // 2. Collect files for each subfolder
  const folderBuckets = new Map()
  const allFilesToStat = []

  for (const folder of allSubfolders) {
    const bucket = {
      folder,
      files: [],
    }
    folderBuckets.set(folder, bucket)

    // Collect main images (.webp only) -> saved into ws-image-data/folder/
    const seriesImgDir = path.join(imgDataDir, folder)
    if (fs.existsSync(seriesImgDir)) {
      const files = fs
        .readdirSync(seriesImgDir)
        .filter((f) => f.endsWith('.webp'))
        .sort()
      for (const f of files) {
        const fileObj = {
          sourcePath: path.join(seriesImgDir, f),
          zipRelativePath: `ws-image-data/${folder}/${f}`,
          isMain: true,
          size: 0,
        }
        bucket.files.push(fileObj)
        allFilesToStat.push(fileObj)
      }
    }

    // Collect blur images (.webp only) -> saved into ws-blur-image-data/folder/
    const seriesBlurDir = path.join(blurImgDataDir, folder)
    if (fs.existsSync(seriesBlurDir)) {
      const files = fs
        .readdirSync(seriesBlurDir)
        .filter((f) => f.endsWith('.webp'))
        .sort()
      for (const f of files) {
        const fileObj = {
          sourcePath: path.join(seriesBlurDir, f),
          zipRelativePath: `ws-blur-image-data/${folder}/${f}`,
          isMain: false,
          size: 0,
        }
        bucket.files.push(fileObj)
        allFilesToStat.push(fileObj)
      }
    }
  }

  // 3. Fast asynchronous batch stating
  console.log(`⚡ 開始高速非同步獲取 ${allFilesToStat.length} 張圖片的檔案資訊...`)
  await batchStatFiles(allFilesToStat, statConcurrency)
  console.timeEnd('🔍 掃描子目錄與卡牌圖片')

  const fullFolderList = Array.from(folderBuckets.values()).sort((a, b) =>
    a.folder.localeCompare(b.folder)
  )

  // Filter if user specified --folder
  const foldersToProcess = filterFolder
    ? fullFolderList.filter((s) => filterFolder.has(s.folder.toLowerCase()))
    : fullFolderList

  // Use existing packages map or migrate from old format
  const existingPackages =
    existingManifest?.packages || existingManifest?.folders || existingManifest?.series || {}

  const manifest = {
    version: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    generated_at: Math.floor(Date.now() / 1000),
    total_packages: fullFolderList.length,
    total_images: 0,
    total_size: 0,
    packages: { ...existingPackages },
  }

  let processedCount = 0
  let packagedCount = 0
  let skippedCount = 0

  const changedOrNewFolders = []
  const pendingShareIdFolders = []

  for (const item of foldersToProcess) {
    processedCount++
    const { folder, files } = item
    const zipFilename = `${folder}.zip`
    const outputZipPath = path.join(absoluteOutput, zipFilename)

    const cardCount = files.filter((f) => f.isMain).length

    if (files.length === 0) {
      console.log(
        `[${processedCount}/${foldersToProcess.length}] ⏭️  子目錄 ${folder}: 無圖片，跳過`
      )
      continue
    }

    // Deterministically calculate source fingerprint
    files.sort((a, b) => a.zipRelativePath.localeCompare(b.zipRelativePath))
    const currentSourceHash = calculateSourceFingerprint(files)

    const existingEntry = existingPackages[folder]
    const zipExists = fs.existsSync(outputZipPath)

    // Check if unchanged and zip exists
    const isUnchanged =
      !force &&
      zipExists &&
      existingEntry &&
      existingEntry.source_hash === currentSourceHash &&
      existingEntry.sha256 &&
      existingEntry.size

    if (isUnchanged) {
      skippedCount++
      const pkgSize = existingEntry.size

      // Retain existing minimal metadata and existing share_id (or default to '0' if empty/whitespace/'0')
      const rawShareId = existingEntry.share_id
      const shareIdStr =
        typeof rawShareId === 'string'
          ? rawShareId.trim()
          : typeof rawShareId === 'number' && rawShareId !== 0
            ? String(rawShareId)
            : ''
      const finalShareId = shareIdStr === '' || shareIdStr === '0' ? '0' : shareIdStr

      manifest.packages[folder] = {
        share_id: finalShareId,
        size: existingEntry.size,
        sha256: existingEntry.sha256,
        source_hash: currentSourceHash,
        card_count: cardCount,
        updated_at: existingEntry.updated_at || Math.floor(Date.now() / 1000),
      }

      if (finalShareId === '0') {
        pendingShareIdFolders.push({
          folder,
          reason: '尚未填入 share_id',
        })
      }

      console.log(
        `[${processedCount}/${foldersToProcess.length}] ⚡ 子目錄 [${folder.padEnd(16)}]: 無變更，沿用現有包 (${(pkgSize / (1024 * 1024)).toFixed(2)} MB, ${cardCount} 張卡)`
      )
      continue
    }

    // Packaging needed (New or Changed)
    packagedCount++
    const changeReason = !zipExists
      ? 'ZIP 檔案不存在'
      : !existingEntry
        ? '新目錄'
        : force
          ? '--force 強制重新打包'
          : '來源卡圖有新增或修改'

    console.log(
      `[${processedCount}/${foldersToProcess.length}] 🔨 打包中 [${folder.padEnd(16)}] -> ${zipFilename} (${changeReason}, ${files.length} 張圖)...`
    )

    const startTime = Date.now()
    const { size: zipSize, sha256: zipSha256 } = await createZipArchive(
      absoluteSource,
      outputZipPath,
      files,
      folder
    )
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

    // Initialize share_id to "0" for changed or new folders (minimal metadata)
    manifest.packages[folder] = {
      share_id: '0',
      size: zipSize,
      sha256: zipSha256,
      source_hash: currentSourceHash,
      card_count: cardCount,
      updated_at: Math.floor(Date.now() / 1000),
    }

    changedOrNewFolders.push({
      folder,
      reason: changeReason,
    })

    const sizeMb = (zipSize / (1024 * 1024)).toFixed(2)
    console.log(
      `  └─ ✅ 打包完成: ${sizeMb} MB, ${cardCount} 張主卡, SHA-256: ${zipSha256.slice(0, 8)}... (${elapsedSec}s, share_id 已設為 "0")`
    )
  }

  // Recalculate totals across all packages in the manifest
  let totalImages = 0
  let totalSize = 0
  for (const pkg of Object.values(manifest.packages)) {
    totalImages += (pkg.card_count || 0) * 2 // main + blur
    totalSize += pkg.size || 0
  }
  manifest.total_images = totalImages
  manifest.total_size = totalSize

  // Write manifest ONLY to public/ directory
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log('\n====================================================')
  console.log('🎉 處理完成！')
  console.log(`📋 主清單已更新: ${manifestPath}`)
  console.log(
    `📊 統計: 共 ${manifest.total_packages} 個子目錄包 (⚡ ${skippedCount} 個無變更跳過, 🔨 ${packagedCount} 個重新打包)`
  )
  console.log(`💾 總壓縮體積: ${(manifest.total_size / (1024 * 1024 * 1024)).toFixed(2)} GB`)
  console.log('====================================================')

  // Print share_id status
  const allNeedsAttention = [...changedOrNewFolders, ...pendingShareIdFolders]

  if (allNeedsAttention.length > 0) {
    console.log('\n⚠️  【注意：需要填入 share_id 的子目錄】')
    console.log('----------------------------------------------------')
    if (changedOrNewFolders.length > 0) {
      console.log('🔄 本次新增 / 變更的目錄（share_id 已初始化為 "0"）：')
      for (const item of changedOrNewFolders) {
        console.log(`  • [${item.folder.padEnd(16)}] (${item.reason})`)
      }
    }

    if (pendingShareIdFolders.length > 0) {
      console.log('\n⏳ 先前已打包但尚未填寫 share_id 的目錄 (share_id 為 "0" 或未設定)：')
      for (const item of pendingShareIdFolders) {
        console.log(`  • [${item.folder.padEnd(16)}]`)
      }
    }

    console.log('----------------------------------------------------')
    console.log('💡 提示：可使用獨立同步腳本自動獲取並填入上述 ZIP 的 TeraCloud 分享連結：')
    console.log('   npm run sync-shares -- --api-key <YOUR_KEY> --cookie <SESSION_ID>')
    console.log(
      '   或執行: node scripts/sync-teracloud-shares.js --api-key <YOUR_KEY> --cookie <SESSION_ID>'
    )
    console.log('====================================================\n')
  } else {
    console.log('\n✨ 所有子目錄的 share_id 皆已填寫完畢，無需額外手動操作！\n')
  }
}

run().catch((err) => {
  console.error('❌ 打包過程出現致命錯誤:', err)
  process.exit(1)
})
