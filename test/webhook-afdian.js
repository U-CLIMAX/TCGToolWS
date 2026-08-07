import * as readline from 'node:readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function main() {
  console.log('=== 模拟爱发电 Webhook 测试工具 ===')
  console.log('请确保您的本地开发服务器 (npm run dev) 正在运行。\n')

  const port = (await question('请输入本地开发服务器端口 (默认: 5173): ')).trim() || '5173'
  const email = (await question('请输入测试账号邮箱 (Email): ')).trim()
  const password = (await question('请输入测试账号密码: ')).trim()

  if (!email || !password) {
    console.error('❌ 邮箱和密码不能为空')
    process.exit(1)
  }

  const baseUrl = `http://localhost:${port}/api`

  console.log('\n[1/3] 正在登录获取 Token...')
  let token = ''
  try {
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const loginData = await loginRes.json()
    if (!loginData.success) {
      console.error('❌ 登录失败:', loginData.message)
      process.exit(1)
    }
    token = loginData.token
    console.log('✅ 登录成功！')
  } catch (err) {
    console.error('❌ 登录请求失败，请确认后端服务器是否已启动。', err.message)
    process.exit(1)
  }

  console.log('\n[2/3] 正在模拟发起支付以获取 Order ID...')
  let customOrderId = ''
  try {
    const initRes = await fetch(`${baseUrl}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    const initData = await initRes.json()
    if (!initData.success) {
      console.error('❌ 发起支付失败')
      process.exit(1)
    }
    // Extract custom_order_id from URL: https://ifdian.net/order/create?plan_id=XXX&custom_order_id=YYY
    const urlParams = new URLSearchParams(initData.url.split('?')[1])
    customOrderId = urlParams.get('custom_order_id')
    if (!customOrderId) {
      console.error('❌ 无法从返回的 URL 中提取 custom_order_id')
      process.exit(1)
    }
    console.log(`✅ 发起支付成功！获得订单 ID: ${customOrderId}`)
  } catch (err) {
    console.error('❌ 发起支付请求失败。', err.message)
    process.exit(1)
  }

  console.log('\n[3/3] 正在发送模拟 Webhook 支付成功回调...')
  try {
    const webhookPayload = {
      ec: 200,
      em: 'ok',
      data: {
        type: 'order',
        order: {
          out_trade_no: `test_trade_${Math.floor(Date.now() / 1000)}`,
          user_id: 'test_afdian_user_id',
          plan_id: 'your_plan_id_xyz',
          month: 1,
          total_amount: '5.00',
          status: 2, // 2 = successful
          remark: 'Local dev test payment',
          custom_order_id: customOrderId,
        },
        // 使用后端预留的测试环境验证绕过 token
        sign: 'dev_sign_bypass_123',
      },
    }

    const webhookRes = await fetch(`${baseUrl}/webhooks/afdian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    })

    const webhookData = await webhookRes.json()
    if (webhookRes.ok && webhookData.ec === 200) {
      console.log('✅ Webhook 模拟成功！')
      console.log('后端响应:', webhookData)
      console.log(
        '\n🎉 测试完成！请检查您的本地数据库（afdian_orders 状态与 users 的 premium 时间是否正确更新）。'
      )
    } else {
      console.error('❌ Webhook 响应异常:', webhookData)
    }
  } catch (err) {
    console.error('❌ Webhook 请求失败。', err.message)
    process.exit(1)
  }

  rl.close()
}

main()
