#!/usr/bin/env node

/**
 * @file sync-gitcode-release.mjs
 * @description Syncs GitHub Release metadata and binary assets (.exe, .apk, .AppImage) to GitCode.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { parseArgs } from 'node:util'

const ALLOWED_EXTENSIONS = new Set(['.exe', '.apk', '.appimage'])

const usage = `
Usage: node sync-gitcode-release.mjs [options]

Options:
  --tag <string>         Release Tag name (e.g., v1.0.0). Defaults to $TAG_NAME.
  --files-dir <string>   Directory containing downloaded assets. Defaults to $RELEASE_FILES_DIR or './release-files'.
  --title <string>       Release Title. Defaults to $RELEASE_TITLE or same as tag.
  --body <string>        Release Description / Changelog markdown. Defaults to $RELEASE_BODY or empty.
  --prerelease           Flag whether this is a pre-release. Defaults to $IS_PRERELEASE === 'true'.
  --repo <string>        GitCode repo path (owner/repo). Defaults to $GITCODE_REPO or 'zhuang39/TCGToolWS'.
  --token <string>       GitCode Personal Access Token. Defaults to $GITCODE_TOKEN.
  --dry-run              Dry run mode: validate parameters & filter files without making network requests.
  --help, -h             Show this help message.
`

/**
 * Exponential backoff delay helper
 * @param {number} ms
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms))

/**
 * Format bytes to readable size
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Execute a fetch with automatic retries on failure
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} maxRetries
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok || (response.status >= 200 && response.status < 400)) {
        return response
      }
      const responseText = await response.text()
      // If 404 on a GET check, return response directly so caller can handle
      if (response.status === 404 && options.method === 'GET') {
        return response
      }
      lastError = new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`)
      console.warn(
        `[Attempt ${attempt}/${maxRetries}] Request to ${url} failed: ${lastError.message}`
      )
    } catch (err) {
      lastError = err
      console.warn(`[Attempt ${attempt}/${maxRetries}] Network error to ${url}: ${err.message}`)
    }

    if (attempt < maxRetries) {
      const waitTime = Math.pow(2, attempt - 1) * 1500
      console.log(`Waiting ${waitTime}ms before retry...`)
      await delay(waitTime)
    }
  }
  throw lastError
}

/**
 * Main execution function
 */
