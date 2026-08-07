import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import * as readline from 'node:readline'
import { exec } from 'node:child_process'

const scryptAsync = promisify(scrypt)
const SCRYPT_PREFIX = '$scrypt$v1$'
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLen: 64 }

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

const hashPassword = async (password, salt) => {
  const derivedKey = await scryptAsync(password, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  })
  return SCRYPT_PREFIX + derivedKey.toString('hex')
}

const execPromise = promisify(exec)

async function main() {
  console.log('=== TCGToolWS 测试账号创建工具 ===')

  const email = await question('请输入测试账号邮箱 (Email): ')
  if (!email || !email.includes('@')) {
    console.error('❌ 邮箱格式错误')
    process.exit(1)
  }

  const password = await question('请输入测试账号密码 (不少于8位): ')
  if (!password || password.length < 8) {
    console.error('❌ 密码长度不能少于8位')
    process.exit(1)
  }

  const roleInput = await question(
    '请输入账号权限 Role (0: user, 1: premium, 2: developer) [默认: 2]: '
  )
  const role = roleInput.trim() === '' ? 2 : parseInt(roleInput, 10)

  if (isNaN(role) || ![0, 1, 2].includes(role)) {
    console.error('❌ Role 必须是 0, 1 或 2')
    process.exit(1)
  }

  rl.close()

  console.log('正在生成加密哈希 (Hashing password)...')
  const salt = randomBytes(16).toString('hex')
  const hashedPassword = await hashPassword(password, salt)
  const id = crypto.randomUUID()

  const sql = `INSERT OR IGNORE INTO users (id, email, hashed_password, salt, role) VALUES ('${id}', '${email}', '${hashedPassword}', '${salt}', ${role});`

  console.log('正在写入本地 D1 数据库...')

  try {
    // oxlint-disable-next-line no-unused-vars
    const { stdout, stderr } = await execPromise(
      `npx wrangler d1 execute ws-account-db --local --command="${sql}"`
    )

    if (stderr && !stderr.includes('Executing on local database')) {
      console.warn('⚠️ 注意:', stderr)
    }

    console.log('✅ 创建成功！您现在可以使用该账号密码登入本地环境。')
  } catch (error) {
    console.error('❌ 执行 Wrangler 命令时发生错误:')
    console.error(error.message)
    console.log('\n确保您已经执行过 npm run db:init 建立了资料表。')
  }
}

main()
