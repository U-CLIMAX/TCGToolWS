export const deckRestrictionsLastUpdated = '2026/2/4'

export const deckRestrictions = {
  // Example format using Card Names:
  // 'hol': { // Series ID
  //   banned: ['Card Name A', 'Card Name B'],
  //   limited: [
  //     { cardName: 'Card Name C', limit: 1 },
  //     { cardName: 'Card Name D', limit: 2 }
  //   ],
  //   choice: [
  //     // Choose 1 kind (by name) from this list
  //     ['Card Name E', 'Card Name F']
  //   ]
  // }
  'dc': {
    choice: [['水着の杏', '木琴占い']],
  },
  'sy': {
    banned: ['情報連結解除'],
  },
  'persona': {
    banned: ['神木 秋成'],
  },
  'kc': {
    choice: [['陽炎型駆逐艦7番艦 初風', '暁型駆逐艦2番艦 響']],
  },
  'bd': {
    banned: ['キラキラを求めて 香澄'],
    choice: ['市ヶ谷有咲', 'がんばれパン', '拒絶の言葉 豊川祥子'],
  },
  'hll': {
    limited: [{ cardName: '見守る者 学園長', limit: 1 }],
  },
  'fate': {
    choice: [['銀糸錬金 天使の詩 イリヤ', '“闇夜の巡回”凛＆アーチャー', 'HEROIC 凛＆アーチャー']],
  },
  'dal': {
    limited: [{ cardName: '“最悪の精霊”狂三', limit: 2 }],
  },
  'sao': {
    banned: ['真っ直ぐな道 アリス'],
  },
  'lsp': {
    banned: ['ギャラクシー すみれ'],
    choice: [['ソングフォーオール!!', 'Liella! 可可']],
  },
  'all': {
    limited: [{ cardName: '“その笑顔を守るために”叶星', limit: 3 }],
  },
  '5hy': {
    limted: [{ cardName: '走り出す恋心 中野 二乃', limit: 2 }],
    choice: [
      [
        '大切なお守り',
        '回る日常 中野 二乃',
        '微睡の中 中野 一花',
        'ありがとうの花 中野 二乃',
        'めいっぱいのアプローチ 中野 二乃',
      ],
    ],
  },
  'hol': {
    banned: ['アニキ 百鬼あやめ'],
    limited: [{ cardName: '未来へと踏み出す一歩 がうる・ぐら', limit: 2 }],
    choice: [
      [
        '姫森ルーナ',
        'はあちゃまビーム 赤井はあと',
        'この世のものは脆すぎる 天音かなた',
        'プールでまったり 大神ミオ',
        '二人きりのアンコール 尾丸ポルカ',
      ],
    ],
  },
  'dct': {
    limited: [{ cardName: '夢見る高校生 蘭堂', limit: 3 }],
    choice: [['最高のアイドル ありや', '気付いた感情 える', '不思議な転校生 える']],
  },
  'ovl': {
    banned: ['豊穣の母神からの返礼 アインズ'],
    choice: [['魔導王 アインズ', '吸血鬼の真祖 シャルティア']],
  },
  'key': {
    choice: [['思い出とたい焼き あゆ', '宝物になった日', '最後の夏やすみ 観鈴', 'ひげ猫団 鴎']],
  },
  'tsk': {
    choice: [
      [
        '“爆炎の支配者”シズ',
        '静かなる怒り シュナ',
        '強者の元へ ベニマル',
        '自由を告げる鼓動 ミュウラン',
      ],
    ],
  },
  'csm': {
    limited: [{ cardName: '公安対魔特異4課 早川アキ', limit: 2 }],
    choice: [['同盟結成 姫野', '休憩中 姫野']],
  },
  'pad': {
    limited: [{ cardName: '甘美の零龍喚士・ネイ', limit: 1 }],
  },
  'sby': {
    limited: [{ cardName: '君と過ごした一年間 桜島 麻衣', limit: 2 }],
  },
  'isc': {
    limited: [{ cardName: '伸ばす手に乗せるのは 風野灯織', limit: 1 }],
    choice: [
      [
        '283プロダクション',
        'たそかれスワッグ 八宮めぐる',
        'アンシーン・ダブルキャスト 黛 冬優子',
        'interStellar-Stella 櫻木真乃',
        'Beautiful Sunset 白瀬咲耶',
      ],
    ],
  },
  'pjs': {
    choice: [['その心意気を買って 神代類', 'アウトドアクッキング！ 青柳冬弥']],
  },
  'ags': {
    choice: [
      [
        '“ツナギをまとった天使”リタ',
        '相河 愛花',
        '“ワイルド・ワイルド・ムードメーカー”リン',
        '私に出来ること 夜露',
        '暴走 のどか',
      ],
    ],
  },
  'uma': {
    choice: [
      [
        'シニカルガール ナイスネイチャ',
        '学園理事長 秋川やよい',
        'ブリュニサージュ・ライン メジロブライト',
      ],
    ],
  },
  'cs': {
    limited: [{ cardName: '“おわり”のない映画', limit: 1 }],
  },
  're0': {
    choice: [['パジャマパーティー レム', '無防備なあくび レム', 'ギンガムチェックの案内人 レム']],
  },
  'lhs': {
    choice: [
      [
        'Dream Believers 百生 吟子',
        'みんなで叶える物語 藤島 慈',
        'PASSION!!!!!! 藤島 慈',
        'ハクチューアラモード 大沢 瑠璃乃',
      ],
    ],
  },
}
