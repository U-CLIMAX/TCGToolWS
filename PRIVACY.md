# 隐私政策 / Privacy Policy

<p align="center">
  <a href="#隐私政策-简体中文"><b>简体中文</b></a> &nbsp;|&nbsp; <a href="#privacy-policy-english"><b>English</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Effective_Date-2026--08--27-blue?style=flat-square" alt="Effective Date">
  <img src="https://img.shields.io/badge/Project-TCGToolWS-orange?style=flat-square" alt="Project">
  <img src="https://img.shields.io/badge/License-GPL--3.0-green?style=flat-square" alt="License">
</p>

---

# 隐私政策 (简体中文)

生效日期：**2026 年 8 月 27 日**  
适用项目：**TCGToolWS (U CLIMAX)**

欢迎使用 **TCGToolWS (U CLIMAX)**（以下统称“本专案”或“我们”）。我们高度重视您的个人隐私与数据安全。本隐私政策旨在向您详尽说明在您浏览网站、使用卡片查询、构筑卡组、同步云端数据或进行功能赞助时，我们如何收集、使用、存储及保护您的信息，以及您行使个人权利的方式。

---

## 1. 引言与非官方项目声明

1. **非官方同人性质**：本专案是由玩家爱好者发起的非营利、开源卡片资料库与卡组构筑辅助工具，与 **Bushiroad Inc. (株式会社武士道)** 或任何相关权利方**无任何隶属、赞助、授权或关联关系**。
2. **知识产权声明**：本专案内所引用的卡片图像、卡面文字、卡牌参数、官方赛事名称及相关著作权、商标权等均严格归 **Bushiroad** 及其原版权方所有。本专案仅供玩家个人技术交流、卡表构筑与学术学习使用，严禁用于任何商业牟利行为。
3. **政策接受**：当您访问或使用本专案服务（包括注册账号、保存卡组、发表公开卡表、参与评分等），即表示您已阅读并同意本隐私政策的所有条款。

---

## 2. 我们收集的信息与存储规范

本专案秉持**最小化收集（Data Minimization）**原则，仅在实现具体功能所必需的前提下收集最少的信息。

| 类别                   | 收集数据项                                                                                                   | 存储位置                                                              | 生命周期与留存期                                                                                                                                            |
| :--------------------- | :----------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **账号认证**           | 电子邮箱地址、加盐密码哈希值（Scrypt）、角色权限等级（普通/赞助会员/开发者）、会员到期时间戳、最近登录时间戳 | Cloudflare D1 边缘数据库 (`users`)                                    | 持续保留至用户注销或申请删除账号                                                                                                                            |
| **注册与重置暂存**     | 注册邮箱、加盐哈希密码、6 位数字邮箱验证码、密码重设 Token                                                   | Cloudflare D1 边缘数据库 (`pending_registrations`, `password_resets`) | 验证通过后立即清除；过期数据由系统定时排程（每周日）自动物理清理                                                                                            |
| **用户生成内容 (UGC)** | 个人私有卡组（卡片 ID、卡组名称、系列识别码、游戏模式、封面卡、标签分类、编辑撤销历史）                      | Cloudflare D1 边缘数据库 (`decks`)                                    | 归属于用户账号，随用户账号注销连带级联删除                                                                                                                  |
| **公开牌库与评分**     | 牌组大厅公开发布卡组、比赛类型与名次、参赛人数区间、关联文章链接、1～5 星社群评分                            | Cloudflare D1 边缘数据库 (`decks_gallery`, `deck_ratings`)            | 随发布者账号注销连带级联完全删除                                                                                                                            |
| **翻译纠错反馈**       | 报错卡片 ID、翻译问题描述                                                                                    | Cloudflare D1 边缘数据库 (`translation_reports`)                      | 匿名保存，不与任何用户身份产生关联                                                                                                                          |
| **赞助与订单流水**     | 爱发电平台订单 UUID、关联用户 ID、订单处理状态、处理时间戳                                                   | Cloudflare D1 边缘数据库 (`afdian_orders`)                            | 用于权益激活审计。<br>**重要保证**：本专案**绝不**经手、处理或存储任何银行卡号、信用卡、支付密码、微信/支付宝账户凭证。所有付款流转均在爱发电平台独立完成。 |
| **安全与网络防护**     | 访问 IP 地址                                                                                                 | 内存级 Cloudflare Rate Limiter                                        | 瞬时处理（仅保留 60 秒滑动窗口用于防范暴力破解、暴力请求与恶意爬虫攻击），**不进行数据库长期留存或日志归档**                                                |