async function main() {
  const { values } = parseArgs({
    options: {
      'tag': { type: 'string' },
      'files-dir': { type: 'string' },
      'title': { type: 'string' },
      'body': { type: 'string' },
      'prerelease': { type: 'boolean', default: false },
      'repo': { type: 'string' },
      'token': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  })

  if (values.help) {
    console.log(usage)
    process.exit(0)
  }

  const isDryRun = values['dry-run'] || process.env.DRY_RUN === 'true'
  const tag = values.tag || process.env.TAG_NAME || process.env.RELEASE_TAG
  const filesDir = resolve(
    values['files-dir'] || process.env.RELEASE_FILES_DIR || './release-files'
  )
  const title = values.title || process.env.RELEASE_TITLE || tag
  const body = values.body || process.env.RELEASE_BODY || `Automated release ${tag}`
  const isPrerelease = values.prerelease || process.env.IS_PRERELEASE === 'true'
  const repo = values.repo || process.env.GITCODE_REPO || 'zhuang39/TCGToolWS'
  const token = values.token || process.env.GITCODE_TOKEN

  console.log('='.repeat(60))
  console.log('🚀 GitCode Release Synchronization Tool')
  console.log('='.repeat(60))
  console.log(`- Target Repository : ${repo}`)
  console.log(`- Release Tag       : ${tag || '(Not set)'}`)
  console.log(`- Release Title     : ${title || '(Not set)'}`)
  console.log(`- Is Pre-release    : ${isPrerelease}`)
  console.log(`- Asset Directory   : ${filesDir}`)
  console.log(`- Dry Run Mode      : ${isDryRun ? 'ENABLED' : 'DISABLED'}`)
  console.log('='.repeat(60))

  if (!tag) {
    console.error(
      '❌ Error: Release tag is required. Pass --tag <tag> or set TAG_NAME environment variable.'
    )
    process.exit(1)
  }

  if (!token && !isDryRun) {
    console.error(
      '❌ Error: GitCode token is required. Pass --token <token> or set GITCODE_TOKEN environment variable.'
    )
    process.exit(1)
  }

  // 1. Scan and filter asset files
  console.log('\n📦 Scanning asset files...')
  const matchedFiles = []

  if (existsSync(filesDir)) {
    const entries = await readdir(filesDir)
    for (const entry of entries) {
      const fullPath = resolve(filesDir, entry)
      const fileStat = await stat(fullPath)
      if (fileStat.isFile()) {
        const ext = extname(entry).toLowerCase()
        if (ALLOWED_EXTENSIONS.has(ext)) {
          matchedFiles.push({
            name: entry,
            path: fullPath,
            size: fileStat.size,
          })
          console.log(`  ✓ Matched: ${entry} (${formatBytes(fileStat.size)})`)
        } else {
          console.log(`  - Skipped non-package file: ${entry}`)
        }
      }
    }
  } else {
    console.warn(`⚠️ Warning: Asset directory ${filesDir} does not exist.`)
  }

  console.log(`Total valid release assets found: ${matchedFiles.length}`)

  if (isDryRun) {
    console.log('\n[Dry Run] Validation succeeded. No network calls executed.')
    process.exit(0)
  }

  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    console.error(`❌ Invalid repo format: "${repo}". Expected format: "owner/repo"`)
    process.exit(1)
  }

  const apiBase = `https://api.gitcode.com/api/v5/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`
  const headers = {
    'PRIVATE-TOKEN': token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  // 2. Check if Release exists on GitCode
  console.log(`\n🔍 Checking if release "${tag}" exists on GitCode...`)
  const checkUrl = `${apiBase}/releases/tags/${encodeURIComponent(tag)}`
  let releaseExists = false

  try {
    const checkRes = await fetchWithRetry(checkUrl, { method: 'GET', headers }, 3)
    if (checkRes.status === 200) {
      releaseExists = true
      console.log(`✅ Release "${tag}" already exists on GitCode.`)
    } else if (checkRes.status === 404) {
      console.log(`ℹ️ Release "${tag}" does not exist yet. Will create a new release.`)
    } else {
      console.warn(`⚠️ Unexpected status check response: ${checkRes.status}`)
    }
  } catch (err) {
    console.warn(`⚠️ Failed to query existing release: ${err.message}. Proceeding to create.`)
  }

  // 3. Create or Update Release
  if (!releaseExists) {
    console.log(`\n📝 Creating new release "${tag}" on GitCode...`)
    const createUrl = `${apiBase}/releases`
    const createPayload = {
      tag_name: tag,
      name: title,
      body: body,
      prerelease: isPrerelease,
    }

    const createRes = await fetchWithRetry(
      createUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(createPayload),
      },
      3
    )

    const createJson = await createRes.json()
    console.log(
      `✅ Release created successfully on GitCode:`,
      createJson.name || createJson.tag_name || tag
    )
  } else {
    console.log(`\n📝 Updating existing release "${tag}" notes on GitCode...`)
    const updateUrl = `${apiBase}/releases/${encodeURIComponent(tag)}`
    const updatePayload = {
      name: title,
      body: body,
      prerelease: isPrerelease,
    }

    try {
      await fetchWithRetry(
        updateUrl,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updatePayload),
        },
        3
      )
      console.log(`✅ Release "${tag}" updated successfully.`)
    } catch (err) {
      console.warn(
        `⚠️ Failed to update release metadata: ${err.message}. Continuing with asset uploads.`
      )
    }
  }

  // 4. Upload Assets
  if (matchedFiles.length === 0) {
    console.log('\nℹ️ No package assets to upload.')
  } else {
    console.log(`\n📤 Uploading ${matchedFiles.length} asset(s) to GitCode Release...`)

    for (let i = 0; i < matchedFiles.length; i++) {
      const file = matchedFiles[i]
      console.log(
        `\n[${i + 1}/${matchedFiles.length}] Uploading ${file.name} (${formatBytes(file.size)})...`
      )

      // 4.1 Get upload url
      const uploadUrlEndpoint = `${apiBase}/releases/${encodeURIComponent(tag)}/upload_url?file_name=${encodeURIComponent(file.name)}`
      let targetUploadUrl

      try {
        const uploadUrlRes = await fetchWithRetry(uploadUrlEndpoint, { method: 'GET', headers }, 3)
        const uploadUrlData = await uploadUrlRes.json()
        targetUploadUrl =
          uploadUrlData.url || uploadUrlData.upload_url || uploadUrlData.download_url

        if (!targetUploadUrl) {
          throw new Error(
            `Upload URL response did not contain 'url': ${JSON.stringify(uploadUrlData)}`
          )
        }
      } catch (err) {
        console.error(`❌ Failed to obtain upload URL for ${file.name}: ${err.message}`)
        continue
      }

      // 4.2 Upload binary data
      const fileBuffer = await readFile(file.path)
      const startTime = Date.now()

      try {
        // Attempt PUT upload to pre-signed / upload url
        let uploadRes = await fetch(targetUploadUrl, {
          method: 'PUT',
          body: fileBuffer,
          headers: {
            'Content-Length': String(fileBuffer.length),
            'Content-Type': 'application/octet-stream',
          },
        })

        // Fallback to POST if PUT is not accepted
        if (uploadRes.status === 405 || uploadRes.status === 400) {
          console.log(`PUT returned ${uploadRes.status}, falling back to POST upload...`)
          uploadRes = await fetch(targetUploadUrl, {
            method: 'POST',
            body: fileBuffer,
            headers: {
              'Content-Length': String(fileBuffer.length),
              'Content-Type': 'application/octet-stream',
            },
          })
        }

        if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
          const errText = await uploadRes.text()
          throw new Error(`Upload returned status ${uploadRes.status}: ${errText}`)
        }

        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`✅ Successfully uploaded ${file.name} in ${durationSec}s`)
      } catch (err) {
        console.error(`❌ Failed to upload asset ${file.name}: ${err.message}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`🎉 GitCode Release Sync for "${tag}" completed successfully!`)
  console.log(`🔗 Target URL: https://gitcode.com/${repo}/releases`)
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('\n💥 Fatal Error during synchronization:')
  console.error(err)
  process.exit(1)
})
