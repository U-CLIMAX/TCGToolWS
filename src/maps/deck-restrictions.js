export const deckRestrictionsLastUpdated = '2026/6/24'

export const deckRestrictions = {
  'dc': {
    choice: [
      [
        {
          水着の杏: ['DC/W01-091', 'DC/WC01-091', 'DC/W81-P02S', 'DC/W128-P09', 'DC/W128-P09S'],
          prefix: 'dc-w01',
        },
        { 木琴占い: ['DC/W01-095', 'DC/WC01-095', 'DC/W81-P01S'], prefix: 'dc-w01' },
        { 選挙ポスター撮影: ['DC/W128-096', 'DC/W128-096S', 'DC/W128-096SP'], prefix: 'dc-w128' },
      ],
    ],
  },
  'sy': {
    banned: [{ 情報連結解除: ['SY/W08-T16', 'SY/W08-097'], prefix: 'sy-w08-td' }],
  },
  'persona': {
    banned: [{ '神木 秋成': ['P3/S01-014', 'P3/SC01-014'], 'prefix': 'p3-s01' }],
  },
  'kc': {
    choice: [
      [
        { '陽炎型駆逐艦7番艦 初風': ['KC/S25-006', 'KC/S42-105'], 'prefix': 'kc-s25' },
        { '暁型駆逐艦2番艦 響': ['KC/S25-056'], 'prefix': 'kc-s25' },
      ],
    ],
  },
  'bd': {
    banned: [{ ミッシェルシール: ['BD/W54-021'], prefix: 'bd-w54' }],
    limited: [
      {
        cardName: 'キラキラを求めて 香澄',
        cardId: ['BD/W47-P28', 'BD/W47-P28S'],
        limit: 1,
        prefix: 'bd-w47-pr',
      },
    ],
    choice: [
      [
        { 市ヶ谷有咲: ['BD/W47-082', 'BD/W47-082SP'], prefix: 'bd-w47' },
        {
          がんばれパン: ['BD/W54-065', 'BD/WE42-P36', 'BD/W125-063', 'BD/W125-063S'],
          prefix: 'bd-w54',
        },
        { '拒絶の言葉 豊川祥子': ['BD/W125-010', 'BD/W125-010S'], 'prefix': 'bd-w125' },
      ],
    ],
  },
  'hll': {
    limited: [
      { cardName: '見守る者 学園長', cardId: ['HLL/WE29-11'], limit: 1, prefix: 'hll-we29' },
    ],
  },
  'fate': {
    choice: [
      [
        {
          '銀糸錬金 天使の詩 イリヤ': ['FS/S34-078', 'FS/S34-078S', 'FS/S77-079', 'FS/S77-079S'],
          'prefix': 'fs-s34',
        },
        { '“闇夜の巡回”凛＆アーチャー': ['FS/S36-P03'], 'prefix': 'fs-s36-pr' },
        { 'HEROIC 凛＆アーチャー': ['FS/S64-063', 'FS/S64-063S'], 'prefix': 'fs-s64' },
      ],
    ],
  },
  'dal': {
    limited: [
      {
        cardName: '“最悪の精霊”狂三',
        cardId: ['DAL/W79-053', 'DAL/W79-053SEC', 'DAL/W131-P04S'],
        limit: 2,
        prefix: 'dal-w79',
      },
    ],
  },
  'sao': {
    banned: [{ '真っ直ぐな道 アリス': ['SAO/S100-011', 'SAO/S100-011S'], 'prefix': 'sao-s100' }],
  },
  'lsp': {
    banned: [{ 'ギャラクシー すみれ': ['LSP/W92-062'], 'prefix': 'lsp-w92' }],
    choice: [
      [
        { 'ソングフォーオール!!': ['LSP/W92-038'], 'prefix': 'lsp-w92' },
        { 'Liella! 可可': ['LSP/W92-083', 'LSP/W92-083S'], 'prefix': 'lsp-w92' },
      ],
    ],
  },
  'all': {
    limited: [
      {
        cardName: '“その笑顔を守るために”叶星',
        cardId: ['ALL/S90-008', 'ALL/S90-008SP'],
        limit: 3,
        prefix: 'all-s90',
      },
    ],
  },
  '5hy': {
    limited: [
      {
        cardName: '走り出す恋心 中野 二乃',
        cardId: ['5HY/W90-052', '5HY/W90-052SSP'],
        limit: 2,
        prefix: '5hy-w90',
      },
    ],
    choice: [
      [
        { '微睡の中 中野 一花': ['5HY/W90-061', '5HY/W90-061S'], 'prefix': '5hy-w90' },
        { 'ありがとうの花 中野 二乃': ['5HY/W101-081', '5HY/W101-081HYR'], 'prefix': '5hy-w101' },
        {
          'めいっぱいのアプローチ 中野 二乃': ['5HY/WE43-23', '5HY/WE43-23IGP'],
          'prefix': '5hy-we43',
        },
      ],
    ],
  },
  'hol': {
    banned: [{ 'アニキ 百鬼あやめ': ['HOL/W104-099', 'HOL/W104-099S'], 'prefix': 'hol-w104' }],
    limited: [
      {
        cardName: '未来へと踏み出す一歩 がうる・ぐら',
        cardId: ['HOL/W104-113', 'HOL/W104-113S', 'HOL/W104-113SP'],
        limit: 2,
        prefix: 'hol-w104',
      },
    ],
    choice: [
      [
        { 姫森ルーナ: ['HOL/W91-057', 'HOL/W91-057S'], prefix: 'hol-w91' },
        { 'はあちゃまビーム 赤井はあと': ['HOL/W91-105', 'HOL/W91-105S'], 'prefix': 'hol-w91' },
        {
          'プールでまったり 大神ミオ': ['HOL/W104-040', 'HOL/W104-040S', 'HOL/W104-040SSP'],
          'prefix': 'hol-w104',
        },
        {
          '二人きりのアンコール 尾丸ポルカ': ['HOL/W104-069', 'HOL/W104-069S', 'HOL/W104-069SSP'],
          'prefix': 'hol-w104',
        },
      ],
    ],
  },
  'dct': {
    limited: [
      {
        cardName: '夢見る高校生 蘭堂',
        cardId: ['DCT/S86-079', 'DCT/S86-079SP'],
        limit: 3,
        prefix: 'dct-s86',
      },
    ],
    choice: [
      [
        { '最高のアイドル ありや': ['DCT/S86-002', 'DCT/S86-002SP'], 'prefix': 'dct-s86' },
        { '気付いた感情 える': ['DCT/S86-076', 'DCT/S86-076SP'], 'prefix': 'dct-s86' },
        { '不思議な転校生 える': ['DCT/S86-088'], 'prefix': 'dct-s86' },
      ],
    ],
  },
  'ovl': {
    banned: [
      { '豊穣の母神からの返礼 アインズ': ['OVL/S99-032', 'OVL/S99-032S'], 'prefix': 'ovl-s99' },
    ],
    choice: [
      [
        { '精神操作の吐息 アウラ': ['OVL/S62-106', 'OVL/SE54-31OLR'], 'prefix': 'ovl-s62-pr' },
        { '自信満々 アウラ': ['OVL/S99-104'], 'prefix': 'ovl-s99-pr' },
        {
          '骸骨の魔法使い アインズ': ['OVL/SE54-57', 'OVL/SE54-57OLR', 'OVL/SE54-57EX'],
          'prefix': 'ovl-se54',
        },
        {
          '慈悲深き純白の悪魔 アルベド': ['OVL/SE54-61', 'OVL/SE54-61OLR', 'OVL/SE54-61SP'],
          'prefix': 'ovl-se54',
        },
      ],
    ],
  },
  'key': {
    choice: [
      [
        { '思い出とたい焼き あゆ': ['Kka/W102-003', 'Kka/W102-003SP'], 'prefix': 'kka-w102' },
        { 宝物になった日: ['Kdb/W102-068', 'Kdb/W102-068S'], prefix: 'kdb-w102' },
        { '最後の夏やすみ 観鈴': ['Kai/W102-077', 'Kai/W102-077SP'], 'prefix': 'kai-w102' },
        { 'ひげ猫団 鴎': ['Ksm/W102-037', 'Ksm/W102-037S'], 'prefix': 'ksm-w102' },
      ],
    ],
  },
  'tsk': {
    choice: [
      [
        { '“爆炎の支配者”シズ': ['TSK/S70-065', 'TSK/S70-065SP'], 'prefix': 'tsk-s70' },
        { '静かなる怒り シュナ': ['TSK/S101-052', 'TSK/S101-052S'], 'prefix': 'tsk-s101' },
        { '強者の元へ ベニマル': ['TSK/S101-054', 'TSK/S101-054S'], 'prefix': 'tsk-s101' },
        { '自由を告げる鼓動 ミュウラン': ['TSK/S101-077', 'TSK/S101-077SP'], 'prefix': 'tsk-s101' },
      ],
    ],
  },
  'csm': {
    limited: [
      {
        cardName: '公安対魔特異4課 早川アキ',
        cardId: ['CSM/S96-029', 'CSM/S96-029S'],
        limit: 2,
        prefix: 'csm-s96',
      },
    ],
    choice: [
      [
        { '同盟結成 姫野': ['CSM/S96-085'], 'prefix': 'csm-s96' },
        { '休憩中 姫野': ['CSM/S96-086', 'CSM/S96-086S'], 'prefix': 'csm-s96' },
      ],
    ],
  },
  'pad': {
    limited: [
      {
        cardName: '甘美の零龍喚士・ネイ',
        cardId: ['PAD/S105-003', 'PAD/S105-003SP'],
        limit: 1,
        prefix: 'pad-s105',
      },
    ],
  },
  'sby': {
    limited: [
      {
        cardName: '君と過ごした一年間 桜島 麻衣',
        cardId: ['SBY/W114-049', 'SBY/W114-049ABR', 'SBY/W114-049OFR'],
        limit: 2,
        prefix: 'sby-w114',
      },
    ],
  },
  'isc': {
    limited: [
      {
        cardName: '伸ばす手に乗せるのは 風野灯織',
        cardId: ['ISC/S110-009', 'ISC/S110-009SP'],
        limit: 1,
        prefix: 'isc-s110',
      },
    ],
    choice: [
      [
        {
          'たそかれスワッグ 八宮めぐる': ['ISC/S110-004', 'ISC/S110-004OFR', 'ISC/S110-004SSP'],
          'prefix': 'isc-s110',
        },
        {
          'アンシーン・ダブルキャスト 黛 冬優子': ['ISC/S110-038', 'ISC/S110-038SP'],
          'prefix': 'isc-s110',
        },
        {
          'interStellar-Stella 櫻木真乃': ['ISC/S110-061', 'ISC/S110-061OFR', 'ISC/S110-061SSP'],
          'prefix': 'isc-s110',
        },
        { 'Beautiful Sunset 白瀬咲耶': ['ISC/S110-093', 'ISC/S110-093WIR'], 'prefix': 'isc-s110' },
      ],
    ],
  },
  'pjs': {
    choice: [
      [
        { 'その心意気を買って 神代類': ['PJS/S109-001', 'PJS/S109-001SSP'], 'prefix': 'pjs-s109' },
        {
          'アウトドアクッキング！ 青柳冬弥': ['PJS/S109-060', 'PJS/S109-060SSP'],
          'prefix': 'pjs-s109',
        },
      ],
    ],
  },
  'ags': {
    choice: [
      [
        { '“ツナギをまとった天使”リタ': ['AGS/W108-005', 'AGS/W108-005SP'], 'prefix': 'ags-w108' },
        { '相河 愛花': ['AGS/W108-009', 'AGS/W108-009S'], 'prefix': 'ags-w108' },
        {
          '“ワイルド・ワイルド・ムードメーカー”リン': ['AGS/W108-032', 'AGS/W108-032SP'],
          'prefix': 'ags-w108',
        },
        { '私に出来ること 夜露': ['AGS/W108-034', 'AGS/W108-034S'], 'prefix': 'ags-w108' },
        { '暴走 のどか': ['AGS/W108-038', 'AGS/W108-038S'], 'prefix': 'ags-w108' },
      ],
    ],
  },
  'uma': {
    choice: [
      [
        {
          'シニカルガール ナイスネイチャ': ['UMA/W106-T11', 'UMA/W106-T11R'],
          'prefix': 'uma-w106-td',
        },
        { '学園理事長 秋川やよい': ['UMA/W106-035', 'UMA/W106-035S'], 'prefix': 'uma-w106' },
        {
          'ブリュニサージュ・ライン メジロブライト': ['UMA/W106-131', 'UMA/W106-131SP'],
          'prefix': 'uma-w106',
        },
      ],
    ],
  },
  'cs': {
    limited: [
      {
        cardName: '“おわり”のない映画',
        cardId: ['CS/S114-047', 'CS/S114-047S'],
        limit: 1,
        prefix: 'cs-s114',
      },
    ],
  },
  're0': {
    choice: [
      [
        { 'パジャマパーティー レム': ['RZ/S116-P09S', 'RZ/S116-P09EX'], 'prefix': 'rz-s116-pr' },
        {
          '無防備なあくび レム': ['RZ/S116-078', 'RZ/S116-078S', 'RZ/S116-078SP'],
          'prefix': 'rz-s116',
        },
        { 'ギンガムチェックの案内人 レム': ['RZ/S116-083', 'RZ/S116-083S'], 'prefix': 'rz-s116' },
      ],
    ],
  },
  'lhs': {
    choice: [
      [
        {
          'Dream Believers 百生 吟子': ['LHS/W122-002', 'LHS/W122-002S', 'LHS/W122-002EX'],
          'prefix': 'lhs-w122',
        },
        {
          'みんなで叶える物語 藤島 慈': ['LHS/W122-009', 'LHS/W122-009S', 'LHS/W122-009SP'],
          'prefix': 'lhs-w122',
        },
        { 'PASSION!!!!!! 藤島 慈': ['LHS/W122-012', 'LHS/W122-012S'], 'prefix': 'lhs-w122' },
        {
          'ハクチューアラモード 大沢 瑠璃乃': ['LHS/W122-050', 'LHS/W122-050S'],
          'prefix': 'lhs-w122',
        },
      ],
    ],
  },
  'gim': {
    limited: [
      {
        cardName: 'アイヴイ 月村手毬',
        cardId: [
          'GIM/W124-071a',
          'GIM/W124-071b',
          'GIM/W124-071EX',
          'GIM/W124-071S',
          'GIM/W124-071SP',
        ],
        limit: 2,
        prefix: 'gim-w124',
      },
    ],
    choice: [
      [
        {
          '君と出会い、夢に翔ける 花海咲季': ['GIM/W124-045', 'GIM/W124-045S'],
          'prefix': 'gim-w124',
        },
        {
          '世界一可愛い私 藤田ことね': [
            'GIM/W124-007',
            'GIM/W124-007S',
            'GIM/W124-007SP',
            'GIM/W124-P09',
          ],
          'prefix': 'gim-w124',
        },
      ],
    ],
  },
}
