import { Hono } from 'hono'
import { etag } from 'hono/etag'
import {
  handleSendVerificationCode,
  handleVerifyAndRegister,
  handleLogin,
  handleRefreshSession,
  handleForgotPasswordRequest,
  handleResetPassword,
  authMiddleware,
  handleAfdianWebhook,
} from './lib/auth.js'
import {
  handleCreateDeck,
  handleGetDecks,
  handleGetDecksMeta,
  handleGetDeckByKey,
  handleDeleteDeck,
  handleUpdateDeck,
  handleGetDecklogData,
  handleUpdateDeckTags,
} from './lib/decks.js'
import {
  handleGetDecksGallery,
  handleGetUserDecksGallery,
  handleDeleteGalleryDeck,
  handleGetMyGalleryCount,
  handleRateDeck,
  handleGetMyDeckRating,
  handleUpdateGalleryDeckMetadata,
} from './lib/gallery.js'
import { handleGetNotices, handleCreateNotice, handleDeleteNotice } from './lib/notices.js'
import {
  createRateLimiter,
  emailBodyKeyExtractor,
  ipKeyExtractor,
  userIdFromJwtKeyExtractor,
} from './lib/ratelimit.js'
import { handleInitiatePayment } from './lib/payments.js'
import { handleGetSeriesPrices } from './lib/prices.js'
import { handleCreateTranslationReport } from './lib/reports.js'
import { cleanupDatabase } from './services/db-cleanup.js'
import { publicCache } from './lib/utils.js'

/** @type {AppInstance} */
const app = new Hono().basePath('/api')

// Enable global ETag calculation (allows 304 Not Modified zero-byte response on weak networks)
app.use('*', etag())

// Fallback safety middleware: guarantee private no-cache for endpoints that don't explicitly declare public cache
app.use('*', async (c, next) => {
  await next()
  if (!c.res.headers.has('Cache-Control')) {
    c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
    c.header('Pragma', 'no-cache')
  }
})

// === Rate Limiter Middlewares ===
/** @type {AppMiddleware} */
const authCodeLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.AUTH_CODE_LIMITER,
    keyExtractor: emailBodyKeyExtractor,
  })(c, next)

/** @type {AppMiddleware} */
const authActionLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.AUTH_ACTION_LIMITER,
    keyExtractor: ipKeyExtractor,
  })(c, next)

/** @type {AppMiddleware} */
const apiUserLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.API_USER_LIMITER,
    keyExtractor: userIdFromJwtKeyExtractor,
  })(c, next)

/** @type {AppMiddleware} */
const publicReadLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.PUBLIC_READ_LIMITER,
    keyExtractor: ipKeyExtractor,
  })(c, next)

// === 公開的 Auth 路由 ===
/** @type {AppInstance} */
const authRoutes = new Hono()
authRoutes.post('/register/send-code', authCodeLimiter, handleSendVerificationCode)
authRoutes.post('/register/verify', authActionLimiter, handleVerifyAndRegister)
authRoutes.post('/login', authActionLimiter, handleLogin)
authRoutes.post('/password/forgot', authCodeLimiter, handleForgotPasswordRequest)
authRoutes.post('/password/reset', authActionLimiter, handleResetPassword)

// === 受保護的 Auth 路由 ===
authRoutes.post('/session/refresh', authMiddleware, apiUserLimiter, handleRefreshSession)

// === 受保護的 Deck 路由 ===
/** @type {AppInstance} */
const deckRoutes = new Hono()
deckRoutes.use('/*', authMiddleware, apiUserLimiter)
deckRoutes.post('/', handleCreateDeck)
deckRoutes.put('/:key', handleUpdateDeck)
deckRoutes.put('/:key/tags', handleUpdateDeckTags)
deckRoutes.get('/', handleGetDecks)
deckRoutes.get('/meta', handleGetDecksMeta)
deckRoutes.delete('/:key', handleDeleteDeck)

