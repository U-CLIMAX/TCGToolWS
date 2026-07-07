const wsSeriesMap = {
  'brd': {
    name: '棕色尘埃2',
    prefixes: ['BRD'],
    latestReleaseDate: '2026-07-03',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=brd&rare=&type=&kizu=0',
  },
  'gbf': {
    name: '碧蓝幻想',
    prefixes: ['GBF'],
    latestReleaseDate: '2026-06-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gbf&rare=&type=&kizu=0',
  },
  'ga': {
    name: 'GA文库',
    prefixes: [
      'GA01',
      'GA02',
      'GA03',
      'GA04',
      'GA05',
      'GA06',
      'GA07',
      'GA08',
      'GA09',
      'GA10',
      'GA11',
      'GA12',
      'GA13',
      'GA14',
      'GA15',
      'GA16',
      'GA17',
      'GA18',
      'GA19',
    ],
    latestReleaseDate: '2026-06-12',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ga&rare=&type=&kizu=0',
  },
  'thp': {
    name: '東方Project',
    prefixes: ['THP'],
    latestReleaseDate: '2026-05-30',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=thp&rare=&type=&kizu=0',
  },
  'anm': {
    name: 'anemoi',
    prefixes: ['ANM'],
    latestReleaseDate: '2026-05-01',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=anm&rare=&type=&kizu=0',
  },
  'vrg': {
    name: 'VIRTUAL GIRL',
    prefixes: ['VRG', 'BDY'],
    latestReleaseDate: '2026-03-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bdytd&vers[]=vrgext&rare=&type=&kizu=0',
  },
  'tal': {
    name: '传说系列',
    prefixes: ['TAL'],
    latestReleaseDate: '2026-01-16',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tal&rare=&type=&kizu=0',
  },
  're0': {
    name: 'Re：从零开始的异世界生活',
    prefixes: ['RZ'],
    latestReleaseDate: '2024-11-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rz&vers[]=rz2.0&vers[]=rz3.0&vers[]=rz4.0&vers[]=rzext1.0&rare=&type=&kizu=0',
  },
  'fantasia': {
    name: '富士见Fantasia文库',
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
  'persona': {
    name: '女神异闻录',
    prefixes: ['P3', 'P4', 'PQ', 'P5'],
    latestReleaseDate: '2024-05-17',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=p3&vers[]=p3chronicle&vers[]=p3rpb&vers[]=p4&vers[]=animep4&vers[]=p5&vers[]=p4ext&vers[]=animep4ext1.0&vers[]=p4uext1.0&vers[]=pqext&rare=&type=&kizu=0',
  },
  'lrc': {
    name: '莉可丽丝',
    prefixes: ['LRC'],
    latestReleaseDate: '2024-11-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lrc&vers[]=lrcpb&rare=&type=&kizu=0',
  },
  'gbc': {
    name: '少女乐队的呐喊',
    prefixes: ['GCR'],
    latestReleaseDate: '2025-02-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gcrpb&rare=&type=&kizu=0',
  },
  'ctb': {
    name: '足球小将',
    prefixes: ['CTB'],
    latestReleaseDate: '2024-09-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ctb&rare=&type=&kizu=0',
  },
  'cs': {
    name: '蜡笔小新',
    prefixes: ['CS'],
    latestReleaseDate: '2024-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=shinchan&vers[]=shinchan2.0&rare=&type=&kizu=0',
  },
  'yrc': {
    name: '摇曳露营',
    prefixes: ['YRC'],
    latestReleaseDate: '2024-11-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yrc&rare=&type=&kizu=0',
  },
  'rsk': {
    name: '里世界郊游',
    prefixes: ['RSK'],
    latestReleaseDate: '2024-01-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rskext&rare=&type=&kizu=0',
  },
  'bd': {
    name: 'BanG Dream!',
    prefixes: ['BD', 'BDY'],
    latestReleaseDate: '2026-03-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bd&vers[]=bd4.0&vers[]=bd2.0&vers[]=bd3.0&vers[]=bd2.0td&vers[]=bdsp&vers[]=bdpb&vers[]=bdextmorras&vers[]=bdextppros&vers[]=bd5th&vers[]=bdpb2.0&vers[]=bd5.0&vers[]=bdpb3.0&vers[]=bdytd&rare=&type=&kizu=0',
  },
  'amg': {
    name: '缘结甘神家',
    prefixes: ['AMG'],
    latestReleaseDate: '2025-04-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=amg&rare=&type=&kizu=0',
  },
  'pjs': {
    name: '世界计划多彩舞台 feat. 初音未来',
    prefixes: ['PJS'],
    latestReleaseDate: '2025-12-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pjs&vers[]=pjs2.0&vers[]=pjs3.0&vers[]=pjsext&rare=&type=&kizu=0',
  },
  'aoh': {
    name: '青桐高校',
    prefixes: ['AOH'],
    latestReleaseDate: '2025-06-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aoh&rare=&type=&kizu=0',
  },
  'lhs': {
    name: 'Love Live! 莲之空女学院学园偶像俱乐部',
    prefixes: ['LHS'],
    latestReleaseDate: '2025-01-31',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lhs&rare=&type=&kizu=0',
  },
  'imc': {
    name: '偶像大师 灰姑娘女孩',
    prefixes: ['IMC'],
    latestReleaseDate: '2026-07-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=imc&vers[]=imc2nd&vers[]=imc3.0&vers[]=imcpb&rare=&type=&kizu=0',
  },
  'ab': {
    name: 'Angel Beats!／Kud Wafter',
    prefixes: ['AB', 'KW', 'Kab', 'Hab', 'Kkw'],
    latestReleaseDate: '2014-06-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ab&vers[]=abre&vers[]=abext&vers[]=abext2.0&rare=&type=&kizu=0',
  },
  'cn': {
    name: 'CANAAN',
    prefixes: ['CN'],
    latestReleaseDate: '2009-08-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ca&rare=&type=&kizu=0',
  },
  'cl': {
    name: 'CLANNAD',
    prefixes: ['CL', 'Kcl', 'Kta'],
    latestReleaseDate: '2016-04-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=clext1.0&vers[]=clext2.0&vers[]=clext3.0&vers[]=clpset&rare=&type=&kizu=0',
  },
  'pxr': {
    name: 'PIXAR',
    prefixes: ['PXR', 'Dpx', 'MRp'],
    latestReleaseDate: '2025-08-01',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pxr&vers[]=pxr2.0&vers[]=disney&vers[]=mr&rare=&type=&kizu=0',
  },
  'cha': {
    name: 'Charlotte',
    prefixes: ['CHA', 'Kch'],
    latestReleaseDate: '2015-10-30',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=charlotte1.0&rare=&type=&kizu=0',
  },
  'dc': {
    name: '初音岛',
    prefixes: ['DC', 'DC3', 'DC4', 'DS', 'DC5'],
    latestReleaseDate: '2026-03-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dc&vers[]=dcext1.0&vers[]=dcext2.0&vers[]=dcchronicle&vers[]=dcpc&vers[]=dcext3.0&vers[]=dc3&vers[]=animedcext1.0&vers[]=dc10th&vers[]=dcsakuraext&vers[]=dsdc&vers[]=dcvslbdc&vers[]=dc20th&vers[]=dc3stageext&vers[]=dc20thext&vers[]=dcretune&rare=&type=&kizu=0',
  },
  'dj': {
    name: 'D4DJ',
    prefixes: ['DJ'],
    latestReleaseDate: '2023-04-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=d4dj&rare=&type=&kizu=0',
  },
  'fxx': {
    name: 'DARLING in the FRANXX',
    prefixes: ['FXX'],
    latestReleaseDate: '2018-09-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=darlifra&rare=&type=&kizu=0',
  },
  'dal': {
    name: '约会大作战',
    prefixes: ['DAL', 'Fdl'],
    latestReleaseDate: '2025-10-03',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dal&vers[]=dalext1.0&vers[]=dal2.0&vers[]=dal3.0&rare=&type=&kizu=0',
  },
  'dd': {
    name: 'DOG DAYS',
    prefixes: ['DD'],
    latestReleaseDate: '2015-11-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddext1.0&vers[]=ddext2.0&vers[]=ddext3.0&rare=&type=&kizu=0',
  },
  'dct': {
    name: 'D_CIDE TRAUMEREI',
    prefixes: ['DCT'],
    latestReleaseDate: '2022-04-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dct&rare=&type=&kizu=0',
  },
  'dds': {
    name: 'Disney',
    prefixes: ['Dds', 'MRd'],
    latestReleaseDate: '2024-05-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=disney&vers[]=mr&rare=&type=&kizu=0',
  },
  'dds100': {
    name: 'Disney100',
    prefixes: ['Dmv', 'Dsw', 'Dpx', 'Dds'],
    latestReleaseDate: '2023-04-07',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=disney&rare=&type=&kizu=0',
  },
  'fate': {
    name: 'Fate',
    prefixes: ['FS', 'FU', 'FH', 'FZ'],
    latestReleaseDate: '2020-12-04',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fs&vers[]=fh&vers[]=fz&vers[]=fsubw&vers[]=fsubw2.0&vers[]=fzext&vers[]=fshf&vers[]=fshf2.0&rare=&type=&kizu=0',
  },
  'apo': {
    name: 'Fate/Apocrypha',
    prefixes: ['APO'],
    latestReleaseDate: '2018-05-25',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fapo&rare=&type=&kizu=0',
  },
  'fgo': {
    name: 'Fate/Grand Order',
    prefixes: ['FGO'],
    latestReleaseDate: '2021-10-29',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fgo&vers[]=fgo2.0&rare=&type=&kizu=0',
  },
  'hol': {
    name: 'Hololive',
    prefixes: ['HOL'],
    latestReleaseDate: '2024-09-06',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=hol&vers[]=holtd&vers[]=holpb&vers[]=hol2.0&vers[]=holpb2.0&vers[]=holtd2.0&rare=&type=&kizu=0',
  },
  'jj': {
    name: 'JOJO的奇妙冒险',
    prefixes: ['JJ'],
    latestReleaseDate: '2023-08-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=jj&vers[]=jjpbsdc&vers[]=jjpbso&rare=&type=&kizu=0',
  },
  'key': {
    name: 'Key',
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
  'lb': {
    name: 'Little Busters!',
    prefixes: ['LB', 'KW', 'Klb'],
    latestReleaseDate: '2021-10-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lb&vers[]=lbext1.0&vers[]=lbchronicle&vers[]=lbe&vers[]=animelb&vers[]=animelbrext&vers[]=lbcmext&vers[]=dcvslblb&vers[]=ab&rare=&type=&kizu=0',
  },
  'mde': {
    name: '超时空要塞',
    prefixes: ['MF', 'MDE'],
    latestReleaseDate: '2024-01-25',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mfi&vers[]=mdepb&rare=&type=&kizu=0',
  },
  'lod': {
    name: 'Lost Decade',
    prefixes: ['LOD'],
    latestReleaseDate: '2020-06-05',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lod&rare=&type=&kizu=0',
  },
  'll': {
    name: 'Love Live!',
    prefixes: ['LL', 'LSF', 'SIL'],
    latestReleaseDate: '2023-10-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelive&vers[]=lovelive2.0&vers[]=lovelivesif&vers[]=lovelivesif2.0&vers[]=lovelivesif3.0&vers[]=lovelivesifvset&vers[]=loveliveext&vers[]=lovelivesimext&vers[]=lovelivepbll&vers[]=lovelivesifpbll&vers[]=lsf&rare=&type=&kizu=0',
  },
  'lls': {
    name: 'Love Live! Sunshine!!',
    prefixes: ['LSS', 'LSF', 'SIS'],
    latestReleaseDate: '2019-08-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivess&vers[]=lovelivessext&vers[]=lovelivess2.0&vers[]=lovelivesssif&vers[]=lovelivepblss&vers[]=lovelivesssifpblss&vers[]=lsf&rare=&type=&kizu=0',
  },
  'lnj': {
    name: 'Love Live! 虹咲学园学园偶像同好会',
    prefixes: ['LNJ', 'LSF', 'SIN'],
    latestReleaseDate: '2022-05-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivenj&vers[]=lovelivenj2.0&vers[]=lovelivepblnj&vers[]=lovelivenjsifpblnj&vers[]=lsf&rare=&type=&kizu=0',
  },
  'lsp': {
    name: 'Love Live! SuperStar!!',
    prefixes: ['LSP', 'LSF', 'SIP'],
    latestReleaseDate: '2021-12-10',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lovelivesp&vers[]=lovelivepblsp&vers[]=lsf&rare=&type=&kizu=0',
  },
  'sif': {
    name: 'Love Live! 学园偶像祭2',
    prefixes: ['SIL', 'SIS', 'SIN', 'SIP', 'LSF'],
    latestReleaseDate: '2023-10-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lsf&rare=&type=&kizu=0',
  },
  'mar': {
    name: 'MARVEL',
    prefixes: ['MAR', 'Dmv'],
    latestReleaseDate: '2025-09-19',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mar&vers[]=marpb&vers[]=mar2.0&vers[]=mar3.0&vers[]=disney&rare=&type=&kizu=0',
  },
  'mb': {
    name: 'MELTY BLOOD／空之境界',
    prefixes: ['MB', 'KK'],
    latestReleaseDate: '2010-11-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mb&vers[]=kk&rare=&type=&kizu=0',
  },
  'ovl': {
    name: 'Overlord',
    prefixes: ['OVL'],
    latestReleaseDate: '2025-11-28',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ovl&vers[]=ovl2.0&vers[]=ovlext&vers[]=ovlpb&rare=&type=&kizu=0',
  },
  'pt': {
    name: 'Phantom -Requiem for the Phantom-',
    prefixes: ['PT'],
    latestReleaseDate: '2009-10-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pr&rare=&type=&kizu=0',
  },
  'rw': {
    name: 'Rewrite',
    prefixes: ['RW', 'Krw'],
    latestReleaseDate: '2017-01-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rw&vers[]=rwhf&vers[]=rwanime&rare=&type=&kizu=0',
  },
  'spy': {
    name: 'SPY×FAMILY',
    prefixes: ['SPY'],
    latestReleaseDate: '2023-07-21',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=spy&rare=&type=&kizu=0',
  },
  'zm': {
    name: '零之使魔',
    prefixes: ['ZM'],
    latestReleaseDate: '2012-05-12',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=zm&vers[]=zmf&vers[]=zmfext&rare=&type=&kizu=0',
  },
  'nr': {
    name: '魔法少女奈叶',
    prefixes: ['NS', 'N1', 'NV', 'NA', 'N2', 'NR', 'ND', 'NTA'],
    latestReleaseDate: '2025-06-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ns&vers[]=nsm&vers[]=nsa&vers[]=nsm2&vers[]=nsm1m2&vers[]=nsr&vers[]=nsd&vers[]=nspb&rare=&type=&kizu=0',
  },
  'ls': {
    name: '幸运☆星',
    prefixes: ['LS'],
    latestReleaseDate: '2009-03-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ls&rare=&type=&kizu=0',
  },
  'sk': {
    name: '穿越宇宙的少女／舞-HiME＆舞-乙HiME',
    prefixes: ['SK', 'MH'],
    latestReleaseDate: '2009-08-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=skext1.0&vers[]=mhext1.0&vers[]=skext2.0&vers[]=mhext2.0&rare=&type=&kizu=0',
  },
  'sy': {
    name: '凉宫春日的忧郁',
    prefixes: ['SY', 'Ssy'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sh&vers[]=shext&vers[]=shpset&rare=&type=&kizu=0',
  },
  'gid': {
    name: '魔法禁书目录／某科学的超电磁炮',
    prefixes: ['ID', 'RG', 'Gid'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ir&vers[]=ir2.0&vers[]=irs&vers[]=irspset&rare=&type=&kizu=0',
  },
  'ss': {
    name: '灼眼的夏娜',
    prefixes: ['SS', 'Gss'],
    latestReleaseDate: '2023-10-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ss&vers[]=ssext&vers[]=sspb&rare=&type=&kizu=0',
  },
  'rn': {
    name: '机器人笔记',
    prefixes: ['RN'],
    latestReleaseDate: '2012-11-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=robono&rare=&type=&kizu=0',
  },
  'nj': {
    name: '日常',
    prefixes: ['NJ'],
    latestReleaseDate: '2012-01-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=njext&rare=&type=&kizu=0',
  },
  'mr': {
    name: '魔法少女小圆',
    prefixes: ['MM', 'MR'],
    latestReleaseDate: '2020-08-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=magica&vers[]=magicamv&vers[]=magicamagireco&vers[]=magicamagireco2.0&rare=&type=&kizu=0',
  },
  'sg': {
    name: '战姬绝唱Symphogear',
    prefixes: ['SG'],
    latestReleaseDate: '2021-06-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=symphogear&vers[]=symphogearg&vers[]=symphogeargx&vers[]=symphogearxd&vers[]=symphogearxded&vers[]=symphogearaxz&vers[]=symphogearxv&rare=&type=&kizu=0',
  },
  'vr': {
    name: 'Vividred Operation',
    prefixes: ['VR'],
    latestReleaseDate: '2013-06-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=vivid&rare=&type=&kizu=0',
  },
  'gt': {
    name: '穿透幻影的太阳',
    prefixes: ['GT'],
    latestReleaseDate: '2013-11-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=genei&rare=&type=&kizu=0',
  },
  'nk': {
    name: '伪恋',
    prefixes: ['NK'],
    latestReleaseDate: '2015-08-21',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nisekoi&vers[]=nisekoiext&rare=&type=&kizu=0',
  },
  'gf': {
    name: '临时女友',
    prefixes: ['GF'],
    latestReleaseDate: '2015-07-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gf&vers[]=gf2.0&rare=&type=&kizu=0',
  },
  'tl': {
    name: 'To LOVE',
    prefixes: ['TL'],
    latestReleaseDate: '2016-03-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tld2nd&vers[]=tld2nd2.0&rare=&type=&kizu=0',
  },
  'gu': {
    name: '请问您今天要来点兔子吗？？',
    prefixes: ['GU'],
    latestReleaseDate: '2024-10-11',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gochiusa&vers[]=gochiusaext&vers[]=gochiusadms&vers[]=gochiusabloom&vers[]=gochiusare&vers[]=gochiusapb&rare=&type=&kizu=0',
  },
  'cgs': {
    name: '卡牌游戏西柚子',
    prefixes: ['CGS', 'SI'],
    latestReleaseDate: '2016-03-25',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=siyoko&vers[]=promo&rare=&type=&kizu=0',
  },
  'ks': {
    name: '为美好的世界献上祝福！',
    prefixes: ['KS', 'Sks'],
    latestReleaseDate: '2020-04-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=konosuba&vers[]=konosuba2.0&vers[]=konosubare&vers[]=konosuba3.0&rare=&type=&kizu=0',
  },
  'vs': {
    name: 'ViVid Strike!',
    prefixes: ['VS'],
    latestReleaseDate: '2017-06-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nspb&vers[]=vvs&rare=&type=&kizu=0',
  },
  'kmn': {
    name: '兽娘动物园',
    prefixes: ['KMN'],
    latestReleaseDate: '2017-08-25',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kmn&rare=&type=&kizu=0',
  },
  'hll': {
    name: '雏逻辑～from Luck & Logic～',
    prefixes: ['HLL'],
    latestReleaseDate: '2018-01-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=hinaext1.0&vers[]=hinaext2.0&rare=&type=&kizu=0',
  },
  'shs': {
    name: '路人女主的养成方法',
    prefixes: ['SHS', 'Fsh'],
    latestReleaseDate: '2022-06-10',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=saekano&vers[]=saekano2.0&vers[]=saekano3.0&rare=&type=&kizu=0',
  },
  'smp': {
    name: 'Summer Pockets',
    prefixes: ['SMP', 'Ksm'],
    latestReleaseDate: '2026-04-10',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=smp&vers[]=smp2.0&vers[]=smpre&vers[]=smp3.0&rare=&type=&kizu=0',
  },
  'yys': {
    name: '摇曳庄的幽奈小姐',
    prefixes: ['YYS'],
    latestReleaseDate: '2018-12-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yys&rare=&type=&kizu=0',
  },
  'snk': {
    name: '角川Sneaker文库',
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
  'sby': {
    name: '青春猪头少年',
    prefixes: ['SBY', 'Gby'],
    latestReleaseDate: '2026-03-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sby&vers[]=sby2.0&vers[]=sby3.0&vers[]=sby4.0&rare=&type=&kizu=0',
  },
  'ccs': {
    name: '魔卡少女樱',
    prefixes: ['CCS'],
    latestReleaseDate: '2024-02-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ccs&vers[]=ccs25th&rare=&type=&kizu=0',
  },
  '5hy': {
    name: '五等分的新娘',
    prefixes: ['5HY'],
    latestReleaseDate: '2024-03-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=5hy&vers[]=5hy2.0&vers[]=5hy3.0&vers[]=5hypb&rare=&type=&kizu=0',
  },
  'knk': {
    name: '租借女友',
    prefixes: ['KNK'],
    latestReleaseDate: '2025-10-31',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=knk&vers[]=knk2.0&rare=&type=&kizu=0',
  },
  'prd': {
    name: '公主连结！Re:Dive',
    prefixes: ['PRD'],
    latestReleaseDate: '2026-05-02',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=prd&vers[]=prd2.0&rare=&type=&kizu=0',
  },
  'dbg': {
    name: '成神之日',
    prefixes: ['DBG', 'Kdb'],
    latestReleaseDate: '2021-05-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dbg&rare=&type=&kizu=0',
  },
  'zls': {
    name: '佐贺偶像是传奇 卷土重来',
    prefixes: ['ZLS'],
    latestReleaseDate: '2021-11-12',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=zls&rare=&type=&kizu=0',
  },
  'kmd': {
    name: '小林家的龙女仆',
    prefixes: ['KMD'],
    latestReleaseDate: '2022-04-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kmd&rare=&type=&kizu=0',
  },
  'hbr': {
    name: '炽焰天穹',
    prefixes: ['HBR', 'Khb', 'Hab'],
    latestReleaseDate: '2024-08-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=hbr&vers[]=hbr2.0&rare=&type=&kizu=0',
  },
  'uma': {
    name: '赛马娘 Pretty Derby',
    prefixes: ['UMA'],
    latestReleaseDate: '2026-02-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=uma&vers[]=uma2.0&vers[]=uma3.0&rare=&type=&kizu=0',
  },
  'btr': {
    name: '孤独摇滚',
    prefixes: ['BTR'],
    latestReleaseDate: '2023-09-29',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=btr&rare=&type=&kizu=0',
  },
  'dgk': {
    name: '电击文库',
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
  'yhn': {
    name: '幻日夜羽 -镜中晖光-',
    prefixes: ['YHN'],
    latestReleaseDate: '2023-11-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=yhn&rare=&type=&kizu=0',
  },
  'ags': {
    name: '机甲爱丽丝',
    prefixes: ['AGS'],
    latestReleaseDate: '2023-10-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ags&rare=&type=&kizu=0',
  },
  'ayt': {
    name: '妖幻三重奏',
    prefixes: ['AYT'],
    latestReleaseDate: '2023-11-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ayt&rare=&type=&kizu=0',
  },
  'bav': {
    name: '碧蓝档案',
    prefixes: ['BAV'],
    latestReleaseDate: '2025-10-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bav&vers[]=bav2.0&rare=&type=&kizu=0',
  },
  'gim': {
    name: '学园偶像大师',
    prefixes: ['GIM'],
    latestReleaseDate: '2025-05-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gim&rare=&type=&kizu=0',
  },
  'mki': {
    name: '败犬女主太多了！',
    prefixes: ['MKI'],
    latestReleaseDate: '2025-06-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mki&rare=&type=&kizu=0',
  },
  'va': {
    name: 'Visual Arts',
    prefixes: ['VA'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
  'dg': {
    name: '魔界战记',
    prefixes: ['DG'],
    latestReleaseDate: '2013-09-13',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=dg&vers[]=dgext1.0&vers[]=dgd2ext&rare=&type=&kizu=0',
  },
  'sr': {
    name: '光明之响',
    prefixes: ['SE', 'SF', 'SR'],
    latestReleaseDate: '2015-07-31',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=se&vers[]=sre&rare=&type=&kizu=0',
  },
  'kf': {
    name: 'THE KING OF FIGHTERS',
    prefixes: ['KF'],
    latestReleaseDate: '2023-09-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kf&vers[]=kfpb&rare=&type=&kizu=0',
  },
  'sb': {
    name: '战国BASARA',
    prefixes: ['SB'],
    latestReleaseDate: '2010-09-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sb&vers[]=sbext1.0&rare=&type=&kizu=0',
  },
  'im': {
    name: '偶像大师',
    prefixes: ['IM', 'IAS'],
    latestReleaseDate: '2025-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=im&vers[]=imd&vers[]=im2.0&vers[]=animeim&vers[]=imm&vers[]=im765proext&vers[]=impset&vers[]=impb&vers[]=ims&vers[]=ims2.0&vers[]=imspb&rare=&type=&kizu=0',
  },
  'ft': {
    name: '妖精的尾巴',
    prefixes: ['FT'],
    latestReleaseDate: '2025-02-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ft&vers[]=ftext1.0&vers[]=ft2.0&rare=&type=&kizu=0',
  },
  'mk': {
    name: '侦探歌剧 少女福尔摩斯',
    prefixes: ['MK', 'MK2'],
    latestReleaseDate: '2019-01-28',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tmh&vers[]=tmh2.0&vers[]=tmh2nd&vers[]=tmhext&vers[]=tmhext2.0&vers[]=tmhmovie&vers[]=tmhffpp&vers[]=tmhext3.0&rare=&type=&kizu=0',
  },
  'ev': {
    name: '新世纪福音战士新剧场版',
    prefixes: ['EV'],
    latestReleaseDate: '2010-12-11',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=eva&rare=&type=&kizu=0',
  },
  'br': {
    name: '黑岩射手',
    prefixes: ['BR'],
    latestReleaseDate: '2011-01-22',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=brext1.0&rare=&type=&kizu=0',
  },
  'kg': {
    name: '刀语',
    prefixes: ['KG'],
    latestReleaseDate: '2011-04-02',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=katanaext&rare=&type=&kizu=0',
  },
  'bm': {
    name: '物语系列',
    prefixes: ['BM', 'NM', 'MG'],
    latestReleaseDate: '2016-01-22',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bake&vers[]=nisem&vers[]=monogatari2nd&rare=&type=&kizu=0',
  },
  'gc': {
    name: '罪恶王冠',
    prefixes: ['GC'],
    latestReleaseDate: '2012-04-07',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gc&rare=&type=&kizu=0',
  },
  'aw': {
    name: '加速世界',
    prefixes: ['AW', 'Gaw'],
    latestReleaseDate: '2016-09-02',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aw&vers[]=awib&rare=&type=&kizu=0',
  },
  'sao': {
    name: '刀剑神域',
    prefixes: ['SAO', 'Gso'],
    latestReleaseDate: '2022-11-18',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sao&vers[]=sao2.0&vers[]=saore&vers[]=saoos&vers[]=saoaz&vers[]=saoaz2.0&vers[]=sao10th&vers[]=sao10th2.0&vers[]=sao2ext&vers[]=sao2ext2.0&rare=&type=&kizu=0',
  },
  'pd': {
    name: '初音未来 -Project DIVA-',
    prefixes: ['PD'],
    latestReleaseDate: '2017-12-01',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=miku&vers[]=miku2.0&vers[]=mikuext1.0&rare=&type=&kizu=0',
  },
  'pp': {
    name: '心理测量者',
    prefixes: ['PP'],
    latestReleaseDate: '2013-05-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ppext&rare=&type=&kizu=0',
  },
  'gg': {
    name: '翠星之加尔刚蒂亚',
    prefixes: ['GG'],
    latestReleaseDate: '2013-08-23',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gargan&rare=&type=&kizu=0',
  },
  'ds2': {
    name: 'TV动画「恶魔幸存者2」',
    prefixes: ['DS2'],
    latestReleaseDate: '2013-10-18',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ds2ext&rare=&type=&kizu=0',
  },
  'pi': {
    name: '魔法少女伊莉雅',
    prefixes: ['PI'],
    latestReleaseDate: '2021-02-12',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=fpi&vers[]=fpi2.0&vers[]=fpi2.0helz&vers[]=fpi3.0&vers[]=fpi4.0&rare=&type=&kizu=0',
  },
  'woo': {
    name: 'T宝的悲惨日常',
    prefixes: ['Woo'],
    latestReleaseDate: '2014-01-11',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=woo&rare=&type=&kizu=0',
  },
  'klk': {
    name: '斩服少女',
    prefixes: ['KLK'],
    latestReleaseDate: '2016-12-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kill&vers[]=killpset&rare=&type=&kizu=0',
  },
  'lh': {
    name: '记录的地平线',
    prefixes: ['LH'],
    latestReleaseDate: '2016-04-08',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=logho&vers[]=loghopset&rare=&type=&kizu=0',
  },
  'kc': {
    name: '舰队Collection',
    prefixes: ['KC'],
    latestReleaseDate: '2019-07-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kancolle&vers[]=kancolle2.0&vers[]=kancolle3.0&vers[]=kancolle4.0&vers[]=kancolleext&rare=&type=&kizu=0',
  },
  'gst': {
    name: '超爆裂异次元卡片大战 Gigant Shooter 司',
    prefixes: ['GST'],
    latestReleaseDate: '2014-10-10',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gstext&rare=&type=&kizu=0',
  },
  'tf': {
    name: '火星异种',
    prefixes: ['TF'],
    latestReleaseDate: '2015-02-27',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tf&rare=&type=&kizu=0',
  },
  'aot': {
    name: '进击的巨人',
    prefixes: ['AOT'],
    latestReleaseDate: '2017-09-29',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=aot&vers[]=aot2.0&rare=&type=&kizu=0',
  },
  'sgs': {
    name: 'SchoolGirl Strikers',
    prefixes: ['SGS'],
    latestReleaseDate: '2016-02-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sgs&rare=&type=&kizu=0',
  },
  'py': {
    name: '噗哟噗哟',
    prefixes: ['PY'],
    latestReleaseDate: '2016-02-04',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=puyopuyo&rare=&type=&kizu=0',
  },
  'oms': {
    name: '阿松',
    prefixes: ['OMS'],
    latestReleaseDate: '2016-06-17',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=oms&rare=&type=&kizu=0',
  },
  'kr': {
    name: '境界之轮回',
    prefixes: ['KR'],
    latestReleaseDate: '2016-07-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rinneext&rare=&type=&kizu=0',
  },
  'ki': {
    name: '羁绊者',
    prefixes: ['KI'],
    latestReleaseDate: '2016-09-30',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kiznaiver&rare=&type=&kizu=0',
  },
  'cc': {
    name: '锁链战记 ～赫克瑟塔斯之光～',
    prefixes: ['CC'],
    latestReleaseDate: '2017-04-28',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=chain&rare=&type=&kizu=0',
  },
  'sw': {
    name: 'STAR WARS',
    prefixes: ['SW', 'Dsw'],
    latestReleaseDate: '2024-08-23',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=starwars&vers[]=starwars2.0&vers[]=starwarspb&vers[]=starwarspb2.0&vers[]=disney&rare=&type=&kizu=0',
  },
  'gl': {
    name: '天元突破红莲螺岩',
    prefixes: ['GL'],
    latestReleaseDate: '2018-01-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gurren&rare=&type=&kizu=0',
  },
  'gzl': {
    name: '动画电影『GODZILLA』',
    prefixes: ['GZL'],
    latestReleaseDate: '2018-11-09',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=godzilla&vers[]=godzillaext1.0&rare=&type=&kizu=0',
  },
  'ggo': {
    name: '刀剑神域外传 Gun Gale Online',
    prefixes: ['GGO', 'Ggg'],
    latestReleaseDate: '2025-03-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ggo&vers[]=ggoext&vers[]=dengeki&rare=&type=&kizu=0',
  },
  'rsl': {
    name: '少女☆歌剧 Revue Starlight',
    prefixes: ['RSL'],
    latestReleaseDate: '2022-10-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rsl&vers[]=rsl2.0&vers[]=rslstageext&vers[]=rsl3.0&rare=&type=&kizu=0',
  },
  'ngl': {
    name: '游戏人生',
    prefixes: ['NGL'],
    latestReleaseDate: '2018-08-03',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ngl&rare=&type=&kizu=0',
  },
  'ims': {
    name: '偶像大师 MILLION LIVE!',
    prefixes: ['IMS', 'IAS'],
    latestReleaseDate: '2026-04-24',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=impb&vers[]=ims&vers[]=ims2.0&vers[]=imspb&rare=&type=&kizu=0',
  },
  'stg': {
    name: 'STEINS;GATE',
    prefixes: ['STG'],
    latestReleaseDate: '2018-10-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=stg&rare=&type=&kizu=0',
  },
  'gbs': {
    name: '哥布林杀手',
    prefixes: ['GBS', 'GA04'],
    latestReleaseDate: '2019-04-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gbs&rare=&type=&kizu=0',
  },
  'tsk': {
    name: '关于我转生变成史莱姆这档事',
    prefixes: ['TSK'],
    latestReleaseDate: '2023-01-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=tsk&vers[]=tsk2.0&vers[]=tsk3.0&rare=&type=&kizu=0',
  },
  'gri': {
    name: '灰色的果实',
    prefixes: ['GRI'],
    latestReleaseDate: '2024-06-07',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=gri&vers[]=gri2.0&vers[]=gri3.0&rare=&type=&kizu=0',
  },
  'all': {
    name: '突击莉莉',
    prefixes: ['ALL'],
    latestReleaseDate: '2026-02-27',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=lily&vers[]=lily2.0&vers[]=lilystageext&vers[]=lily3.0&rare=&type=&kizu=0',
  },
  'skr': {
    name: '新樱花大战',
    prefixes: ['SKR'],
    latestReleaseDate: '2020-05-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=skr&rare=&type=&kizu=0',
  },
  'bfr': {
    name: '因为太怕痛就全点防御力了',
    prefixes: ['BFR'],
    latestReleaseDate: '2020-11-20',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=bfr&rare=&type=&kizu=0',
  },
  'kgl': {
    name: '辉夜大小姐想让我告白～天才们的恋爱头脑战～',
    prefixes: ['KGL'],
    latestReleaseDate: '2022-07-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kgl&vers[]=kgl2.0&rare=&type=&kizu=0',
  },
  'isc': {
    name: '偶像大师 闪耀色彩',
    prefixes: ['ISC'],
    latestReleaseDate: '2025-09-26',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=isc&vers[]=isctd&vers[]=isc2.0&vers[]=iscpb&rare=&type=&kizu=0',
  },
  'mti': {
    name: '无职转生 ~到了异世界就拿出真本事~',
    prefixes: ['MTI'],
    latestReleaseDate: '2021-07-30',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mti&rare=&type=&kizu=0',
  },
  'wtr': {
    name: '境界触发者',
    prefixes: ['WTR'],
    latestReleaseDate: '2021-10-15',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=wtr&rare=&type=&kizu=0',
  },
  'ddm': {
    name: '在地下城寻求邂逅是否搞错了什么',
    prefixes: ['DDM', 'GA10'],
    latestReleaseDate: '2021-11-26',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddm&rare=&type=&kizu=0',
  },
  'trv': {
    name: '东京复仇者',
    prefixes: ['TRV'],
    latestReleaseDate: '2022-05-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=trv&rare=&type=&kizu=0',
  },
  'azl': {
    name: '碧蓝航线',
    prefixes: ['AZL'],
    latestReleaseDate: '2025-01-17',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=azl&vers[]=azl2.0&rare=&type=&kizu=0',
  },
  'csm': {
    name: '电锯人',
    prefixes: ['CSM'],
    latestReleaseDate: '2023-06-16',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=csm&rare=&type=&kizu=0',
  },
  'ari': {
    name: '平凡职业造就世界最强',
    prefixes: ['ARI'],
    latestReleaseDate: '2023-02-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ari&rare=&type=&kizu=0',
  },
  'pad': {
    name: '智龙迷城',
    prefixes: ['PAD'],
    latestReleaseDate: '2023-05-19',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=pad&rare=&type=&kizu=0',
  },
  'osk': {
    name: '我推的孩子',
    prefixes: ['OSK'],
    latestReleaseDate: '2025-02-14',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=osk&vers[]=osk2.0&rare=&type=&kizu=0',
  },
  'sfn': {
    name: '葬送的芙莉莲',
    prefixes: ['SFN'],
    latestReleaseDate: '2026-03-20',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=sfn&vers[]=sfnre&rare=&type=&kizu=0',
  },
  'mrp': {
    name: 'Disney 镜之守卫者',
    prefixes: ['MRd', 'MRp'],
    latestReleaseDate: '2024-05-24',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=mr&rare=&type=&kizu=0',
  },
  'rkn': {
    name: '浪客剑心 -明治剑客浪漫谭-',
    prefixes: ['RKN'],
    latestReleaseDate: '2024-07-12',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=rkn&rare=&type=&kizu=0',
  },
  'nik': {
    name: '胜利女神：妮姬',
    prefixes: ['NIK'],
    latestReleaseDate: '2024-12-13',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=nik&rare=&type=&kizu=0',
  },
  'ddd': {
    name: '胆大党',
    prefixes: ['DDD'],
    latestReleaseDate: '2026-05-15',
    yytUrl:
      'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=ddd&vers[]=ddd2.0&rare=&type=&kizu=0',
  },
  'kj8': {
    name: '怪兽8号',
    prefixes: ['KJ8'],
    latestReleaseDate: '2025-08-08',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kj8&rare=&type=&kizu=0',
  },
  'kms': {
    name: '黄金拼图',
    prefixes: ['KMS'],
    latestReleaseDate: '2025-11-14',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=kms&rare=&type=&kizu=0',
  },
  'ws': {
    name: '其他',
    prefixes: ['WS', 'NSO', 'CJ', 'VG'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/ws/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
}

const wsrSeriesMap = {
  os11: {
    name: 'Purple software',
    prefixes: ['OS11'],
    latestReleaseDate: '2026-07-03',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os11&rare=&type=&kizu=0',
  },
  os10: {
    name: 'Navel',
    prefixes: ['OS10'],
    latestReleaseDate: '2026-05-29',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os10&rare=&type=&kizu=0',
  },
  os09: {
    name: 'ALICESOFT',
    prefixes: ['OS09'],
    latestReleaseDate: '2026-04-17',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os09&rare=&type=&kizu=0',
  },
  os08: {
    name: 'AQUAPLUS',
    prefixes: ['OS08'],
    latestReleaseDate: '2026-02-27',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os08&rare=&type=&kizu=0',
  },
  os05: {
    name: 'sprite',
    prefixes: ['OS05'],
    latestReleaseDate: '2025-10-31',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os05&rare=&type=&kizu=0',
  },
  os04: {
    name: '异种族风俗娘',
    prefixes: ['OS04'],
    latestReleaseDate: '2025-08-29',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os04&rare=&type=&kizu=0',
  },
  os03: {
    name: 'HARUKAZE',
    prefixes: ['OS03'],
    latestReleaseDate: '2025-06-27',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os03&rare=&type=&kizu=0',
  },
  os01: {
    name: '柚子社',
    prefixes: ['OS01'],
    latestReleaseDate: '2025-04-25',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=OS01&rare=&type=&kizu=0',
  },
  os02: {
    name: '梦想成为魔法少女',
    prefixes: ['OS02'],
    latestReleaseDate: '2025-04-25',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=OS02&rare=&type=&kizu=0',
  },
  os06: {
    name: '枕',
    prefixes: ['OS06'],
    latestReleaseDate: '2025-12-26',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os06&rare=&type=&kizu=0',
  },
  os07: {
    name: 'Lose＆Whisp',
    prefixes: ['OS07'],
    latestReleaseDate: '2026-01-30',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=os07&rare=&type=&kizu=0',
  },
  wsr: {
    name: '其他',
    prefixes: ['OS00', 'WSR'],
    latestReleaseDate: '-',
    yytUrl: 'https://yuyu-tei.jp/sell/wsr/s/search?search_word=&vers[]=promo&rare=&type=&kizu=0',
  },
}

const wscSeriesMap = {
  '[cn]p5x': {
    name: '[cn]女神异闻录：夜幕魅影',
    prefixes: ['[cn]P5X'],
    latestReleaseDate: '2026-06-26',
  },
  '[cn]fate': {
    name: '[cn]Fate/stay night [Unlimited Blade Works]',
    prefixes: ['[cn]FS'],
    latestReleaseDate: '2026-05-29',
  },
  '[cn]rsa': {
    name: '[cn]蕾斯莱莉娅娜的炼金工房 ～忘却的炼金术与极夜的解放者～',
    prefixes: ['[cn]RSA'],
    latestReleaseDate: '2025-08-15',
  },
  '[cn]stg': {
    name: '[cn]STEINS;GATE',
    prefixes: ['[cn]STG'],
    latestReleaseDate: '2026-01-30',
  },
  '[cn]ccs': {
    name: '[cn]魔卡少女樱透明牌篇',
    prefixes: ['[cn]CCS'],
    latestReleaseDate: '2019-04-26',
  },
  '[cn]gu': {
    name: '[cn]请问您今天要来点兔子吗？',
    prefixes: ['[cn]GU'],
    latestReleaseDate: '2025-04-25',
  },
  '[cn]sao': {
    name: '[cn]刀剑神域',
    prefixes: ['[cn]SAO', '[cn]Gso'],
    latestReleaseDate: '2025-05-30',
  },
  '[cn]dgk': {
    name: '[cn]电击文库',
    prefixes: [
      '[cn]G86',
      '[cn]Gas',
      '[cn]Gaw',
      '[cn]Gbb',
      '[cn]Gbc',
      '[cn]Gbd',
      '[cn]Gbl',
      '[cn]Gby',
      '[cn]Gc3',
      '[cn]Gdc',
      '[cn]Gdr',
      '[cn]Gds',
      '[cn]Gdy',
      '[cn]Gem',
      '[cn]Gfq',
      '[cn]Gga',
      '[cn]Ggh',
      '[cn]Ggg',
      '[cn]Ggu',
      '[cn]Ghh',
      '[cn]Ghm',
      '[cn]Gid',
      '[cn]Giy',
      '[cn]Gkb',
      '[cn]Gkl',
      '[cn]Gkm',
      '[cn]Glt',
      '[cn]Gmf',
      '[cn]Gmm',
      '[cn]Gmr',
      '[cn]Gms',
      '[cn]Gnh',
      '[cn]Gnm',
      '[cn]Gns',
      '[cn]Gny',
      '[cn]Goi',
      '[cn]Gok',
      '[cn]Gom',
      '[cn]Gos',
      '[cn]Grk',
      '[cn]Gsb',
      '[cn]Gsc',
      '[cn]Gsd',
      '[cn]Gsk',
      '[cn]Gso',
      '[cn]Gsp',
      '[cn]Gsr',
      '[cn]Gss',
      '[cn]Gtd',
      '[cn]Gyf',
    ],
    latestReleaseDate: '2025-11-28',
  },
  '[cn]bd': {
    name: '[cn]BanG Dream!',
    prefixes: ['[cn]BD', '[cn]BDY'],
    latestReleaseDate: '2025-10-10',
  },
  '[cn]dal': {
    name: '[cn]约会大作战',
    prefixes: ['[cn]DAL'],
    latestReleaseDate: '2024-07-12',
  },
  '[cn]lrc': {
    name: '[cn]莉可丽丝',
    prefixes: ['[cn]LRC'],
    latestReleaseDate: '2024-08-23',
  },
  '[cn]nik': {
    name: '[cn]胜利女神：妮姬',
    prefixes: ['[cn]NIK'],
    latestReleaseDate: '2025-07-25',
  },
  'wsc': {
    name: '其他',
    prefixes: ['[cn]WS', '[cn]CGS'],
    latestReleaseDate: '-',
  },
}

export const seriesMap = {
  ...Object.fromEntries(
    Object.entries(wsSeriesMap).map(([id, v]) => [id, { ...v, id, game: 'ws' }])
  ),
  ...Object.fromEntries(
    Object.entries(wsrSeriesMap).map(([id, v]) => [id, { ...v, id, game: 'wsr' }])
  ),
  ...Object.fromEntries(
    Object.entries(wscSeriesMap).map(([id, v]) => [id, { ...v, id, game: 'wsc' }])
  ),
}

export const ALL_SERIES_OPTIONS = Object.entries(seriesMap)
  .filter(([id]) => !['ws', 'wsr', 'wsc'].includes(id))
  .map(([id, info]) => ({
    title: info.name.replace('[cn]', ''),
    value: id,
    game: info.game,
  }))

export const GAME_TYPE_OPTIONS = [
  { title: 'WS', value: 'ws', color: 'primary' },
  { title: 'WSR', value: 'wsr', color: 'ws-rose' },
  { title: 'WSC', value: 'wsc', color: 'ws-cn' },
]
