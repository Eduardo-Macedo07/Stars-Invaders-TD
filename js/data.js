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
