import fs from 'fs'
import path from 'path'
import { extractCardSlangs, WS_SLANG_DEFINITIONS } from '../src/maps/card-slang-rules.js'

const CARD_DATA_DIR = './src/assets/card-data'

console.log('=== WS Card Slang Verification Suite ===\n')

// 1. Golden Fixtures
const GOLDEN_FIXTURES = [
  {
    file: 'gup-w141-td.json',
    id: 'GUP/W141-T14',
    name: '大洗女子学園 角谷 杏',
    mustInclude: ['彩飘'],
    mustExclude: ['墓飘', '手血'],
  },
  {
    file: 'sts-w140-td.json',
    id: 'STS/W140-T18',
    name: '巡遊者 コハク',
    mustInclude: [],
    mustExclude: ['手血', '彩飘', '墓飘'],
  },
  {
    file: 'cha-w40.json',
    id: 'CHA/W40-001',
    name: '大切な何か 乙坂 歩未',
    mustInclude: ['冰甲'],
    mustExclude: [],
  },
  {
    file: 'lss-we27.json',
    id: 'LSS/WE27-21',
    name: '“青空Jumping Heart”渡辺 曜',
    mustInclude: ['渡边曜'],
    mustExclude: [],
  },
  {
    file: '5hy-w101.json',
    id: '5HY/W101-081',
    name: 'ありがとうの花 中野 二乃',
    mustInclude: ['手血'],
    mustExclude: [],
  },
  {
    file: '5hy-w101.json',
    id: '5HY/W101-040',
    name: '勤勉な放課後 中野 五月',
    mustInclude: ['彩飘'],
    mustExclude: ['墓飘'],
  },
  {
    file: '5hy-w90.json',
    id: '5HY/W90-024',
    name: 'ムードメーカー 中野 四葉',
    mustInclude: ['彩飘', '墓飘'],
    mustExclude: [],
  },
  {
    file: '5hy-w83.json',
    id: '5HY/W83-031',
    name: '輝く笑顔 中野 四葉',
    mustInclude: ['中学生'],
    mustExclude: ['血学生', '逃学生'],
  },
  {
    file: 'hbr-w117.json',
    id: 'HBR/W117-086',
    name: 'トドケ・Miracle 蒼井 えりか',
    mustInclude: ['血学生'],
    mustExclude: ['中学生', '逃学生'],
  },
  {
    file: 'anm-w138.json',
    id: 'ANM/W138-005',
    name: '“温泉を堪能”六花',
    mustInclude: ['逃学生'],
    mustExclude: ['中学生', '血学生'],
  },
  {
    file: '5hy-w90.json',
    id: '5HY/W90-001',
    name: '女優として 中野 一花',
    mustInclude: ['才研'],
    mustExclude: ['费血'],
  },
  {
    file: '5hy-w83.json',
    id: '5HY/W83-007',
    name: '仲良し姉妹 中野 一花',
    mustInclude: ['费血'],
    mustExclude: ['才研'],
  },
  {
    file: '5hy-w83.json',
    id: '5HY/W83-065',
    name: '五等分の花嫁 中野 五月',
    mustInclude: ['死冬晓'],
    mustExclude: ['冬晓'],
  },
  {
    file: '5hy-w83-pr.json',
    id: '5HY/W83-P01',
    name: '純潔無垢 中野 一花',
    mustInclude: ['拔刀'],
    mustExclude: [],
  },
  {
    file: 'bd-w125.json',
    id: 'BD/W125-063',
    name: 'がんばれパン',
    mustInclude: ['面包'],
    mustExclude: [],
  },
  {
    file: 'ab-w31-pr.json',
    id: 'AB/W31-P05',
    name: '暖かな気持ち かなで',
    mustInclude: ['武藏'],
    mustExclude: [],
  },
]

let passedFixtures = 0
for (const fix of GOLDEN_FIXTURES) {
  const filePath = path.join(CARD_DATA_DIR, fix.file)
  if (!fs.existsSync(filePath)) {
    console.error(`Fixture file not found: ${filePath}`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  let card = null
  for (const k in data) {
    if (k.includes(fix.id) || (data[k].card_no && data[k].card_no.includes(fix.id))) {
      card = data[k]
      break
    }
  }
  if (!card) {
    console.error(`Fixture card not found: ${fix.id}`)
    process.exit(1)
  }
  const slangs = extractCardSlangs(card.effect, card)
  for (const inc of fix.mustInclude) {
    if (!slangs.includes(inc)) {
      console.error(
        `[FAIL] ${fix.id} (${fix.name}) expected to have [${inc}], but got: [${slangs.join(', ')}]`
      )
      process.exit(1)
    }
  }
  for (const exc of fix.mustExclude) {
    if (slangs.includes(exc)) {
      console.error(
        `[FAIL] ${fix.id} (${fix.name}) expected to NOT have [${exc}], but got: [${slangs.join(', ')}]`
      )
      process.exit(1)
    }
  }
  console.log(`[PASS] Fixture ${fix.id} (${fix.name}): [${slangs.join(', ')}]`)
  passedFixtures++
}

console.log(`\nAll ${passedFixtures} golden fixtures passed!`)

// 2. Scan all cards for Single-Ability Invariants
console.log('\nScanning all 48,000+ cards for single-ability mutual exclusion violations...')
const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))

let violations = 0
let totalCards = 0

const mutuallyExclusivePairs = [
  ['彩飘', '墓飘'],
  ['冬晓', '死冬晓'],
  ['小梅', '死小梅'],
  ['中学生', '血学生'],
  ['中学生', '逃学生'],
  ['血学生', '逃学生'],
]

for (const f of files) {
  const content = JSON.parse(fs.readFileSync(path.join(CARD_DATA_DIR, f), 'utf-8'))
  for (const k in content) {
    totalCards++
    const card = content[k]
    const eff = card.effect || ''
    const abs = eff.split(/<br\s*\/?>/i)
    for (const a of abs) {
      const matchedThisAbility = []
      for (const def of WS_SLANG_DEFINITIONS) {
        if (def.test(a, eff, card)) {
          matchedThisAbility.push(def.name)
        }
      }
      for (const [p1, p2] of mutuallyExclusivePairs) {
        if (matchedThisAbility.includes(p1) && matchedThisAbility.includes(p2)) {
          console.error(
            `[VIOLATION] Card ${card.card_no || k} in ${f} ability simultaneously matched ${p1} and ${p2}!`
          )
          console.error(`  Ability: ${a}`)
          violations++
        }
      }
    }
  }
}

if (violations > 0) {
  console.error(`\nFound ${violations} single-ability mutual exclusion violations!`)
  process.exit(1)
} else {
  console.log(
    `\nSuccessfully verified ${totalCards} cards across ${files.length} files. Zero mutual exclusion violations!`
  )
}
