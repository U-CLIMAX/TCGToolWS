export const deckRestrictionsLastUpdated = '2026/7/11'

export const wsDeckRestrictions = {
  'dc': {
    choice: [
      [
        {
          cardName: '水着の杏',
          cardId: ['DC/W01-091', 'DC/WC01-091', 'DC/W81-P02S', 'DC/W128-P09', 'DC/W128-P09S'],
          prefix: 'dc-w01',
        },
        {
          cardName: '木琴占い',
          cardId: ['DC/W01-095', 'DC/WC01-095', 'DC/W81-P01S'],
          prefix: 'dc-w01',
        },
        {
          cardName: '選挙ポスター撮影',
          cardId: ['DC/W128-096', 'DC/W128-096S', 'DC/W128-096SP'],
          prefix: 'dc-w128',
        },
      ],
    ],
  },
  'sy': {
    banned: [
      { cardName: '情報連結解除', cardId: ['SY/W08-T16', 'SY/W08-097'], prefix: 'sy-w08-td' },
    ],
  },
  'persona': {
    banned: [{ cardName: '神木 秋成', cardId: ['P3/S01-014', 'P3/SC01-014'], prefix: 'p3-s01' }],
  },
  'kc': {
    choice: [
      [
        {
          cardName: '陽炎型駆逐艦7番艦 初風',
          cardId: ['KC/S25-006', 'KC/S42-105'],
          prefix: 'kc-s25',
        },
        { cardName: '暁型駆逐艦2番艦 響', cardId: ['KC/S25-056'], prefix: 'kc-s25' },
      ],
    ],
  },
  'bd': {
    banned: [
      {
        cardName: 'ミッシェルシール',
        cardId: ['BD/W54-021'],
        prefix: 'bd-w54',
        desc: '<p style="color:#c42727; font-weight:bold; margin:0 0 8px;">但是符合以下特殊条件的卡组无需遵守上述使用限制：</p><p style="margin:2px 0;">・角色卡：仅限带有《ハロー、ハッピーワールド！》特征的卡牌</p><p style="margin:2px 0;">・事件卡：无限制</p><p style="margin:2px 0;">・高潮卡：无限制</p>',
      },
    ],
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
        { cardName: '市ヶ谷有咲', cardId: ['BD/W47-082', 'BD/W47-082SP'], prefix: 'bd-w47' },
        {
          cardName: 'がんばれパン',
          cardId: ['BD/W54-065', 'BD/WE42-P36', 'BD/W125-063', 'BD/W125-063S'],
          prefix: 'bd-w54',
        },
        {
          cardName: '拒絶の言葉 豊川祥子',
          cardId: ['BD/W125-010', 'BD/W125-010S'],
          prefix: 'bd-w125',
        },
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
          cardName: '銀糸錬金 天使の詩 イリヤ',
          cardId: ['FS/S34-078', 'FS/S34-078S', 'FS/S77-079', 'FS/S77-079S'],
          prefix: 'fs-s34',
        },
        { cardName: '“闇夜の巡回”凛＆アーチャー', cardId: ['FS/S36-P03'], prefix: 'fs-s36-pr' },
        {
          cardName: 'HEROIC 凛＆アーチャー',
          cardId: ['FS/S64-063', 'FS/S64-063S'],
          prefix: 'fs-s64',
        },
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
    banned: [
      {
        cardName: '真っ直ぐな道 アリス',
        cardId: ['SAO/S100-011', 'SAO/S100-011S'],
        prefix: 'sao-s100',
      },
    ],
  },
  'lsp': {
    banned: [{ cardName: 'ギャラクシー すみれ', cardId: ['LSP/W92-062'], prefix: 'lsp-w92' }],
    choice: [
      [
        { cardName: 'ソングフォーオール!!', cardId: ['LSP/W92-038'], prefix: 'lsp-w92' },
        { cardName: 'Liella! 可可', cardId: ['LSP/W92-083', 'LSP/W92-083S'], prefix: 'lsp-w92' },
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
        {
          cardName: '微睡の中 中野 一花',
          cardId: ['5HY/W90-061', '5HY/W90-061S'],
          prefix: '5hy-w90',
        },
        {
          cardName: 'ありがとうの花 中野 二乃',
          cardId: ['5HY/W101-081', '5HY/W101-081HYR'],
          prefix: '5hy-w101',
        },
        {
          cardName: 'めいっぱいのアプローチ 中野 二乃',
          cardId: ['5HY/WE43-23', '5HY/WE43-23IGP'],
          prefix: '5hy-we43',
        },
      ],
    ],
  },
  'hol': {
    banned: [
      {
        cardName: 'アニキ 百鬼あやめ',
        cardId: ['HOL/W104-099', 'HOL/W104-099S'],
        prefix: 'hol-w104',
      },
    ],
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
        { cardName: '姫森ルーナ', cardId: ['HOL/W91-057', 'HOL/W91-057S'], prefix: 'hol-w91' },
        {
          cardName: 'はあちゃまビーム 赤井はあと',
          cardId: ['HOL/W91-105', 'HOL/W91-105S'],
          prefix: 'hol-w91',
        },
        {
          cardName: 'プールでまったり 大神ミオ',
          cardId: ['HOL/W104-040', 'HOL/W104-040S', 'HOL/W104-040SSP'],
          prefix: 'hol-w104',
        },
        {
          cardName: '二人きりのアンコール 尾丸ポルカ',
          cardId: ['HOL/W104-069', 'HOL/W104-069S', 'HOL/W104-069SSP'],
          prefix: 'hol-w104',
        },
      ],
    ],
  },
  'dct': {
    limited: [
      {
        cardName: '梦見る高校生 蘭堂', // Fixed original typo 梦->夢 if it was one, but keeping original literal string
        cardId: ['DCT/S86-079', 'DCT/S86-079SP'],
        limit: 3,
        prefix: 'dct-s86',
      },
    ],
    choice: [
      [
        {
          cardName: '最高のアイドル ありや',
          cardId: ['DCT/S86-002', 'DCT/S86-002SP'],
          prefix: 'dct-s86',
        },
        {
          cardName: '気付いた感情 える',
          cardId: ['DCT/S86-076', 'DCT/S86-076SP'],
          prefix: 'dct-s86',
        },
        { cardName: '不思議な転校生 える', cardId: ['DCT/S86-088'], prefix: 'dct-s86' },
      ],
    ],
  },
  'ovl': {
    banned: [
      {
        cardName: '豊穣の母神からの返礼 アインズ',
        cardId: ['OVL/S99-032', 'OVL/S99-032S'],
        prefix: 'ovl-s99',
      },
    ],
    choice: [
      [
        {
          cardName: '精神操作の吐息 アウラ',
          cardId: ['OVL/S62-106', 'OVL/SE54-31OLR'],
          prefix: 'ovl-s62-pr',
        },
        { cardName: '自信満々 アウラ', cardId: ['OVL/S99-104'], prefix: 'ovl-s99-pr' },
        {
          cardName: '骸骨の魔法使い アインズ',
          cardId: ['OVL/SE54-57', 'OVL/SE54-57OLR', 'OVL/SE54-57EX'],
          prefix: 'ovl-se54',
        },
        {
          cardName: '慈悲深き純白の悪魔 アルベド',
          cardId: ['OVL/SE54-61', 'OVL/SE54-61OLR', 'OVL/SE54-61SP'],
          prefix: 'ovl-se54',
        },
      ],
    ],
  },
  'key': {
    choice: [
      [
        {
          cardName: '思い出とたい焼き あゆ',
          cardId: ['Kka/W102-003', 'Kka/W102-003SP'],
          prefix: 'kka-w102',
        },
        {
          cardName: '宝物になった日',
          cardId: ['Kdb/W102-068', 'Kdb/W102-068S'],
          prefix: 'kdb-w102',
        },
        {
          cardName: '最後の夏やすみ 観鈴',
          cardId: ['Kai/W102-077', 'Kai/W102-077SP'],
          prefix: 'kai-w102',
        },
        { cardName: 'ひげ猫団 鴎', cardId: ['Ksm/W102-037', 'Ksm/W102-037S'], prefix: 'ksm-w102' },
      ],
    ],
  },
  'tsk': {
    choice: [
      [
        {
          cardName: '“爆炎の支配者”シズ',
          cardId: ['TSK/S70-065', 'TSK/S70-065SP'],
          prefix: 'tsk-s70',
        },
        {
          cardName: '静かなる怒り シュナ',
          cardId: ['TSK/S101-052', 'TSK/S101-052S'],
          prefix: 'tsk-s101',
        },
        {
          cardName: '強者の元へ ベニマル',
          cardId: ['TSK/S101-054', 'TSK/S101-054S'],
          prefix: 'tsk-s101',
        },
        {
          cardName: '自由を告げる鼓動 ミュウラン',
          cardId: ['TSK/S101-077', 'TSK/S101-077SP'],
          prefix: 'tsk-s101',
        },
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
        { cardName: '同盟結成 姫野', cardId: ['CSM/S96-085'], prefix: 'csm-s96' },
        { cardName: '休憩中 姫野', cardId: ['CSM/S96-086', 'CSM/S96-086S'], prefix: 'csm-s96' },
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
          cardName: 'たそかれスワッグ 八宮めぐる',
          cardId: ['ISC/S110-004', 'ISC/S110-004OFR', 'ISC/S110-004SSP'],
          prefix: 'isc-s110',
        },
        {
          cardName: 'アンシーン・ダブルキャスト 黛 冬優子',
          cardId: ['ISC/S110-038', 'ISC/S110-038SP'],
          prefix: 'isc-s110',
        },
        {
          cardName: 'interStellar-Stella 櫻木真乃',
          cardId: ['ISC/S110-061', 'ISC/S110-061OFR', 'ISC/S110-061SSP'],
          prefix: 'isc-s110',
        },
        {
          cardName: 'Beautiful Sunset 白瀬咲耶',
          cardId: ['ISC/S110-093', 'ISC/S110-093WIR'],
          prefix: 'isc-s110',
        },
      ],
    ],
  },
  'pjs': {
    choice: [
      [
        {
          cardName: 'その心意気を買って 神代類',
          cardId: ['PJS/S109-001', 'PJS/S109-001SSP'],
          prefix: 'pjs-s109',
        },
        {
          cardName: 'アウトドアクッキング！ 青柳冬弥',
          cardId: ['PJS/S109-060', 'PJS/S109-060SSP'],
          prefix: 'pjs-s109',
        },
      ],
    ],
  },
  'ags': {
    choice: [
      [
        {
          cardName: '“ツナギをまとった天使”リタ',
          cardId: ['AGS/W108-005', 'AGS/W108-005SP'],
          prefix: 'ags-w108',
        },
        { cardName: '相河 愛花', cardId: ['AGS/W108-009', 'AGS/W108-009S'], prefix: 'ags-w108' },
        {
          cardName: '“ワイルド・ワイルド・ムードメーカー”リン',
          cardId: ['AGS/W108-032', 'AGS/W108-032SP'],
          prefix: 'ags-w108',
        },
        {
          cardName: '私に出来ること 夜露',
          cardId: ['AGS/W108-034', 'AGS/W108-034S'],
          prefix: 'ags-w108',
        },
        { cardName: '暴走 のどか', cardId: ['AGS/W108-038', 'AGS/W108-038S'], prefix: 'ags-w108' },
      ],
    ],
  },
  'uma': {
    choice: [
      [
        {
          cardName: 'シニカルガール ナイスネイチャ',
          cardId: ['UMA/W106-T11', 'UMA/W106-T11R'],
          prefix: 'uma-w106-td',
        },
        {
          cardName: '学園理事長 秋川やよい',
          cardId: ['UMA/W106-035', 'UMA/W106-035S'],
          prefix: 'uma-w106',
        },
        {
          cardName: 'ブリュニサージュ・ライン メジロブライト',
          cardId: ['UMA/W106-131', 'UMA/W106-131SP'],
          prefix: 'uma-w106',
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
        {
          cardName: 'パジャマパーティー レム',
          cardId: ['RZ/S116-P09S', 'RZ/S116-P09EX'],
          prefix: 'rz-s116-pr',
        },
        {
          cardName: '無防備なあくび レム',
          cardId: ['RZ/S116-078', 'RZ/S116-078S', 'RZ/S116-078SP'],
          prefix: 'rz-s116',
        },
        {
          cardName: 'ギンガムチェックの案内人 レム',
          cardId: ['RZ/S116-083', 'RZ/S116-083S'],
          prefix: 'rz-s116',
        },
      ],
    ],
  },
  'lhs': {
    choice: [
      [
        {
          cardName: 'Dream Believers 百生 吟子',
          cardId: ['LHS/W122-002', 'LHS/W122-002S', 'LHS/W122-002EX'],
          prefix: 'lhs-w122',
        },
        {
          cardName: 'みんなで叶える物語 藤島 慈',
          cardId: ['LHS/W122-009', 'LHS/W122-009S', 'LHS/W122-009SP'],
          prefix: 'lhs-w122',
        },
        {
          cardName: 'PASSION!!!!!! 藤島 慈',
          cardId: ['LHS/W122-012', 'LHS/W122-012S'],
          prefix: 'lhs-w122',
        },
        {
          cardName: 'ハクチューアラモード 大沢 瑠璃乃',
          cardId: ['LHS/W122-050', 'LHS/W122-050S'],
          prefix: 'lhs-w122',
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
          cardName: '君と出会い、夢に翔ける 花海咲季',
          cardId: ['GIM/W124-045', 'GIM/W124-045S'],
          prefix: 'gim-w124',
        },
        {
          cardName: '世界一可愛い私 藤田ことね',
          cardId: ['GIM/W124-007', 'GIM/W124-007S', 'GIM/W124-007SP', 'GIM/W124-P09'],
          prefix: 'gim-w124',
        },
      ],
    ],
  },
}

