import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

async function syncReleaseToGitCode() {
  if (process.env.IS_DRAFT?.trim() === 'true') {
    console.log('[gitcode] Draft release detected. Skipping sync.')
    return
  }

  const token = process.env.GITCODE_TOKEN
  if (!token) {
    console.warn('[gitcode] GITCODE_TOKEN is not set. Skipping sync.')
    return
  }

  const owner = process.env.GITCODE_OWNER || 'zhuang39'
  const repo = process.env.GITCODE_REPO || 'TCGToolWS'

  let tag = process.env.TAG_NAME
  if (!tag) {
    const tauriPath = path.resolve(process.cwd(), 'src-tauri/tauri.conf.json')
    const conf = JSON.parse(fs.readFileSync(tauriPath, 'utf8'))
    tag = `v${conf.version}`
  }

  const releaseStatus = process.env.IS_PRERELEASE?.trim() === 'true' ? 'pre' : 'latest'
  const releaseDir = path.resolve(process.cwd(), process.env.RELEASE_DIR || 'release-files')

  console.log(`[gitcode] Syncing release ${owner}/${repo}@${tag}...`)

  // Check or create release
  const baseUrl = `https://api.gitcode.com/api/v5/repos/${owner}/${repo}/releases`
  const checkRes = await fetch(`${baseUrl}/${encodeURIComponent(tag)}?access_token=${token}`)

  if (checkRes.ok) {
    console.log(`[gitcode] Release '${tag}' exists.`)
  } else {
    console.log(`[gitcode] Creating release '${tag}' (${releaseStatus})...`)
    const body = process.env.RELEASE_BODY?.trim() || `Release ${tag}`
    const createRes = await fetch(`${baseUrl}?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        name: tag,
        body,
        target_commitish: 'main',
        release_status: releaseStatus,
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => '')
      throw new Error(`Failed to create release: HTTP ${createRes.status} ${err}`)
    }
    console.log(`[gitcode] Created release '${tag}'.`)
  }

  if (!fs.existsSync(releaseDir)) {
    console.warn(`[gitcode] Release directory '${releaseDir}' not found.`)
    return
  }

  const files = fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)

  if (files.length === 0) {
    console.warn(`[gitcode] No files to upload in '${releaseDir}'.`)
    return
  }

  // Upload assets
  for (const file of files) {
    const filePath = path.join(releaseDir, file)
    const { size } = fs.statSync(filePath)
    console.log(`[gitcode] Uploading ${file} (${size} bytes)...`)

    const urlEndpoint = `${baseUrl}/${encodeURIComponent(tag)}/upload_url?access_token=${token}&file_name=${encodeURIComponent(file)}`
    const urlRes = await fetch(urlEndpoint)

    if (!urlRes.ok) {
      const err = await urlRes.text().catch(() => '')
      throw new Error(`Failed to get upload URL for '${file}': HTTP ${urlRes.status} ${err}`)
    }

    const { url: uploadUrl, headers = {} } = await urlRes.json()
    if (!uploadUrl) {
      throw new Error(`Invalid upload URL for '${file}'`)
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Length': String(size) },
      body: fs.createReadStream(filePath),
      duplex: 'half',
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => '')
      throw new Error(`Failed to upload '${file}': HTTP ${uploadRes.status} ${err}`)
    }

    console.log(`[gitcode] Uploaded ${file}.`)
  }

  console.log(`[gitcode] Release sync finished successfully.`)
}

syncReleaseToGitCode().catch((err) => {
  console.error('[gitcode] Sync error:', err.message || err)
  process.exit(1)
})