// === 公開的 Deck 路由 ===
/** @type {AppInstance} */
const publicDeckRoutes = new Hono()
publicDeckRoutes.use('/*', publicReadLimiter)
publicDeckRoutes.get(
  '/:key',
  publicCache({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 600 }),
  handleGetDeckByKey
)

// === 公開的 Decklog 路由 ===
/** @type {AppInstance} */
const decklogRoutes = new Hono()
decklogRoutes.use('/*', publicReadLimiter)
decklogRoutes.get(
  '/:key',
  publicCache({ maxAge: 300, sMaxAge: 1800, staleWhileRevalidate: 3600 }),
  handleGetDecklogData
)

// === Gallery 路由 ===
/** @type {AppInstance} */
const galleryRoutes = new Hono()
// 公開讀取
galleryRoutes.get(
  '/decks',
  publicReadLimiter,
  publicCache({ maxAge: 15, sMaxAge: 60, staleWhileRevalidate: 120 }),
  handleGetDecksGallery
)
// 需要驗證
galleryRoutes.use('/*', authMiddleware, apiUserLimiter)
galleryRoutes.get('/my-decks', handleGetUserDecksGallery)
galleryRoutes.get('/my-count', handleGetMyGalleryCount)
galleryRoutes.put('/decks/:key', handleUpdateGalleryDeckMetadata)
galleryRoutes.delete('/decks/:key', handleDeleteGalleryDeck)
galleryRoutes.post('/decks/:key/rating', handleRateDeck)
galleryRoutes.get('/decks/:key/rating', handleGetMyDeckRating)

// === Notice 路由 ===
/** @type {AppInstance} */
const noticeRoutes = new Hono()
noticeRoutes.get(
  '/',
  publicReadLimiter,
  publicCache({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 600 }),
  handleGetNotices
)
noticeRoutes.post('/', authMiddleware, apiUserLimiter, handleCreateNotice)
noticeRoutes.delete('/:id', authMiddleware, apiUserLimiter, handleDeleteNotice)

// === Price 路由 ===
/** @type {AppInstance} */
const priceRoutes = new Hono()
priceRoutes.get('/:seriesId', publicReadLimiter, handleGetSeriesPrices)

// === 受保護的 Payment 路由 ===
/** @type {AppInstance} */
const paymentRoutes = new Hono()
paymentRoutes.use('/*', authMiddleware, apiUserLimiter) // 必須登入才能創建訂單
paymentRoutes.post('/initiate', handleInitiatePayment)

// === Report 路由 ===
/** @type {AppInstance} */
const reportRoutes = new Hono()
reportRoutes.post('/translation', publicReadLimiter, handleCreateTranslationReport)

// === Webhook 路由 (公開, 但受簽名保護) ===
/** @type {AppInstance} */
const webhookRoutes = new Hono()
webhookRoutes.post('/afdian', handleAfdianWebhook)

// === 組合所有路由 ===
app.route('/', authRoutes)
app.route('/decks', deckRoutes)
app.route('/shared-decks', publicDeckRoutes)
app.route('/decklog', decklogRoutes)
app.route('/gallery', galleryRoutes)
app.route('/notices', noticeRoutes)
app.route('/prices', priceRoutes)
app.route('/webhooks', webhookRoutes)
app.route('/payments', paymentRoutes)
app.route('/reports', reportRoutes)

export default {
  fetch: app.fetch,
  /**
   * Handles Cloudflare Workers Cron Triggers scheduled tasks.
   * Dispatches tasks based on the `event.cron` string defined in the `wrangler.jsonc` crons array.
   * (When testing locally, append the URL-encoded `?cron` parameter to the `/cdn-cgi/handler/scheduled` request)
   *
   * @param {ScheduledController} event - The scheduled controller containing the cron string that triggered the event.
   * @param {Env} env - Environment variables and bindings.
   * @param {ExecutionContext} ctx - Execution context providing methods like waitUntil.
   */
  scheduled: async (event, env, ctx) => {
    if (event.cron === '0 0 * * 7') {
      ctx.waitUntil(cleanupDatabase(env))
    }
  },
}
