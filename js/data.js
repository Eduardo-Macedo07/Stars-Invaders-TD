'use strict';

// ============================================================
// Dados do jogo: setores (mapas), defensores, invasores e ondas.
// O mundo tem sempre 1280 x 720 unidades; a tela ajusta a escala.
// ============================================================
const WORLD_W = 1280;
const WORLD_H = 720;

// Cada setor tem 3 rotas, uma por dificuldade. Uma rota é uma lista de caminhos:
// com mais de um caminho, os invasores entram por várias portas (ou o caminho se bifurca)
// e todos se juntam no fim.
// Em cada caminho, o 1º ponto é a entrada (portal) e o último é a nave-mãe
// (todos os caminhos de uma rota terminam no mesmo ponto).
const MAPS = [
  {
    id: 'asteroides', name: 'Cinturão de Asteroides', theme: 'asteroides', accent: '#5fe8ff',
    desc: 'Rota sinuosa entre rochas flutuantes. Bom para começar.',
    bg: ['#0a1030', '#03050f'], nebula: ['#2a4aa0', '#5a2a90'],
    rotas: {
      facil: [[[-40, 120], [180, 110], [320, 200], [300, 420], [170, 560], [320, 650], [530, 600], [600, 420], [560, 230], [700, 110], [900, 130], [990, 300], [870, 470], [960, 610], [1120, 580]]],
      normal: [[[-40, 200], [200, 160], [380, 290], [360, 490], [540, 610], [760, 530], [770, 300], [900, 160], [1060, 250], [1090, 430], [1120, 570]]],
      dificil: [
        [[-40, 140], [260, 180], [480, 320], [700, 380], [900, 470], [1120, 570]],
        [[-40, 620], [240, 580], [480, 440], [700, 380], [900, 470], [1120, 570]],
      ],
    },
  },
  {
    id: 'estacao', name: 'Estação Órbita-7', theme: 'estacao', accent: '#ffb347',
    desc: 'Corredores de uma estação abandonada, com curvas fechadas.',
    bg: ['#1a1224', '#05030a'], nebula: ['#a0502a', '#5a2a60'],
    rotas: {
      facil: [[[-40, 600], [160, 620], [240, 450], [180, 260], [260, 110], [460, 110], [530, 290], [470, 470], [570, 620], [760, 600], [830, 420], [770, 240], [860, 100], [1040, 130], [1090, 320], [1010, 500], [1100, 630], [1150, 640]]],
      normal: [
        [[-40, 560], [200, 560], [310, 380], [250, 180], [430, 100], [620, 180], [650, 400], [810, 560], [1000, 520], [1150, 640]],
        [[-40, 560], [200, 560], [380, 600], [560, 640], [810, 560], [1000, 520], [1150, 640]],
      ],
      dificil: [
        [[-40, 150], [260, 180], [460, 300], [640, 420], [860, 520], [1000, 610], [1150, 640]],
        [[640, -40], [610, 180], [640, 420], [860, 520], [1000, 610], [1150, 640]],
        [[-40, 560], [300, 520], [640, 420], [860, 520], [1000, 610], [1150, 640]],
      ],
    },
  },
  {
    id: 'bar', name: 'Cantina Estelar', theme: 'bar', accent: '#ff5ad8',
    desc: 'Um bar espacial lotado. Os invasores passam entre as mesas e o balcão.',
    rotas: {
      facil: [[[-40, 100], [300, 80], [520, 160], [720, 90], [960, 110], [1100, 240], [960, 370], [700, 300], [460, 370], [260, 300], [140, 440], [260, 610], [520, 650], [760, 570], [960, 640], [1110, 600]]],
      normal: [[[-40, 360], [180, 300], [300, 140], [480, 110], [610, 290], [560, 500], [700, 640], [900, 560], [930, 380], [1120, 360]]],
      dificil: [
        [[-40, 200], [240, 140], [460, 230], [640, 360], [860, 300], [1000, 410], [1120, 360]],
        [[-40, 560], [240, 630], [460, 500], [640, 360], [860, 300], [1000, 410], [1120, 360]],
      ],
    },
  },
  {
    id: 'corrida', name: 'Corrida Estelar', theme: 'corrida', accent: '#ff3b30',
    desc: 'Uma pista de corrida no espaço. Os invasores aceleram pelas retas.',
    bg: ['#08081a', '#020208'], nebula: ['#2a2aa0', '#a02a2a'],
    rotas: {
      facil: [[[-40, 640], [400, 655], [900, 640], [1130, 560], [1185, 360], [1100, 160], [860, 75], [400, 75], [160, 140], [105, 320], [220, 460], [500, 480], [800, 460], [910, 330], [770, 245], [480, 255]]],
      normal: [
        [[-40, 620], [500, 645], [1000, 600], [1145, 420], [1065, 200], [800, 110], [440, 120], [200, 220], [220, 385], [440, 425], [700, 385], [860, 360]],
        [[-40, 620], [300, 520], [440, 425], [700, 385], [860, 360]],
      ],
      dificil: [
        [[-40, 620], [300, 610], [520, 490], [640, 360], [780, 470], [960, 530], [1100, 450]],
        [[-40, 100], [300, 130], [520, 240], [640, 360], [780, 470], [960, 530], [1100, 450]],
        [[1320, 100], [1020, 110], [800, 210], [640, 360], [780, 470], [960, 530], [1100, 450]],
      ],
    },
  },
  {
    id: 'marte', name: 'Deserto de Marte', theme: 'marte', accent: '#ff7a3a',
    desc: 'Areia vermelha, crateras e cânions. Trilhas abertas e diagonais.',
    rotas: {
      facil: [[[-40, 160], [150, 115], [300, 210], [330, 420], [240, 580], [400, 665], [600, 610], [665, 420], [620, 240], [720, 95], [900, 115], [1005, 280], [960, 460], [1060, 610], [1120, 580]]],
      normal: [
        [[-40, 360], [200, 300], [400, 180], [600, 220], [760, 380], [900, 520], [1100, 540]],
        [[640, -40], [670, 100], [600, 220], [760, 380], [900, 520], [1100, 540]],
      ],
      dificil: [
        [[-40, 600], [260, 560], [480, 440], [640, 340], [800, 480], [1000, 560], [1100, 500]],
        [[640, -40], [590, 140], [640, 340], [800, 480], [1000, 560], [1100, 500]],
        [[1320, 120], [1060, 150], [860, 230], [640, 340], [800, 480], [1000, 560], [1100, 500]],
      ],
    },
  },
  {
    id: 'nebulosa', name: 'Nebulosa Carmesim', theme: 'nebulosa', accent: '#ff5a8a',
    desc: 'Dentro de uma nebulosa. Os invasores vêm em massa.',
    bg: ['#2a0a1a', '#08020a'], nebula: ['#c02a5a', '#3a2aa0'],
    rotas: {
      facil: [[[640, -40], [600, 100], [340, 90], [140, 220], [120, 450], [300, 640], [640, 665], [980, 620], [1150, 420], [1080, 180], [860, 135], [600, 220], [430, 330], [470, 480], [680, 500], [820, 380]]],
      normal: [
        [[640, -40], [600, 120], [380, 150], [190, 290], [250, 470], [430, 440], [600, 300], [800, 250], [950, 390], [790, 580], [560, 630]],
        [[640, -40], [600, 120], [380, 150], [190, 290], [250, 470], [290, 610], [450, 670], [560, 630]],
      ],
      dificil: [
        [[-40, 300], [160, 180], [340, 240], [470, 390], [640, 360], [800, 470], [720, 600], [560, 640]],
        [[640, -40], [720, 120], [590, 230], [640, 360], [800, 470], [720, 600], [560, 640]],
        [[1320, 300], [1120, 180], [950, 250], [810, 330], [640, 360], [800, 470], [720, 600], [560, 640]],
      ],
    },
  },
];

