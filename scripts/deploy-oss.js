import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const distDir = resolve(rootDir, 'dist/client')
const headersPath = resolve(rootDir, 'public/_headers')

const OSS_REMOTE = process.env.OSS_REMOTE || 'oss'
const OSS_BUCKET = process.env.OSS_BUCKET || 'ucx-frontend'
const TARGET = `${OSS_REMOTE}:${OSS_BUCKET}`
const DEFAULT_CACHE_CONTROL = 'no-cache'
const EXCLUDED_FILES = new Set(['_headers', '.assetsignore'])
const IS_DRY_RUN = process.argv.includes('--dry-run')

/**
 * Convert a Cloudflare _headers path pattern (with `*` splats) into a RegExp.
 * @param {string} pattern
 * @returns {RegExp}
 */
const patternToRegex = (pattern) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/**
 * Parse Cache-Control rules from public/_headers.
 * Non-Cache-Control headers (e.g. CDN-Cache-Control) are ignored because OSS
 * object metadata only accepts standard HTTP headers.
 * @param {string} filePath
 * @returns {Array<{ pattern: string, regex: RegExp, cacheControl: string }>}
 */
const parseHeadersFile = (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`_headers file not found: ${filePath}`)
  }

  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/)
  const rules = []
  let currentPattern = null

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    if (!/^\s/.test(rawLine)) {
      currentPattern = trimmed
      continue
    }

    if (!currentPattern) {
      continue
    }

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) {
      continue
    }

    const name = trimmed.slice(0, colonIdx).trim().toLowerCase()
    const value = trimmed.slice(colonIdx + 1).trim()
    if (name === 'cache-control' && value) {
      rules.push({
        pattern: currentPattern,
        regex: patternToRegex(currentPattern),
        cacheControl: value,
      })
    }
  }

  return rules
}

/**
 * Recursively collect all files under a directory as POSIX relative paths.
 * @param {string} baseDir
 * @param {string} [currentDir]
 * @returns {string[]}
 */
const walkFiles = (baseDir, currentDir = baseDir) => {
  const entries = readdirSync(currentDir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(baseDir, fullPath))
    } else if (entry.isFile()) {
      const relPath = relative(baseDir, fullPath).split('\\').join('/')
      if (!EXCLUDED_FILES.has(relPath)) {
        results.push(relPath)
      }
    }
  }

  return results
}

/**
 * Resolve Cache-Control value for a given POSIX relative file path.
 * Later matching rules override earlier ones, matching Cloudflare _headers behavior.
 * @param {string} relPath
 * @param {Array<{ regex: RegExp, cacheControl: string }>} rules
 * @returns {string}
 */
const resolveCacheControl = (relPath, rules) => {
  const urlPath = `/${relPath}`
  let matched = DEFAULT_CACHE_CONTROL

  for (const rule of rules) {
    if (rule.regex.test(urlPath)) {
      matched = rule.cacheControl
    }
  }

  return matched
}

/**
 * Determine upload priority: immutable/long-lived assets first,
 * mutable/no-cache entrypoints (index.html, sw.js, manifests) last.
 * @param {string} cacheControl
 * @returns {number}
 */
const getUploadPriority = (cacheControl) => {
  const lower = cacheControl.toLowerCase()
  if (lower.includes('immutable')) {
    return 0
  }
  if (lower.includes('no-cache') || lower.includes('max-age=0')) {
    return 2
  }
  return 1
}

/**
 * Execute an rclone command and throw on non-zero exit.
 * @param {string[]} args
 * @param {{ capture?: boolean }} [options]
 * @returns {string}
 */
const runRclone = (args, options = {}) => {
  const result = spawnSync('rclone', args, {
    stdio: options.capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf-8',
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`rclone exited with status ${result.status}: rclone ${args.join(' ')}`)
  }

  return result.stdout || ''
}

const main = () => {
  if (!existsSync(distDir)) {
    throw new Error(`Build output not found: ${distDir}. Run "npm run build:oss" first.`)
  }

  const rules = parseHeadersFile(headersPath)
  const localFiles = walkFiles(distDir)
  const localFileSet = new Set(localFiles)

  /** @type {Map<string, string[]>} */
  const groups = new Map()
  for (const file of localFiles) {
    const cc = resolveCacheControl(file, rules)
    const list = groups.get(cc) || []
    list.push(file)
    groups.set(cc, list)
  }

  const sortedGroups = [...groups.entries()].sort(
    ([ccA], [ccB]) => getUploadPriority(ccA) - getUploadPriority(ccB)
  )

  console.log(
    `[OSS Deploy] Target: ${TARGET} | Files: ${localFiles.length} | Cache-Control groups: ${sortedGroups.length}${IS_DRY_RUN ? ' (DRY RUN)' : ''}`
  )

  const workDir = mkdtempSync(join(tmpdir(), 'oss-deploy-'))
  try {
    // 1. Upload grouped files in zero-downtime order
    for (let i = 0; i < sortedGroups.length; i += 1) {
      const [cacheControl, files] = sortedGroups[i]
      const listFile = join(workDir, `group-${i}.txt`)
      writeFileSync(listFile, `${files.join('\n')}\n`, 'utf-8')

      console.log(
        `[OSS Deploy] [${i + 1}/${sortedGroups.length}] Uploading ${files.length} file(s) with Cache-Control: ${cacheControl}`
      )

      const args = [
        'copy',
        distDir,
        TARGET,
        '--files-from',
        listFile,
        '--checksum',
        '--transfers',
        '32',
        '--checkers',
        '20',
        '--header-upload',
        `Cache-Control: ${cacheControl}`,
      ]
      if (IS_DRY_RUN) {
        args.push('--dry-run')
      }

      runRclone(args)
    }

    // 2. Clean up stale files on remote that no longer exist in dist/client
    console.log('[OSS Deploy] Checking for stale remote files...')
    const remoteOutput = runRclone(['lsf', '-R', '--files-only', TARGET], { capture: true })
    const remoteFiles = remoteOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const staleFiles = remoteFiles.filter((file) => !localFileSet.has(file))
    if (staleFiles.length === 0) {
      console.log('[OSS Deploy] No stale files to remove.')
    } else {
      const staleListFile = join(workDir, 'stale.txt')
      writeFileSync(staleListFile, `${staleFiles.join('\n')}\n`, 'utf-8')
      console.log(`[OSS Deploy] Removing ${staleFiles.length} stale file(s)...`)

      const deleteArgs = ['delete', TARGET, '--files-from', staleListFile]
      if (IS_DRY_RUN) {
        deleteArgs.push('--dry-run')
      }
      runRclone(deleteArgs)
    }

    console.log('[OSS Deploy] Deployment completed successfully.')
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

main()