export const wsrDeckRestrictions = {}

export const wscDeckRestrictions = {
  '[cn]sao': {
    banned: [
      {
        cardName: '坚定不移的道路 爱丽丝',
        cardId: ['SAO/SZ04-012', 'SAO/SZ04-012S'],
        prefix: '[cn]sao-sz04',
      },
    ],
  },
  '[cn]isc': {
    limited: [
      {
        cardName: '乘于伸出的手之上的是 风野灯织',
        cardId: ['ISC/SZ07-009', 'ISC/SZ07-009SP'],
        limit: 1,
        prefix: '[cn]isc-sz07',
      },
    ],
    choice: [
      [
        {
          cardName: '283PRODUCTION',
          cardId: ['ISC/SZ07-158'],
          prefix: '[cn]isc-sz07',
        },
        {
          cardName: 'Beautiful Sunset 白瀬咲耶',
          cardId: ['ISC/SZ07-150', 'ISC/SZ07-150WIR'],
          prefix: '[cn]isc-sz07',
        },
        {
          cardName: 'interStellar-Stella 樱木真乃',
          cardId: ['ISC/SZ07-062', 'ISC/SZ07-062OFR', 'ISC/SZ07-062SSP'],
          prefix: '[cn]isc-sz07',
        },
        {
          cardName: 'Unseen・Double Cast 黛冬优子',
          cardId: ['ISC/SZ07-043', 'ISC/SZ07-043SP'],
          prefix: '[cn]isc-sz07',
        },
        {
          cardName: '黄昏Swag 八宫巡',
          cardId: ['ISC/SZ07-005', 'ISC/SZ07-005OFR', 'ISC/SZ07-005SSP'],
          prefix: '[cn]isc-sz07',
        },
      ],
    ],
  },
}

export const deckRestrictions = {
  ...Object.fromEntries(
    Object.entries(wsDeckRestrictions).map(([id, v]) => [id, { ...v, game: 'ws' }])
  ),
  ...Object.fromEntries(
    Object.entries(wsrDeckRestrictions).map(([id, v]) => [id, { ...v, game: 'wsr' }])
  ),
  ...Object.fromEntries(
    Object.entries(wscDeckRestrictions).map(([id, v]) => [id, { ...v, game: 'wsc' }])
  ),
}
