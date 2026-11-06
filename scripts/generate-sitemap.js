import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seriesMap } from '../src/maps/series-map.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const publicDir = resolve(rootDir, 'public')

const getBaseUrl = () => {
  if (process.env.VITE_WEBSITE_URL) {
    return process.env.VITE_WEBSITE_URL.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\/$/, '')
  }
  const envPath = resolve(rootDir, '.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(/^VITE_WEBSITE_URL=["']?([^"'\r\n]+)["']?/m)
    if (match && match[1]) {
      return match[1].trim().replace(/\/$/, '')
    }
  }
  return 'https://www.uclimax.top'
}

const BASE_URL = getBaseUrl()
const TODAY = new Date().toISOString().split('T')[0]

/**
 * Escape XML special characters to ensure 100% GSC compliance.
 * @param {string} str
 * @returns {string}
 */
const escapeXml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 核心靜態頁面清單
const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/search/ws', priority: '0.9', changefreq: 'daily' },
  { path: '/search/wsc', priority: '0.8', changefreq: 'weekly' },
  { path: '/search/wsr', priority: '0.8', changefreq: 'weekly' },
  { path: '/series', priority: '0.8', changefreq: 'weekly' },
  { path: '/gallery', priority: '0.7', changefreq: 'daily' },
  { path: '/banlist', priority: '0.7', changefreq: 'monthly' },
  { path: '/download', priority: '0.6', changefreq: 'monthly' },
  { path: '/community', priority: '0.5', changefreq: 'monthly' },
]

// 動態系列頁面
const seriesRoutes = Object.entries(seriesMap)
  .filter(([id]) => !['ws', 'wsr', 'wsc'].includes(id))
  .map(([id, info]) => ({
    path: `/series/${encodeURIComponent(id)}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: info.latestReleaseDate || TODAY,
  }))

const allRoutes = [...staticRoutes.map((r) => ({ ...r, lastmod: TODAY })), ...seriesRoutes]

// 生成 XML
const xmlUrls = allRoutes
  .map(
    (r) => `  <url>
    <loc>${escapeXml(`${BASE_URL}${r.path}`)}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>
`

// 生成 robots.txt
const robotsContent = `# Robots.txt for U-CLIMAX
User-agent: *
Allow: /
Disallow: /decks/
Disallow: /share-decks/
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${BASE_URL}/sitemap.xml
`

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemapContent, 'utf-8')
writeFileSync(resolve(publicDir, 'robots.txt'), robotsContent, 'utf-8')

console.log(
  `[Sitemap] Successfully generated ${allRoutes.length} URLs into public/sitemap.xml and public/robots.txt`
)
