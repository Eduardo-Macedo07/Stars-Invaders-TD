'use strict';

// ============================================================
// Desenho estilo cartoon futurista (tudo feito por código)
// ============================================================
const Art = (() => {
  const TAU = Math.PI * 2;
  const OUT = '#0a0e1e';

  function hex(h) {
    const v = parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function mix(a, b, t) {
    const A = hex(a);
    const B = hex(b);
    return '#' + [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join('');
  }
  const light = (c, t) => mix(c, '#ffffff', t);
  const dark = (c, t) => mix(c, '#000000', t);
  function rgba(h, a) {
    const [r, g, b] = hex(h);
    return `rgba(${r},${g},${b},${a})`;
  }

  function outline(g, w) {
    g.lineWidth = w === undefined ? 2 : w;
    g.strokeStyle = OUT;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
  function radial(g, x, y, r, c) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
    gr.addColorStop(0, light(c, 0.45));
    gr.addColorStop(0.55, c);
    gr.addColorStop(1, dark(c, 0.45));
    return gr;
  }
  function lin(g, x0, y0, x1, y1, a, b) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  }
  function ball(g, x, y, r, c, w, shine = true) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fillStyle = radial(g, x, y, r, c);
    g.fill();
    if (w !== 0) outline(g, w);
    if (shine) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.17, -0.5, 0, TAU);
      g.fill();
    }
  }
  function poly(g, pts, fill, w) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (w !== 0) outline(g, w);
  }
  function rrect(g, x, y, w, h, r, fill, lw) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (lw !== 0) outline(g, lw);
  }

  // brilho aditivo (sprite em cache por cor)
  const glows = new Map();
  function glowSprite(c) {
    let s = glows.get(c);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(c, 1));
      gr.addColorStop(0.35, rgba(c, 0.45));
      gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      glows.set(c, s);
    }
    return s;
  }
  function glow(g, x, y, r, c, a) {
    if (r <= 0) return;
    const op = g.globalCompositeOperation;
    const ga = g.globalAlpha;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = ga * (a === undefined ? 1 : a);
    g.drawImage(glowSprite(c), x - r, y - r, r * 2, r * 2);
    g.globalCompositeOperation = op;
    g.globalAlpha = ga;
  }

  // ---------- Fundo do setor (estrelas, nebulosa, decoração e o caminho), em cache ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function asteroid(g, x, y, r, R) {
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const k = 0.75 + R() * 0.3;
      pts.push(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k);
    }
    poly(g, pts.map((v, i) => (i % 2 ? v + r * 0.18 : v)), '#0c0a12', 0);
    poly(g, pts, lin(g, x - r, y - r, x + r, y + r, '#7a6a64', '#2a2226'), 2);
    for (let i = 0; i < 3; i++) {
      const cx = x + (R() - 0.5) * r;
      const cy = y + (R() - 0.5) * r;
      g.beginPath();
      g.arc(cx, cy, r * (0.12 + R() * 0.12), 0, TAU);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fill();
    }
  }

  function planet(g, x, y, r, c, ring) {
    glow(g, x, y, r * 2.2, c, 0.25);
    ball(g, x, y, r, c, 2.5);
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.clip();
    g.strokeStyle = rgba('#ffffff', 0.15);
    g.lineWidth = r * 0.12;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(x - r, y + i * r * 0.3);
      g.lineTo(x + r, y + i * r * 0.3 - r * 0.2);
      g.stroke();
    }
    g.restore();
    if (ring) {
      g.save();
      g.translate(x, y);
      g.rotate(-0.35);
      g.scale(1, 0.28);
      g.strokeStyle = rgba(light(c, 0.4), 0.8);
      g.lineWidth = r * 0.35;
      g.beginPath();
      g.arc(0, 0, r * 1.6, Math.PI * 0.05, Math.PI * 0.95, true);
      g.stroke();
      g.restore();
    }
  }

  function buildBackground(map, idx) {
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const g = c.getContext('2d');
    const R = rng(1234 + idx * 777);
    const bg = g.createRadialGradient(WORLD_W * 0.5, WORLD_H * 0.45, 50, WORLD_W * 0.5, WORLD_H * 0.5, WORLD_W * 0.8);
    bg.addColorStop(0, map.bg[0]);
    bg.addColorStop(1, map.bg[1]);
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // nebulosas
    for (let i = 0; i < 9; i++) {
      glow(g, R() * WORLD_W, R() * WORLD_H, 180 + R() * 260, map.nebula[i % 2], 0.18 + R() * 0.12);
    }
    // estrelas
    for (let i = 0; i < 380; i++) {
      const s = R();
      g.fillStyle = `rgba(${200 + R() * 55},${210 + R() * 45},255,${0.3 + s * 0.7})`;
      g.fillRect(R() * WORLD_W, R() * WORLD_H, s > 0.9 ? 2 : 1, s > 0.9 ? 2 : 1);
    }
    // decoração própria do setor
    if (map.id === 'asteroides') {
      planet(g, 1060, 110, 70, '#4a7ad0', true);
      for (let i = 0; i < 26; i++) asteroid(g, R() * WORLD_W, R() * WORLD_H, 8 + R() * 22, R);
    } else if (map.id === 'estacao') {
      planet(g, 120, 90, 55, '#d07a3a', false);
      // placas de metal da estação
      for (let i = 0; i < 18; i++) {
        const x = R() * WORLD_W;
        const y = R() * WORLD_H;
        const w = 50 + R() * 90;
        const h = 30 + R() * 60;
        rrect(g, x, y, w, h, 6, lin(g, x, y, x, y + h, '#3a3448', '#1a1624'), 2);
        g.fillStyle = 'rgba(255,180,80,0.5)';
        for (let k = 0; k < 3; k++) g.fillRect(x + 8 + k * 14, y + 8, 6, 3);
      }
    } else {
      planet(g, 1150, 620, 80, '#c03a6a', true);
      for (let i = 0; i < 14; i++) glow(g, R() * WORLD_W, R() * WORLD_H, 60 + R() * 90, '#ff5a8a', 0.12);
      for (let i = 0; i < 14; i++) asteroid(g, R() * WORLD_W, R() * WORLD_H, 6 + R() * 14, R);
    }
    drawPathStatic(g, map.path);
    return c;
  }

  // Caminho: faixa metálica com bordas brilhantes.
  function drawPathStatic(g, path) {
    const stroke = (w, color) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
      g.stroke();
    };
    stroke(70, 'rgba(0,0,0,0.45)');
    stroke(62, '#5fe8ff');
    stroke(56, '#1a2340');
    stroke(46, '#252f52');
    stroke(2, 'rgba(120,180,255,0.35)');
  }

  // Setas de energia correndo pelo caminho (animado).
  function drawPathFlow(g, path, t) {
    g.save();
    g.strokeStyle = 'rgba(95,232,255,0.5)';
    g.lineWidth = 3;
    g.setLineDash([10, 34]);
    g.lineDashOffset = -t * 60;
    g.beginPath();
    g.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
    g.stroke();
    g.restore();
  }

  // Portal de onde saem os invasores.
  function portal(g, x, y, t) {
    glow(g, x, y, 90, '#c77dff', 0.6);
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(x, y);
      g.rotate(t * (1 + i * 0.6) * (i % 2 ? -1 : 1));
      g.strokeStyle = rgba(i === 1 ? '#5fe8ff' : '#c77dff', 0.8);
      g.lineWidth = 4 - i;
      g.beginPath();
      g.arc(0, 0, 26 + i * 9, 0, Math.PI * 1.4);
      g.stroke();
      g.restore();
    }
    ball(g, x, y, 16, '#3a1a6a', 2, false);
    glow(g, x, y, 22, '#ffffff', 0.5);
  }

  // Nave-mãe: grande, com luzes piscando e escudo que pisca quando é atingida.
  function mothership(g, x, y, t, hpFrac, hitT) {
    g.save();
    g.translate(x, y);
    const bob = Math.sin(t * 1.5) * 3;
    g.translate(0, bob);
    glow(g, 0, 0, 150, '#5fe8ff', 0.25);
    // motores
    for (const s of [-1, 1]) {
      glow(g, s * 40, 52, 26, '#ff8a2a', 0.8 + Math.sin(t * 20 + s) * 0.2);
    }
    // casco
    poly(g, [-95, 10, -40, -46, 40, -46, 95, 10, 60, 40, -60, 40], lin(g, 0, -46, 0, 40, '#c8d4e8', '#4a5676'), 3);
    poly(g, [-60, 40, 60, 40, 44, 54, -44, 54], '#2a3050', 2.5);
    rrect(g, -30, -60, 60, 24, 8, lin(g, 0, -60, 0, -36, '#a8b8d8', '#3a4666'), 2.5);
    // ponte com vidro
    rrect(g, -18, -56, 36, 12, 5, '#5fe8ff', 1.5);
    glow(g, 0, -50, 24, '#5fe8ff', 0.6);
    // listras e luzes
    g.strokeStyle = 'rgba(30,40,70,0.6)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-70, 10); g.lineTo(70, 10);
    g.moveTo(-30, -46); g.lineTo(-40, 40);
    g.moveTo(30, -46); g.lineTo(40, 40);
    g.stroke();
    for (let i = -3; i <= 3; i++) {
      const on = Math.sin(t * 4 + i) > 0;
      ball(g, i * 22, 24, 3, on ? '#ffd36b' : '#5a4a2a', 1, false);
      if (on) glow(g, i * 22, 24, 8, '#ffd36b', 0.6);
    }
    // escudo
    const k = Math.max(0, hitT);
    g.strokeStyle = rgba(hpFrac > 0.35 ? '#5fe8ff' : '#ff4a4a', 0.25 + k * 0.6);
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, -4, 120, 78, 0, 0, TAU);
    g.stroke();
    g.restore();
  }

  // ---------- Defensores (vistos de cima, arma apontando para o alvo) ----------
  // a = ângulo da arma; tier = nível no caminho escolhido (0 a 5); pc = cor do caminho;
  // recoil = recuo do tiro (0 a 1). No nível 5 o defensor fica maior, com aura e coroa.
  function unit(g, type, x, y, a, tier, t, recoil, sel, pc) {
    const U = UNITS[type];
    const r = U.r;
    const col = pc || U.color;
    const sup = tier >= 5;
    g.save();
    g.translate(x, y);
    if (sup) {
      glow(g, 0, 0, r * 3.2, col, 0.45 + Math.sin(t * 3) * 0.12);
      g.save();
      g.rotate(t * 0.8);
      g.strokeStyle = rgba(col, 0.7);
      g.lineWidth = 2;
      g.setLineDash([6, 7]);
      g.beginPath();
      g.arc(0, 0, r * 1.9, 0, TAU);
      g.stroke();
      g.restore();
      g.scale(1.25, 1.25);
    }
    // base de holograma no chão
    g.save();
    g.scale(1, 0.45);
    g.beginPath();
    g.arc(0, r * 1.5, r * 1.25, 0, TAU);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fill();
    g.strokeStyle = rgba(col, sel ? 0.95 : 0.55);
    g.lineWidth = sel ? 3 : 2;
    g.stroke();
    g.restore();
    const bob = Math.sin(t * 3 + x) * 1;
    g.translate(0, bob);
    if (type === 'gosma') {
      gosmaBody(g, r, a, t, recoil, tier, col);
    } else {
      soldierBody(g, type, U, r, a, t, recoil, tier, col);
    }
    // marcadores de nível (bolinhas na cor do caminho) e coroa no nível 5
    if (sup) {
      poly(g, [-9, -r - 10, -9, -r - 20, -4.5, -r - 15, 0, -r - 23, 4.5, -r - 15, 9, -r - 20, 9, -r - 10], '#ffd36b', 1.5);
      glow(g, 0, -r - 16, 14, '#ffd36b', 0.5);
    } else {
      for (let i = 0; i < tier; i++) {
        const sx = (i - (tier - 1) / 2) * 8;
        ball(g, sx, -r - 13, 3, col, 1.2, false);
      }
    }
    g.restore();
  }

  function soldierBody(g, type, U, r, a, t, recoil, tier, col) {
    g.save();
    g.rotate(a);
    const kick = -recoil * 4;
    // arma (por tipo)
    if (type === 'viajante') {
      rrect(g, 4 + kick, -5, 28, 10, 3, lin(g, 0, -5, 0, 5, '#e8f0ff', '#5a6a8a'), 2);
      rrect(g, 26 + kick, -3, 10, 6, 2, '#5fe8ff', 1.5);
      glow(g, 36 + kick, 0, 10 + recoil * 12, '#5fe8ff', 0.6);
    } else if (type === 'atiradora') {
      rrect(g, 2 + kick, -3, 40, 6, 2, lin(g, 0, -3, 0, 3, '#c8ccd8', '#3a3a4a'), 1.8);
      rrect(g, 12 + kick, -7, 10, 4, 1.5, '#ff5a8a', 1.2);
    } else if (type === 'artilheiro') {
      rrect(g, 0 + kick, -8, 30, 16, 5, lin(g, 0, -8, 0, 8, '#8a7a5a', '#3a2a1a'), 2);
      ball(g, 30 + kick, 0, 6, '#ffb347', 1.5, false);
    } else if (type === 'crio') {
      rrect(g, 4 + kick, -5, 22, 10, 5, lin(g, 0, -5, 0, 5, '#e8fbff', '#5aa8e0'), 1.8);
      ball(g, 27 + kick, 0, 5, '#9af0ff', 1.4);
      glow(g, 27 + kick, 0, 10, '#9af0ff', 0.6);
    } else if (type === 'piromante') {
      // tanque nas costas e bico do lança-chamas
      rrect(g, -r * 1.25, -7, 10, 14, 4, lin(g, 0, -7, 0, 7, '#ff9a4a', '#8a2a0a'), 1.8);
      rrect(g, 4 + kick, -4, 24, 8, 3, lin(g, 0, -4, 0, 4, '#6a6a76', '#2a2a30'), 1.8);
      glow(g, 30 + kick, 0, 9 + recoil * 8 + Math.sin(t * 30) * 2, '#ff8a2a', 0.8);
    } else if (type === 'tesla') {
      rrect(g, 4 + kick, -4, 18, 8, 3, '#3a3050', 1.8);
      for (let i = 0; i < 3; i++) ball(g, 10 + i * 5 + kick, 0, 4, '#b48cff', 1, false);
      ball(g, 27 + kick, 0, 5, '#e8d8ff', 1.4);
      glow(g, 27 + kick, 0, 12 + Math.sin(t * 25) * 3, '#b48cff', 0.8);
    } else {
      rrect(g, 4 + kick, -4, 22, 8, 2.5, lin(g, 0, -4, 0, 4, '#8a96a6', '#2a3038'), 1.8);
    }
    // corpo (ombros) e mãos
    const armor = type === 'viajante' ? '#e8ecf4' : tier >= 3 ? light(U.color, 0.1) : dark(U.color, 0.15);
    ball(g, 8, -8, r * 0.32, armor, 1.5, false);
    ball(g, 8, 8, r * 0.32, armor, 1.5, false);
    g.restore();
    if (type === 'viajante') {
      // capa esvoaçante
      const wave = Math.sin(t * 5) * 3;
      g.save();
      g.rotate(a + Math.PI);
      poly(g, [-4, -r * 0.8, -4, r * 0.8, r * 1.6, r * 0.9 + wave, r * 1.9, 0, r * 1.6, -r * 0.9 - wave], lin(g, 0, 0, r * 2, 0, '#2a4aa0', '#0a1a40'), 2);
      g.restore();
    }
    ball(g, 0, 0, r * 0.8, armor, 2.2);
    // detalhe colorido no peito (cor do caminho escolhido)
    g.save();
    g.rotate(a);
    rrect(g, -r * 0.2, -r * 0.45, r * 0.4, r * 0.9, 3, col, 1.2);
    g.restore();
    // capacete com visor apontando para o alvo
    ball(g, 0, -2, r * 0.58, type === 'viajante' ? '#f4f8ff' : mix(armor, '#ffffff', 0.3), 2);
    g.save();
    g.translate(0, -2);
    g.rotate(a);
    g.beginPath();
    g.ellipse(r * 0.22, 0, r * 0.3, r * 0.36, 0, -1.2, 1.2);
    g.fillStyle = type === 'viajante' ? '#ffb347' : '#1a2a4a';
    g.fill();
    outline(g, 1.2);
    glow(g, r * 0.3, 0, r * 0.5, type === 'viajante' ? '#ffb347' : U.color, 0.6);
    g.restore();
    if (type === 'viajante') {
      // antena
      g.strokeStyle = OUT;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-r * 0.2, -r * 0.6);
      g.lineTo(-r * 0.4, -r * 1.1);
      g.stroke();
      ball(g, -r * 0.4, -r * 1.15, 3, '#ff4a4a', 1, false);
      glow(g, -r * 0.4, -r * 1.15, 8, '#ff4a4a', 0.5 + Math.sin(t * 6) * 0.3);
    }
  }

  // Gosma Gigante: gelatina verde translúcida que balança, com coisas boiando dentro e olhos grandes.
  function gosmaBody(g, r, a, t, recoil, tier, col) {
    const sq = 1 + Math.sin(t * 4) * 0.06 + recoil * 0.12;
    const R = r * 1.05;
    g.save();
    g.scale(1 / sq, sq);
    // corpo ondulado
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const k = (i / 16) * TAU;
      const w = 1 + Math.sin(k * 3 + t * 5) * 0.05;
      pts.push(Math.cos(k) * R * w, Math.sin(k) * R * w * 0.92 + (Math.sin(k) > 0 ? R * 0.08 : 0));
    }
    glow(g, 0, 0, R * 2, '#7aff4a', 0.35);
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
    gr.addColorStop(0, 'rgba(210,255,170,0.95)');
    gr.addColorStop(0.5, 'rgba(120,240,80,0.85)');
    gr.addColorStop(1, 'rgba(40,140,30,0.9)');
    g.fillStyle = gr;
    g.fill();
    outline(g, 2.4);
    // objetos engolidos boiando lá dentro
    g.globalAlpha = 0.55;
    rrect(g, -R * 0.55 + Math.sin(t) * 2, R * 0.15, R * 0.35, R * 0.2, 2, '#c8a070', 1);
    ball(g, R * 0.45, R * 0.35 + Math.sin(t * 1.3) * 2, R * 0.14, '#ff5a8a', 1, false);
    g.globalAlpha = 1;
    // bolhas
    for (let i = 0; i < 4; i++) {
      const by = R * 0.6 - ((t * 12 + i * 9) % (R * 1.2));
      g.beginPath();
      g.arc(-R * 0.2 + i * R * 0.15, by, 2 + (i % 2), 0, TAU);
      g.strokeStyle = 'rgba(230,255,210,0.8)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    // brilho
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(-R * 0.4, -R * 0.5, R * 0.28, R * 0.13, -0.5, 0, TAU);
    g.fill();
    // olhos que seguem o alvo e boca sorridente
    const ex = Math.cos(a) * 2.5;
    const ey = Math.sin(a) * 2.5;
    for (const s of [-1, 1]) {
      ball(g, s * R * 0.3, -R * 0.15, R * 0.22, '#ffffff', 1.6, false);
      ball(g, s * R * 0.3 + ex, -R * 0.15 + ey, R * 0.1, '#0a1a0a', 0, false);
    }
    g.beginPath();
    g.arc(0, R * 0.12, R * 0.28, 0.2, Math.PI - 0.2);
    g.strokeStyle = '#1a4a10';
    g.lineWidth = 2.2;
    g.stroke();
    if (tier >= 3) {
      // mais forte: gosma escorrendo com a cor do caminho
      for (const s of [-1, 1]) ball(g, s * R * 0.75, R * 0.6 + Math.sin(t * 3 + s) * 2, R * 0.16, col, 1.2, false);
    }
    g.restore();
  }

  // Poça do Rio de Gosma sobre o caminho (pts = pontos amostrados do trecho).
  function goo(g, pts, t, k) {
    if (pts.length < 2) return;
    const stroke = (w, c) => {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    };
    g.save();
    g.globalAlpha = Math.min(1, k * 3);
    stroke(58, 'rgba(20,80,10,0.55)');
    stroke(50, 'rgba(110,230,70,0.75)');
    stroke(26, 'rgba(190,255,150,0.6)');
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = pts[i];
      const s = (Math.sin(t * 3 + i * 1.7) + 1) * 0.5;
      g.beginPath();
      g.arc(x + Math.sin(i * 2.3) * 14, y + Math.cos(i * 1.9) * 14, 3 + s * 4, 0, TAU);
      g.strokeStyle = 'rgba(230,255,210,0.85)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    g.restore();
  }

  function starPts(x, y, R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const k = i % 2 ? r : R;
      pts.push(x + Math.cos(a) * k, y + Math.sin(a) * k);
    }
    return pts;
  }

  // ---------- Invasores (giram na direção em que andam) ----------
  function enemy(g, e, t) {
    const E = ENEMIES[e.type];
    const r = E.r;
    g.save();
    g.translate(e.x, e.y);
    // sombra
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(0, r * 0.9, r * 0.9, r * 0.3, 0, 0, TAU);
    g.fill();
    if (e.slowT > 0) glow(g, 0, 0, r * 2, '#9af0ff', 0.4);
    g.rotate(e.angle);
    const flash = e.flash > 0;
    const col = flash ? '#ffffff' : E.color;
    if (e.type === 'drone') {
      ball(g, 0, 0, r, dark(col, 0.25), 2.2, false);
      g.strokeStyle = OUT;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, r * 0.65, 0, TAU);
      g.stroke();
      ball(g, r * 0.1, 0, r * 0.45, col, 1.6);
      glow(g, r * 0.5, 0, r * 0.7, col, 0.7);
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i / 3) * TAU;
        ball(g, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, 2.2, '#ffffff', 0, false);
      }
    } else if (e.type === 'interceptador') {
      poly(g, [r * 1.3, 0, -r * 0.8, -r * 0.9, -r * 0.4, 0, -r * 0.8, r * 0.9], lin(g, -r, 0, r, 0, dark(col, 0.3), col), 2);
      glow(g, -r * 0.6, 0, r * 0.9, '#ff8a2a', 0.8);
      ball(g, r * 0.3, 0, r * 0.25, '#1a1a3a', 1.2, false);
    } else if (e.type === 'blindado') {
      // esteiras e casco hexagonal
      rrect(g, -r, -r * 1.05, r * 2, r * 0.4, 3, '#2a2a33', 1.8);
      rrect(g, -r, r * 0.65, r * 2, r * 0.4, 3, '#2a2a33', 1.8);
      const hx = [];
      for (let i = 0; i < 6; i++) hx.push(Math.cos((i / 6) * TAU) * r * 0.9, Math.sin((i / 6) * TAU) * r * 0.75);
      poly(g, hx, lin(g, -r, -r, r, r, light(col, 0.2), dark(col, 0.4)), 2.2);
      rrect(g, 0, -r * 0.15, r * 1.1, r * 0.3, 2, '#3a3a48', 1.5);
      ball(g, 0, 0, r * 0.35, '#ff4a4a', 1.4);
      glow(g, 0, 0, r * 0.6, '#ff4a4a', 0.5);
    } else if (e.type === 'enxame') {
      ball(g, 0, 0, r, col, 1.6);
      for (const s of [-1, 1]) {
        g.save();
        g.scale(1, s);
        poly(g, [-r * 0.2, -r * 0.5, -r * 1.2, -r * (1.3 + Math.sin(t * 40) * 0.3), r * 0.3, -r * 0.6], 'rgba(255,200,255,0.75)', 1);
        g.restore();
      }
      glow(g, r * 0.4, 0, r * 0.8, col, 0.6);
    } else {
      // Cruzador alienígena (chefão)
      glow(g, 0, 0, r * 2.2, col, 0.25);
      poly(g, [r * 1.4, 0, r * 0.4, -r * 0.9, -r, -r * 0.7, -r * 1.2, 0, -r, r * 0.7, r * 0.4, r * 0.9], lin(g, -r, -r, r, r, light(col, 0.15), dark(col, 0.5)), 3);
      for (const s of [-1, 1]) poly(g, [0, s * r * 0.7, -r * 0.6, s * r * 1.35, -r * 1.1, s * r * 1.2, -r * 0.6, s * r * 0.6], dark(col, 0.25), 2);
      ball(g, r * 0.3, 0, r * 0.32, '#ffd36b', 2);
      glow(g, r * 0.3, 0, r * 0.7, '#ffd36b', 0.7);
      for (let i = 0; i < 4; i++) glow(g, -r * 1.1, (i - 1.5) * r * 0.35, r * 0.35, '#ff8a2a', 0.7 + Math.sin(t * 20 + i) * 0.2);
    }
    g.restore();
    if (e.stunT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i / 3) * TAU;
        glow(g, e.x + Math.cos(a) * r, e.y - r - 6 + Math.sin(a) * 4, 6, '#ffd36b', 0.9);
      }
    }
  }

  // Ícone de um defensor (para a loja), como imagem.
  const icons = new Map();
  function unitIcon(type) {
    let url = icons.get(type);
    if (!url) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.scale(2, 2);
      unit(g, type, 24, 22, -0.5, 0, 0.4, 0, false);
      url = c.toDataURL();
      icons.set(type, url);
    }
    return url;
  }

  // Miniatura do setor para a tela de escolha.
  function mapPreview(map, idx) {
    const bg = buildBackground(map, idx);
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const g = c.getContext('2d');
    g.drawImage(bg, 0, 0, 320, 180);
    return c.toDataURL();
  }

  return { TAU, OUT, mix, light, dark, rgba, outline, ball, poly, rrect, lin, glow, buildBackground, drawPathFlow, portal, mothership, unit, goo, enemy, unitIcon, mapPreview, starPts };
})();
