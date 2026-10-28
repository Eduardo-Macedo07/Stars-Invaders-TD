'use strict';

// ============================================================
// Dados do jogo: setores (mapas), defensores, invasores e ondas.
// O mundo tem sempre 1280 x 720 unidades; a tela ajusta a escala.
// ============================================================
const WORLD_W = 1280;
const WORLD_H = 720;

// Cada setor tem um caminho fixo (pontos por onde os invasores passam).
// O primeiro ponto é o portal de entrada; o último, a nave-mãe.
const MAPS = [
  {
    id: 'asteroides', name: 'Cinturão de Asteroides', accent: '#5fe8ff',
    desc: 'Rota sinuosa entre rochas flutuantes. Bom para começar.',
    bg: ['#0a1030', '#03050f'], nebula: ['#2a4aa0', '#5a2a90'],
    path: [[-40, 130], [260, 130], [260, 420], [560, 420], [560, 170], [880, 170], [880, 560], [1130, 560]],
  },
  {
    id: 'estacao', name: 'Estação Órbita-7', accent: '#ffb347',
    desc: 'Corredores de uma estação abandonada, com curvas fechadas.',
    bg: ['#1a1224', '#05030a'], nebula: ['#a0502a', '#5a2a60'],
    path: [[-40, 610], [190, 610], [190, 150], [470, 150], [470, 520], [760, 520], [760, 210], [1040, 210], [1040, 640], [1160, 640]],
  },
  {
    id: 'nebulosa', name: 'Nebulosa Carmesim', accent: '#ff5a8a',
    desc: 'Caminho longo dentro de uma nebulosa. Os invasores vêm em massa.',
    bg: ['#2a0a1a', '#08020a'], nebula: ['#c02a5a', '#3a2aa0'],
    path: [[640, -40], [640, 120], [150, 120], [150, 320], [1120, 320], [1120, 510], [300, 510], [300, 640], [560, 640]],
  },
];

// Defensores (personagens). range e cd (recarga) em segundos; ups = melhorias dos níveis 2 e 3.
const UNITS = {
  viajante: {
    name: 'Viajante Espacial', role: 'Herói', cost: 400, color: '#5fe8ff', hero: true,
    desc: 'O herói. Muito dano, bom alcance e a habilidade Chuva de Plasma. Só pode haver um.',
    range: 175, dmg: 20, cd: 0.42, shot: 'plasma', r: 20,
    ability: { name: 'Chuva de Plasma', cd: 25, dmg: 140, radius: 270, stun: 1.2 },
    ups: [
      { cost: 320, text: '+12 de dano, +15 de alcance, habilidade +50%', apply: (u) => { u.dmg += 12; u.range += 15; u.abilityMul += 0.5; } },
      { cost: 650, text: '+18 de dano, tiro 25% mais rápido, habilidade +60%', apply: (u) => { u.dmg += 18; u.cd *= 0.75; u.abilityMul += 0.6; } },
    ],
  },
  soldado: {
    name: 'Soldado Estelar', role: 'Básico', cost: 100, color: '#8fd36a',
    desc: 'Barato e rápido de posicionar. Pouco dano, mas vários juntos seguram a linha.',
    range: 125, dmg: 6, cd: 0.55, shot: 'laser', r: 14,
    ups: [
      { cost: 110, text: '+4 de dano, +10 de alcance', apply: (u) => { u.dmg += 4; u.range += 10; } },
      { cost: 220, text: '+5 de dano, tiro 30% mais rápido', apply: (u) => { u.dmg += 5; u.cd *= 0.7; } },
    ],
  },
  crio: {
    name: 'Técnica Criogênica', role: 'Controle', cost: 170, color: '#9af0ff',
    desc: 'Dispara gelo que deixa os invasores lentos. Ótima para segurar os rápidos.',
    range: 130, dmg: 3, cd: 0.7, shot: 'ice', r: 14, slow: 0.4, slowT: 1.6,
    ups: [
      { cost: 150, text: 'Lentidão de 55%, +15 de alcance', apply: (u) => { u.slow = 0.55; u.range += 15; } },
      { cost: 300, text: 'Congela em área pequena, +4 de dano', apply: (u) => { u.splash = 45; u.dmg += 4; } },
    ],
  },
  atiradora: {
    name: 'Atiradora de Elite', role: 'Longo alcance', cost: 240, color: '#ff5a8a',
    desc: 'Alcance enorme e tiro forte que atravessa blindagem. Atira devagar.',
    range: 330, dmg: 45, cd: 1.8, shot: 'rail', r: 14, pierceArmor: true,
    ups: [
      { cost: 220, text: '+30 de dano', apply: (u) => { u.dmg += 30; } },
      { cost: 420, text: '+40 de dano, tiro 30% mais rápido', apply: (u) => { u.dmg += 40; u.cd *= 0.7; } },
    ],
  },
  artilheiro: {
    name: 'Artilheiro Pesado', role: 'Dano em área', cost: 280, color: '#ffb347',
    desc: 'Lança foguetes que explodem e acertam vários invasores juntos.',
    range: 155, dmg: 22, cd: 1.4, shot: 'rocket', r: 16, splash: 60,
    ups: [
      { cost: 250, text: '+12 de dano, explosão maior', apply: (u) => { u.dmg += 12; u.splash += 15; } },
      { cost: 460, text: '+25 de dano, tiro 25% mais rápido', apply: (u) => { u.dmg += 25; u.cd *= 0.75; } },
    ],
  },
};
const UNIT_ORDER = ['viajante', 'soldado', 'crio', 'atiradora', 'artilheiro'];

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
function buildWave(n, mapIndex) {
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
  // vida cresce a cada onda (e um pouco a cada setor)
  const hpMul = (1 + (n - 1) * 0.24 + (n - 1) * (n - 1) * 0.016) * (1 + mapIndex * 0.25);
  // o chefão cresce mais devagar que os invasores comuns
  const bossMul = (1 + (n - 1) * 0.2) * (1 + mapIndex * 0.15);
  return { groups, hpMul, bossMul };
}
