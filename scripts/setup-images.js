// scripts/setup-images.js
import fs from 'fs'
import path from 'path'
import process from 'process'
import { execSync } from 'child_process'

const tempDir = 'temp-images'
const targetDir = 'public/ws-image-data'
const sourceFolder = 'ws-image-data'

console.log('🖼️  Setting up local images...')

try {
  // 清理既有的目標目錄和臨時目錄
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true })
  }
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  // 克隆圖片倉庫到臨時目錄
  console.log('📦 Cloning images repository...')
  execSync(`git clone git@github.com:U-CLIMAX/ws-image-data.git ${tempDir}`, {
    stdio: 'inherit',
  })

  // 檢查源文件夾是否存在
  const sourcePath = path.join(tempDir, sourceFolder)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source folder "${sourceFolder}" not found in repository`)
  }

  // 創建目標目錄的父文件夾
  fs.mkdirSync(path.dirname(targetDir), { recursive: true })

  // 複製需要的文件夾
  console.log('📁 Copying images to public directory...')
  fs.cpSync(sourcePath, targetDir, { recursive: true })

  // 清理臨時目錄
  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log('✅ Images setup complete!')
  console.log(`📍 Images available at: ${targetDir}`)
} catch (error) {
  console.error('❌ Error setting up images:', error.message)

  // 清理臨時目錄
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  process.exit(1)
}
