import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export default function genVersion(options = {}) {
  const { fileName = 'version.json' } = options

  return {
    name: 'vite-plugin-gen-version',
    writeBundle(outputOptions, bundle) {
      let version = Date.now().toString()
      const entryChunk = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'index'
      )

      if (entryChunk) {
        const hash = crypto.createHash('md5').update(entryChunk.fileName).digest('hex')
        version = hash
      } else {
        console.warn('⚠️ [Version] Could not find entry chunk "index", falling back to timestamp.')
      }

      const content = {
        version,
        timestamp: new Date().toISOString(),
        description: 'Auto-generated from entry chunk hash',
      }

      const outDir = outputOptions.dir || 'dist'
      const filePath = path.resolve(outDir, fileName)

      try {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2))
        console.log(`\n✨ [Version] Generated: ${fileName} (Version: ${version})`)
      } catch (error) {
        console.error(`\n❌ [Version] Failed to write ${fileName}:`, error)
      }
    },
  }
}
