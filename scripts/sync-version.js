import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const packageJsonPath = path.resolve(rootDir, 'package.json')
const tauriConfPath = path.resolve(rootDir, 'src-tauri/tauri.conf.json')
const cargoTomlPath = path.resolve(rootDir, 'src-tauri/Cargo.toml')
const cargoLockPath = path.resolve(rootDir, 'src-tauri/Cargo.lock')

// 1. Get new version from package.json or npm environment variable
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const newVersion = process.env.npm_package_version || packageJson.version

if (!newVersion) {
  console.error('❌ Could not determine version from package.json or npm_package_version.')
  process.exit(1)
}

console.log(`🔄 Syncing version ${newVersion} to Tauri and Cargo configuration files...`)

// 2. Update src-tauri/tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
  const tauriConfRaw = fs.readFileSync(tauriConfPath, 'utf8')
  const tauriPattern = /"version":\s*"[^"]+"/
  if (tauriPattern.test(tauriConfRaw)) {
    const updatedTauriConf = tauriConfRaw.replace(tauriPattern, `"version": "${newVersion}"`)
    fs.writeFileSync(tauriConfPath, updatedTauriConf, 'utf8')
    console.log(`  ✓ Updated src-tauri/tauri.conf.json -> ${newVersion}`)
  } else {
    console.warn('  ⚠️ "version" field not found in src-tauri/tauri.conf.json')
  }
}

// 3. Update src-tauri/Cargo.toml
if (fs.existsSync(cargoTomlPath)) {
  const cargoTomlRaw = fs.readFileSync(cargoTomlPath, 'utf8')
  // Update version specifically inside [package] block
  const cargoTomlPattern = /(\[package\][\s\S]*?\nversion\s*=\s*)"[^"]+"/
  if (cargoTomlPattern.test(cargoTomlRaw)) {
    const updatedCargoToml = cargoTomlRaw.replace(cargoTomlPattern, `$1"${newVersion}"`)
    fs.writeFileSync(cargoTomlPath, updatedCargoToml, 'utf8')
    console.log(`  ✓ Updated src-tauri/Cargo.toml -> ${newVersion}`)
  } else {
    console.warn('  ⚠️ [package] version not found in src-tauri/Cargo.toml')
  }
}

// 4. Update src-tauri/Cargo.lock
if (fs.existsSync(cargoLockPath)) {
  const cargoLockRaw = fs.readFileSync(cargoLockPath, 'utf8')
  // Match [[package]] followed by name = "tcgtoolws" and version = "..."
  const cargoLockPattern = /(\[\[package\]\][\r\n]+name = "tcgtoolws"[\r\n]+version = )"[^"]+"/
  if (cargoLockPattern.test(cargoLockRaw)) {
    const updatedCargoLock = cargoLockRaw.replace(cargoLockPattern, `$1"${newVersion}"`)
    fs.writeFileSync(cargoLockPath, updatedCargoLock, 'utf8')
    console.log(`  ✓ Updated src-tauri/Cargo.lock -> ${newVersion}`)
  } else {
    console.warn('  ⚠️ Package "tcgtoolws" entry not found in src-tauri/Cargo.lock')
  }
}

// 5. Stage updated files if in a git repository
try {
  const filesToStage = [
    'src-tauri/tauri.conf.json',
    'src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock',
  ].filter((file) => fs.existsSync(path.resolve(rootDir, file)))

  if (filesToStage.length > 0) {
    const result = spawnSync('git', ['add', ...filesToStage], { stdio: 'inherit' })
    if (result.status === 0) {
      console.log(`  ✓ Staged updated files for git commit`)
    }
  }
} catch {
  // Ignore git staging error if git is not available or not a git repo
}

console.log(`✨ Version sync completed successfully!`)