// Os pontos das rotas são pontos de controle: o caminho real é uma curva suave (Catmull-Rom)
// que passa por eles, amostrada em trechos curtos. Assim os caminhos ficam curvos, não quadrados.
function suavizar(pts, passo = 14) {
  const out = [pts[0]];
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
for (const m of MAPS) for (const d of Object.keys(m.rotas)) m.rotas[d] = m.rotas[d].map((pts) => suavizar(pts));

// Dificuldades: multiplicam a vida dos invasores, os créditos iniciais, o casco e a recompensa.
const DIFICULDADES = {
  facil: { name: 'Fácil', color: '#5cff7a', hp: 0.8, money: 750, lives: 150, reward: 1.1 },
  normal: { name: 'Normal', color: '#ffe81f', hp: 1, money: 650, lives: 100, reward: 1 },
  dificil: { name: 'Difícil', color: '#ff3b30', hp: 1, money: 800, lives: 80, reward: 1.1 },
};
const DIF_ORDER = ['facil', 'normal', 'dificil'];

// ------------------------------------------------------------
// Defensores (personagens). range em unidades; cd = recarga do tiro em segundos.
//
// Árvore de evolução: cada defensor tem caminhos (paths) com 5 níveis.
// Ao comprar o 1º nível de um caminho, os outros ficam bloqueados.
// O nível 5 dos soldados é uma SUPER habilidade; os heróis ganham buffs fortes.
//
// Efeitos (fx) que um nível pode dar:
//   dmg +dano, dmgMul xdano, rate +% velocidade de tiro, range +alcance, splash +área,
//   slow lentidão (0 a 1), slowT +duração da lentidão, multishot +projéteis, crit +chance de crítico,
//   critMul multiplicador do crítico, pierce ignora blindagem, burn +queimadura por segundo,
//   burnT duração da queimadura, chain +saltos elétricos, stunChance chance de paralisar, stunT duração,
//   shred reduz blindagem do alvo, bossMul +dano em chefões, cash +% créditos por abate,
//   income créditos por onda, vuln alvo sofre +% de dano, explode explosão ao morrer marcado,
//   aura {range, dmg, rate} buffa aliados, pulse {every, kind, dmg, stun} efeito periódico,
//   slowAura lentidão contínua em todo o alcance, line tiro atravessa em linha,
//   ab melhora a habilidade do herói.
// ------------------------------------------------------------
const T = (name, fx, d) => ({ name, fx, d });
const P = (name, color, tiers) => ({ name, color, tiers });

const UNITS = {
  viajante: {
    name: 'Viajante Espacial', role: 'Herói', cost: 400, color: '#5fe8ff', hero: true, key: 'Q',
    desc: 'Herói de plasma. Muito dano, bom alcance e a habilidade Chuva de Plasma.',
    range: 175, dmg: 20, cd: 0.42, shot: 'plasma', r: 20,
    ability: { name: 'Chuva de Plasma', cd: 25, dmg: 140, radius: 270, stun: 1.2 },
    costs: [250, 450, 800, 1500, 3000],
    paths: [
      P('Pistoleiro', '#5fe8ff', [
        T('Plasma Concentrado', { dmg: 8 }), T('Gatilho Rápido', { rate: 0.25 }), T('Núcleo Instável', { dmg: 14 }),
        T('Duas Pistolas', { rate: 0.4, dmg: 10 }), T('Pistoleiro Galáctico', { dmgMul: 2.5, multishot: 2 }, 'Dano x2,5 e dispara 3 rajadas de plasma por vez.'),
      ]),
      P('Astro', '#c77dff', [
        T('Chuva Forte', { ab: { dmg: 0.4 } }, 'Chuva de Plasma causa +40% de dano.'),
        T('Recarga Estelar', { ab: { cd: -3 } }, 'Chuva de Plasma recarrega 3s mais rápido.'),
        T('Céu Aberto', { ab: { radius: 50, dmg: 0.4 } }, 'Chuva de Plasma: +50 de área e +40% de dano.'),
        T('Gravidade Zero', { ab: { cd: -4, stun: 0.5 } }, 'Recarga 4s menor e atordoa +0,5s.'),
        T('Supernova', { ab: { dmg: 2, radius: 100, cd: -5 } }, 'Chuva de Plasma vira uma supernova: dano x3, área enorme e recarga bem menor.'),
      ]),
      P('Explorador', '#ffd36b', [
        T('Visor Avançado', { range: 25 }), T('Ponto Fraco', { crit: 0.15, critMul: 3 }), T('Caçador de Tesouros', { cash: 0.25 }),
        T('Plasma Perfurante', { range: 35, pierce: true }), T('Lenda do Espaço', { crit: 0.3, critMul: 5, range: 40, cash: 0.5 }, 'Críticos de 5x em quase metade dos tiros e +50% de créditos.'),
      ]),
    ],
  },
  gosma: {
    name: 'Gosma Gigante', role: 'Herói', cost: 450, color: '#7aff4a', hero: true, key: 'E',
    desc: 'Heroína gelatinosa. Cospe gosma em área que deixa lento, e a habilidade Rio de Gosma paralisa um trecho do caminho.',
    range: 150, dmg: 10, cd: 0.9, shot: 'goo', r: 22, splash: 50, slow: 0.45, slowT: 1.8,
    ability: { name: 'Rio de Gosma', cd: 22, len: 240, dur: 6, stun: 1.6, dps: 12 },
    costs: [250, 450, 800, 1500, 3000],
    paths: [
      P('Ácido', '#c8ff3a', [
        T('Gosma Azeda', { dmg: 6 }), T('Corrosão', { burn: 8, burnT: 2 }), T('Derrete Metal', { dmg: 10, shred: 2 }),
        T('Ácido Puro', { burn: 25 }), T('Gosma Corrosiva', { dmgMul: 3, burn: 80, shred: 4 }, 'Dano x3, corrói a blindagem e derrete os invasores aos poucos.'),
      ]),
      P('Viscosa', '#7aff4a', [
        T('Mais Grudenta', { slow: 0.55 }), T('Cusparada Larga', { splash: 20 }), T('Pegajosa', { stunChance: 0.15, stunT: 0.7 }),
        T('Lama Cósmica', { splash: 25, slowT: 1 }), T('Cola Cósmica', { stunChance: 0.35, stunT: 1.2, slow: 0.75, splash: 30 }, 'Gruda quase tudo: 75% de lentidão e 35% de chance de paralisar.'),
      ]),
      P('Mutante', '#4affb0', [
        T('Poça Maior', { ab: { len: 80 } }, 'Rio de Gosma cobre +80 de caminho.'),
        T('Regeneração', { ab: { cd: -3 } }, 'Rio de Gosma recarrega 3s mais rápido.'),
        T('Gosma Tóxica', { ab: { stun: 0.6, dps: 1 } }, 'Paralisa +0,6s e o rio causa o dobro de dano.'),
        T('Enchente', { ab: { len: 120, dur: 2 } }, 'Rio +120 maior e dura +2s.'),
        T('Inundação de Gosma', { ab: { len: 250, stun: 1.5, dps: 3, cd: -5 } }, 'Um rio gigante de gosma: paralisa muito mais, causa dano alto e recarrega rápido.'),
      ]),
    ],
  },
  soldado: {
    name: 'Soldado Estelar', role: 'Básico', cost: 100, color: '#8fd36a',
    desc: 'Barato e versátil. Pouco dano no começo, mas evolui para qualquer função.',
    range: 125, dmg: 6, cd: 0.55, shot: 'laser', r: 14,
    costs: [90, 160, 320, 900, 2600],
    paths: [
      P('Rajada', '#8fd36a', [
        T('Gatilho Leve', { rate: 0.25 }), T('Carregador Duplo', { dmg: 2, rate: 0.15 }), T('Tiro Duplo', { multishot: 1 }),
        T('Fuzil Automático', { rate: 0.5, dmg: 3 }), T('Tempestade de Lasers', { multishot: 3, rate: 1, dmg: 8 }, 'SUPER: 5 lasers por vez numa cadência absurda.'),
      ]),
      P('Precisão', '#ffd36b', [
        T('Mira Holográfica', { range: 20 }), T('Munição Densa', { dmg: 5 }), T('Ponto Fraco', { crit: 0.2, critMul: 3 }),
        T('Perfurante', { pierce: true, dmg: 8 }), T('Lenda Estelar', { dmgMul: 3, crit: 0.25, critMul: 5, range: 70 }, 'SUPER: dano x3, críticos de 5x e alcance enorme.'),
      ]),
      P('Granadeiro', '#ff8a2a', [
        T('Granada de Pulso', { splash: 30 }), T('Carga Extra', { dmg: 4 }), T('Fragmentação', { splash: 15, rate: 0.2 }),
        T('Incendiária', { burn: 8, burnT: 2 }), T('Bombardeio Orbital', { pulse: { every: 5, kind: 'orbital', dmg: 450, stun: 0.6 }, dmg: 10 }, 'SUPER: a cada 5s chama um ataque orbital devastador no invasor mais avançado.'),
      ]),
      P('Comando', '#5fe8ff', [
        T('Rádio Tático', { aura: { range: 150, rate: 0.1 } }), T('Ordem de Ataque', { aura: { dmg: 0.1 } }), T('Antena Ampliada', { aura: { range: 40 }, range: 15 }),
        T('Disciplina', { aura: { rate: 0.1, dmg: 0.15 }, dmg: 4 }), T('General da Frota', { aura: { range: 60, dmg: 0.5, rate: 0.3 }, dmg: 15, rate: 0.5 }, 'SUPER: aliados por perto ganham +75% de dano e +50% de velocidade de tiro.'),
      ]),
    ],
  },
  crio: {
    name: 'Técnica Criogênica', role: 'Controle', cost: 170, color: '#9af0ff',
    desc: 'Dispara gelo que deixa os invasores lentos. Ótima para segurar os rápidos.',
    range: 130, dmg: 3, cd: 0.7, shot: 'ice', r: 14, slow: 0.4, slowT: 1.6,
    costs: [120, 200, 400, 1000, 2800],
    paths: [
      P('Congelamento', '#9af0ff', [
        T('Gelo Denso', { slow: 0.5 }), T('Frio Persistente', { slowT: 1 }), T('Congelar', { stunChance: 0.12, stunT: 0.6 }),
        T('Onda Fria', { splash: 35 }), T('Zero Absoluto', { pulse: { every: 5, kind: 'freeze', dmg: 80, stun: 1.6 } }, 'SUPER: a cada 5s congela TODOS os invasores no alcance.'),
      ]),
      P('Estilhaços', '#e8fbff', [
        T('Lâminas de Gelo', { dmg: 4 }), T('Cadência Gélida', { rate: 0.35 }), T('Quebra-gelo', { shred: 2, dmg: 4 }),
        T('Fragmentos', { multishot: 1, dmg: 6 }), T('Tempestade de Gelo', { multishot: 3, dmgMul: 3, rate: 0.5 }, 'SUPER: 5 estilhaços por vez com dano triplicado.'),
      ]),
      P('Nevasca', '#5aa8e0', [
        T('Neblina', { splash: 40 }), T('Frente Fria', { range: 25 }), T('Granizo', { splash: 20, dmg: 3 }),
        T('Clima Polar', { slowAura: 0.25 }), T('Era do Gelo', { slowAura: 0.65, range: 50, splash: 30, dmg: 10 }, 'SUPER: tudo no alcance fica 65% mais lento o tempo todo.'),
      ]),
      P('Marca Criogênica', '#c8a0ff', [
        T('Fragilizar', { vuln: 0.1 }), T('Alcance Estendido', { range: 20, rate: 0.2 }), T('Rachadura', { vuln: 0.15 }),
        T('Gelo Quebradiço', { vuln: 0.15, shred: 3 }), T('Estilhaçar', { vuln: 0.5, explode: 150 }, 'SUPER: alvos marcados sofrem +90% de dano e explodem em gelo ao morrer.'),
      ]),
    ],
  },
  atiradora: {
    name: 'Atiradora de Elite', role: 'Longo alcance', cost: 240, color: '#ff5a8a',
    desc: 'Alcance enorme e tiro forte que atravessa blindagem. Atira devagar.',
    range: 330, dmg: 45, cd: 1.8, shot: 'rail', r: 14, pierce: true,
    costs: [180, 300, 550, 1300, 3500],
    paths: [
      P('Calibre Pesado', '#ff5a8a', [
        T('Bala Pesada', { dmg: 25 }), T('Núcleo de Tungstênio', { dmg: 35 }), T('Impacto', { dmg: 50, stunChance: 0.15, stunT: 0.4 }),
        T('Canhão de Mão', { dmgMul: 1.5 }), T('Canhão Ferroviário', { dmgMul: 3, line: true }, 'SUPER: dano x3 e o tiro atravessa TODOS os invasores em linha.'),
      ]),
      P('Cadência', '#ffd36b', [
        T('Ferrolho Rápido', { rate: 0.3 }), T('Pente Estendido', { rate: 0.3 }), T('Semiautomática', { rate: 0.6 }),
        T('Cano Refrigerado', { rate: 0.6, dmg: 20 }), T('Metralhadora de Elite', { rate: 3, multishot: 1 }, 'SUPER: atira 4x mais rápido, dois alvos de cada vez.'),
      ]),
      P('Caçadora', '#ff4a4a', [
        T('Olho Treinado', { crit: 0.15, critMul: 2.5 }), T('Rastreadora', { bossMul: 0.5 }), T('Alvo Prioritário', { crit: 0.15, dmg: 25 }),
        T('Matadora de Gigantes', { bossMul: 1 }), T('Caçadora de Chefões', { bossMul: 4, crit: 0.2, critMul: 5 }, 'SUPER: dano x6,5 contra chefões e críticos de 5x.'),
      ]),
      P('Recompensa', '#7aff6a', [
        T('Contrato', { cash: 0.2 }), T('Mira Longa', { range: 60 }), T('Bônus de Risco', { income: 60 }),
        T('Patrocínio', { cash: 0.3, income: 100 }), T('Contrato Galáctico', { cash: 1, income: 400, dmg: 60 }, 'SUPER: dobra os créditos dos abates dela e paga ◆ 400 a mais por onda.'),
      ]),
    ],
  },
  artilheiro: {
    name: 'Artilheiro Pesado', role: 'Dano em área', cost: 280, color: '#ffb347',
    desc: 'Lança foguetes que explodem e acertam vários invasores juntos.',
    range: 155, dmg: 22, cd: 1.4, shot: 'rocket', r: 16, splash: 60,
    costs: [200, 320, 600, 1400, 3800],
    paths: [
      P('Explosivos', '#ffb347', [
        T('Pólvora Extra', { splash: 15 }), T('Ogiva Maior', { dmg: 15 }), T('Carga Dupla', { splash: 20, dmg: 10 }),
        T('Alto Explosivo', { dmgMul: 1.6 }), T('Ogiva Nuclear', { splash: 90, dmgMul: 3, stunChance: 1, stunT: 0.6 }, 'SUPER: explosões nucleares gigantes que atordoam tudo que acertam.'),
      ]),
      P('Lança-mísseis', '#ff5a5a', [
        T('Recarga Rápida', { rate: 0.25 }), T('Dois Tubos', { multishot: 1 }), T('Motor Turbo', { rate: 0.3 }),
        T('Bateria de Mísseis', { multishot: 1, dmg: 10 }), T('Enxame de Mísseis', { multishot: 4, rate: 1, dmg: 20 }, 'SUPER: dispara 7 mísseis por vez, o dobro de rápido.'),
      ]),
      P('Napalm', '#ff5a2a', [
        T('Gel Inflamável', { burn: 10, burnT: 2.5 }), T('Chamas Altas', { burn: 10 }), T('Tapete de Fogo', { splash: 15, burnT: 1.5 }),
        T('Fogo Grego', { burn: 30 }), T('Inferno', { burn: 150, burnT: 4, splash: 30 }, 'SUPER: tudo que for atingido queima com fogo infernal.'),
      ]),
      P('Abalo', '#c8a070', [
        T('Perfuração', { shred: 2 }), T('Concussão', { stunChance: 0.15, stunT: 0.5 }), T('Rompe-blindagem', { shred: 3, dmg: 10 }),
        T('Tremor', { pulse: { every: 7, kind: 'quake', dmg: 60, stun: 0.8 } }), T('Terremoto', { pulse: { every: 3, kind: 'quake', dmg: 350, stun: 1.2 }, shred: 6 }, 'SUPER: a cada 3s um terremoto atinge e atordoa tudo no alcance.'),
      ]),
    ],
  },
  piromante: {
    name: 'Piromante', role: 'Queimadura', cost: 220, color: '#ff7a2a',
    desc: 'Lança-chamas de curto alcance. Acerta em área e deixa os invasores queimando.',
    range: 100, dmg: 4, cd: 0.2, shot: 'flame', r: 15, splash: 28, burn: 6, burnT: 2,
    costs: [150, 260, 480, 1100, 3000],
    paths: [
      P('Chama Azul', '#5fa8ff', [
        T('Gás Puro', { dmg: 3 }), T('Bico Fino', { dmg: 4, rate: 0.2 }), T('Fogo Azul', { dmg: 6 }),
        T('Plasma Quente', { dmgMul: 1.6 }), T('Sol Portátil', { dmgMul: 4, splash: 20 }, 'SUPER: chamas na temperatura de uma estrela, dano x4.'),
      ]),
      P('Combustão', '#ff4a2a', [
        T('Combustível', { burn: 6 }), T('Fogo Lento', { burnT: 1.5 }), T('Brasas', { burn: 12 }),
        T('Labareda', { burn: 25 }), T('Fogo Eterno', { burn: 180, burnT: 5 }, 'SUPER: queimadura altíssima que dura mais de 8 segundos.'),
      ]),
      P('Maçarico Longo', '#ffd36b', [
        T('Bico Estendido', { range: 20 }), T('Pressão Alta', { range: 20 }), T('Leque de Fogo', { splash: 15 }),
        T('Jato Longo', { range: 30, dmg: 4 }), T('Sopro de Dragão', { range: 90, line: true, dmgMul: 2.5 }, 'SUPER: um jato de fogo enorme que atravessa a fila de invasores.'),
      ]),
      P('Derretimento', '#ff8aff', [
        T('Amolecer', { shred: 2 }), T('Fundir', { shred: 2 }), T('Fogo Perfurante', { pierce: true }),
        T('Metal Líquido', { vuln: 0.2 }), T('Fusão Nuclear', { vuln: 0.4, pierce: true, dmgMul: 2 }, 'SUPER: derrete blindagens; alvos sofrem +60% de dano de todos.'),
      ]),
    ],
  },
  tesla: {
    name: 'Engenheira Tesla', role: 'Elétrico', cost: 300, color: '#b48cff',
    desc: 'Raios que saltam de um invasor para outro. Ótima contra grupos.',
    range: 140, dmg: 12, cd: 1.0, shot: 'zap', r: 15, chain: 3,
    costs: [200, 330, 600, 1400, 3600],
    paths: [
      P('Corrente', '#b48cff', [
        T('Condutor', { chain: 1 }), T('Arco Largo', { chain: 1 }), T('Ramificação', { chain: 2 }),
        T('Rede Elétrica', { chain: 3, dmg: 6 }), T('Tempestade Elétrica', { chain: 10, dmgMul: 2 }, 'SUPER: o raio salta por até 20 invasores com dano dobrado.'),
      ]),
      P('Sobrecarga', '#ffe14a', [
        T('Voltagem', { dmg: 6 }), T('Choque', { stunChance: 0.15, stunT: 0.5 }), T('Alta Tensão', { dmg: 12 }),
        T('Sobrecarga', { dmgMul: 1.6, stunChance: 0.1 }), T('Raio Divino', { dmgMul: 4, stunChance: 0.3, stunT: 1 }, 'SUPER: raios de dano x4 que paralisam com frequência.'),
      ]),
      P('Usina', '#7aff6a', [
        T('Bateria Extra', { income: 40 }), T('Campo Energizado', { aura: { range: 140, rate: 0.1 } }), T('Gerador', { income: 80 }),
        T('Rede de Energia', { aura: { rate: 0.15, dmg: 0.15 } }), T('Usina de Fusão', { income: 350, aura: { range: 200, rate: 0.4, dmg: 0.4 } }, 'SUPER: gera ◆ 470 por onda e energiza os aliados (+55% de dano, +65% de velocidade).'),
      ]),
      P('Bobina', '#5fe8ff', [
        T('Capacitor', { rate: 0.3 }), T('Bobina Dupla', { rate: 0.3 }), T('Antena', { range: 25 }),
        T('Descarga Rápida', { rate: 0.6 }), T('Arco Contínuo', { rate: 3, chain: 2 }, 'SUPER: dispara raios quase sem parar.'),
      ]),
    ],
  },
};
// Visual de cada caminho (acessório desenhado em js/art.js), na ordem dos caminhos.
const PATH_LOOKS = {
  viajante: ['canos', 'halo', 'visor'],
  gosma: ['chifres', 'tentaculos', 'olhos'],
  soldado: ['canos', 'luneta', 'mochila', 'estandarte'],
  crio: ['cristais', 'canos', 'nevasca', 'runas'],
  atiradora: ['luneta', 'canos', 'visor', 'medalhas'],
  artilheiro: ['mochila', 'canos', 'tanques', 'escudo'],
  piromante: ['chama', 'tanques', 'luneta', 'runas'],
  tesla: ['bobinas', 'canos', 'antena', 'halo'],
};
for (const [type, looks] of Object.entries(PATH_LOOKS)) looks.forEach((l, i) => { UNITS[type].paths[i].look = l; });

const UNIT_ORDER = ['viajante', 'gosma', 'soldado', 'crio', 'atiradora', 'artilheiro', 'piromante', 'tesla'];

// Texto automático de um nível (quando não tem descrição própria).
function describeFx(fx) {
  const pct = (v) => Math.round(v * 100) + '%';
  const out = [];
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'dmg') out.push(`+${v} de dano`);
    else if (k === 'dmgMul') out.push(`dano x${String(v).replace('.', ',')}`);
    else if (k === 'rate') out.push(`+${pct(v)} velocidade de tiro`);
    else if (k === 'range') out.push(`+${v} de alcance`);
    else if (k === 'splash') out.push(`+${v} de área`);
    else if (k === 'slow') out.push(`lentidão de ${pct(v)}`);
    else if (k === 'slowT') out.push(`lentidão dura +${v}s`);
    else if (k === 'multishot') out.push(`+${v} projétil${v > 1 ? 'eis' : ''} por tiro`);
    else if (k === 'crit') out.push(`+${pct(v)} de chance de crítico`);
    else if (k === 'critMul') out.push(`crítico x${String(v).replace('.', ',')}`);
    else if (k === 'pierce') out.push('ignora blindagem');
    else if (k === 'burn') out.push(`+${v} de queimadura/s`);
    else if (k === 'burnT') out.push(`queimadura dura +${v}s`);
    else if (k === 'chain') out.push(`+${v} salto${v > 1 ? 's' : ''} elétrico${v > 1 ? 's' : ''}`);
    else if (k === 'stunChance') out.push(`+${pct(v)} de chance de paralisar`);
    else if (k === 'shred') out.push(`-${v} de blindagem no alvo`);
    else if (k === 'bossMul') out.push(`+${pct(v)} de dano em chefões`);
    else if (k === 'cash') out.push(`+${pct(v)} de créditos por abate`);
    else if (k === 'income') out.push(`+◆ ${v} por onda`);
    else if (k === 'vuln') out.push(`alvo sofre +${pct(v)} de dano`);
    else if (k === 'slowAura') out.push(`tudo no alcance fica ${pct(v)} mais lento`);
    else if (k === 'aura') {
      const p = [];
      if (v.dmg) p.push(`+${pct(v.dmg)} dano`);
      if (v.rate) p.push(`+${pct(v.rate)} velocidade`);
      if (v.range && !v.dmg && !v.rate) p.push(`+${v.range} de raio da aura`);
      out.push(`aliados por perto: ${p.join(', ')}`);
    } else if (k === 'pulse') out.push(v.kind === 'quake' ? `tremor a cada ${v.every}s` : `efeito a cada ${v.every}s`);
  }
  return out.join(', ');
}