---

## 3. 本地存储技术规范 (Cookies & Local Storage)

本专案致力于提供流畅、毫秒级响应的构筑体验，大量计算与数据缓存直接在您的浏览器本地执行。

- **绝无第三方追踪 Cookie**：本专案**不设置任何第三方商业广告、跨网站画像或营销追踪类 Cookie**。
- **本地存储使用清单**：

| 技术手段           | 存储键名 (Key)             | 存储内容与业务目的                                                     | 留存机制                                                                         |
| :----------------- | :------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **LocalStorage**   | `auth`                     | 勾选“记住我”时的 JWT 登录凭证，维持无缝登录体验                        | 持续保留至用户手动登出或清除浏览器缓存                                           |
| **SessionStorage** | `auth`                     | 未勾选“记住我”时的 JWT 登录凭证                                        | 当前浏览器标签页或窗口关闭后即刻销毁                                             |
| **LocalStorage**   | `deck`                     | 当前正在编辑的卡组临时草稿、卡表数组、撤销/重做操作记录                | 跨页面刷新保留，避免意外关闭导致编辑成果丢失                                     |
| **LocalStorage**   | `ui`, `recent`, `download` | 界面主题外观、自定义背景壁纸、缩放尺寸、卡图打印偏好、最近查看卡片记录 | 纯本地偏好，不向服务器回传                                                       |
| **IndexedDB**      | `ws-card-db`               | 预先生成的全量卡牌信息表及 FlexSearch 分块全文检索索引                 | 存储于浏览器端沙盒数据库中；实现零网络请求延迟的本地卡牌搜索，版本更新时自动覆写 |

---

## 4. 信息的使用目的

我们仅将上述收集的信息用于以下明确的目的：

1. **提供核心功能**：实现账号注册、安全登录、密码找回、跨设备同步卡组、导入导出 DeckLog 及生成卡组分享链接。
2. **社区交互支持**：支持用户将得意卡组分享至“牌组大厅”、参与社区打分、展示赛事名次与战术攻略。
3. **会员权益履约**：通过爱发电 Webhook 自动核验赞助订单，并为赞助者解锁相应的扩展功能。
4. **服务安全与合规保障**：通过分布式速率限制（Rate Limiting）抵御针对登录接口和验证码接口的恶意凭证撞库、DoS/DDoS 拒绝服务攻击。

---

## 5. 第三方服务与数据交互

为了保障系统高可用性与轻量边缘分发，本专案整合了以下第三方服务：

1. **Cloudflare, Inc.**：
   - **用途**：提供全球边缘 CDN 节点、Workers Serverless 计算环境、D1 分布式关系型数据库、KV 键值缓存及基础网络安全防护。
   - **交互数据**：请求路由中的瞬时网络连接特征（IP 地址、User-Agent 等），以及保存在 D1 中的加密数据。
2. **Brevo (原 Sendinblue)**：
   - **用途**：事务型邮件服务（Transactional Email），用于发送用户注册时的 6 位验证码以及找回密码时的重置链接。
   - **交互数据**：收件人邮箱地址、一次性验证码或随机重设 Token。邮件发送后不对邮件内容做商业分析。
3. **爱发电 (Afdian.com)**：
   - **用途**：粉丝赞助与自愿付费渠道。
   - **交互数据**：本专案仅接收爱发电服务端发送的 Webhook 回调通知（包含订单编号、赞助者 ID、赞助方案名称及签名）。
