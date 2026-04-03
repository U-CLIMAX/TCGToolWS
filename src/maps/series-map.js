const wsSeriesMap = {
  'VIRTUAL GIRL': {
    id: 'vrg',
    prefixes: ['VRG', 'BDY'],
    latestReleaseDate: '2026-03-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bdytd&vers[]=vrgext&rare=&type=&kizu=0',
  },
  '传说系列': {
    id: 'tal',
    prefixes: ['TAL'],
    latestReleaseDate: '2026-01-16',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tal&rare=&type=&kizu=0',
  },
  'Re：从零开始的异世界生活': {
    id: 're0',
    prefixes: ['RZ'],
    latestReleaseDate: '2024-11-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rz&vers[]=rz2.0&vers[]=rz3.0&vers[]=rz4.0&vers[]=rzext1.0&rare=&type=&kizu=0',
  },
  '富士见Fantasia文库': {
    id: 'fantasia',
    prefixes: [
      'F35',
      'Fab',
      'Fcr',
      'Fdd',
      'Fdl',
      'Fdy',
      'Ffp',
      'Fgc',
      'Fgi',
      'Fgm',
      'Fhc',
      'Fii',
      'Fil',
      'Fjk',
      'Fkd',
      'Fkk',
      'Fkm',
      'Fkn',
      'Fks',
      'Fkz',
      'Fma',
      'Fmr',
      'Foo',
      'Fos',
      'Foy',
      'Fra',
      'Fsa',
      'Fsh',
      'Fsi',
      'Fsl',
      'Fsp',
      'Fsr',
      'Ftr',
      'Ftt',
      'Fvd',
    ],
    latestReleaseDate: '2024-10-25',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fujimif&vers[]=fujimif2.0&rare=&type=&kizu=0',
  },
  '女神异闻录': {
    id: 'persona',
    prefixes: ['P3', 'P4', 'PQ', 'P5'],
    latestReleaseDate: '2024-05-17',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=p3&vers[]=p3chronicle&vers[]=p3rpb&vers[]=p4&vers[]=animep4&vers[]=p5&vers[]=p4ext&vers[]=animep4ext1.0&vers[]=p4uext1.0&vers[]=pqext&rare=&type=&kizu=0',
  },
  '莉可丽丝': {
    id: 'lrc',
    prefixes: ['LRC'],
    latestReleaseDate: '2024-11-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lrc&vers[]=lrcpb&rare=&type=&kizu=0',
  },
  '少女乐队的呐喊': {
    id: 'gbc',
    prefixes: ['GCR'],
    latestReleaseDate: '2025-02-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gcrpb&rare=&type=&kizu=0',
  },
  '足球小将': {
    id: 'ctb',
    prefixes: ['CTB'],
    latestReleaseDate: '2024-09-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ctb&rare=&type=&kizu=0',
  },
  '蜡笔小新': {
    id: 'cs',
    prefixes: ['CS'],
    latestReleaseDate: '2024-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=shinchan&vers[]=shinchan2.0&rare=&type=&kizu=0',
  },
  '摇曳露营': {
    id: 'yrc',
    prefixes: ['YRC'],
    latestReleaseDate: '2024-11-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yrc&rare=&type=&kizu=0',
  },
  '里世界郊游': {
    id: 'rsk',
    prefixes: ['RSK'],
    latestReleaseDate: '2024-01-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rskext&rare=&type=&kizu=0',
  },
  'BanG Dream!': {
    id: 'bd',
    prefixes: ['BD', 'BDY'],
    latestReleaseDate: '2026-03-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bd&vers[]=bd4.0&vers[]=bd2.0&vers[]=bd3.0&vers[]=bd2.0td&vers[]=bdsp&vers[]=bdpb&vers[]=bdextmorras&vers[]=bdextppros&vers[]=bd5th&vers[]=bdpb2.0&vers[]=bd5.0&vers[]=bdpb3.0&vers[]=bdytd&rare=&type=&kizu=0',
  },
  '缘结甘神家': {
    id: 'amg',
    prefixes: ['AMG'],
    latestReleaseDate: '2025-04-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=amg&rare=&type=&kizu=0',
  },
  '世界计划多彩舞台 feat. 初音未来': {
    id: 'pjs',
    prefixes: ['PJS'],
    latestReleaseDate: '2025-12-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pjs&vers[]=pjs2.0&vers[]=pjs3.0&vers[]=pjsext&rare=&type=&kizu=0',
  },
  '青桐高校': {
    id: 'aoh',
    prefixes: ['AOH'],
    latestReleaseDate: '2025-06-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aoh&rare=&type=&kizu=0',
  },
  'Love Live! 莲之空女学院学园偶像俱乐部': {
    id: 'lhs',
    prefixes: ['LHS'],
    latestReleaseDate: '2025-01-31',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lhs&rare=&type=&kizu=0',
  },
  '偶像大师 灰姑娘女孩': {
    id: 'imc',
    prefixes: ['IMC'],
    latestReleaseDate: '2026-01-30',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=imc&vers[]=imc2nd&vers[]=imc3.0&vers[]=imcpb&rare=&type=&kizu=0',
  },
  'Angel Beats!／Kud Wafter': {
    id: 'ab',
    prefixes: ['AB', 'KW', 'Kab', 'Hab', 'Kkw'],
    latestReleaseDate: '2014-06-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ab&vers[]=abre&vers[]=abext&vers[]=abext2.0&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  'CANAAN': {
    id: 'cn',
    prefixes: ['CN'],
    latestReleaseDate: '2009-08-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ca&rare=&type=&kizu=0',
  },
  'CLANNAD': {
    id: 'cl',
    prefixes: ['CL', 'Kcl', 'Kta'],
    latestReleaseDate: '2016-04-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=clext1.0&vers[]=clext2.0&vers[]=clext3.0&vers[]=clpset&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  'PIXAR': {
    id: 'pxr',
    prefixes: ['PXR', 'Dpx', 'MRp'],
    latestReleaseDate: '2025-08-01',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pxr&vers[]=pxr2.0&vers[]=disney&vers[]=mr&rare=&type=&kizu=0',
  },
  'Charlotte': {
    id: 'cha',
    prefixes: ['CHA', 'Kch'],
    latestReleaseDate: '2015-10-30',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=charlotte1.0&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  '初音岛': {
    id: 'dc',
    prefixes: ['DC', 'DC3', 'DC4', 'DS', 'DC5'],
    latestReleaseDate: '2026-03-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dc&vers[]=dcext1.0&vers[]=dcext2.0&vers[]=dcchronicle&vers[]=dcpc&vers[]=dcext3.0&vers[]=dc3&vers[]=animedcext1.0&vers[]=dc10th&vers[]=dcsakuraext&vers[]=dsdc&vers[]=dcvslbdc&vers[]=dc20th&vers[]=dc3stageext&vers[]=dc20thext&vers[]=dcretune&rare=&type=&kizu=0',
  },
  'D4DJ': {
    id: 'dj',
    prefixes: ['DJ'],
    latestReleaseDate: '2023-04-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=d4dj&rare=&type=&kizu=0',
  },
  'DARLING in the FRANXX': {
    id: 'fxx',
    prefixes: ['FXX'],
    latestReleaseDate: '2018-09-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=darlifra&rare=&type=&kizu=0',
  },
  '约会大作战': {
    id: 'dal',
    prefixes: ['DAL', 'Fdl'],
    latestReleaseDate: '2025-10-03',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fujimif&vers[]=fujimif2.0&vers[]=dal&vers[]=dalext1.0&vers[]=dal2.0&vers[]=dal3.0&rare=&type=&kizu=0',
  },
  'DOG DAYS': {
    id: 'dd',
    prefixes: ['DD'],
    latestReleaseDate: '2015-11-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddext1.0&vers[]=ddext2.0&vers[]=ddext3.0&rare=&type=&kizu=0',
  },
  'D_CIDE TRAUMEREI': {
    id: 'dct',
    prefixes: ['DCT'],
    latestReleaseDate: '2022-04-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dct&rare=&type=&kizu=0',
  },
  'Disney': {
    id: 'dds',
    prefixes: ['Dds', 'MRd'],
    latestReleaseDate: '2024-05-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=disney&vers[]=mr&rare=&type=&kizu=0',
  },
  'Disney100': {
    id: 'dds100',
    prefixes: ['Dmv', 'Dsw', 'Dpx', 'Dds'],
    latestReleaseDate: '2023-04-07',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=disney&rare=&type=&kizu=0',
  },
  'Fate': {
    id: 'fate',
    prefixes: ['FS', 'FU', 'FH', 'FZ'],
    latestReleaseDate: '2020-12-04',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fs&vers[]=fh&vers[]=fz&vers[]=fsubw&vers[]=fsubw2.0&vers[]=fzext&vers[]=fshf&vers[]=fshf2.0&rare=&type=&kizu=0',
  },
  'Fate/Apocrypha': {
    id: 'apo',
    prefixes: ['APO'],
    latestReleaseDate: '2018-05-25',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fapo&rare=&type=&kizu=0',
  },
  'Fate/Grand Order': {
    id: 'fgo',
    prefixes: ['FGO'],
    latestReleaseDate: '2021-10-29',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fgo&vers[]=fgo2.0&rare=&type=&kizu=0',
  },
  'Hololive': {
    id: 'hol',
    prefixes: ['HOL'],
    latestReleaseDate: '2024-09-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=hol&vers[]=holtd&vers[]=holpb&vers[]=hol2.0&vers[]=holpb2.0&vers[]=holtd2.0&rare=&type=&kizu=0',
  },
  'JOJO的奇妙冒险': {
    id: 'jj',
    prefixes: ['JJ'],
    latestReleaseDate: '2023-08-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=jj&vers[]=jjpbsdc&vers[]=jjpbso&rare=&type=&kizu=0',
  },
  'Key': {
    id: 'key',
    prefixes: [
      'Kab',
      'Kai',
      'Kch',
      'Kcl',
      'Kdb',
      'Key',
      'Khb',
      'Kka',
      'Klb',
      'Krw',
      'Ksm',
      'Kkw',
      'Kta',
    ],
    latestReleaseDate: '2025-11-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  'Little Busters!': {
    id: 'lb',
    prefixes: ['LB', 'KW', 'Klb'],
    latestReleaseDate: '2021-10-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lb&vers[]=lbext1.0&vers[]=lbchronicle&vers[]=lbe&vers[]=animelb&vers[]=animelbrext&vers[]=lbcmext&vers[]=dcvslblb&vers[]=ab&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  '超时空要塞': {
    id: 'mde',
    prefixes: ['MF', 'MDE'],
    latestReleaseDate: '2024-01-25',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mfi&vers[]=mdepb&rare=&type=&kizu=0',
  },
  'Lost Decade': {
    id: 'lod',
    prefixes: ['LOD'],
    latestReleaseDate: '2020-06-05',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lod&rare=&type=&kizu=0',
  },
  'Love Live!': {
    id: 'll',
    prefixes: ['LL', 'LSF', 'SIL'],
    latestReleaseDate: '2023-10-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelive&vers[]=lovelive2.0&vers[]=lovelivesif&vers[]=lovelivesif2.0&vers[]=lovelivesif3.0&vers[]=lovelivesifvset&vers[]=loveliveext&vers[]=lovelivesimext&vers[]=lovelivepbll&vers[]=lovelivesifpbll&vers[]=lsf&rare=&type=&kizu=0',
  },
  'Love Live! Sunshine!!': {
    id: 'lls',
    prefixes: ['LSS', 'LSF', 'SIS'],
    latestReleaseDate: '2019-08-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivess&vers[]=lovelivessext&vers[]=lovelivess2.0&vers[]=lovelivesssif&vers[]=lovelivepblss&vers[]=lovelivesssifpblss&vers[]=lsf&rare=&type=&kizu=0',
  },
  'Love Live! 虹咲学园学园偶像同好会': {
    id: 'lnj',
    prefixes: ['LNJ', 'LSF', 'SIN'],
    latestReleaseDate: '2022-05-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivenj&vers[]=lovelivenj2.0&vers[]=lovelivepblnj&vers[]=lovelivenjsifpblnj&vers[]=lsf&rare=&type=&kizu=0',
  },
  'Love Live! SuperStar!!': {
    id: 'lsp',
    prefixes: ['LSP', 'LSF', 'SIP'],
    latestReleaseDate: '2021-12-10',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivesp&vers[]=lovelivepblsp&vers[]=lsf&rare=&type=&kizu=0',
  },
  'Love Live! 学园偶像祭2': {
    id: 'sif',
    prefixes: ['SIL', 'SIS', 'SIN', 'SIP', 'LSF'],
    latestReleaseDate: '2023-10-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lsf&rare=&type=&kizu=0',
  },
  'MARVEL': {
    id: 'mar',
    prefixes: ['MAR', 'Dmv'],
    latestReleaseDate: '2025-09-19',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mar&vers[]=marpb&vers[]=mar2.0&vers[]=mar3.0&vers[]=disney&rare=&type=&kizu=0',
  },
  'MELTY BLOOD／空之境界': {
    id: 'mb',
    prefixes: ['MB', 'KK'],
    latestReleaseDate: '2010-11-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mb&vers[]=kk&rare=&type=&kizu=0',
  },
  'Overlord': {
    id: 'ovl',
    prefixes: ['OVL'],
    latestReleaseDate: '2025-11-28',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ovl&vers[]=ovl2.0&vers[]=ovlext&vers[]=ovlpb&rare=&type=&kizu=0',
  },
  'Phantom -Requiem for the Phantom-': {
    id: 'pt',
    prefixes: ['PT'],
    latestReleaseDate: '2009-10-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pr&rare=&type=&kizu=0',
  },
  'Rewrite': {
    id: 'rw',
    prefixes: ['RW', 'Krw'],
    latestReleaseDate: '2017-01-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rw&vers[]=rwhf&vers[]=rwanime&vers[]=key20th&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  'SPY×FAMILY': {
    id: 'spy',
    prefixes: ['SPY'],
    latestReleaseDate: '2023-07-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=spy&rare=&type=&kizu=0',
  },
  '零之使魔': {
    id: 'zm',
    prefixes: ['ZM'],
    latestReleaseDate: '2012-05-12',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=zm&vers[]=zmf&vers[]=zmfext&rare=&type=&kizu=0',
  },
  '魔法少女奈叶': {
    id: 'nr',
    prefixes: ['NS', 'N1', 'NV', 'NA', 'N2', 'NR', 'ND', 'NTA'],
    latestReleaseDate: '2025-06-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ns&vers[]=nsm&vers[]=nsa&vers[]=nsm2&vers[]=nsm1m2&vers[]=nsr&vers[]=nsd&vers[]=nspb&rare=&type=&kizu=0',
  },
  '幸运☆星': {
    id: 'ls',
    prefixes: ['LS'],
    latestReleaseDate: '2009-03-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ls&rare=&type=&kizu=0',
  },
  '穿越宇宙的少女／舞-HiME＆舞-乙HiME': {
    id: 'sk',
    prefixes: ['SK', 'MH'],
    latestReleaseDate: '2009-08-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=skext1.0&vers[]=mhext1.0&vers[]=skext2.0&vers[]=mhext2.0&rare=&type=&kizu=0',
  },
  '凉宫春日的忧郁': {
    id: 'sy',
    prefixes: ['SY', 'Ssy'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sh&vers[]=shext&vers[]=shpset&vers[]=kadokawas&vers[]=kadokawas2.0&rare=&type=&kizu=0',
  },
  '魔法禁书目录／某科学的超电磁炮': {
    id: 'gid',
    prefixes: ['ID', 'RG', 'Gid'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ir&vers[]=ir2.0&vers[]=irs&vers[]=irspset&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '灼眼的夏娜': {
    id: 'ss',
    prefixes: ['SS', 'Gss'],
    latestReleaseDate: '2023-10-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ss&vers[]=ssext&vers[]=sspb&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '机器人笔记': {
    id: 'rn',
    prefixes: ['RN'],
    latestReleaseDate: '2012-11-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=robono&rare=&type=&kizu=0',
  },
  '日常': {
    id: 'nj',
    prefixes: ['NJ'],
    latestReleaseDate: '2012-01-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=njext&rare=&type=&kizu=0',
  },
  '魔法少女小圆': {
    id: 'mr',
    prefixes: ['MM', 'MR'],
    latestReleaseDate: '2020-08-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=magica&vers[]=magicamv&vers[]=magicamagireco&vers[]=magicamagireco2.0&rare=&type=&kizu=0',
  },
  '战姬绝唱Symphogear': {
    id: 'sg',
    prefixes: ['SG'],
    latestReleaseDate: '2021-06-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=symphogear&vers[]=symphogearg&vers[]=symphogeargx&vers[]=symphogearxd&vers[]=symphogearxded&vers[]=symphogearaxz&vers[]=symphogearxv&rare=&type=&kizu=0',
  },
  'Vividred Operation': {
    id: 'vr',
    prefixes: ['VR'],
    latestReleaseDate: '2013-06-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=vivid&rare=&type=&kizu=0',
  },
  '穿透幻影的太阳': {
    id: 'gt',
    prefixes: ['GT'],
    latestReleaseDate: '2013-11-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=genei&rare=&type=&kizu=0',
  },
  '伪恋': {
    id: 'nk',
    prefixes: ['NK'],
    latestReleaseDate: '2015-08-21',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nisekoi&vers[]=nisekoiext&rare=&type=&kizu=0',
  },
  '临时女友': {
    id: 'gf',
    prefixes: ['GF'],
    latestReleaseDate: '2015-07-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gf&vers[]=gf2.0&rare=&type=&kizu=0',
  },
  'To LOVE': {
    id: 'tl',
    prefixes: ['TL'],
    latestReleaseDate: '2016-03-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tld2nd&vers[]=tld2nd2.0&rare=&type=&kizu=0',
  },
  '请问您今天要来点兔子吗？？': {
    id: 'gu',
    prefixes: ['GU'],
    latestReleaseDate: '2024-10-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gochiusa&vers[]=gochiusaext&vers[]=gochiusadms&vers[]=gochiusabloom&vers[]=gochiusare&vers[]=gochiusapb&rare=&type=&kizu=0',
  },
  '卡牌游戏西柚子': {
    id: 'cgs',
    prefixes: ['CGS', 'SI'],
    latestReleaseDate: '2016-03-25',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=siyoko&vers[]=promo&rare=&type=&kizu=0',
  },
  '为美好的世界献上祝福！': {
    id: 'ks',
    prefixes: ['KS', 'Sks'],
    latestReleaseDate: '2020-04-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=konosuba&vers[]=konosuba2.0&vers[]=konosubare&vers[]=konosuba3.0&vers[]=kadokawas&vers[]=kadokawas2.0&vers[]=siyoko&vers[]=promo&rare=&type=&kizu=0',
  },
  'ViVid Strike!': {
    id: 'vs',
    prefixes: ['VS'],
    latestReleaseDate: '2017-06-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nspb&vers[]=vvs&rare=&type=&kizu=0',
  },
  '兽娘动物园': {
    id: 'kmn',
    prefixes: ['KMN'],
    latestReleaseDate: '2017-08-25',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kmn&rare=&type=&kizu=0',
  },
  '雏逻辑～from Luck & Logic～': {
    id: 'hll',
    prefixes: ['HLL'],
    latestReleaseDate: '2018-01-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=hinaext1.0&vers[]=hinaext2.0&rare=&type=&kizu=0',
  },
  '路人女主的养成方法': {
    id: 'shs',
    prefixes: ['SHS', 'Fsh'],
    latestReleaseDate: '2022-06-10',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=saekano&vers[]=saekano2.0&vers[]=saekano3.0&vers[]=fujimif&vers[]=fujimif2.0&rare=&type=&kizu=0',
  },
  'Summer Pockets': {
    id: 'smp',
    prefixes: ['SMP', 'Ksm'],
    latestReleaseDate: '2025-07-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=smp&vers[]=smp2.0&vers[]=smpre&vers[]=key2.0&vers[]=keypb&rare=&type=&kizu=0',
  },
  '摇曳庄的幽奈小姐': {
    id: 'yys',
    prefixes: ['YYS'],
    latestReleaseDate: '2018-12-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yys&rare=&type=&kizu=0',
  },
  '角川Sneaker文库': {
    id: 'snk',
    prefixes: [
      'Sak',
      'Sbm',
      'Scn',
      'Sde',
      'Sdy',
      'Seo',
      'Sfl',
      'Shg',
      'Shh',
      'Shm',
      'Sks',
      'Sky',
      'Sle',
      'Sls',
      'Smc',
      'Sme',
      'Smi',
      'Smu',
      'Snk',
      'Snw',
      'Soa',
      'Soj',
      'Srd',
      'Srm',
      'Ssc',
      'Ssh',
      'Ssk',
      'Ssn',
      'Sst',
      'Ssw',
      'Ssy',
      'Stk',
      'Stm',
    ],
    latestReleaseDate: '2025-03-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kadokawas&vers[]=kadokawas2.0&rare=&type=&kizu=0',
  },
  '青春猪头少年': {
    id: 'sby',
    prefixes: ['SBY', 'Gby'],
    latestReleaseDate: '2026-03-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sby&vers[]=sby2.0&vers[]=sby3.0&vers[]=sby4.0&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '魔卡少女樱': {
    id: 'ccs',
    prefixes: ['CCS'],
    latestReleaseDate: '2024-02-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ccs&vers[]=ccs25th&rare=&type=&kizu=0',
  },
  '五等分的新娘': {
    id: '5hy',
    prefixes: ['5HY'],
    latestReleaseDate: '2024-03-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=5hy&vers[]=5hy2.0&vers[]=5hy3.0&vers[]=5hypb&rare=&type=&kizu=0',
  },
  '租借女友': {
    id: 'knk',
    prefixes: ['KNK'],
    latestReleaseDate: '2025-10-31',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=knk&vers[]=knk2.0&rare=&type=&kizu=0',
  },
  '公主连结！Re:Dive': {
    id: 'prd',
    prefixes: ['PRD'],
    latestReleaseDate: '2026-05-02',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=prd&vers[]=prd2.0&rare=&type=&kizu=0',
  },
  '成神之日': {
    id: 'dbg',
    prefixes: ['DBG', 'Kdb'],
    latestReleaseDate: '2021-05-28',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=key2.0&vers[]=keypb&vers[]=dbg&rare=&type=&kizu=0',
  },
  '佐贺偶像是传奇 卷土重来': {
    id: 'zls',
    prefixes: ['ZLS'],
    latestReleaseDate: '2021-11-12',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=zls&rare=&type=&kizu=0',
  },
  '小林家的龙女仆': {
    id: 'kmd',
    prefixes: ['KMD'],
    latestReleaseDate: '2022-04-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kmd&rare=&type=&kizu=0',
  },
  '炽焰天穹': {
    id: 'hbr',
    prefixes: ['HBR', 'Khb', 'Hab'],
    latestReleaseDate: '2024-08-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=keypb&vers[]=hbr&vers[]=hbr2.0&rare=&type=&kizu=0',
  },
  '赛马娘 Pretty Derby': {
    id: 'uma',
    prefixes: ['UMA'],
    latestReleaseDate: '2026-02-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=uma&vers[]=uma2.0&vers[]=uma3.0&rare=&type=&kizu=0',
  },
  '孤独摇滚': {
    id: 'btr',
    prefixes: ['BTR'],
    latestReleaseDate: '2023-09-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=btr&rare=&type=&kizu=0',
  },
  '电击文库': {
    id: 'dgk',
    prefixes: [
      'G86',
      'Gas',
      'Gaw',
      'Gbb',
      'Gbc',
      'Gbd',
      'Gbl',
      'Gby',
      'Gc3',
      'Gdc',
      'Gdr',
      'Gds',
      'Gdy',
      'Gem',
      'Gfq',
      'Gga',
      'Ggg',
      'Ggh',
      'Ggu',
      'Ghh',
      'Ghm',
      'Gid',
      'Giy',
      'Gkb',
      'Gkl',
      'Gkm',
      'Glt',
      'Gmf',
      'Gmm',
      'Gmr',
      'Gms',
      'Gnh',
      'Gnm',
      'Gns',
      'Gny',
      'Goi',
      'Gok',
      'Gom',
      'Gos',
      'Grk',
      'Gsb',
      'Gsc',
      'Gsd',
      'Gsk',
      'Gso',
      'Gsp',
      'Gsr',
      'Gss',
      'Gtd',
      'Gyf',
    ],
    latestReleaseDate: '2023-09-01',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '幻日夜羽 -镜中晖光-': {
    id: 'yhn',
    prefixes: ['YHN'],
    latestReleaseDate: '2023-11-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yhn&rare=&type=&kizu=0',
  },
  '机甲爱丽丝': {
    id: 'ags',
    prefixes: ['AGS'],
    latestReleaseDate: '2023-10-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ags&rare=&type=&kizu=0',
  },
  '妖幻三重奏': {
    id: 'ayt',
    prefixes: ['AYT'],
    latestReleaseDate: '2023-11-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ayt&rare=&type=&kizu=0',
  },
  '碧蓝档案': {
    id: 'bav',
    prefixes: ['BAV'],
    latestReleaseDate: '2025-10-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bav&vers[]=bav2.0&rare=&type=&kizu=0',
  },
  '学园偶像大师': {
    id: 'gim',
    prefixes: ['GIM'],
    latestReleaseDate: '2025-05-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gim&rare=&type=&kizu=0',
  },
  '败犬女主太多了！': {
    id: 'mki',
    prefixes: ['MKI'],
    latestReleaseDate: '2025-06-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mki&rare=&type=&kizu=0',
  },
  'Visual Arts': {
    id: 'va',
    prefixes: ['VA'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
  '魔界战记': {
    id: 'dg',
    prefixes: ['DG'],
    latestReleaseDate: '2013-09-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dg&vers[]=dgext1.0&vers[]=dgd2ext&rare=&type=&kizu=0',
  },
  '光明之响': {
    id: 'sr',
    prefixes: ['SE', 'SF', 'SR'],
    latestReleaseDate: '2015-07-31',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=se&vers[]=sre&rare=&type=&kizu=0',
  },
  'THE KING OF FIGHTERS': {
    id: 'kf',
    prefixes: ['KF'],
    latestReleaseDate: '2023-09-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kf&vers[]=kfpb&rare=&type=&kizu=0',
  },
  '战国BASARA': {
    id: 'sb',
    prefixes: ['SB'],
    latestReleaseDate: '2010-09-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sb&vers[]=sbext1.0&rare=&type=&kizu=0',
  },
  '偶像大师': {
    id: 'im',
    prefixes: ['IM', 'IAS'],
    latestReleaseDate: '2025-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=im&vers[]=imd&vers[]=im2.0&vers[]=animeim&vers[]=imm&vers[]=im765proext&vers[]=impset&vers[]=impb&vers[]=ims&vers[]=ims2.0&rare=&type=&kizu=0',
  },
  '妖精的尾巴': {
    id: 'ft',
    prefixes: ['FT'],
    latestReleaseDate: '2025-02-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ft&vers[]=ftext1.0&vers[]=ft2.0&rare=&type=&kizu=0',
  },
  '侦探歌剧 少女福尔摩斯': {
    id: 'mk',
    prefixes: ['MK', 'MK2'],
    latestReleaseDate: '2019-01-28',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tmh&vers[]=tmh2.0&vers[]=tmh2nd&vers[]=tmhext&vers[]=tmhext2.0&vers[]=tmhmovie&vers[]=tmhffpp&vers[]=tmhext3.0&rare=&type=&kizu=0',
  },
  '新世纪福音战士新剧场版': {
    id: 'ev',
    prefixes: ['EV'],
    latestReleaseDate: '2010-12-11',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=eva&rare=&type=&kizu=0',
  },
  '黑岩射手': {
    id: 'br',
    prefixes: ['BR'],
    latestReleaseDate: '2011-01-22',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=brext1.0&rare=&type=&kizu=0',
  },
  '刀语': {
    id: 'kg',
    prefixes: ['KG'],
    latestReleaseDate: '2011-04-02',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=katanaext&rare=&type=&kizu=0',
  },
  '物语系列': {
    id: 'bm',
    prefixes: ['BM', 'NM', 'MG'],
    latestReleaseDate: '2016-01-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bake&vers[]=nisem&vers[]=monogatari2nd&rare=&type=&kizu=0',
  },
  '罪恶王冠': {
    id: 'gc',
    prefixes: ['GC'],
    latestReleaseDate: '2012-04-07',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gc&rare=&type=&kizu=0',
  },
  '加速世界': {
    id: 'aw',
    prefixes: ['AW', 'Gaw'],
    latestReleaseDate: '2016-09-02',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aw&vers[]=awib&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '刀剑神域': {
    id: 'sao',
    prefixes: ['SAO', 'Gso'],
    latestReleaseDate: '2022-11-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sao&vers[]=sao2.0&vers[]=saore&vers[]=saoos&vers[]=saoaz&vers[]=saoaz2.0&vers[]=sao10th&vers[]=sao10th2.0&vers[]=sao2ext&vers[]=sao2ext2.0&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '初音未来 -Project DIVA-': {
    id: 'pd',
    prefixes: ['PD'],
    latestReleaseDate: '2017-12-01',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=miku&vers[]=miku2.0&vers[]=mikuext1.0&rare=&type=&kizu=0',
  },
  '心理测量者': {
    id: 'pp',
    prefixes: ['PP'],
    latestReleaseDate: '2013-05-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ppext&rare=&type=&kizu=0',
  },
  '翠星之加尔刚蒂亚': {
    id: 'gg',
    prefixes: ['GG'],
    latestReleaseDate: '2013-08-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gargan&rare=&type=&kizu=0',
  },
  'TV动画「恶魔幸存者2」': {
    id: 'ds2',
    prefixes: ['DS2'],
    latestReleaseDate: '2013-10-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ds2ext&rare=&type=&kizu=0',
  },
  '魔法少女伊莉雅': {
    id: 'pi',
    prefixes: ['PI'],
    latestReleaseDate: '2021-02-12',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fpi&vers[]=fpi2.0&vers[]=fpi2.0helz&vers[]=fpi3.0&vers[]=fpi4.0&rare=&type=&kizu=0',
  },
  'T宝的悲惨日常': {
    id: 'woo',
    prefixes: ['Woo'],
    latestReleaseDate: '2014-01-11',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=woo&rare=&type=&kizu=0',
  },
  '斩服少女': {
    id: 'klk',
    prefixes: ['KLK'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kill&vers[]=killpset&rare=&type=&kizu=0',
  },
  '记录的地平线': {
    id: 'lh',
    prefixes: ['LH'],
    latestReleaseDate: '2016-04-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=logho&vers[]=loghopset&rare=&type=&kizu=0',
  },
  '舰队Collection': {
    id: 'kc',
    prefixes: ['KC'],
    latestReleaseDate: '2019-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kancolle&vers[]=kancolle2.0&vers[]=kancolle3.0&vers[]=kancolle4.0&vers[]=kancolleext&rare=&type=&kizu=0',
  },
  '超爆裂异次元卡片大战 Gigant Shooter 司': {
    id: 'gst',
    prefixes: ['GST'],
    latestReleaseDate: '2014-10-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gstext&rare=&type=&kizu=0',
  },
  '火星异种': {
    id: 'tf',
    prefixes: ['TF'],
    latestReleaseDate: '2015-02-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tf&rare=&type=&kizu=0',
  },
  '进击的巨人': {
    id: 'aot',
    prefixes: ['AOT'],
    latestReleaseDate: '2017-09-29',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aot&vers[]=aot2.0&rare=&type=&kizu=0',
  },
  'SchoolGirl Strikers': {
    id: 'sgs',
    prefixes: ['SGS'],
    latestReleaseDate: '2016-02-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sgs&rare=&type=&kizu=0',
  },
  '噗哟噗哟': {
    id: 'py',
    prefixes: ['PY'],
    latestReleaseDate: '2016-02-04',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=puyopuyo&rare=&type=&kizu=0',
  },
  '阿松': {
    id: 'oms',
    prefixes: ['OMS'],
    latestReleaseDate: '2016-06-17',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=oms&rare=&type=&kizu=0',
  },
  '境界之轮回': {
    id: 'kr',
    prefixes: ['KR'],
    latestReleaseDate: '2016-07-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rinneext&rare=&type=&kizu=0',
  },
  '羁绊者': {
    id: 'ki',
    prefixes: ['KI'],
    latestReleaseDate: '2016-09-30',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kiznaiver&rare=&type=&kizu=0',
  },
  '锁链战记 ～赫克瑟塔斯之光～': {
    id: 'cc',
    prefixes: ['CC'],
    latestReleaseDate: '2017-04-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=chain&rare=&type=&kizu=0',
  },
  'STAR WARS': {
    id: 'sw',
    prefixes: ['SW', 'Dsw'],
    latestReleaseDate: '2024-08-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=starwars&vers[]=starwars2.0&vers[]=starwarspb&vers[]=starwarspb2.0&vers[]=disney&rare=&type=&kizu=0',
  },
  '天元突破红莲螺岩': {
    id: 'gl',
    prefixes: ['GL'],
    latestReleaseDate: '2018-01-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gurren&rare=&type=&kizu=0',
  },
  '动画电影『GODZILLA』': {
    id: 'gzl',
    prefixes: ['GZL'],
    latestReleaseDate: '2018-11-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=godzilla&vers[]=godzillaext1.0&rare=&type=&kizu=0',
  },
  '刀剑神域外传 Gun Gale Online': {
    id: 'ggo',
    prefixes: ['GGO', 'Ggg'],
    latestReleaseDate: '2025-03-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ggo&vers[]=ggoext&vers[]=dengeki&rare=&type=&kizu=0',
  },
  '少女☆歌剧 Revue Starlight': {
    id: 'rsl',
    prefixes: ['RSL'],
    latestReleaseDate: '2022-10-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rsl&vers[]=rsl2.0&vers[]=rslstageext&vers[]=rsl3.0&rare=&type=&kizu=0',
  },
  '游戏人生': {
    id: 'ngl',
    prefixes: ['NGL'],
    latestReleaseDate: '2018-08-03',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ngl&rare=&type=&kizu=0',
  },
  '偶像大师 MILLION LIVE!': {
    id: 'ims',
    prefixes: ['IMS', 'IAS'],
    latestReleaseDate: '2022-06-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=impb&vers[]=ims&vers[]=ims2.0&rare=&type=&kizu=0',
  },
  'STEINS;GATE': {
    id: 'stg',
    prefixes: ['STG'],
    latestReleaseDate: '2018-10-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=stg&rare=&type=&kizu=0',
  },
  '哥布林杀手': {
    id: 'gbs',
    prefixes: ['GBS'],
    latestReleaseDate: '2019-04-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gbs&rare=&type=&kizu=0',
  },
  '关于我转生变成史莱姆这档事': {
    id: 'tsk',
    prefixes: ['TSK'],
    latestReleaseDate: '2023-01-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tsk&vers[]=tsk2.0&vers[]=tsk3.0&rare=&type=&kizu=0',
  },
  '灰色的果实': {
    id: 'gri',
    prefixes: ['GRI'],
    latestReleaseDate: '2024-06-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gri&vers[]=gri2.0&vers[]=gri3.0&rare=&type=&kizu=0',
  },
  '突击莉莉': {
    id: 'all',
    prefixes: ['ALL'],
    latestReleaseDate: '2026-02-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lily&vers[]=lily2.0&vers[]=lilystageext&vers[]=lily3.0&rare=&type=&kizu=0',
  },
  '新樱花大战': {
    id: 'skr',
    prefixes: ['SKR'],
    latestReleaseDate: '2020-05-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=skr&rare=&type=&kizu=0',
  },
  '因为太怕痛就全点防御力了': {
    id: 'bfr',
    prefixes: ['BFR'],
    latestReleaseDate: '2020-11-20',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bfr&rare=&type=&kizu=0',
  },
  '辉夜大小姐想让我告白～天才们的恋爱头脑战～': {
    id: 'kgl',
    prefixes: ['KGL'],
    latestReleaseDate: '2022-07-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kgl&vers[]=kgl2.0&rare=&type=&kizu=0',
  },
  '偶像大师 闪耀色彩': {
    id: 'isc',
    prefixes: ['ISC'],
    latestReleaseDate: '2025-09-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=isc&vers[]=isctd&vers[]=isc2.0&vers[]=iscpb&rare=&type=&kizu=0',
  },
  '无职转生 ~到了异世界就拿出真本事~': {
    id: 'mti',
    prefixes: ['MTI'],
    latestReleaseDate: '2021-07-30',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mti&rare=&type=&kizu=0',
  },
  '境界触发者': {
    id: 'wtr',
    prefixes: ['WTR'],
    latestReleaseDate: '2021-10-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=wtr&rare=&type=&kizu=0',
  },
  '在地下城寻求邂逅是否搞错了什么': {
    id: 'ddm',
    prefixes: ['DDM'],
    latestReleaseDate: '2021-11-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddm&rare=&type=&kizu=0',
  },
  '东京复仇者': {
    id: 'trv',
    prefixes: ['TRV'],
    latestReleaseDate: '2022-05-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=trv&rare=&type=&kizu=0',
  },
  '碧蓝航线': {
    id: 'azl',
    prefixes: ['AZL'],
    latestReleaseDate: '2025-01-17',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=azl&vers[]=azl2.0&rare=&type=&kizu=0',
  },
  '电锯人': {
    id: 'csm',
    prefixes: ['CSM'],
    latestReleaseDate: '2023-06-16',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=csm&rare=&type=&kizu=0',
  },
  '平凡职业造就世界最强': {
    id: 'ari',
    prefixes: ['ARI'],
    latestReleaseDate: '2023-02-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ari&rare=&type=&kizu=0',
  },
  '智龙迷城': {
    id: 'pad',
    prefixes: ['PAD'],
    latestReleaseDate: '2023-05-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pad&rare=&type=&kizu=0',
  },
  '我推的孩子': {
    id: 'osk',
    prefixes: ['OSK'],
    latestReleaseDate: '2025-02-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=osk&vers[]=osk2.0&rare=&type=&kizu=0',
  },
  '葬送的芙莉莲': {
    id: 'sfn',
    prefixes: ['SFN'],
    latestReleaseDate: '2026-03-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sfn&vers[]=sfnre&rare=&type=&kizu=0',
  },
  'Disney 镜之守卫者': {
    id: 'mrp',
    prefixes: ['MRd', 'MRp'],
    latestReleaseDate: '2024-05-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mr&rare=&type=&kizu=0',
  },
  '浪客剑心 -明治剑客浪漫谭-': {
    id: 'rkn',
    prefixes: ['RKN'],
    latestReleaseDate: '2024-07-12',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rkn&rare=&type=&kizu=0',
  },
  '胜利女神：妮姬': {
    id: 'nik',
    prefixes: ['NIK'],
    latestReleaseDate: '2024-12-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nik&rare=&type=&kizu=0',
  },
  '胆大党': {
    id: 'ddd',
    prefixes: ['DDD'],
    latestReleaseDate: '2025-03-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddd&rare=&type=&kizu=0',
  },
  '怪兽8号': {
    id: 'kj8',
    prefixes: ['KJ8'],
    latestReleaseDate: '2025-08-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kj8&rare=&type=&kizu=0',
  },
  '黄金拼图': {
    id: 'kms',
    prefixes: ['KMS'],
    latestReleaseDate: '2025-11-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kms&rare=&type=&kizu=0',
  },
  '其他': {
    id: 'ws',
    prefixes: ['WS', 'NSO'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
}

const wsrSeriesMap = {
  'AQUAPLUS': {
    id: 'os08',
    prefixes: ['OS08'],
    latestReleaseDate: '2026-02-27',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os08&rare=&type=&kizu=0',
  },
  'sprite': {
    id: 'os05',
    prefixes: ['OS05'],
    latestReleaseDate: '2025-10-31',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os05&rare=&type=&kizu=0',
  },
  '异种族风俗娘': {
    id: 'os04',
    prefixes: ['OS04'],
    latestReleaseDate: '2025-08-29',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os04&rare=&type=&kizu=0',
  },
  'HARUKAZE': {
    id: 'os03',
    prefixes: ['OS03'],
    latestReleaseDate: '2025-06-27',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os03&rare=&type=&kizu=0',
  },
  '柚子社': {
    id: 'os01',
    prefixes: ['OS01'],
    latestReleaseDate: '2025-04-25',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=OS01&rare=&type=&kizu=0',
  },
  '梦想成为魔法少女': {
    id: 'os02',
    prefixes: ['OS02'],
    latestReleaseDate: '2025-04-25',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=OS02&rare=&type=&kizu=0',
  },
  '枕': {
    id: 'os06',
    prefixes: ['OS06'],
    latestReleaseDate: '2025-12-26',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os06&rare=&type=&kizu=0',
  },
  'Lose＆Whisp': {
    id: 'os07',
    prefixes: ['OS07'],
    latestReleaseDate: '2026-01-30',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os07&rare=&type=&kizu=0',
  },
  ' 其他': {
    id: 'wsr',
    prefixes: ['OS00', 'WSR'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
}

const wscSeriesMap = {
  '[cn]蕾斯莱莉娅娜的炼金工房 ～忘却的炼金术与极夜的解放者～': {
    id: '[cn]rsa',
    prefixes: ['[cn]RSA'],
    latestReleaseDate: '2025-08-15',
  },
  '[cn]STEINS;GATE': {
    id: '[cn]stg',
    prefixes: ['[cn]STG'],
    latestReleaseDate: '2026-01-30',
  },
}

export const seriesMap = {
  ...Object.fromEntries(Object.entries(wsSeriesMap).map(([k, v]) => [k, { ...v, game: 'ws' }])),
  ...Object.fromEntries(Object.entries(wsrSeriesMap).map(([k, v]) => [k, { ...v, game: 'wsr' }])),
  ...Object.fromEntries(Object.entries(wscSeriesMap).map(([k, v]) => [k, { ...v, game: 'wsc' }])),
}

export const ALL_SERIES_OPTIONS = Object.keys(seriesMap)
  .filter((key) => !['ws', 'wsr'].includes(seriesMap[key].id))
  .map((key) => ({
    title: key.replace('[cn]', ''),
    value: seriesMap[key].id,
    game: seriesMap[key].game,
  }))

export const GAME_TYPE_OPTIONS = [
  { title: 'WS', value: 'ws', color: 'primary' },
  { title: 'WSR', value: 'wsr', color: 'ws-rose' },
  { title: 'WSC', value: 'wsc', color: 'ws-cn' },
]
