// scripts/setup-images.js
import fs from 'fs'
import path from 'path'
import process from 'process'
import { execSync } from 'child_process'

const tempDir = 'temp-images'
const directories = [
  {
    source: 'ws-image-data',
    target: 'public/ws-image-data',
  },
  {
    source: 'ws-blur-image-data',
    target: 'public/ws-blur-image-data',
  },
]

console.log('🖼️  Setting up local images...')

try {
  directories.forEach(({ target }) => {
    if (fs.existsSync(target)) {
      console.log(`🧹 Cleaning existing directory: ${target}`)
      fs.rmSync(target, { recursive: true, force: true })
    }
  })

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('📦 Cloning images repository...')
  execSync(`git clone git@github.com:U-CLIMAX/ws-image-data.git ${tempDir}`, {
    stdio: 'inherit',
  })

  directories.forEach(({ source, target }) => {
    const sourcePath = path.join(tempDir, source)
    if (fs.existsSync(sourcePath)) {
      console.log(`📁 Copying ${source} to public directory...`)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.cpSync(sourcePath, target, { recursive: true })
    } else {
      console.warn(`⚠️  Warning: Source folder "${source}" not found in repository. Skipping.`)
    }
  })

  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log('✅ Images setup complete!')
  console.log(`📍 Images available at: public/`)
} catch (error) {
  console.error('❌ Error setting up images:', error.message)

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  process.exit(1)
}