4. **Umami Analytics**：
   - **用途**：自托管/去中心化的轻量级网站访问统计。
   - **交互数据**：完全去标识化的聚合流量数据（如每日访问量、热门页面、浏览器类型、设备屏幕分辨率）。**不使用 Cookie、不记录个人 IP、不追踪跨站行为**。
5. **GitHub**：
   - **用途**：开源代码托管，以及卡牌高清图片资源库 CDN 托管（`media.githubusercontent.com`）。

---

## 6. 数据保留、账号注销与级联删除 (Cascading Deletion)

1. **安全哈希加密**：
   - 您的密码在存储前，均使用业界公认的高强度 `scrypt` 算法并结合独立随机生成的 16 字节盐值（Salt）进行单向哈希处理。任何系统管理员均无法读取您的密码明文。
2. **级联完全删除（Cascading Delete）**：
   - 依据底层数据库的 `ON DELETE CASCADE` 外键机制，一旦您的账号被执行注销或物理删除，**与该账号关联的所有个人卡组、在“牌组大厅”公开发布的卡组、社区评分记录、订单关联记录都将从生产数据库中永久、同步且不可逆地完全抹除**，绝不在数据库中保留幽灵数据或脱敏遗留数据。
3. **定时排程清理**：
   - 系统内置定时调度任务（每周排程），自动物理删除过期的待验证注册信息（`pending_registrations`）与失效的密码重设凭证（`password_resets`）。

---

## 7. 用户权利与请求途径

依据通用个人数据保护原则，您对自身的个人数据拥有以下法定权利：

- **访问与查询权**：您有权随时登录个人账号，查看您保存的所有卡组与个人资料。
- **修改与更正权**：您有权更新您的卡组数据、重置登录密码。
- **删除与注销权**：您有权随时申请彻底注销您的个人账户，并清除所有关联数据。

### 如何行使您的权利与联系我们：

本专案为开源社区维护项目，统一通过官方 GitHub 仓库受理所有隐私与个人数据相关的咨询与处理请求：

