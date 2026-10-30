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

  // rota = lista de caminhos (cada um, lista de pontos). Decorações evitam ficar em cima dos caminhos.
  function buildBackground(map, idx, rota) {
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const g = c.getContext('2d');
    const R = rng(1234 + idx * 777);
    const segs = [];
    for (const pts of rota) {
      for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
    }
    // distância de um ponto até o caminho mais próximo
    const away = (x, y) => {
      let m = 1e9;
      for (const [x1, y1, x2, y2] of segs) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const L = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L));
        m = Math.min(m, Math.hypot(x - x1 - dx * t, y - y1 - dy * t));
      }
      return m;
    };
    const spot = (minAway) => {
      for (let k = 0; k < 30; k++) {
        const x = R() * WORLD_W;
        const y = R() * WORLD_H;
        if (away(x, y) > minAway) return [x, y];
      }
      return null;
    };
    const custom = typeof Sprites !== 'undefined' ? Sprites.image('mapa_' + map.id) : null;
    if (custom) {
      g.drawImage(custom, 0, 0, WORLD_W, WORLD_H);
    } else if (map.theme === 'bar') {
      barBackground(g, R, spot);
    } else if (map.theme === 'marte') {
      marsBackground(g, R, spot);
    } else {
      spaceBackground(g, map, R, spot);
    }
    for (const pts of rota) drawPathStatic(g, pts, map.theme, 'edge');
    for (const pts of rota) drawPathStatic(g, pts, map.theme, 'body');
    if (map.theme === 'corrida') {
      // faixa quadriculada de largada em cada entrada
      for (const pts of rota) checkered(g, pts);
    }
    return custom ? c : pixelateCanvas(c);
  }

  function spaceBackground(g, map, R, spot) {
    const bg = g.createRadialGradient(WORLD_W * 0.5, WORLD_H * 0.45, 50, WORLD_W * 0.5, WORLD_H * 0.5, WORLD_W * 0.8);
    bg.addColorStop(0, map.bg[0]);
    bg.addColorStop(1, map.bg[1]);
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 9; i++) glow(g, R() * WORLD_W, R() * WORLD_H, 180 + R() * 260, map.nebula[i % 2], 0.18 + R() * 0.12);
    if (map.theme === 'corrida') {
      // estrelas esticadas: sensação de velocidade
      for (let i = 0; i < 220; i++) {
        const x = R() * WORLD_W;
        const y = R() * WORLD_H;
        const l = 10 + R() * 50;
        g.strokeStyle = `rgba(220,230,255,${0.15 + R() * 0.5})`;
        g.lineWidth = R() > 0.8 ? 2 : 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + l, y);
        g.stroke();
      }
    } else {
      for (let i = 0; i < 380; i++) {
        const s = R();
        g.fillStyle = `rgba(${200 + R() * 55},${210 + R() * 45},255,${0.3 + s * 0.7})`;
        g.fillRect(R() * WORLD_W, R() * WORLD_H, s > 0.9 ? 2 : 1, s > 0.9 ? 2 : 1);
      }
    }
    if (map.theme === 'asteroides') {
      planet(g, 1060, 110, 70, '#4a7ad0', true);
      for (let i = 0; i < 26; i++) { const p = spot(50); if (p) asteroid(g, p[0], p[1], 8 + R() * 22, R); }
    } else if (map.theme === 'estacao') {
      planet(g, 120, 90, 55, '#d07a3a', false);
      for (let i = 0; i < 18; i++) {
        const p = spot(90);
        if (!p) continue;
        const [x, y] = p;
        const w = 50 + R() * 70;
        const h = 30 + R() * 40;
        rrect(g, x - w / 2, y - h / 2, w, h, 6, lin(g, x, y - h / 2, x, y + h / 2, '#3a3448', '#1a1624'), 2);
        g.fillStyle = 'rgba(255,180,80,0.5)';
        for (let k = 0; k < 3; k++) g.fillRect(x - w / 2 + 8 + k * 14, y - h / 2 + 8, 6, 3);
      }
    } else if (map.theme === 'corrida') {
      // arquibancadas com torcida
      for (let i = 0; i < 7; i++) {
        const p = spot(95);
        if (!p) continue;
        const [x, y] = p;
        const w = 110;
        const h = 44;
        rrect(g, x - w / 2, y - h / 2, w, h, 3, lin(g, x, y - h / 2, x, y + h / 2, '#4a4a5a', '#1a1a24'), 2);
        for (let k = 0; k < 26; k++) {
          g.fillStyle = ['#ff3b30', '#ffe81f', '#5fe8ff', '#ffffff', '#ff5ad8'][Math.floor(R() * 5)];
          g.fillRect(x - w / 2 + 6 + (k % 13) * 7.6, y - h / 2 + 8 + Math.floor(k / 13) * 14, 4, 5);
        }
      }
    } else {
      planet(g, 1150, 620, 80, '#c03a6a', true);
      for (let i = 0; i < 14; i++) glow(g, R() * WORLD_W, R() * WORLD_H, 60 + R() * 90, '#ff5a8a', 0.12);
      for (let i = 0; i < 14; i++) { const p = spot(45); if (p) asteroid(g, p[0], p[1], 6 + R() * 14, R); }
    }
  }

  // Cantina: piso quadriculado, balcão, mesas redondas e letreiros de neon.
  function barBackground(g, R, spot) {
    g.fillStyle = '#120a18';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let y = 0; y < WORLD_H; y += 40) {
      for (let x = 0; x < WORLD_W; x += 40) {
        g.fillStyle = (x + y) % 80 === 0 ? '#1c1226' : '#160e1e';
        g.fillRect(x, y, 40, 40);
      }
    }
    // luz ambiente colorida
    glow(g, 200, 600, 380, '#ff5ad8', 0.12);
    glow(g, 1100, 150, 380, '#5fe8ff', 0.1);
    // balcão no topo-direito ou onde couber
    const bal = spot(110);
    if (bal) {
      const [x, y] = bal;
      rrect(g, x - 110, y - 22, 220, 44, 6, lin(g, x, y - 22, x, y + 22, '#6a3a2a', '#2a140e'), 2.5);
      for (let k = 0; k < 9; k++) {
        const bx = x - 95 + k * 24;
        rrect(g, bx, y - 16, 8, 14, 2, ['#5cff7a', '#ff5ad8', '#ffe81f', '#5fe8ff'][k % 4], 1.2);
      }
    }
    // mesas com banquinhos
    for (let i = 0; i < 12; i++) {
      const p = spot(78);
      if (!p) continue;
      const [x, y] = p;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + 0.4;
        ball(g, x + Math.cos(a) * 30, y + Math.sin(a) * 30, 8, '#3a2a48', 1.5, false);
      }
      ball(g, x, y, 22, '#5a3a6a', 2.5, false);
      ball(g, x + (R() - 0.5) * 12, y + (R() - 0.5) * 12, 4, ['#ffe81f', '#5cff7a', '#ff5ad8'][Math.floor(R() * 3)], 1, false);
    }
    // letreiros de neon
    const signs = ['CANTINA', 'BAR', 'OPEN 24H'];
    for (let i = 0; i < 3; i++) {
      const p = spot(70);
      if (!p) continue;
      const col = ['#ff5ad8', '#5fe8ff', '#ffe81f'][i];
      glow(g, p[0], p[1], 90, col, 0.35);
      g.font = '800 28px "Barlow Condensed", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.strokeText(signs[i], p[0], p[1]);
      g.fillStyle = rgba(col, 0.25);
      g.fillText(signs[i], p[0], p[1]);
    }
  }

  // Marte: areia vermelha com dunas, crateras e rochas.
  function marsBackground(g, R, spot) {
    const bg = g.createLinearGradient(0, 0, WORLD_W, WORLD_H);
    bg.addColorStop(0, '#a8452a');
    bg.addColorStop(1, '#6a2414');
    g.fillStyle = bg;
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // dunas (faixas onduladas claras e escuras)
    for (let i = 0; i < 16; i++) {
      const y0 = R() * WORLD_H;
      g.strokeStyle = R() > 0.5 ? 'rgba(255,170,110,0.18)' : 'rgba(60,15,5,0.22)';
      g.lineWidth = 6 + R() * 12;
      g.beginPath();
      for (let x = -20; x <= WORLD_W + 20; x += 20) {
        const y = y0 + Math.sin(x * 0.012 + i) * 18;
        if (x === -20) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    // crateras
    for (let i = 0; i < 9; i++) {
      const p = spot(70);
      if (!p) continue;
      const r = 18 + R() * 30;
      g.fillStyle = 'rgba(50,12,4,0.45)';
      g.beginPath();
      g.ellipse(p[0], p[1], r, r * 0.8, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,170,120,0.4)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(p[0], p[1] - 2, r, r * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();
    }
    // rochas
    for (let i = 0; i < 22; i++) {
      const p = spot(50);
      if (!p) continue;
      const r = 6 + R() * 14;
      const pts = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        const kk = 0.7 + R() * 0.35;
        pts.push(p[0] + Math.cos(a) * r * kk, p[1] + Math.sin(a) * r * kk * 0.8);
      }
      poly(g, pts, lin(g, p[0] - r, p[1] - r, p[0] + r, p[1] + r, '#c86a4a', '#4a1a0e'), 2);
    }
    // poeira
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255,200,150,${R() * 0.25})`;
      g.fillRect(R() * WORLD_W, R() * WORLD_H, 2, 2);
    }
  }

  function checkered(g, pts) {
    const [x1, y1] = pts[0][0] < 0 || pts[0][0] > WORLD_W || pts[0][1] < 0 || pts[0][1] > WORLD_H ? clampIn(pts) : pts[0];
    const [x2, y2] = pts[1];
    const a = Math.atan2(y2 - y1, x2 - x1);
    g.save();
    g.translate(x1 + Math.cos(a) * 40, y1 + Math.sin(a) * 40);
    g.rotate(a);
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < 6; k++) {
        g.fillStyle = (i + k) % 2 ? '#111' : '#eee';
        g.fillRect(i * 9 - 9, -27 + k * 9, 9, 9);
      }
    }
    g.restore();
  }
  function clampIn(pts) {
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    return [x0 + ((x1 - x0) / L) * 70, y0 + ((y1 - y0) / L) * 70];
  }

  // Caminho, com estilo conforme o tema. part = 'edge' (borda) ou 'body' (faixa).
  function drawPathStatic(g, path, theme, part) {
    const stroke = (w, color, dash) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.setLineDash(dash || []);
      g.beginPath();
      g.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
      g.stroke();
      g.setLineDash([]);
    };
    if (theme === 'bar') {
      if (part === 'edge') { stroke(66, 'rgba(0,0,0,0.5)'); stroke(60, '#c8a040'); return; }
      stroke(52, '#5a1424');
      stroke(40, '#7a1c30');
      stroke(2, 'rgba(255,200,120,0.25)', [4, 10]);
    } else if (theme === 'corrida') {
      // zebra vermelha e branca nas bordas
      if (part === 'edge') { stroke(70, 'rgba(0,0,0,0.5)'); stroke(64, '#f0f0f0'); stroke(64, '#ff3b30', [14, 14]); return; }
      stroke(56, '#2a2a30');
      stroke(48, '#34343c');
      stroke(3, '#ffe81f', [18, 16]);
    } else if (theme === 'marte') {
      if (part === 'edge') { stroke(70, 'rgba(50,10,2,0.45)'); stroke(62, '#e8a070'); return; }
      stroke(56, '#c87a4a');
      stroke(44, '#d88a58');
      stroke(3, 'rgba(90,30,10,0.4)', [6, 6]);
    } else {
      if (part === 'edge') { stroke(70, 'rgba(0,0,0,0.45)'); stroke(62, '#5fe8ff'); return; }
      stroke(56, '#1a2340');
      stroke(46, '#252f52');
      stroke(2, 'rgba(120,180,255,0.35)');
    }
  }

  // Setas de energia correndo pelo caminho (animado). path = caminho montado (com segs).
  function drawPathFlow(g, path, t, map) {
    const col = map && map.theme === 'marte' ? 'rgba(255,190,140,0.35)' : map && map.theme === 'bar' ? 'rgba(255,200,120,0.35)' : 'rgba(95,232,255,0.45)';
    g.save();
    g.strokeStyle = col;
    g.lineWidth = 3;
    g.setLineDash([10, 34]);
    g.lineDashOffset = -t * 60;
    g.beginPath();
    g.moveTo(path.segs[0].x1, path.segs[0].y1);
    for (const s of path.segs) g.lineTo(s.x2, s.y2);
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
  // look = acessório do caminho; recoil = recuo do tiro (0 a 1).
  // A aparência muda por estágio: e0 (base), e1 (níveis 1-2), e2 (níveis 3-4) e e3 (nível 5).
  function stageOf(tier) { return tier >= 5 ? 3 : tier >= 3 ? 2 : tier >= 1 ? 1 : 0; }
  const STAGE_SCALE = [1, 1.08, 1.18, 1.32];

  function unitVector(g, type, x, y, a, tier, t, recoil, sel, pc, look) {
    const U = UNITS[type];
    const r = U.r;
    const col = pc || U.color;
    const st = stageOf(tier);
    g.save();
    g.translate(x, y);
    if (st === 3) {
      glow(g, 0, 0, r * 3.4, col, 0.45 + Math.sin(t * 3) * 0.12);
      g.save();
      g.rotate(t * 0.8);
      g.strokeStyle = rgba(col, 0.7);
      g.lineWidth = 2;
      g.setLineDash([6, 7]);
      g.beginPath();
      g.arc(0, 0, r * 2, 0, TAU);
      g.stroke();
      g.restore();
    }
    g.scale(STAGE_SCALE[st], STAGE_SCALE[st]);
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
      gosmaBody(g, r, a, t, recoil, st, col, look);
    } else {
      soldierBody(g, type, U, r, a, t, recoil, st, col, look);
    }
    // marcadores de nível (bolinhas na cor do caminho) e coroa no nível 5
    if (st === 3) {
      poly(g, [-9, -r - 12, -9, -r - 22, -4.5, -r - 17, 0, -r - 25, 4.5, -r - 17, 9, -r - 22, 9, -r - 12], '#ffd36b', 1.5);
      glow(g, 0, -r - 18, 14, '#ffd36b', 0.5);
    } else {
      for (let i = 0; i < tier; i++) {
        const sx = (i - (tier - 1) / 2) * 8;
        ball(g, sx, -r - 13, 3, col, 1.2, false);
      }
    }
    g.restore();
  }

  // Cor da armadura conforme o estágio: base, tingida pelo caminho, cor do caminho e dourada no SUPER.
  function armorColor(type, U, st, col) {
    if (type === 'viajante') return [ '#e8ecf4', mix('#e8ecf4', col, 0.25), mix('#e8ecf4', col, 0.45), mix('#ffd36b', col, 0.3)][st];
    const base = dark(U.color, 0.15);
    return [base, mix(base, col, 0.45), light(col, 0.05), mix('#ffd36b', col, 0.35)][st];
  }

  function soldierBody(g, type, U, r, a, t, recoil, st, col, look) {
    const armor = armorColor(type, U, st, col);
    // ---- atrás do corpo: asas de energia (SUPER), capa, mochilas, estandarte ----
    if (st === 3) {
      g.save();
      g.rotate(a + Math.PI);
      const flap = Math.sin(t * 6) * 0.15;
      for (const s of [-1, 1]) {
        g.save();
        g.rotate(s * (0.9 + flap));
        poly(g, [0, 0, r * 2.4, -r * 0.5 * s, r * 2.1, r * 0.25 * s, r * 1.4, r * 0.55 * s], rgba(col, 0.45), 1.2);
        g.restore();
      }
      g.restore();
      glow(g, 0, 0, r * 2, col, 0.3);
    }
    if (type === 'viajante' || look === 'medalhas' || (look === 'estandarte' && st >= 2)) {
      // capa esvoaçante (maior com o estágio)
      const wave = Math.sin(t * 5) * 3;
      const L = 1.6 + st * 0.25;
      const capa = type === 'viajante' ? ['#2a4aa0', '#0a1a40'] : [col, dark(col, 0.6)];
      g.save();
      g.rotate(a + Math.PI);
      poly(g, [-4, -r * 0.8, -4, r * 0.8, r * L, r * 0.9 + wave, r * (L + 0.3), 0, r * L, -r * 0.9 - wave], lin(g, 0, 0, r * 2, 0, capa[0], capa[1]), 2);
      g.restore();
    }
    if (st >= 1) backAccessory(g, look, st, r, a, t, col);
    // ---- arma ----
    g.save();
    g.rotate(a);
    const kick = -recoil * 4;
    const ws = [1, 1.1, 1.3, 1.55][st];
    g.save();
    g.scale(ws, ws);
    weapon(g, type, kick, t, recoil);
    if (st >= 1) weaponAccessory(g, look, st, kick, col);
    g.restore();
    // mãos
    ball(g, 8, -8, r * 0.32, armor, 1.5, false);
    ball(g, 8, 8, r * 0.32, armor, 1.5, false);
    g.restore();
    // ---- corpo ----
    ball(g, 0, 0, r * 0.8, armor, 2.2);
    if (st >= 2) {
      // ombreiras
      g.save();
      g.rotate(a);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(-2, s * r * 0.62, r * 0.42, r * 0.28, 0, 0, TAU);
        g.fillStyle = st === 3 ? '#ffd36b' : light(armor, 0.25);
        g.fill();
        outline(g, 1.6);
      }
      g.restore();
    }
    // detalhe colorido no peito (cor do caminho escolhido)
    g.save();
    g.rotate(a);
    rrect(g, -r * 0.2, -r * 0.45, r * 0.4, r * 0.9, 3, col, 1.2);
    if (look === 'medalhas' && st >= 1) for (let i = 0; i < st; i++) ball(g, -r * 0.45, -r * 0.3 + i * 5, 2.4, '#ffd36b', 1, false);
    g.restore();
    // capacete com visor apontando para o alvo
    const helm = type === 'viajante' ? (st === 3 ? '#ffe8a0' : '#f4f8ff') : mix(armor, '#ffffff', 0.3);
    ball(g, 0, -2, r * 0.58, helm, 2);
    if (st >= 2) {
      // crista do capacete
      g.save();
      g.translate(0, -2);
      g.rotate(a);
      rrect(g, -r * 0.55, -2.5, r * 0.75, 5, 2.5, st === 3 ? '#ffd36b' : col, 1.3);
      g.restore();
    }
    g.save();
    g.translate(0, -2);
    g.rotate(a);
    const visorCol = look === 'visor' && st >= 1 ? '#ff3b30' : type === 'viajante' ? '#ffb347' : '#1a2a4a';
    g.beginPath();
    g.ellipse(r * 0.22, 0, r * 0.3, r * (look === 'visor' && st >= 2 ? 0.46 : 0.36), 0, -1.2, 1.2);
    g.fillStyle = visorCol;
    g.fill();
    outline(g, 1.2);
    glow(g, r * 0.3, 0, r * (0.5 + st * 0.12), look === 'visor' && st >= 1 ? '#ff3b30' : type === 'viajante' ? '#ffb347' : U.color, 0.6);
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
    if (st >= 1) frontAccessory(g, look, st, r, a, t, col);
    if (st === 3) {
      // halo de energia sobre a cabeça
      g.save();
      g.translate(0, -r * 0.2);
      g.scale(1, 0.35);
      g.strokeStyle = rgba('#ffe8a0', 0.9);
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, -r * 1.6, r * 0.6, 0, TAU);
      g.stroke();
      g.restore();
    }
  }

  function weapon(g, type, kick, t, recoil) {
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
      rrect(g, -18, -7, 10, 14, 4, lin(g, 0, -7, 0, 7, '#ff9a4a', '#8a2a0a'), 1.8);
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
  }

  // Acessórios na arma (no referencial da arma, já girado).
  function weaponAccessory(g, look, st, kick, col) {
    if (look === 'canos') {
      const n = st >= 2 ? 2 : 1;
      for (let i = 1; i <= n; i++) {
        for (const s of [-1, 1]) rrect(g, 8 + kick, s * (4 + i * 4) - 2, 22 - i * 2, 4, 1.5, '#5a6270', 1.2);
      }
      if (st === 3) glow(g, 32 + kick, 0, 14, col, 0.6);
    } else if (look === 'luneta') {
      rrect(g, 10 + kick, -9, 14, 5, 2, '#2a2a3a', 1.2);
      ball(g, 24 + kick, -6.5, 2.5, '#ff3b30', 0.8, false);
      if (st >= 2) rrect(g, 28 + kick, -2, 16, 4, 1.5, '#8a96a6', 1.2);
    }
  }

  // Acessórios atrás do corpo (giram junto com o personagem).
  function backAccessory(g, look, st, r, a, t, col) {
    g.save();
    g.rotate(a + Math.PI);
    if (look === 'mochila' || look === 'tanques') {
      const n = look === 'tanques' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const oy = n === 2 ? (i ? 6 : -6) : 0;
        rrect(g, r * 0.4, oy - 7, r * 0.75 + st * 2, 14, 4, look === 'tanques' ? lin(g, 0, -7, 0, 7, '#ff9a4a', '#8a2a0a') : lin(g, 0, -7, 0, 7, '#7a8a5a', '#2a3a1a'), 1.6);
      }
      if (look === 'mochila') for (let i = 0; i < st + 1; i++) ball(g, r * 0.6 + i * 5, -10, 3, '#ffb347', 1, false);
    } else if (look === 'estandarte') {
      g.strokeStyle = OUT;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(r * 0.5, -r * 0.5);
      g.lineTo(r * 0.5, -r * 2.2);
      g.stroke();
      const w = Math.sin(t * 6) * 3;
      poly(g, [r * 0.5, -r * 2.2, r * 0.5 + 16 + st * 4, -r * 2 + w, r * 0.5, -r * 1.5], col, 1.4);
    } else if (look === 'bobinas') {
      for (const s of [-1, 1]) {
        rrect(g, r * 0.4, s * 7 - 4, 12, 8, 3, '#3a3050', 1.4);
        ball(g, r * 0.4 + 14, s * 7, 3.5 + st, '#e8d8ff', 1, false);
        glow(g, r * 0.4 + 14, s * 7, 8 + st * 3 + Math.sin(t * 30 + s) * 2, '#b48cff', 0.8);
      }
    } else if (look === 'antena') {
      g.strokeStyle = OUT;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(r * 0.4, 0);
      g.lineTo(r * 1.1, 0);
      g.stroke();
      g.beginPath();
      g.arc(r * 1.3, 0, 5 + st * 2, Math.PI * 0.6, Math.PI * 1.4);
      g.fillStyle = '#c8ccd8';
      g.fill();
      outline(g, 1.4);
    } else if (look === 'escudo') {
      g.restore();
      g.save();
      g.rotate(a);
      poly(g, [r * 0.9, -r * 0.9, r * 1.2, 0, r * 0.9, r * 0.9, r * 0.6, 0], lin(g, 0, -r, 0, r, '#c8a070', '#5a4020'), 1.8);
    }
    g.restore();
  }

  // Acessórios por cima (efeitos que orbitam ou enfeitam o personagem).
  function frontAccessory(g, look, st, r, a, t, col) {
    if (look === 'cristais' || look === 'runas' || look === 'halo') {
      const n = 2 + st * 2;
      for (let i = 0; i < n; i++) {
        const k = t * (look === 'runas' ? 1.5 : 2.2) + (i / n) * TAU;
        const x = Math.cos(k) * r * 1.35;
        const y = Math.sin(k) * r * 0.9;
        if (look === 'halo') { poly(g, starPts(x, y - 4, 4, 1.8), '#ffe8a0', 0.8); continue; }
        const c = look === 'cristais' ? '#c8f8ff' : col;
        poly(g, [x, y - 5, x + 3, y, x, y + 5, x - 3, y], c, 1);
        glow(g, x, y, 7, c, 0.5);
      }
    } else if (look === 'nevasca') {
      for (let i = 0; i < 6 + st * 4; i++) {
        const k = t * 1.3 + i * 1.7;
        const d = r * (1 + (i % 3) * 0.35);
        g.fillStyle = 'rgba(230,250,255,0.85)';
        g.fillRect(Math.cos(k) * d, Math.sin(k) * d * 0.7, 2.5, 2.5);
      }
    } else if (look === 'chama') {
      for (let i = 0; i < 2 + st; i++) {
        const k = (i / (2 + st)) * TAU + t;
        glow(g, Math.cos(k) * r * 0.5, -r * 0.6 + Math.sin(t * 10 + i) * 2, 6 + st * 2, i % 2 ? '#5fa8ff' : '#ff8a2a', 0.8);
      }
    }
  }

  // Gosma Gigante: gelatina translúcida que balança, com coisas boiando dentro e olhos grandes.
  // A cor acompanha o caminho e ela cresce, ganha chifres, tentáculos ou mais olhos a cada estágio.
  function gosmaBody(g, r, a, t, recoil, st, col, look) {
    const tone = st === 0 ? '#7aff4a' : col;
    const sq = 1 + Math.sin(t * 4) * 0.06 + recoil * 0.12;
    const R = r * 1.05;
    if (look === 'tentaculos' && st >= 1) {
      for (let i = 0; i < 2 + st * 2; i++) {
        const k = (i / (2 + st * 2)) * TAU + Math.sin(t * 2 + i) * 0.3;
        const L = R * (1.2 + st * 0.25);
        g.strokeStyle = dark(tone, 0.35);
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(Math.cos(k) * R * 0.6, Math.sin(k) * R * 0.6);
        g.quadraticCurveTo(Math.cos(k + 0.4) * L, Math.sin(k + 0.4) * L, Math.cos(k + Math.sin(t * 3 + i) * 0.4) * L * 1.2, Math.sin(k) * L * 1.2);
        g.stroke();
        g.strokeStyle = tone;
        g.lineWidth = 4;
        g.stroke();
      }
    }
    g.save();
    g.scale(1 / sq, sq);
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const k = (i / 16) * TAU;
      const w = 1 + Math.sin(k * 3 + t * 5) * 0.05;
      pts.push(Math.cos(k) * R * w, Math.sin(k) * R * w * 0.92 + (Math.sin(k) > 0 ? R * 0.08 : 0));
    }
    glow(g, 0, 0, R * 2, tone, 0.35);
    if (look === 'chifres' && st >= 1) {
      // espinhos de ácido no topo
      for (let i = 0; i < 1 + st; i++) {
        const sx = (i - st / 2) * R * 0.35;
        poly(g, [sx - 5, -R * 0.75, sx, -R * (1.05 + st * 0.12), sx + 5, -R * 0.75], light(tone, 0.3), 1.6);
      }
    }
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
    gr.addColorStop(0, rgba(light(tone, 0.6), 0.95));
    gr.addColorStop(0.5, rgba(tone, 0.85));
    gr.addColorStop(1, rgba(dark(tone, 0.45), 0.9));
    g.fillStyle = gr;
    g.fill();
    outline(g, 2.4);
    // objetos engolidos boiando lá dentro (mais coisas a cada estágio)
    g.globalAlpha = 0.55;
    rrect(g, -R * 0.55 + Math.sin(t) * 2, R * 0.15, R * 0.35, R * 0.2, 2, '#c8a070', 1);
    ball(g, R * 0.45, R * 0.35 + Math.sin(t * 1.3) * 2, R * 0.14, '#ff5a8a', 1, false);
    if (st >= 2) poly(g, starPts(-R * 0.1, R * 0.5 + Math.sin(t * 1.7) * 2, R * 0.14, R * 0.06), '#ffe81f', 1);
    if (st >= 3) rrect(g, R * 0.15, R * 0.05, R * 0.3, R * 0.12, 2, '#5fe8ff', 1);
    g.globalAlpha = 1;
    for (let i = 0; i < 4 + st; i++) {
      const by = R * 0.6 - ((t * 12 + i * 9) % (R * 1.2));
      g.beginPath();
      g.arc(-R * 0.3 + i * R * 0.15, by, 2 + (i % 2), 0, TAU);
      g.strokeStyle = 'rgba(230,255,210,0.8)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(-R * 0.4, -R * 0.5, R * 0.28, R * 0.13, -0.5, 0, TAU);
    g.fill();
    // olhos que seguem o alvo (o caminho Mutante ganha olhos extras)
    const ex = Math.cos(a) * 2.5;
    const ey = Math.sin(a) * 2.5;
    const eyes = [[-0.3, -0.15, 0.22], [0.3, -0.15, 0.22]];
    if (look === 'olhos') {
      if (st >= 1) eyes.push([0, -0.48, 0.15]);
      if (st >= 2) eyes.push([-0.55, 0.2, 0.12], [0.55, 0.2, 0.12]);
      if (st >= 3) eyes.push([0, 0.42, 0.14]);
    }
    for (const [x, y, s] of eyes) {
      ball(g, x * R, y * R, s * R, '#ffffff', 1.6, false);
      ball(g, x * R + ex, y * R + ey, s * R * 0.45, '#0a1a0a', 0, false);
    }
    g.beginPath();
    g.arc(0, R * 0.12, R * 0.28, 0.2, Math.PI - 0.2);
    g.strokeStyle = dark(tone, 0.6);
    g.lineWidth = 2.2;
    g.stroke();
    if (st >= 2) {
      // gosma escorrendo
      for (const s of [-1, 1]) ball(g, s * R * 0.75, R * 0.6 + Math.sin(t * 3 + s) * 2, R * 0.16, tone, 1.2, false);
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
  function enemyVector(g, e, t) {
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

  // ---------- Pixel art ----------
  // Modo pixel: personagens e invasores são desenhados numa tela pequena e ampliados sem suavizar,
  // com cores reduzidas, o que dá o visual de pixel art. Cada pose fica em cache.
  // Se existir um sprite do usuário (assets/sprites), ele é usado no lugar.
  let pixel = true;
  const PX = 3; // unidades do mundo por pixel
  const cache = new Map();
  function setPixel(v) { pixel = v; cache.clear(); icons.clear(); }
  function isPixel() { return pixel; }
  Sprites.onLoad(() => { cache.clear(); icons.clear(); });

  function pixelize(box, draw) {
    const n = Math.ceil(box / PX);
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    g.translate(n / 2, n / 2);
    g.scale(1 / PX, 1 / PX);
    draw(g);
    const im = g.getImageData(0, 0, n, n);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      // alpha binário e cores reduzidas (paleta de 6 tons por canal)
      if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
      d[i + 3] = 255;
      for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 51) * 51;
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  function cached(key, box, draw) {
    let c = cache.get(key);
    if (!c) {
      if (cache.size > 4000) cache.clear();
      c = pixelize(box, draw);
      cache.set(key, c);
    }
    return c;
  }
  function blit(g, c, x, y, box) {
    const sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(c, x - box / 2, y - box / 2, box, box);
    g.imageSmoothingEnabled = sm;
  }
  const ANG = 16; // direções em cache
  const angBucket = (a) => ((Math.round(a / (TAU / ANG)) % ANG) + ANG) % ANG;

  // Sprite do usuário para um defensor (procura do mais específico ao mais geral).
  function unitSheet(type, tier, pathName) {
    const e = 'e' + stageOf(tier);
    const names = [];
    if (pathName) names.push(`unidade_${type}_${Sprites.slug(pathName)}_${e}`);
    names.push(`unidade_${type}_${e}`, `unidade_${type}_e0`);
    return Sprites.sheet(...names);
  }
  function drawSheet(g, sh, frame, x, y, size, flip) {
    g.save();
    g.translate(x, y);
    if (flip) g.scale(-1, 1);
    g.imageSmoothingEnabled = false;
    g.drawImage(sh.img, (frame % sh.frames) * sh.fw, 0, sh.fw, sh.fh, -size / 2, -size / 2, size, size);
    g.restore();
  }

  // pathName = nome do caminho escolhido (para achar o sprite certo).
  function unit(g, type, x, y, a, tier, t, recoil, sel, pc, look, pathName) {
    const sh = unitSheet(type, tier, pathName);
    if (sh) {
      const r = UNITS[type].r;
      const size = r * 3.2 * STAGE_SCALE[stageOf(tier)];
      // base, marcadores e coroa continuam desenhados por código; o corpo vem do sprite
      g.save();
      g.translate(x, y);
      g.scale(1, 0.45);
      g.beginPath();
      g.arc(0, r * 1.5, r * 1.25, 0, TAU);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fill();
      g.strokeStyle = rgba(pc || UNITS[type].color, sel ? 0.95 : 0.55);
      g.lineWidth = sel ? 3 : 2;
      g.stroke();
      g.restore();
      if (stageOf(tier) === 3) glow(g, x, y, r * 3.2, pc || UNITS[type].color, 0.4);
      // quadros 1-4 parado, 5-6 tiro (se a tira tiver)
      const frame = recoil > 0.3 && sh.frames >= 6 ? 4 + (recoil > 0.65 ? 0 : 1) : Math.floor(t * 6) % Math.min(4, sh.frames);
      drawSheet(g, sh, frame, x, y - size * 0.1, size, Math.cos(a) < 0);
      return;
    }
    if (!pixel) { unitVector(g, type, x, y, a, tier, t, recoil, sel, pc, look); return; }
    const box = 220;
    const fr = Math.floor(t * 4) % 4;
    const key = `u|${type}|${tier}|${pc}|${look}|${angBucket(a)}|${recoil > 0.5 ? 1 : 0}|${sel ? 1 : 0}|${fr}`;
    const c = cached(key, box, (cg) => unitVector(cg, type, 0, 0, angBucket(a) * (TAU / ANG), tier, fr * (TAU / 12), recoil > 0.5 ? 1 : 0, sel, pc, look));
    blit(g, c, x, y, box);
  }

  function enemy(g, e, t) {
    const E = ENEMIES[e.type];
    const sh = Sprites.sheet(`inimigo_${e.type}`);
    if (sh) {
      const size = E.r * 2.8;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.ellipse(e.x, e.y + E.r * 0.9, E.r * 0.9, E.r * 0.3, 0, 0, TAU);
      g.fill();
      if (e.slowT > 0) glow(g, e.x, e.y, E.r * 2, '#9af0ff', 0.4);
      drawSheet(g, sh, Math.floor(t * 8 + (e.wob || 0)) % sh.frames, e.x, e.y, size, Math.cos(e.angle) < 0);
      if (e.flash > 0) glow(g, e.x, e.y, E.r * 1.4, '#ffffff', 0.6);
      return;
    }
    if (!pixel) { enemyVector(g, e, t); return; }
    const box = Math.ceil(E.r * 5.4);
    const fr = Math.floor(t * 6 + (e.wob || 0)) % 3;
    const ab = angBucket(e.angle);
    const st = `${e.flash > 0 ? 1 : 0}${e.slowT > 0 ? 1 : 0}${e.stunT > 0 ? 1 : 0}`;
    const key = `e|${e.type}|${ab}|${st}|${fr}`;
    const c = cached(key, box, (cg) => enemyVector(cg, { type: e.type, x: 0, y: 0, angle: ab * (TAU / ANG), flash: e.flash, slowT: e.slowT, stunT: e.stunT }, fr * 0.35));
    blit(g, c, e.x, e.y, box);
  }

  // Ícone de um defensor (loja e painel), desenhado num <canvas> da página.
  // (Usa canvas e não imagem porque sprites carregados de arquivo local não podem virar data URL.)
  const icons = new Map();
  function unitIcon(type) {
    let c = icons.get(type);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.scale(2, 2);
      unit(g, type, 24, 22, -0.5, 0, 0.4, 0, false);
      icons.set(type, c);
    }
    return c;
  }
  // Desenha os ícones em todos os <canvas data-icon="tipo"> dentro de root.
  function fillIcons(root) {
    for (const c of root.querySelectorAll('canvas[data-icon]')) {
      const src = unitIcon(c.dataset.icon);
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
    }
  }

  // Fundo em pixel art: desenha pequeno e amplia sem suavizar.
  function pixelateCanvas(src) {
    if (!pixel) return src;
    const w = Math.ceil(src.width / 2);
    const h = Math.ceil(src.height / 2);
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    small.getContext('2d').drawImage(src, 0, 0, w, h);
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, src.width, src.height);
    return out;
  }

  // Miniatura do setor para a tela de escolha.
  const previews = new Map();
  function mapPreview(map, idx, dif) {
    const key = map.id + dif;
    if (previews.has(key)) return previews.get(key);
    const bg = buildBackground(map, idx, map.rotas[dif]);
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const g = c.getContext('2d');
    g.drawImage(bg, 0, 0, 320, 180);
    previews.set(key, c);
    return c;
  }

  return { stageOf, setPixel, isPixel, TAU, OUT, mix, light, dark, rgba, outline, ball, poly, rrect, lin, glow, buildBackground, drawPathFlow, portal, mothership, unit, goo, enemy, unitIcon, fillIcons, mapPreview, starPts };
})();
