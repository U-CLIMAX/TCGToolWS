import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const gradlew = isWindows ? 'gradlew.bat' : './gradlew'
const androidDir = resolve('src-tauri/gen/android')
const gradlewPath = resolve(androidDir, gradlew)

const action = process.argv[2] === 'check' ? ':app:ktlintCheck' : ':app:ktlintFormat'

const env = {
  ...process.env,
  JAVA_OPTS: `${process.env.JAVA_OPTS || ''} --enable-native-access=ALL-UNNAMED`.trim(),
  GRADLE_OPTS: `${process.env.GRADLE_OPTS || ''} --enable-native-access=ALL-UNNAMED`.trim(),
}

const result = spawnSync(gradlewPath, ['-p', androidDir, action, '--warning-mode=none', '-q'], {
  stdio: 'inherit',
  shell: true,
  cwd: androidDir,
  env,
})

process.exit(result.status ?? 0)