- **受理途径**：请前往 [GitHub Issues](https://github.com/U-CLIMAX/TCGToolWS/issues) 或 [GitHub Discussions](https://github.com/U-CLIMAX/TCGToolWS/discussions) 提交请求。
- **处理时限**：维护团队在核实您的账号所有权（如通过注册邮箱发送确认）后，将于 7 个工作日内完成数据注销与物理清除，并在工单中向您反馈。

---

## 8. 政策变更与公示机制

随着专案功能的迭代升级，我们可能会适时更新本隐私政策。

- **更新告知**：本政策的所有历史修订与内容变更均通过 GitHub Commit 记录保持完全公开透明。对于重大调整，我们将在网站首页面板的**系统公告（Notice）**中显著公示。
- 若您在本政策更新生效后继续使用本服务，即表示您完全知晓并同意接受修订后的政策内容。

---

# Privacy Policy (English)

Effective Date: **August 27, 2026**  
Applicable Project: **TCGToolWS (U CLIMAX)**

Welcome to **TCGToolWS (U CLIMAX)** ("the Project", "we", "us", or "our"). We take your privacy and personal data protection very seriously. This Privacy Policy describes how we collect, use, store, and safeguard your information when you browse our website, search cards, construct decks, synchronize cloud data, or sponsor the project, as well as your rights regarding your data.

---

## 1. Introduction & Non-Official Project Disclaimer

1. **Non-Official Fan Project**: This project is a non-profit, open-source card database and deck-building utility created by card game enthusiasts. We are **not affiliated with, endorsed, sponsored, or certified by Bushiroad Inc.** or any of its subsidiaries.
2. **Intellectual Property Rights**: All card illustrations, card text, card attributes, official tournament marks, and associated intellectual properties referenced within the project are the sole property of **Bushiroad Inc.** and their respective copyright holders. This project is provided solely for personal player research, deck sharing, and educational purposes, and may not be used for commercial profit.
3. **Acceptance of Policy**: By accessing or using the Project (including creating an account, saving decks, publishing public deck lists, and submitting ratings), you acknowledge that you have read and agreed to the practices outlined in this Privacy Policy.

---

## 2. Information We Collect & Data Breakdown

We adhere to the principle of **Data Minimization**, collecting only the minimal information strictly required to provide our services.

| Category                         | Data Items                                                                                                                                                 | Storage Location                                                         | Retention Lifecycle                                                                                                                                                                                                            |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account Credentials**          | Email address, Scrypt-hashed password (with unique 16-byte salt), User role level (Free / VIP / Developer), VIP expiration timestamp, Last login timestamp | Cloudflare D1 Edge Database (`users`)                                    | Retained until account deletion or termination                                                                                                                                                                                 |
| **Registration & Reset**         | Email, hashed password, salt, 6-digit verification code, Password reset token                                                                              | Cloudflare D1 Edge Database (`pending_registrations`, `password_resets`) | Immediately deleted after verification; unverified/expired records pruned automatically via scheduled cron jobs                                                                                                                |
| **User Generated Content (UGC)** | Personal private decks (card IDs, deck names, series IDs, game modes, cover cards, tags, undo/redo history)                                                | Cloudflare D1 Edge Database (`decks`)                                    | Associated with user account; permanently deleted upon account deletion                                                                                                                                                        |
| **Public Gallery & Ratings**     | Shared public decks in the Gallery, tournament placements, participant tiers, related article URLs, 1–5 star community ratings                             | Cloudflare D1 Edge Database (`decks_gallery`, `deck_ratings`)            | Completely removed via cascading delete upon account deletion                                                                                                                                                                  |
| **Translation Feedback**         | Reported card ID, translation mistake description                                                                                                          | Cloudflare D1 Edge Database (`translation_reports`)                      | Stored anonymously without any user identification                                                                                                                                                                             |
| **Sponsorship Logs**             | Afdian order UUID, associated User ID, order status, processed timestamps                                                                                  | Cloudflare D1 Edge Database (`afdian_orders`)                            | Historical audit records.<br>**Security Guarantee**: We **never** access, handle, or store credit card numbers, bank accounts, payment passwords, or financial credentials. All payments are processed entirely on Afdian.com. |
| **Security & Rate Limiting**     | Client IP address                                                                                                                                          | In-memory Cloudflare Rate Limiter                                        | Processed ephemerally within a 60-second sliding window for anti-abuse and DDoS protection. **No persistent storage or archiving.**                                                                                            |

---

## 3. Client-Side Storage Specifications (Cookies & Local Storage)

To ensure instant, millisecond-level responsiveness, major computations and data caching occur directly within your browser.

- **No Tracking Cookies**: We **do not use any third-party marketing, behavioral profiling, or advertising cookies**.
- **Client Storage Usage Matrix**:

| Technology         | Key / Store                | Content & Purpose                                                                                                           | Lifecycle                                                                                                        |
| :----------------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **LocalStorage**   | `auth`                     | JWT session token when "Remember Me" is selected, ensuring seamless login                                                   | Stored until explicit sign-out or manual browser storage clearance                                               |
| **SessionStorage** | `auth`                     | JWT session token when "Remember Me" is unselected                                                                          | Automatically destroyed when closing the current browser tab or window                                           |
| **LocalStorage**   | `deck`                     | In-progress deck editing draft, unsaved card lists, undo/redo operation stacks                                              | Persisted across page reloads to prevent accidental loss of edits                                                |
| **LocalStorage**   | `ui`, `recent`, `download` | UI theme preferences, custom background wallpaper URL/Base64, zoom scales, card print configurations, recently viewed cards | Strictly local client preferences; never transmitted back to the server                                          |
| **IndexedDB**      | `ws-card-db`               | Pre-indexed full card database & FlexSearch chunks                                                                          | Sandboxed client-side database; powers offline, zero-network-latency card searching; refreshed upon version bump |

---

## 4. Purposes of Data Processing

We process collected information exclusively for the following purposes:

1. **Core Service Operation**: Managing user registrations, authentication, password recovery, cross-device deck synchronization, and DeckLog import/export.
2. **Community Interactions**: Allowing users to publish custom deck builds to the "Decks Gallery", review ratings, and exchange tactical tournament deck lists.
3. **Membership Fulfillment**: Automatically validating sponsor orders through Afdian webhooks to unlock VIP feature tiers.
4. **Security & System Integrity**: Applying distributed rate limiting to protect authentication endpoints from credential stuffing, brute-force exploits, and denial-of-service attacks.

---

## 5. Third-Party Services & Data Flow

To ensure global performance and high availability, the Project integrates with the following third-party infrastructure providers:

1. **Cloudflare, Inc.**:
   - **Purpose**: Global CDN delivery, Workers serverless computing runtime, D1 relational SQL database, KV key-value cache, and network-level DDoS mitigation.
   - **Data Shared**: Transient network parameters (IP addresses, request headers) and encrypted database records stored in D1.
2. **Brevo (formerly Sendinblue)**:
   - **Purpose**: Transactional email delivery for 6-digit registration codes and password recovery links.
   - **Data Shared**: Recipient email address and one-time verification tokens.
3. **Afdian (Afdian.com)**:
   - **Purpose**: Fan support and sponsorship processing platform.
   - **Data Shared**: We receive webhook notifications from Afdian containing order trade IDs, sponsor IDs, plan details, and verification signatures.
4. **Umami Analytics**:
   - **Purpose**: Self-hosted, privacy-first, cookieless web analytics.
   - **Data Shared**: Anonymized, aggregated site metrics (e.g., page views, referral sources, browser and operating system families). **No personal identification, no IP logging, and no cross-site tracking.**
5. **GitHub**:
   - **Purpose**: Open-source repository hosting and static card image CDN delivery (`media.githubusercontent.com`).

---

## 6. Data Retention, Account Cancellation & Cascading Deletion

1. **Cryptographic Protection**:
   - All passwords are encrypted prior to storage using the industry-standard `scrypt` key derivation function coupled with a uniquely generated 16-byte random salt. Plaintext passwords cannot be reversed or retrieved by anyone, including administrators.
2. **Cascading Deletion (`ON DELETE CASCADE`)**:
   - Our database enforces strict foreign key constraints. Upon account cancellation or deletion, **all personal decks, public decks published in the Gallery, ratings, and order associations belonging to that user are permanently and completely wiped from the database**. No orphaned or phantom user data remains.
3. **Automated Maintenance**:
   - A weekly background cron scheduler automatically purges expired pending registration codes (`pending_registrations`) and stale password reset tokens (`password_resets`).

---

## 7. User Rights & Contact Channels

In accordance with fundamental data privacy principles, you possess the following rights regarding your personal information:

- **Right of Access & Portability**: You may view your saved decks and profile status at any time by logging in.
- **Right to Rectification**: You can modify your deck contents, change tags, or reset your authentication credentials.
- **Right to Erasure (Right to Be Forgotten)**: You may request the permanent deletion and complete expungement of your account and all associated records.

### How to Exercise Your Rights:

Because this is an open-source community project, all privacy inquiries, data export requests, and account deletion applications are handled through our official GitHub Repository:

- **Contact Channel**: Please submit your request via [GitHub Issues](https://github.com/U-CLIMAX/TCGToolWS/issues) or [GitHub Discussions](https://github.com/U-CLIMAX/TCGToolWS/discussions).
- **Processing Time**: Once your account ownership is confirmed (e.g., via a verification email response from your registered address), the project maintainers will permanently execute the deletion within seven (7) business days.

---

## 8. Changes to Privacy Policy

We may periodically revise this Privacy Policy to reflect application updates or regulatory requirements.

- **Notification**: All revisions are tracked transparently through our public Git commit history. Substantive changes will also be highlighted in the website's **Notice system (`/api/notices`)**.
- Your continued use of the Project following any modifications indicates your acknowledgment and acceptance of the updated policy terms.