// Invasores. speed em unidades por segundo; dmg = dano no casco se chegar; reward = créditos ao morrer.
const ENEMIES = {
  drone: { name: 'Drone Invasor', hp: 30, speed: 58, armor: 0, r: 13, dmg: 2, reward: 6, color: '#7aff6a' },
  interceptador: { name: 'Interceptador', hp: 20, speed: 100, armor: 0, r: 12, dmg: 1, reward: 5, color: '#ffd23f' },
  blindado: { name: 'Tanque Blindado', hp: 120, speed: 36, armor: 4, r: 17, dmg: 5, reward: 14, color: '#b0b8c8' },
  enxame: { name: 'Mini-drone', hp: 10, speed: 75, armor: 0, r: 8, dmg: 1, reward: 2, color: '#ff7aff' },
  cruzador: { name: 'Cruzador Alienígena', hp: 1400, speed: 26, armor: 5, r: 34, dmg: 30, reward: 160, color: '#ff4a4a', boss: true },
};

const TOTAL_WAVES = 20;
const START_MONEY = 650;
const START_LIVES = 100;

// Monta a lista de grupos de uma onda: [tipo, quantidade, intervalo entre eles, atraso inicial].
function buildWave(n, mapIndex, dif) {
  const D = DIFICULDADES[dif || 'normal'];
  const groups = [];
  const base = 6 + n * 2;
  groups.push(['drone', base, 0.8, 0]);
  if (n >= 3) groups.push(['interceptador', Math.floor(n * 1.2), 0.55, 3]);
  if (n >= 5) groups.push(['blindado', Math.floor((n - 3) * 0.7), 1.6, 6]);
  if (n >= 7) groups.push(['enxame', 8 + n * 2, 0.18, 9]);
  if (n >= 12) groups.push(['interceptador', n, 0.35, 14]);
  if (n >= 14) groups.push(['blindado', Math.floor(n * 0.5), 1.1, 16]);
  if (n === 10 || n === 20) groups.push(['cruzador', n === 20 ? 2 : 1, 6, 12]);
  if (n === 15) groups.push(['cruzador', 1, 1, 20]);
  // vida cresce a cada onda, um pouco a cada setor e com a dificuldade
  const hpMul = (1 + (n - 1) * 0.24 + (n - 1) * (n - 1) * 0.016) * (1 + mapIndex * 0.12) * D.hp;
  // o chefão cresce mais devagar que os invasores comuns
  const bossMul = (1 + (n - 1) * 0.2) * (1 + mapIndex * 0.08) * D.hp;
  return { groups, hpMul, bossMul };
}
