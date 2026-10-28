'use strict';

// ============================================================
// Defensores da Nave-Mãe: laço do jogo, regras e interface
// ============================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const SAVE_KEY = 'ndm_save_v1';

  // ---------- Progresso salvo ----------
  let save = { unlocked: 1, best: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw.unlocked === 'number') save = { unlocked: raw.unlocked, best: raw.best || {} };
  } catch (e) { /* sem armazenamento: segue sem salvar */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignorado */ }
  }

  // ---------- Tela e escala do mundo ----------
  const view = { w: 0, h: 0, dpr: 1, s: 1, ox: 0, oy: 0 };
  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    // na partida, o mundo fica entre a barra de cima e a loja da direita
    const playing = state === 'play';
    const top = playing ? $('topbar').offsetHeight + 8 : 0;
    const right = playing ? $('shop').offsetWidth + 12 : 0;
    const aw = Math.max(100, view.w - right - (playing ? 8 : 0));
    const ah = Math.max(100, view.h - top - (playing ? 6 : 0));
    view.s = playing ? Math.min(aw / WORLD_W, ah / WORLD_H) : Math.max(view.w / WORLD_W, view.h / WORLD_H);
    view.ox = (playing ? 8 : 0) + (aw - WORLD_W * view.s) / 2;
    view.oy = top + (ah - WORLD_H * view.s) / 2;
    $('rotate').classList.toggle('hidden', !(view.h > view.w && view.w < 760));
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  // ---------- Caminho ----------
  function buildPath(points) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      segs.push({ x1, y1, x2, y2, dx: (x2 - x1) / len, dy: (y2 - y1) / len, len, start: total });
      total += len;
    }
    return { segs, total };
  }
  function posAt(path, d) {
    const segs = path.segs;
    let s = segs[segs.length - 1];
    for (let i = 0; i < segs.length; i++) {
      if (d < segs[i].start + segs[i].len) { s = segs[i]; break; }
    }
    const k = Math.min(d - s.start, s.len);
    return { x: s.x1 + s.dx * k, y: s.y1 + s.dy * k, a: Math.atan2(s.dy, s.dx) };
  }
  function distToSeg(px, py, s) {
    const t = Math.max(0, Math.min(s.len, (px - s.x1) * s.dx + (py - s.y1) * s.dy));
    return Math.hypot(px - (s.x1 + s.dx * t), py - (s.y1 + s.dy * t));
  }

  // ---------- Estado ----------
  let state = 'home'; // home | play
  let G = null; // partida atual
  let demo = null; // fundo animado dos menus
  let time = 0;

  function newGame(mapIndex) {
    const map = MAPS[mapIndex];
    const end = map.path[map.path.length - 1];
    G = {
      mapIndex, map, path: buildPath(map.path), bg: Art.buildBackground(map, mapIndex),
      portal: map.path[0][0] < 0 || map.path[0][1] < 0
        ? [Math.max(30, map.path[0][0] + 70 * (map.path[0][0] < 0 ? 1 : 0)), Math.max(30, map.path[0][1] + 70 * (map.path[0][1] < 0 ? 1 : 0))]
        : map.path[0],
      ship: [end[0] + 40, end[1] - 10],
      units: [], enemies: [], shots: [], fx: [], floats: [], strikes: [],
      money: START_MONEY, lives: START_LIVES, wave: 0, waveActive: false, queue: [], waveT: 0,
      speed: 1, paused: false, over: false, place: null, sel: null, hover: null,
      kills: 0, earned: 0, shipHit: 0, hero: null, bossBar: null,
    };
    state = 'play';
    showOnly(null);
    $('hud').classList.remove('hidden');
    buildShop();
    hideUnitPanel();
    resize();
    refreshHud();
    toast('Posicione seus defensores e inicie a onda!');
  }

  // ---------- Loja ----------
  function buildShop() {
    const shop = $('shop');
    shop.innerHTML = '';
    UNIT_ORDER.forEach((type, i) => {
      const U = UNITS[type];
      const b = document.createElement('button');
      b.className = 'card' + (U.hero ? ' hero' : '');
      b.dataset.type = type;
      b.style.setProperty('--c', U.color);
      b.title = `${U.name} (${i + 1}): ${U.desc}`;
      b.innerHTML = `<img src="${Art.unitIcon(type)}" alt=""><span class="nm">${U.name.split(' ')[0]}</span><span class="cost">◆ ${U.cost}</span>`;
      b.addEventListener('click', () => pickShop(type));
      shop.appendChild(b);
    });
  }
  function pickShop(type) {
    if (!G || G.over) return;
    const U = UNITS[type];
    if (G.place === type) { G.place = null; refreshShop(); return; }
    if (U.hero && G.hero) { toast('O Viajante Espacial já está em campo.'); Sound.play('deny'); return; }
    if (G.money < U.cost) { toast('Créditos insuficientes.'); Sound.play('deny'); return; }
    G.place = type;
    G.sel = null;
    hideUnitPanel();
    refreshShop();
    toast(`Toque num lugar livre para posicionar: ${U.name}`);
  }
  function refreshShop() {
    for (const b of $('shop').children) {
      const U = UNITS[b.dataset.type];
      const used = U.hero && G.hero;
      b.classList.toggle('poor', !used && G.money < U.cost);
      b.classList.toggle('used', !!used);
      b.classList.toggle('active', G.place === b.dataset.type);
      b.querySelector('.cost').textContent = used ? 'Em campo' : `◆ ${U.cost}`;
    }
  }

  function canPlace(type, x, y) {
    const r = UNITS[type].r;
    if (x < r + 6 || y < r + 14 || x > WORLD_W - r - 6 || y > WORLD_H - r - 6) return false;
    for (const s of G.path.segs) if (distToSeg(x, y, s) < 30 + r) return false;
    for (const u of G.units) if (Math.hypot(u.x - x, u.y - y) < r + UNITS[u.type].r + 6) return false;
    if (Math.hypot(G.ship[0] - x, G.ship[1] - y) < 100 + r) return false;
    if (Math.hypot(G.portal[0] - x, G.portal[1] - y) < 45 + r) return false;
    return true;
  }

  function placeUnit(type, x, y) {
    const U = UNITS[type];
    if (G.money < U.cost) { toast('Créditos insuficientes.'); Sound.play('deny'); return false; }
    if (!canPlace(type, x, y)) { toast('Não dá para posicionar aí.'); Sound.play('deny'); return false; }
    const u = {
      type, x, y, lvl: 1, spent: U.cost, timer: 0.2, angle: -Math.PI / 2, recoil: 0, kills: 0,
      dmg: U.dmg, range: U.range, cd: U.cd, slow: U.slow || 0, slowT: U.slowT || 0, splash: U.splash || 0,
      pierceArmor: !!U.pierceArmor, abilityMul: 1, abilityCd: 0,
    };
    G.units.push(u);
    if (U.hero) G.hero = u;
    G.money -= U.cost;
    Sound.play('place');
    ring(x, y, U.color, 40, 0.4);
    if (G.money < U.cost || U.hero) G.place = null;
    refreshHud();
    return true;
  }

  // ---------- Painel do defensor ----------
  function selectUnit(u) {
    G.sel = u;
    G.place = null;
    refreshShop();
    renderUnitPanel();
  }
  function hideUnitPanel() {
    $('unitpanel').classList.add('hidden');
  }
  function sellValue(u) { return Math.floor(u.spent * 0.7); }
  function renderUnitPanel() {
    const u = G.sel;
    const p = $('unitpanel');
    if (!u) { hideUnitPanel(); return; }
    const U = UNITS[u.type];
    const up = u.lvl < 3 ? U.ups[u.lvl - 1] : null;
    const rate = (1 / u.cd).toFixed(1);
    let html = `<div class="uphead" style="--c:${U.color}"><img src="${Art.unitIcon(u.type)}" alt="">
      <div><b>${U.name}</b><small>${U.role} · Nível ${u.lvl}${'★'.repeat(u.lvl)}</small></div>
      <button class="x" id="upClose" title="Fechar">✕</button></div>
      <div class="upstats"><span>Dano <b>${u.dmg}</b></span><span>Alcance <b>${Math.round(u.range)}</b></span><span>Tiros/s <b>${rate}</b></span><span>Abates <b>${u.kills}</b></span></div>`;
    if (U.ability) {
      const ready = u.abilityCd <= 0;
      html += `<button id="upAbility" class="ability ${ready ? '' : 'wait'}">☄ ${U.ability.name} ${ready ? '(Q)' : Math.ceil(u.abilityCd) + 's'}</button>`;
    }
    html += up
      ? `<button id="upBuy" class="${G.money < up.cost ? 'poor' : ''}">Melhorar ◆ ${up.cost}<small>${up.text}</small></button>`
      : '<div class="maxed">Nível máximo</div>';
    html += `<button id="upSell" class="secondary">Vender por ◆ ${sellValue(u)}</button>`;
    p.innerHTML = html;
    p.classList.remove('hidden');
    $('upClose').onclick = () => { G.sel = null; hideUnitPanel(); };
    if (up) $('upBuy').onclick = () => upgrade(u);
    $('upSell').onclick = () => sell(u);
    if (U.ability) $('upAbility').onclick = () => useAbility();
    p.dataset.sig = panelSig(u);
  }
  function panelSig(u) {
    return [u.lvl, u.kills, Math.ceil(u.abilityCd), G.money >= ((UNITS[u.type].ups[u.lvl - 1] || {}).cost || 0)].join('|');
  }
  function upgrade(u) {
    const up = UNITS[u.type].ups[u.lvl - 1];
    if (!up) return;
    if (G.money < up.cost) { toast('Créditos insuficientes.'); Sound.play('deny'); return; }
    G.money -= up.cost;
    u.spent += up.cost;
    up.apply(u);
    u.lvl++;
    Sound.play('upgrade');
    ring(u.x, u.y, '#ffd36b', 50, 0.5);
    burst(u.x, u.y, '#ffd36b', 14, 120);
    refreshHud();
    renderUnitPanel();
  }
  function sell(u) {
    const v = sellValue(u);
    G.money += v;
    G.units.splice(G.units.indexOf(u), 1);
    if (G.hero === u) G.hero = null;
    G.sel = null;
    hideUnitPanel();
    floatText(u.x, u.y - 20, `+◆${v}`, '#ffd36b');
    burst(u.x, u.y, UNITS[u.type].color, 12, 100);
    Sound.play('sell');
    refreshHud();
  }

  // ---------- Habilidade do herói: Chuva de Plasma ----------
  function useAbility() {
    if (!G || G.over || G.paused) return;
    const h = G.hero;
    if (!h) { toast('Posicione o Viajante Espacial para usar a habilidade.'); return; }
    if (h.abilityCd > 0) { toast(`Habilidade recarregando: ${Math.ceil(h.abilityCd)}s`); Sound.play('deny'); return; }
    const A = UNITS.viajante.ability;
    h.abilityCd = A.cd;
    Sound.play('ability');
    ring(h.x, h.y, '#5fe8ff', A.radius, 0.7);
    const targets = G.enemies.filter((e) => Math.hypot(e.x - h.x, e.y - h.y) <= A.radius);
    targets.forEach((e, i) => G.strikes.push({ e, x: e.x, y: e.y, t: 0.15 + (i % 10) * 0.06 + Math.random() * 0.2, dmg: A.dmg * h.abilityMul, stun: A.stun }));
    // raios extras só pelo visual
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      const d = Math.random() * A.radius;
      G.strikes.push({ e: null, x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, t: Math.random() * 0.8, dmg: 0, stun: 0 });
    }
    if (G.sel === h) renderUnitPanel();
  }

  // ---------- Ondas ----------
  function startWave() {
    if (!G || G.over || G.waveActive || G.wave >= TOTAL_WAVES) return;
    G.wave++;
    G.waveActive = true;
    G.waveT = 0;
    const w = buildWave(G.wave, G.mapIndex);
    G.queue = [];
    for (const [type, count, interval, delay] of w.groups) {
      for (let i = 0; i < count; i++) G.queue.push({ type, t: delay + i * interval, hpMul: ENEMIES[type].boss ? w.bossMul : w.hpMul });
    }
    G.queue.sort((a, b) => a.t - b.t);
    const boss = w.groups.some((g) => g[0] === 'cruzador');
    Sound.play('wave');
    toast(boss ? `Onda ${G.wave}: um CRUZADOR ALIENÍGENA se aproxima!` : `Onda ${G.wave} chegando!`);
    refreshHud();
  }
  function endWave() {
    G.waveActive = false;
    const bonus = 90 + G.wave * 8;
    G.money += bonus;
    G.earned += bonus;
    if (G.wave >= TOTAL_WAVES) { finish(true); return; }
    toast(`Onda ${G.wave} vencida! Bônus de ◆ ${bonus}`);
    Sound.play('coin');
    refreshHud();
  }

  function spawn(type, hpMul, dist) {
    const E = ENEMIES[type];
    const hp = Math.round(E.hp * hpMul);
    const p = posAt(G.path, dist || 0);
    G.enemies.push({
      type, hp, maxHp: hp, dist: dist || 0, x: p.x, y: p.y, angle: p.a, slowT: 0, slow: 0, stunT: 0, flash: 0,
      reward: E.reward, wob: Math.random() * TAU,
    });
  }

  // ---------- Combate ----------
  function damage(e, amount, pierce) {
    if (e.hp <= 0) return;
    const armor = pierce ? 0 : ENEMIES[e.type].armor;
    const d = Math.max(1, amount - armor);
    e.hp -= d;
    e.flash = 0.08;
    if (e.hp <= 0) kill(e);
  }
  function kill(e, src) {
    const E = ENEMIES[e.type];
    G.kills++;
    G.money += e.reward;
    G.earned += e.reward;
    floatText(e.x, e.y - E.r - 4, `+◆${e.reward}`, '#ffd36b');
    coin(e.x, e.y);
    burst(e.x, e.y, E.color, E.boss ? 40 : 10, E.boss ? 260 : 140);
    if (E.boss) {
      ring(e.x, e.y, '#ffd36b', 140, 0.7);
      Sound.play('boom');
      // o cruzador solta mini-drones ao explodir
      for (let i = 0; i < 6; i++) spawn('enxame', 1 + G.wave * 0.15, Math.max(0, e.dist - i * 14));
    } else {
      Sound.play('pop');
    }
    if (src) src.kills++;
    refreshHud();
  }

  function fire(u, t) {
    const U = UNITS[u.type];
    u.angle = Math.atan2(t.y - u.y, t.x - u.x);
    u.recoil = 1;
    const mx = u.x + Math.cos(u.angle) * (U.r + 18);
    const my = u.y + Math.sin(u.angle) * (U.r + 18);
    Sound.play(U.shot);
    if (U.shot === 'rail') {
      damage(t, u.dmg, true);
      if (t.hp <= 0) u.kills++;
      G.fx.push({ kind: 'beam', x1: mx, y1: my, x2: t.x, y2: t.y, life: 0.25, max: 0.25, color: U.color });
      burst(t.x, t.y, U.color, 6, 90);
      return;
    }
    const speed = { plasma: 700, laser: 950, ice: 520, rocket: 400 }[U.shot];
    G.shots.push({ kind: U.shot, x: mx, y: my, t, tx: t.x, ty: t.y, speed, u, color: U.color, life: 2 });
  }

  function hitShot(s) {
    const u = s.u;
    if (s.kind === 'rocket' || (s.kind === 'ice' && u.splash)) {
      const R = u.splash;
      for (const e of G.enemies) {
        if (e.hp > 0 && Math.hypot(e.x - s.x, e.y - s.y) <= R + ENEMIES[e.type].r) {
          if (s.kind === 'ice') { e.slowT = u.slowT; e.slow = Math.max(e.slow, u.slow); }
          damage(e, u.dmg, false);
          if (e.hp <= 0) u.kills++;
        }
      }
      ring(s.x, s.y, s.kind === 'ice' ? '#9af0ff' : '#ffb347', R, 0.35);
      burst(s.x, s.y, s.kind === 'ice' ? '#e8fbff' : '#ffb347', 12, 160);
      if (s.kind === 'rocket') Sound.play('boom');
      return;
    }
    const e = s.t;
    if (e.hp > 0) {
      if (s.kind === 'ice') { e.slowT = u.slowT; e.slow = Math.max(e.slow, u.slow); }
      damage(e, u.dmg, u.pierceArmor);
      if (e.hp <= 0) u.kills++;
    }
    burst(s.x, s.y, s.color, 4, 70);
  }

  // ---------- Efeitos ----------
  function burst(x, y, color, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = sp * (0.3 + Math.random() * 0.7);
      G.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.35, max: 0.7, color, size: 2 + Math.random() * 3 });
    }
  }
  function ring(x, y, color, r, life) { G.fx.push({ kind: 'ring', x, y, r, life, max: life, color }); }
  function coin(x, y) {
    G.fx.push({ kind: 'coin', x, y, vy: -120, life: 0.7, max: 0.7 });
  }
  function floatText(x, y, text, color) { G.floats.push({ x, y, text, color, life: 1, max: 1 }); }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
  }

  // ---------- HUD ----------
  function refreshHud() {
    if (!G) return;
    $('money').textContent = Math.floor(G.money);
    $('lives').textContent = Math.max(0, Math.ceil(G.lives));
    $('lives').parentElement.classList.toggle('low', G.lives <= 30);
    $('wave').textContent = `${G.wave}/${TOTAL_WAVES}`;
    const wb = $('waveBtn');
    wb.disabled = G.waveActive;
    wb.textContent = G.waveActive ? `Onda ${G.wave}\nem curso` : G.wave === 0 ? '▶ Iniciar\nonda' : `▶ Onda ${G.wave + 1}`;
    $('speedBtn').textContent = `x${G.speed}`;
    $('abilityBtn').classList.toggle('hidden', !G.hero);
    refreshShop();
  }
  function refreshAbility() {
    const h = G.hero;
    if (!h) return;
    const ready = h.abilityCd <= 0;
    const btn = $('abilityBtn');
    btn.classList.toggle('wait', !ready);
    $('abilityTxt').textContent = ready ? 'Pronta' : Math.ceil(h.abilityCd) + 's';
  }

  // ---------- Atualização ----------
  function update(dt) {
    time += dt;
    G.shipHit = Math.max(0, G.shipHit - dt * 2);
    if (G.waveActive) {
      G.waveT += dt;
      while (G.queue.length && G.queue[0].t <= G.waveT) {
        const q = G.queue.shift();
        spawn(q.type, q.hpMul);
      }
    }
    // invasores
    for (const e of G.enemies) {
      const E = ENEMIES[e.type];
      e.flash = Math.max(0, e.flash - dt);
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      let sp = E.speed;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slow; if (e.slowT <= 0) e.slow = 0; }
      e.dist += sp * dt;
      const p = posAt(G.path, e.dist);
      e.x = p.x;
      e.y = p.y + (e.type === 'enxame' ? Math.sin(time * 6 + e.wob) * 4 : 0);
      let da = p.a - e.angle;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      e.angle += da * Math.min(1, dt * 10);
      if (e.dist >= G.path.total) {
        e.hp = 0;
        e.escaped = true;
        G.lives -= E.dmg;
        G.shipHit = 1;
        ring(G.ship[0], G.ship[1], '#ff4a4a', 120, 0.4);
        Sound.play('hit');
        refreshHud();
      }
    }
    G.enemies = G.enemies.filter((e) => e.hp > 0);

    // defensores
    for (const u of G.units) {
      u.timer -= dt;
      u.recoil = Math.max(0, u.recoil - dt * 6);
      if (u.abilityCd > 0) u.abilityCd = Math.max(0, u.abilityCd - dt);
      let best = null;
      for (const e of G.enemies) {
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d <= u.range + ENEMIES[e.type].r && (!best || e.dist > best.dist)) best = e;
      }
      if (best) {
        const want = Math.atan2(best.y - u.y, best.x - u.x);
        let da = want - u.angle;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        u.angle += da * Math.min(1, dt * 14);
        if (u.timer <= 0) { fire(u, best); u.timer = u.cd; }
      }
    }

    // projéteis
    for (const s of G.shots) {
      if (s.t.hp > 0) { s.tx = s.t.x; s.ty = s.t.y; }
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const d = Math.hypot(dx, dy);
      const step = s.speed * dt;
      s.life -= dt;
      if (s.kind === 'rocket' && Math.random() < 0.7) G.fx.push({ kind: 'spark', x: s.x, y: s.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ff8a2a', size: 3 });
      if (d <= step + 4) {
        s.x = s.tx; s.y = s.ty;
        s.done = true;
        if (s.t.hp > 0 || s.kind === 'rocket' || s.u.splash) hitShot(s);
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        s.a = Math.atan2(dy, dx);
      }
      if (s.life <= 0) s.done = true;
    }
    G.shots = G.shots.filter((s) => !s.done);

    // Chuva de Plasma
    for (const k of G.strikes) {
      k.t -= dt;
      if (k.t <= 0) {
        if (k.e && k.e.hp > 0) { k.x = k.e.x; k.y = k.e.y; }
        k.done = true;
        G.fx.push({ kind: 'strike', x: k.x, y: k.y, life: 0.35, max: 0.35 });
        ring(k.x, k.y, '#5fe8ff', 45, 0.3);
        burst(k.x, k.y, '#9af0ff', 8, 150);
        if (k.dmg > 0) {
          for (const e of G.enemies) {
            if (e.hp > 0 && Math.hypot(e.x - k.x, e.y - k.y) <= 45 + ENEMIES[e.type].r) {
              e.stunT = Math.max(e.stunT, ENEMIES[e.type].boss ? k.stun * 0.4 : k.stun);
              damage(e, k.e === e ? k.dmg : k.dmg * 0.35, true);
              if (e.hp <= 0 && G.hero) G.hero.kills++;
            }
          }
        }
        Sound.play('boom');
      }
    }
    G.strikes = G.strikes.filter((k) => !k.done);
    G.enemies = G.enemies.filter((e) => e.hp > 0);

    // efeitos
    for (const f of G.fx) {
      f.life -= dt;
      if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (f.kind === 'coin') { f.y += f.vy * dt; f.vy += 300 * dt; }
    }
    G.fx = G.fx.filter((f) => f.life > 0);
    for (const t of G.floats) { t.life -= dt; t.y -= 30 * dt; }
    G.floats = G.floats.filter((t) => t.life > 0);

    if (G.lives <= 0 && !G.over) { finish(false); return; }
    if (G.waveActive && !G.queue.length && !G.enemies.length) endWave();
  }

  function finish(won) {
    G.over = true;
    G.waveActive = false;
    G.place = null;
    G.sel = null;
    hideUnitPanel();
    Sound.setIntense(false);
    Sound.play(won ? 'win' : 'lose');
    const id = G.map.id;
    const prev = save.best[id] || { won: false, wave: 0, lives: 0 };
    save.best[id] = {
      won: prev.won || won,
      wave: Math.max(prev.wave, won ? TOTAL_WAVES : G.wave - 1),
      lives: won ? Math.max(prev.lives || 0, Math.ceil(G.lives)) : prev.lives || 0,
    };
    if (won) save.unlocked = Math.max(save.unlocked, Math.min(MAPS.length, G.mapIndex + 2));
    persist();
    $('resultTitle').textContent = won ? 'Nave-mãe protegida!' : 'A nave-mãe caiu...';
    $('resultTitle').className = won ? 'win' : 'lose';
    const next = won && G.mapIndex + 1 < MAPS.length ? `<p class="unlock">Novo setor liberado: <b>${MAPS[G.mapIndex + 1].name}</b></p>` : '';
    $('resultStats').innerHTML = `
      <div class="stats"><span>Ondas<b>${won ? TOTAL_WAVES : G.wave - 1}/${TOTAL_WAVES}</b></span>
      <span>Invasores<b>${G.kills}</b></span><span>Créditos ganhos<b>◆ ${G.earned}</b></span>
      <span>Casco<b>${Math.max(0, Math.ceil(G.lives))}</b></span></div>${next}`;
    setTimeout(() => showOnly('result'), 900);
  }

  // ---------- Desenho ----------
  function drawWorld(g, W, t) {
    g.drawImage(W.bg, 0, 0);
    Art.drawPathFlow(g, W.map.path, t);
    Art.portal(g, W.portal[0], W.portal[1], t);
  }

  function render() {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#03050f';
    g.fillRect(0, 0, canvas.width, canvas.height);
    const W = state === 'play' ? G : demo;
    if (!W) return;
    g.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);
    g.save();
    g.beginPath();
    g.rect(0, 0, WORLD_W, WORLD_H);
    g.clip();
    drawWorld(g, W, time);
    Art.mothership(g, W.ship[0], W.ship[1], time, W.lives / START_LIVES, W.shipHit || 0);

    if (state === 'play') {
      // alcance do defensor selecionado
      if (G.sel) rangeCircle(g, G.sel.x, G.sel.y, G.sel.range, UNITS[G.sel.type].color, true);
      if (G.hero && G.hero.abilityCd <= 0 && G.sel === G.hero) {
        g.setLineDash([6, 8]);
        g.strokeStyle = 'rgba(95,232,255,0.4)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(G.hero.x, G.hero.y, UNITS.viajante.ability.radius, 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
    }
    // invasores e defensores ordenados pela altura
    const list = [];
    for (const e of W.enemies) list.push({ y: e.y, e });
    if (state === 'play') for (const u of G.units) list.push({ y: u.y, u });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.e) Art.enemy(g, it.e, time);
      else Art.unit(g, it.u.type, it.u.x, it.u.y, it.u.angle, it.u.lvl, time, it.u.recoil, G.sel === it.u);
    }
    if (state === 'play') {
      for (const e of G.enemies) if (e.hp < e.maxHp && !ENEMIES[e.type].boss) hpBar(g, e);
      drawShots(g);
      drawFx(g);
      // fantasma do posicionamento
      if (G.place && G.hover) {
        const ok = canPlace(G.place, G.hover.x, G.hover.y) && G.money >= UNITS[G.place].cost;
        rangeCircle(g, G.hover.x, G.hover.y, UNITS[G.place].range, ok ? '#5fe8ff' : '#ff4a4a', false);
        g.globalAlpha = 0.75;
        Art.unit(g, G.place, G.hover.x, G.hover.y, -Math.PI / 2, 1, time, 0, false);
        g.globalAlpha = 1;
      }
      for (const t of G.floats) {
        g.globalAlpha = Math.min(1, t.life * 2);
        g.font = '800 18px "Exo 2", sans-serif';
        g.textAlign = 'center';
        g.lineWidth = 4;
        g.strokeStyle = '#0a0e1e';
        g.strokeText(t.text, t.x, t.y);
        g.fillStyle = t.color;
        g.fillText(t.text, t.x, t.y);
      }
      g.globalAlpha = 1;
      bossBar(g);
    }
    g.restore();
  }

  function rangeCircle(g, x, y, r, c, solid) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fillStyle = Art.rgba(c, solid ? 0.08 : 0.12);
    g.fill();
    g.strokeStyle = Art.rgba(c, 0.6);
    g.lineWidth = 2;
    g.stroke();
  }
  function hpBar(g, e) {
    const r = ENEMIES[e.type].r;
    const w = Math.max(22, r * 2);
    const x = e.x - w / 2;
    const y = e.y - r - 10;
    g.fillStyle = 'rgba(10,14,30,0.85)';
    g.fillRect(x - 1, y - 1, w + 2, 6);
    const k = Math.max(0, e.hp / e.maxHp);
    g.fillStyle = k > 0.5 ? '#7aff6a' : k > 0.25 ? '#ffd23f' : '#ff4a4a';
    g.fillRect(x, y, w * k, 4);
  }
  function bossBar(g) {
    const bosses = G.enemies.filter((e) => ENEMIES[e.type].boss);
    if (!bosses.length) return;
    const hp = bosses.reduce((a, e) => a + Math.max(0, e.hp), 0);
    const max = bosses.reduce((a, e) => a + e.maxHp, 0);
    const w = 420;
    const x = WORLD_W / 2 - w / 2;
    const y = 16;
    Art.rrect(g, x - 4, y - 4, w + 8, 26, 8, 'rgba(10,14,30,0.85)', 2);
    g.fillStyle = '#ff4a4a';
    g.fillRect(x, y, w * (hp / max), 18);
    g.font = '800 14px "Orbitron", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#fff';
    g.fillText(`CRUZADOR ALIENÍGENA${bosses.length > 1 ? ' x' + bosses.length : ''}`, WORLD_W / 2, y + 14);
  }
  function drawShots(g) {
    for (const s of G.shots) {
      if (s.kind === 'laser') {
        const a = s.a || 0;
        g.strokeStyle = '#d8ffb8';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(s.x - Math.cos(a) * 14, s.y - Math.sin(a) * 14);
        g.lineTo(s.x, s.y);
        g.stroke();
        Art.glow(g, s.x, s.y, 12, '#8fd36a', 0.8);
      } else if (s.kind === 'plasma') {
        Art.glow(g, s.x, s.y, 20, '#5fe8ff', 0.9);
        Art.ball(g, s.x, s.y, 5, '#e8fbff', 0, false);
      } else if (s.kind === 'ice') {
        Art.glow(g, s.x, s.y, 16, '#9af0ff', 0.8);
        Art.poly(g, Art.starPts(s.x, s.y, 7, 3), '#e8fbff', 1);
      } else {
        g.save();
        g.translate(s.x, s.y);
        g.rotate(s.a || 0);
        Art.rrect(g, -9, -4, 18, 8, 3, '#d8d0c0', 1.5);
        Art.poly(g, [9, -4, 15, 0, 9, 4], '#ff4a4a', 1.2);
        g.restore();
        Art.glow(g, s.x - Math.cos(s.a || 0) * 12, s.y - Math.sin(s.a || 0) * 12, 12, '#ff8a2a', 0.9);
      }
    }
  }
  function drawFx(g) {
    for (const f of G.fx) {
      const k = Math.max(0, f.life / f.max);
      if (f.kind === 'spark') {
        Art.glow(g, f.x, f.y, f.size * 3 * k + 1, f.color, k);
      } else if (f.kind === 'ring') {
        g.strokeStyle = Art.rgba(f.color, k * 0.8);
        g.lineWidth = 3 + k * 3;
        g.beginPath();
        g.arc(f.x, f.y, f.r * (1 - k * 0.7), 0, TAU);
        g.stroke();
      } else if (f.kind === 'beam') {
        g.strokeStyle = Art.rgba('#ffffff', k);
        g.lineWidth = 2 + k * 3;
        g.beginPath();
        g.moveTo(f.x1, f.y1);
        g.lineTo(f.x2, f.y2);
        g.stroke();
        g.strokeStyle = Art.rgba(f.color, k * 0.6);
        g.lineWidth = 8 * k;
        g.stroke();
      } else if (f.kind === 'coin') {
        g.globalAlpha = k;
        Art.poly(g, [f.x, f.y - 8, f.x + 7, f.y, f.x, f.y + 8, f.x - 7, f.y], '#ffd36b', 1.5);
        g.globalAlpha = 1;
      } else if (f.kind === 'strike') {
        g.strokeStyle = Art.rgba('#e8fbff', k);
        g.lineWidth = 6 * k + 2;
        g.beginPath();
        g.moveTo(f.x + 40, f.y - 400);
        g.lineTo(f.x, f.y);
        g.stroke();
        Art.glow(g, f.x, f.y, 60 * k + 10, '#5fe8ff', k);
      }
    }
  }

  // ---------- Fundo animado dos menus ----------
  function makeDemo() {
    const map = MAPS[0];
    const end = map.path[map.path.length - 1];
    demo = { map, path: buildPath(map.path), bg: Art.buildBackground(map, 0), portal: [30, 130], ship: [end[0] + 40, end[1] - 10], enemies: [], lives: START_LIVES, shipHit: 0, t: 0 };
  }
  function updateDemo(dt) {
    time += dt;
    demo.t -= dt;
    if (demo.t <= 0) {
      demo.t = 0.9 + Math.random() * 1.4;
      const types = ['drone', 'drone', 'interceptador', 'blindado', 'enxame'];
      const type = types[Math.floor(Math.random() * types.length)];
      demo.enemies.push({ type, hp: 1, maxHp: 1, dist: 0, x: 0, y: 0, angle: 0, slowT: 0, stunT: 0, flash: 0 });
    }
    for (const e of demo.enemies) {
      e.dist += ENEMIES[e.type].speed * dt;
      const p = posAt(demo.path, e.dist);
      e.x = p.x; e.y = p.y; e.angle = p.a;
      if (e.dist >= demo.path.total) e.hp = 0;
    }
    demo.enemies = demo.enemies.filter((e) => e.hp > 0);
  }

  // ---------- Laço principal ----------
  let last = performance.now();
  let hudTick = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'play' && G) {
      if (!G.paused && !G.over) {
        for (let i = 0; i < G.speed; i++) if (!G.over) update(dt);
        Sound.setIntense(G.waveActive);
      } else if (G.over) {
        time += dt;
        for (const f of G.fx) f.life -= dt;
      }
      hudTick -= dt;
      if (hudTick <= 0) {
        hudTick = 0.2;
        $('money').textContent = Math.floor(G.money);
        refreshAbility();
        if (G.sel && $('unitpanel').dataset.sig !== panelSig(G.sel)) renderUnitPanel();
        refreshShop();
      }
    } else if (demo) {
      updateDemo(dt);
    }
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Entrada (mouse e toque) ----------
  function toWorld(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left - view.ox) / view.s, y: (ev.clientY - r.top - view.oy) / view.s };
  }
  canvas.addEventListener('pointermove', (ev) => {
    if (state !== 'play' || !G) return;
    G.hover = toWorld(ev);
  });
  canvas.addEventListener('pointerleave', () => { if (G) G.hover = null; });
  canvas.addEventListener('pointerdown', (ev) => {
    Sound.unlock();
    if (state !== 'play' || !G || G.over || G.paused) return;
    const p = toWorld(ev);
    G.hover = p;
    if (G.place) {
      const placed = placeUnit(G.place, p.x, p.y);
      if (placed && ev.pointerType !== 'mouse') G.hover = null;
      refreshShop();
      return;
    }
    let hit = null;
    for (const u of G.units) {
      if (Math.hypot(u.x - p.x, u.y - p.y) <= UNITS[u.type].r + 10) hit = u;
    }
    if (hit) { selectUnit(hit); Sound.play('place'); } else if (G.sel) { G.sel = null; hideUnitPanel(); }
  });
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  document.addEventListener('keydown', (ev) => {
    if (state !== 'play' || !G) return;
    const k = ev.key.toLowerCase();
    if (k === 'escape') {
      if (G.place || G.sel) { G.place = null; G.sel = null; hideUnitPanel(); refreshShop(); } else togglePause();
    } else if (G.paused || G.over) {
      return;
    } else if (ev.code === 'Space') {
      ev.preventDefault();
      startWave();
    } else if (k === 'f') {
      toggleSpeed();
    } else if (k === 'q') {
      useAbility();
    } else if (k >= '1' && k <= '5') {
      pickShop(UNIT_ORDER[+k - 1]);
    } else if (k === 'u' && G.sel) {
      upgrade(G.sel);
    }
  });

  function toggleSpeed() {
    G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1;
    refreshHud();
  }
  function togglePause() {
    if (!G || G.over) return;
    G.paused = !G.paused;
    showOnly(G.paused ? 'pause' : null);
  }

  // ---------- Menus ----------
  const overlays = ['home', 'maps', 'how', 'pause', 'result'];
  function showOnly(id) {
    for (const o of overlays) $(o).classList.toggle('hidden', o !== id);
  }
  function goHome() {
    state = 'home';
    G = null;
    $('hud').classList.add('hidden');
    resize();
    const won = MAPS.filter((m) => save.best[m.id] && save.best[m.id].won).length;
    $('homeBest').textContent = won ? `Setores protegidos: ${won}/${MAPS.length}` : '';
    showOnly('home');
  }
  function openMaps() {
    if (G) { state = 'home'; G = null; $('hud').classList.add('hidden'); resize(); }
    const list = $('maplist');
    list.innerHTML = '';
    MAPS.forEach((m, i) => {
      const locked = i >= save.unlocked;
      const best = save.best[m.id];
      const b = document.createElement('button');
      b.className = 'mapcard' + (locked ? ' locked' : '');
      b.style.setProperty('--c', m.accent);
      b.innerHTML = `<div class="thumb" style="background-image:url(${Art.mapPreview(m, i)})">${locked ? '<span class="lock">🔒</span>' : ''}</div>
        <div class="info"><b>${m.name}</b><small>${locked ? 'Vença o setor anterior para liberar.' : m.desc}</small>
        <span class="best">${best ? (best.won ? `✔ Protegido · casco ${best.lives}` : `Melhor: onda ${best.wave}/${TOTAL_WAVES}`) : 'Ainda não jogado'}</span></div>`;
      b.addEventListener('click', () => {
        Sound.unlock();
        if (locked) { Sound.play('deny'); return; }
        newGame(i);
      });
      list.appendChild(b);
    });
    showOnly('maps');
  }

  $('playBtn').onclick = () => { Sound.unlock(); openMaps(); };
  $('howBtn').onclick = () => showOnly('how');
  $('howBack').onclick = () => showOnly('home');
  $('mapsBack').onclick = goHome;
  $('waveBtn').onclick = startWave;
  $('speedBtn').onclick = toggleSpeed;
  $('pauseBtn').onclick = togglePause;
  $('abilityBtn').onclick = useAbility;
  $('resumeBtn').onclick = togglePause;
  $('restartBtn').onclick = () => newGame(G.mapIndex);
  $('quitBtn').onclick = openMaps;
  $('againBtn').onclick = () => newGame(G.mapIndex);
  $('resultMaps').onclick = openMaps;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G && !G.over && !G.paused && state === 'play') togglePause();
  });

  // ganchos para testes automatizados
  window.__ndm = { get G() { return G; }, step: (dt) => update(dt), newGame, startWave, placeUnit, useAbility, upgrade, sell, selectUnit, canPlace };

  makeDemo();
  resize();
  goHome();
  requestAnimationFrame(frame);
})();
