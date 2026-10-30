'use strict';

// ============================================================
// Defensores da Nave-Mãe: laço do jogo, regras e interface
// ============================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const SAVE_KEY = 'ndm_save_v2';
  const OLD_SAVE_KEY = 'ndm_save_v1';
  const MIN_ABILITY_CD = 6;

  // ---------- Progresso salvo ----------
  // best[idDoSetor][dificuldade] = { won, wave, lives }
  let save = { unlocked: 1, best: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw.unlocked === 'number') {
      save = { unlocked: raw.unlocked, best: raw.best || {}, pixel: raw.pixel };
    } else {
      // migra o progresso antigo (um resultado por setor) para a dificuldade Normal
      const old = JSON.parse(localStorage.getItem(OLD_SAVE_KEY));
      if (old && typeof old.unlocked === 'number') {
        for (const [id, b] of Object.entries(old.best || {})) save.best[id] = { normal: b };
        // setores novos entraram no meio da lista: libera pelo número de setores vencidos
        const wonIds = Object.keys(old.best || {}).filter((id) => old.best[id].won);
        save.unlocked = Math.max(1, ...wonIds.map((id) => MAPS.findIndex((m) => m.id === id) + 2));
      }
    }
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
    const k = Math.max(0, Math.min(d - s.start, s.len));
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

  // Monta o cenário de um setor numa dificuldade: caminhos, portais, nave-mãe e fundo.
  function makeLevel(mapIndex, dif) {
    const map = MAPS[mapIndex];
    const rota = map.rotas[dif];
    const paths = rota.map(buildPath);
    // portal: o início do caminho, ou um pouco para dentro se ele começa fora da tela
    const portals = rota.map((pts, i) => {
      const [x, y] = pts[0];
      if (x >= 0 && y >= 0 && x <= WORLD_W && y <= WORLD_H) return [x, y];
      const p = posAt(paths[i], 70);
      return [p.x, p.y];
    });
    const end = rota[0][rota[0].length - 1];
    return { map, paths, portals, ship: [Math.min(WORLD_W - 90, end[0] + 40), end[1] - 10], bg: Art.buildBackground(map, mapIndex, rota) };
  }

  function newGame(mapIndex, dif) {
    dif = dif || 'normal';
    const D = DIFICULDADES[dif];
    G = Object.assign(makeLevel(mapIndex, dif), {
      mapIndex, dif,
      units: [], enemies: [], shots: [], fx: [], floats: [], strikes: [], puddles: [],
      money: D.money, lives: D.lives, maxLives: D.lives, wave: 0, waveActive: false, queue: [], waveT: 0, spawnN: 0,
      speed: 1, paused: false, over: false, place: null, sel: null, hover: null,
      kills: 0, earned: 0, shipHit: 0, heroes: {},
    });
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
      b.innerHTML = `<canvas data-icon="${type}"></canvas><span class="nm">${U.name.split(' ')[0]}</span><span class="cost">◆ ${U.cost}</span>`;
      b.addEventListener('click', () => pickShop(type));
      shop.appendChild(b);
      Art.fillIcons(b);
    });
  }
  function pickShop(type) {
    if (!G || G.over) return;
    const U = UNITS[type];
    if (G.place === type) { G.place = null; refreshShop(); return; }
    if (U.hero && G.heroes[type]) { toast(`${U.name} já está em campo.`); Sound.play('deny'); return; }
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
      const used = U.hero && G.heroes[b.dataset.type];
      b.classList.toggle('poor', !used && G.money < U.cost);
      b.classList.toggle('used', !!used);
      b.classList.toggle('active', G.place === b.dataset.type);
      b.querySelector('.cost').textContent = used ? 'Em campo' : `◆ ${U.cost}`;
    }
  }

  function canPlace(type, x, y) {
    const r = UNITS[type].r;
    if (x < r + 6 || y < r + 14 || x > WORLD_W - r - 6 || y > WORLD_H - r - 6) return false;
    for (const path of G.paths) for (const s of path.segs) if (distToSeg(x, y, s) < 30 + r) return false;
    for (const u of G.units) if (Math.hypot(u.x - x, u.y - y) < r + UNITS[u.type].r + 6) return false;
    if (Math.hypot(G.ship[0] - x, G.ship[1] - y) < 100 + r) return false;
    for (const pt of G.portals) if (Math.hypot(pt[0] - x, pt[1] - y) < 45 + r) return false;
    return true;
  }

  // Cria um defensor com os atributos base do tipo.
  function makeUnit(type, x, y) {
    const U = UNITS[type];
    return {
      type, x, y, path: null, tier: 0, spent: U.cost, timer: 0.2, angle: -Math.PI / 2, recoil: 0, kills: 0,
      dmg: U.dmg, range: U.range, cd: U.cd, slow: U.slow || 0, slowT: U.slowT || 0, splash: U.splash || 0,
      pierce: !!U.pierce, burn: U.burn || 0, burnT: U.burnT || 0, chain: U.chain || 0, multishot: 1,
      crit: 0, critMul: 2, stunChance: 0, stunT: 0.5, shred: 0, bossMul: 0, cash: 0, income: 0,
      vuln: 0, explode: 0, line: false, aura: null, pulse: null, pulseT: 0, slowAura: 0,
      bDmg: 1, bRate: 1, ab: U.ability ? { ...U.ability } : null, abilityCd: 0,
    };
  }

  function placeUnit(type, x, y) {
    const U = UNITS[type];
    if (U.hero && G.heroes[type]) return false;
    if (G.money < U.cost) { toast('Créditos insuficientes.'); Sound.play('deny'); return false; }
    if (!canPlace(type, x, y)) { toast('Não dá para posicionar aí.'); Sound.play('deny'); return false; }
    const u = makeUnit(type, x, y);
    G.units.push(u);
    if (U.hero) G.heroes[type] = u;
    G.money -= U.cost;
    Sound.play('place');
    ring(x, y, U.color, 40, 0.4);
    if (G.money < U.cost || U.hero) G.place = null;
    refreshHud();
    return true;
  }

  // ---------- Árvore de evolução ----------
  // Aplica os efeitos de um nível no defensor.
  function applyFx(u, fx) {
    for (const [k, v] of Object.entries(fx)) {
      if (k === 'dmgMul') u.dmg *= v;
      else if (k === 'rate') u.cd /= 1 + v;
      else if (k === 'slow') u.slow = Math.max(u.slow, v);
      else if (k === 'critMul') u.critMul = Math.max(u.critMul, v);
      else if (k === 'stunT') u.stunT = Math.max(u.stunT, v);
      else if (k === 'pierce' || k === 'line') u[k] = true;
      else if (k === 'pulse') { u.pulse = { ...v }; u.pulseT = 1; }
      else if (k === 'slowAura') u.slowAura = Math.max(u.slowAura, v);
      else if (k === 'explode') u.explode = Math.max(u.explode, v);
      else if (k === 'aura') {
        u.aura = u.aura || { range: 0, dmg: 0, rate: 0 };
        for (const kk in v) u.aura[kk] += v[kk];
      } else if (k === 'ab') {
        for (const [kk, vv] of Object.entries(v)) {
          if (kk === 'dmg' || kk === 'dps') u.ab[kk] *= 1 + vv;
          else u.ab[kk] += vv;
        }
        u.ab.cd = Math.max(MIN_ABILITY_CD, u.ab.cd);
      } else u[k] = (u[k] || 0) + v;
    }
  }
  function nextTier(u, pi) {
    if (u.path !== null && u.path !== pi) return null; // caminho bloqueado
    const tier = u.path === pi ? u.tier : 0;
    if (tier >= 5) return null;
    const U = UNITS[u.type];
    return { tier, cost: U.costs[tier], def: U.paths[pi].tiers[tier] };
  }
  function buyTier(u, pi) {
    const n = nextTier(u, pi);
    if (!n) return false;
    if (G.money < n.cost) { toast('Créditos insuficientes.'); Sound.play('deny'); return false; }
    G.money -= n.cost;
    u.spent += n.cost;
    applyFx(u, n.def.fx);
    u.path = pi;
    u.tier = n.tier + 1;
    const pc = UNITS[u.type].paths[pi].color;
    if (u.tier === 1) toast(`Caminho ${UNITS[u.type].paths[pi].name} escolhido. Os outros foram bloqueados.`);
    if (u.tier === 5) {
      Sound.play('ability');
      ring(u.x, u.y, pc, 120, 0.8);
      burst(u.x, u.y, pc, 40, 260);
      floatText(u.x, u.y - 34, UNITS[u.type].hero ? 'LENDÁRIO!' : 'SUPER!', pc);
      toast(`${UNITS[u.type].name} virou ${n.def.name}!`);
    } else {
      Sound.play('upgrade');
      ring(u.x, u.y, pc, 50, 0.5);
      burst(u.x, u.y, pc, 14, 120);
    }
    refreshHud();
    renderUnitPanel();
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
  function pathColor(u) { return u.path !== null ? UNITS[u.type].paths[u.path].color : null; }
  function pathLook(u) { return u.path !== null ? UNITS[u.type].paths[u.path].look : null; }
  function renderUnitPanel() {
    const u = G.sel;
    const p = $('unitpanel');
    if (!u) { hideUnitPanel(); return; }
    const U = UNITS[u.type];
    const title = u.path !== null && u.tier > 0 ? U.paths[u.path].tiers[u.tier - 1].name : U.name;
    const rate = (u.bRate / u.cd).toFixed(1);
    let html = `<div class="uphead" style="--c:${pathColor(u) || U.color}"><canvas data-icon="${u.type}"></canvas>
      <div><b>${title}</b><small>${U.name}${u.tier ? ` · Nível ${u.tier}` : ''}</small></div>
      <button class="x" id="upClose" title="Fechar">✕</button></div>
      <div class="upstats"><span>Dano <b>${Math.round(u.dmg * u.bDmg)}</b></span><span>Alcance <b>${Math.round(u.range)}</b></span><span>Tiros/s <b>${rate}</b></span><span>Abates <b>${u.kills}</b></span></div>`;
    if (U.ability) {
      const ready = u.abilityCd <= 0;
      html += `<button id="upAbility" class="ability ${ready ? '' : 'wait'}">${u.type === 'gosma' ? '◉' : '☄'} ${U.ability.name} ${ready ? `(${U.key})` : (G.waveActive ? '' : '⏸ ') + Math.ceil(u.abilityCd) + 's'}</button>`;
    }
    html += '<div class="paths">';
    U.paths.forEach((path, i) => {
      const locked = u.path !== null && u.path !== i;
      const have = u.path === i ? u.tier : 0;
      const n = nextTier(u, i);
      const pips = [0, 1, 2, 3, 4].map((k) => `<i class="${k < have ? 'on' : ''} ${k === 4 ? 'top' : ''}"></i>`).join('');
      let info;
      let btn;
      if (locked) {
        info = '<small>Bloqueado: outro caminho foi escolhido.</small>';
        btn = '<button class="buy" disabled>🔒</button>';
      } else if (!n) {
        info = `<small class="done">★ ${path.tiers[4].name}: ${(path.tiers[4].d || describeFx(path.tiers[4].fx)).replace(/^SUPER: /, '')}</small>`;
        btn = '<button class="buy" disabled>MÁX</button>';
      } else {
        const super5 = n.tier === 4;
        info = `<small>${super5 ? `<em>${U.hero ? 'LENDÁRIO' : 'SUPER'}</em> ` : ''}<b>${n.def.name}:</b> ${(n.def.d || describeFx(n.def.fx)).replace(/^SUPER: /, '')}</small>`;
        btn = `<button class="buy ${G.money < n.cost ? 'poor' : ''}" data-path="${i}">◆ ${n.cost}</button>`;
      }
      html += `<div class="path ${locked ? 'locked' : ''} ${u.path === i ? 'chosen' : ''}" style="--pc:${path.color}">
        <div class="pinfo"><div class="pname"><b>${path.name}</b><span class="pips">${pips}</span></div>${info}</div>${btn}</div>`;
    });
    html += '</div>';
    html += `<button id="upSell" class="secondary">Vender por ◆ ${sellValue(u)}</button>`;
    p.innerHTML = html;
    Art.fillIcons(p);
    p.classList.remove('hidden');
    $('upClose').onclick = () => { G.sel = null; hideUnitPanel(); };
    for (const b of p.querySelectorAll('button.buy[data-path]')) b.onclick = () => buyTier(u, +b.dataset.path);
    $('upSell').onclick = () => sell(u);
    if (U.ability) $('upAbility').onclick = () => useAbility(u.type);
    p.dataset.sig = panelSig(u);
  }
  function panelSig(u) {
    const afford = UNITS[u.type].paths.map((_, i) => { const n = nextTier(u, i); return n && G.money >= n.cost ? 1 : 0; }).join('');
    return [u.tier, u.path, u.kills, Math.ceil(u.abilityCd), G.waveActive, afford, u.bDmg, u.bRate].join('|');
  }
  function sell(u) {
    const v = sellValue(u);
    G.money += v;
    G.units.splice(G.units.indexOf(u), 1);
    if (G.heroes[u.type] === u) delete G.heroes[u.type];
    G.sel = null;
    hideUnitPanel();
    floatText(u.x, u.y - 20, `+◆${v}`, '#ffd36b');
    burst(u.x, u.y, UNITS[u.type].color, 12, 100);
    Sound.play('sell');
    refreshHud();
  }

  // ---------- Habilidades dos heróis ----------
  function useAbility(type) {
    if (!G || G.over || G.paused) return;
    const h = G.heroes[type];
    const U = UNITS[type];
    if (!h) { toast(`Posicione ${type === 'gosma' ? 'a' : 'o'} ${U.name} para usar a habilidade.`); return; }
    if (h.abilityCd > 0) { toast(`${U.ability.name} recarregando: ${Math.ceil(h.abilityCd)}s`); Sound.play('deny'); return; }
    const ok = type === 'gosma' ? gooRiver(h) : plasmaRain(h);
    if (!ok) return;
    h.abilityCd = h.ab.cd;
    Sound.play('ability');
    if (G.sel === h) renderUnitPanel();
  }

  // Chuva de Plasma: raios caem sobre todos os invasores em volta do Viajante.
  function plasmaRain(h) {
    const A = h.ab;
    ring(h.x, h.y, '#5fe8ff', A.radius, 0.7);
    const targets = G.enemies.filter((e) => Math.hypot(e.x - h.x, e.y - h.y) <= A.radius);
    targets.forEach((e, i) => G.strikes.push({ e, x: e.x, y: e.y, t: 0.15 + (i % 10) * 0.06 + Math.random() * 0.2, dmg: A.dmg * h.bDmg, stun: A.stun, src: h }));
    // raios extras só pelo visual
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      const d = Math.random() * A.radius;
      G.strikes.push({ e: null, x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, t: Math.random() * 0.8, dmg: 0, stun: 0 });
    }
    return true;
  }

  // Rio de Gosma: cobre um trecho do caminho no alcance da Gosma.
  // Quem passa por ali fica grudado (paralisado) por um tempo, e anda devagar enquanto estiver na gosma.
  function gooRiver(h) {
    const A = h.ab;
    const reach = h.range + 40;
    let center = -1;
    let pi = 0;
    for (const e of G.enemies) {
      if (Math.hypot(e.x - h.x, e.y - h.y) <= reach && e.dist > center) { center = e.dist; pi = e.pi; }
    }
    if (center < 0) {
      // sem invasores por perto: usa o ponto mais avançado de um caminho dentro do alcance
      G.paths.forEach((path, i) => {
        for (let d = 0; d <= path.total; d += 10) {
          const p = posAt(path, d);
          if (Math.hypot(p.x - h.x, p.y - h.y) <= reach && d > center) { center = d; pi = i; }
        }
      });
    }
    const path = G.paths[pi];
    if (center < 0) { toast('Não há caminho no alcance da Gosma.'); Sound.play('deny'); return false; }
    const d0 = Math.max(0, center - A.len * 0.7);
    const d1 = Math.min(path.total, center + A.len * 0.3);
    const pts = [];
    for (let d = d0; d <= d1; d += 12) { const p = posAt(path, d); pts.push([p.x, p.y]); }
    const pe = posAt(path, d1);
    pts.push([pe.x, pe.y]);
    G.puddles.push({ pi, d0, d1, pts, t: A.dur, max: A.dur, stun: A.stun, dps: A.dps * (1 + G.wave * 0.35) * h.bDmg, hit: new Set(), src: h });
    // gosma voando da heroína até o caminho
    for (let i = 0; i < pts.length; i += 3) {
      const [x, y] = pts[i];
      G.fx.push({ kind: 'spark', x: h.x, y: h.y, vx: (x - h.x) * 2.2, vy: (y - h.y) * 2.2, life: 0.4, max: 0.5, color: '#7aff4a', size: 6 });
    }
    burst(h.x, h.y, '#7aff4a', 20, 160);
    return true;
  }

  // ---------- Ondas ----------
  function startWave() {
    if (!G || G.over || G.waveActive || G.wave >= TOTAL_WAVES) return;
    G.wave++;
    G.waveActive = true;
    G.waveT = 0;
    const w = buildWave(G.wave, G.mapIndex, G.dif);
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
    let extra = 0;
    for (const u of G.units) {
      if (u.income > 0) {
        extra += u.income;
        floatText(u.x, u.y - 30, `+◆${u.income}`, '#7aff6a');
      }
    }
    G.money += bonus + extra;
    G.earned += bonus + extra;
    if (G.wave >= TOTAL_WAVES) { finish(true); return; }
    toast(`Onda ${G.wave} vencida! Bônus de ◆ ${bonus}${extra ? ` + ◆ ${extra} de renda` : ''}`);
    Sound.play('coin');
    refreshHud();
  }

  function spawn(type, hpMul, dist, pi) {
    const E = ENEMIES[type];
    const hp = Math.round(E.hp * hpMul);
    // com várias entradas, os invasores se revezam entre os caminhos
    if (pi === undefined) pi = G.spawnN++ % G.paths.length;
    const p = posAt(G.paths[pi], dist || 0);
    G.enemies.push({
      type, pi, hp, maxHp: hp, dist: dist || 0, x: p.x, y: p.y, angle: p.a, slowT: 0, slow: 0, stunT: 0, flash: 0,
      reward: Math.max(1, Math.round(E.reward * DIFICULDADES[G.dif].reward)), wob: Math.random() * TAU, burn: 0, burnT: 0, burnSrc: null, shred: 0, vuln: 0, vulnT: 0, explode: 0,
    });
  }

  // ---------- Combate ----------
  function isBoss(e) { return !!ENEMIES[e.type].boss; }
  function damage(e, amount, pierce, src) {
    if (e.hp <= 0) return;
    const armor = pierce ? 0 : Math.max(0, ENEMIES[e.type].armor - e.shred);
    const mul = e.vulnT > 0 ? 1 + e.vuln : 1;
    e.hp -= Math.max(1, amount * mul - armor);
    e.flash = 0.08;
    if (e.hp <= 0) kill(e, src);
  }
  function kill(e, src) {
    const E = ENEMIES[e.type];
    const reward = Math.round(e.reward * (1 + (src ? src.cash : 0)));
    G.kills++;
    G.money += reward;
    G.earned += reward;
    if (src) src.kills++;
    floatText(e.x, e.y - E.r - 4, `+◆${reward}`, '#ffd36b');
    coin(e.x, e.y);
    burst(e.x, e.y, E.color, E.boss ? 40 : 10, E.boss ? 260 : 140);
    if (e.vulnT > 0 && e.explode > 0) {
      // marca criogênica: explode em gelo e acerta quem está perto
      ring(e.x, e.y, '#c8a0ff', 80, 0.4);
      burst(e.x, e.y, '#e8fbff', 12, 200);
      const boom = e.explode;
      e.explode = 0;
      for (const o of G.enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 80) damage(o, boom, true, src);
    }
    if (E.boss) {
      ring(e.x, e.y, '#ffd36b', 140, 0.7);
      Sound.play('boom');
      // o cruzador solta mini-drones ao explodir
      for (let i = 0; i < 6; i++) spawn('enxame', 1 + G.wave * 0.15, Math.max(0, e.dist - i * 14), e.pi);
    } else {
      Sound.play('pop');
    }
    refreshHud();
  }

  // Um acerto do defensor u no invasor e, com todos os efeitos do caminho escolhido.
  function onHit(u, e, mul) {
    if (e.hp <= 0) return;
    let d = u.dmg * u.bDmg * (mul || 1);
    if (u.crit && Math.random() < u.crit) {
      d *= u.critMul;
      if (Math.random() < 0.5) floatText(e.x, e.y - 16, 'CRÍTICO!', '#ff5a8a');
    }
    if (isBoss(e)) d *= 1 + u.bossMul;
    if (u.slow) { e.slowT = Math.max(e.slowT, u.slowT); e.slow = Math.max(e.slow, u.slow); }
    if (u.burn) {
      e.burn = Math.max(e.burn, u.burn * u.bDmg);
      e.burnT = Math.max(e.burnT, u.burnT || 2);
      e.burnSrc = u;
    }
    if (u.shred) e.shred = Math.max(e.shred, u.shred);
    if (u.vuln) {
      e.vuln = Math.max(e.vuln, u.vuln);
      e.vulnT = 3;
      if (u.explode) e.explode = Math.max(e.explode, u.explode * u.bDmg);
    }
    if (u.stunChance && Math.random() < u.stunChance) e.stunT = Math.max(e.stunT, isBoss(e) ? u.stunT * 0.35 : u.stunT);
    damage(e, d, u.pierce, u);
  }
  function areaHit(u, x, y, R, color) {
    for (const e of G.enemies) {
      if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= R + ENEMIES[e.type].r) onHit(u, e);
    }
    ring(x, y, color, R, 0.35);
  }
  // Acerta todos os invasores numa linha a partir do defensor (tiro que atravessa).
  function lineHit(u, a, len, width) {
    const x2 = u.x + Math.cos(a) * len;
    const y2 = u.y + Math.sin(a) * len;
    const seg = { x1: u.x, y1: u.y, dx: Math.cos(a), dy: Math.sin(a), len };
    for (const e of G.enemies) if (e.hp > 0 && distToSeg(e.x, e.y, seg) <= width + ENEMIES[e.type].r) onHit(u, e);
    return [x2, y2];
  }

  function targetsFor(u) {
    const list = [];
    for (const e of G.enemies) {
      if (Math.hypot(e.x - u.x, e.y - u.y) <= u.range + ENEMIES[e.type].r) list.push(e);
    }
    list.sort((a, b) => b.dist - a.dist);
    return list;
  }

  function fire(u, list) {
    const U = UNITS[u.type];
    const t = list[0];
    u.angle = Math.atan2(t.y - u.y, t.x - u.x);
    u.recoil = 1;
    Sound.play(U.shot === 'goo' ? 'pop' : U.shot === 'zap' || U.shot === 'flame' ? 'laser' : U.shot);
    for (let i = 0; i < u.multishot; i++) {
      const e = list[i % list.length];
      const a = Math.atan2(e.y - u.y, e.x - u.x);
      const mx = u.x + Math.cos(a) * (U.r + 18);
      const my = u.y + Math.sin(a) * (U.r + 18);
      if (U.shot === 'rail') {
        let end = [e.x, e.y];
        if (u.line) end = lineHit(u, a, u.range + 300, 14);
        else onHit(u, e);
        G.fx.push({ kind: 'beam', x1: mx, y1: my, x2: end[0], y2: end[1], life: 0.25, max: 0.25, color: pathColor(u) || U.color });
        burst(e.x, e.y, U.color, 6, 90);
      } else if (U.shot === 'zap') {
        zap(u, e, mx, my);
      } else if (U.shot === 'flame') {
        if (u.line) lineHit(u, a, u.range + 20, 26);
        else areaHit(u, e.x, e.y, u.splash, 'rgba(0,0,0,0)');
        const fc = pathColor(u) === '#5fa8ff' ? '#5fa8ff' : '#ff8a2a';
        const reach = u.line ? u.range + 20 : Math.hypot(e.x - mx, e.y - my);
        for (let k = 0; k < 3; k++) {
          const sp = (reach / 0.3) * (0.7 + Math.random() * 0.4);
          const aa = a + (Math.random() - 0.5) * 0.35;
          G.fx.push({ kind: 'spark', x: mx, y: my, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.3, max: 0.3, color: Math.random() < 0.4 ? '#ffd36b' : fc, size: 5 + Math.random() * 4 });
        }
      } else {
        const speed = { plasma: 700, laser: 950, ice: 520, rocket: 400, goo: 460 }[U.shot];
        G.shots.push({ kind: U.shot, x: mx, y: my, t: e, tx: e.x, ty: e.y, speed, u, color: U.color, life: 2, a });
      }
    }
  }

  // Raio da Engenheira Tesla: salta de invasor em invasor.
  function zap(u, first, mx, my) {
    const pts = [[mx, my], [first.x, first.y]];
    const hit = new Set([first]);
    onHit(u, first);
    let cur = first;
    let mul = 1;
    for (let i = 0; i < u.chain; i++) {
      let best = null;
      let bd = 120;
      for (const e of G.enemies) {
        if (e.hp <= 0 || hit.has(e)) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      mul *= 0.85;
      hit.add(best);
      pts.push([best.x, best.y]);
      onHit(u, best, mul);
      cur = best;
    }
    G.fx.push({ kind: 'zap', pts, life: 0.18, max: 0.18, color: pathColor(u) || '#b48cff' });
  }

  function hitShot(s) {
    const u = s.u;
    if (u.splash > 0) {
      const color = s.kind === 'ice' ? '#9af0ff' : s.kind === 'goo' ? '#7aff4a' : '#ffb347';
      areaHit(u, s.x, s.y, u.splash, color);
      burst(s.x, s.y, s.kind === 'ice' ? '#e8fbff' : color, s.kind === 'goo' ? 14 : 12, 160);
      if (s.kind === 'rocket') Sound.play('boom');
      return;
    }
    onHit(u, s.t);
    burst(s.x, s.y, s.color, 4, 70);
  }

  // Efeitos periódicos das SUPER habilidades (ataque orbital, congelamento, terremoto).
  function pulse(u, list) {
    const P = u.pulse;
    const dmg = P.dmg * u.bDmg;
    if (P.kind === 'orbital') {
      const e = list[0];
      G.fx.push({ kind: 'strike', x: e.x, y: e.y, life: 0.45, max: 0.45, color: '#ff8a2a' });
      ring(e.x, e.y, '#ffb347', 110, 0.5);
      burst(e.x, e.y, '#ffd36b', 24, 260);
      for (const o of G.enemies) {
        if (o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 110) {
          o.stunT = Math.max(o.stunT, isBoss(o) ? P.stun * 0.35 : P.stun);
          damage(o, dmg, true, u);
        }
      }
      Sound.play('boom');
    } else {
      const ice = P.kind === 'freeze';
      ring(u.x, u.y, ice ? '#9af0ff' : '#c8a070', u.range, 0.6);
      burst(u.x, u.y, ice ? '#e8fbff' : '#c8a070', 24, u.range * 2);
      for (const e of list) {
        e.stunT = Math.max(e.stunT, isBoss(e) ? P.stun * 0.35 : P.stun);
        if (ice) { e.slowT = Math.max(e.slowT, 2); e.slow = Math.max(e.slow, 0.5); }
        damage(e, dmg, !ice, u);
      }
      Sound.play(ice ? 'ice' : 'boom');
    }
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
  function floatText(x, y, text, color) {
    if (G.floats.length > 60) G.floats.shift();
    G.floats.push({ x, y, text, color, life: 1, max: 1 });
  }

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
    buildAbilityButtons();
    refreshShop();
  }
  function buildAbilityButtons() {
    const box = $('abilities');
    const types = UNIT_ORDER.filter((t) => G.heroes[t]);
    if (box.dataset.types === types.join(',')) return;
    box.dataset.types = types.join(',');
    box.innerHTML = '';
    for (const type of types) {
      const U = UNITS[type];
      const b = document.createElement('button');
      b.className = 'small ability ' + type;
      b.title = `${U.ability.name} (${U.key})`;
      b.innerHTML = `${type === 'gosma' ? '◉' : '☄'} <span>Pronta</span><kbd>${U.key}</kbd>`;
      b.onclick = () => useAbility(type);
      box.appendChild(b);
    }
    refreshAbility();
  }
  function refreshAbility() {
    for (const b of $('abilities').children) {
      const type = b.classList.contains('gosma') ? 'gosma' : 'viajante';
      const h = G.heroes[type];
      if (!h) continue;
      const ready = h.abilityCd <= 0;
      b.classList.toggle('wait', !ready);
      b.querySelector('span').textContent = ready ? 'Pronta' : (G.waveActive ? '' : '⏸ ') + Math.ceil(h.abilityCd) + 's';
      b.title = ready ? '' : G.waveActive ? '' : 'Recarga pausada até a próxima onda';
    }
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

    // poças de gosma no caminho
    for (const pd of G.puddles) {
      pd.t -= dt;
      for (const e of G.enemies) {
        if (e.hp <= 0 || e.pi !== pd.pi || e.dist < pd.d0 || e.dist > pd.d1) continue;
        if (!pd.hit.has(e)) {
          pd.hit.add(e);
          e.stunT = Math.max(e.stunT, isBoss(e) ? pd.stun * 0.4 : pd.stun);
          burst(e.x, e.y, '#7aff4a', 5, 70);
        }
        e.slowT = Math.max(e.slowT, 0.2);
        e.slow = Math.max(e.slow, 0.5);
        // dano contínuo (sem o mínimo de 1 por acerto)
        e.hp -= pd.dps * dt * (e.vulnT > 0 ? 1 + e.vuln : 1);
        if (e.hp <= 0) kill(e, pd.src);
      }
    }
    G.puddles = G.puddles.filter((pd) => pd.t > 0);

    // invasores
    for (const e of G.enemies) {
      const E = ENEMIES[e.type];
      e.flash = Math.max(0, e.flash - dt);
      if (e.vulnT > 0) e.vulnT -= dt;
      if (e.burnT > 0 && e.hp > 0) {
        e.burnT -= dt;
        e.hp -= e.burn * dt;
        if (Math.random() < dt * 12) G.fx.push({ kind: 'spark', x: e.x + (Math.random() - 0.5) * E.r, y: e.y, vx: 0, vy: -40, life: 0.4, max: 0.4, color: '#ff8a2a', size: 3 });
        if (e.hp <= 0) { kill(e, e.burnSrc); continue; }
        if (e.burnT <= 0) e.burn = 0;
      }
      if (e.hp <= 0) continue;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      let sp = E.speed;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slow; if (e.slowT <= 0) e.slow = 0; }
      e.dist += sp * dt;
      const path = G.paths[e.pi];
      const p = posAt(path, e.dist);
      e.x = p.x;
      e.y = p.y + (e.type === 'enxame' ? Math.sin(time * 6 + e.wob) * 4 : 0);
      let da = p.a - e.angle;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      e.angle += da * Math.min(1, dt * 10);
      if (e.dist >= path.total) {
        e.hp = 0;
        G.lives -= E.dmg;
        G.shipHit = 1;
        ring(G.ship[0], G.ship[1], '#ff4a4a', 120, 0.4);
        Sound.play('hit');
        refreshHud();
      }
    }
    G.enemies = G.enemies.filter((e) => e.hp > 0);

    // auras de comando: cada defensor recebe o melhor buff ao seu redor
    for (const u of G.units) { u.bDmg = 1; u.bRate = 1; }
    for (const a of G.units) {
      if (!a.aura) continue;
      for (const b of G.units) {
        if (b === a || Math.hypot(b.x - a.x, b.y - a.y) > a.aura.range) continue;
        b.bDmg = Math.max(b.bDmg, 1 + a.aura.dmg);
        b.bRate = Math.max(b.bRate, 1 + a.aura.rate);
      }
    }

    // defensores
    for (const u of G.units) {
      u.timer -= dt * u.bRate;
      u.recoil = Math.max(0, u.recoil - dt * 6);
      // a recarga da habilidade só anda com uma onda em curso (e acompanha a velocidade, pois update roda G.speed vezes)
      if (u.abilityCd > 0 && G.waveActive) u.abilityCd = Math.max(0, u.abilityCd - dt);
      const list = targetsFor(u);
      if (u.slowAura) {
        for (const e of list) { e.slowT = Math.max(e.slowT, 0.15); e.slow = Math.max(e.slow, u.slowAura); }
      }
      if (u.pulse) {
        u.pulseT -= dt;
        if (u.pulseT <= 0 && list.length) { pulse(u, list); u.pulseT = u.pulse.every; }
      }
      if (list.length) {
        const best = list[0];
        const want = Math.atan2(best.y - u.y, best.x - u.x);
        let da = want - u.angle;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        u.angle += da * Math.min(1, dt * 14);
        if (u.timer <= 0) { fire(u, list.filter((e) => e.hp > 0).length ? list.filter((e) => e.hp > 0) : list); u.timer = u.cd; }
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
      if (s.kind === 'goo' && Math.random() < 0.4) G.fx.push({ kind: 'spark', x: s.x, y: s.y, vx: 0, vy: 30, life: 0.3, max: 0.3, color: '#7aff4a', size: 3 });
      if (d <= step + 4) {
        s.x = s.tx; s.y = s.ty;
        s.done = true;
        if (s.t.hp > 0 || s.u.splash) hitShot(s);
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
        G.fx.push({ kind: 'strike', x: k.x, y: k.y, life: 0.35, max: 0.35, color: '#5fe8ff' });
        ring(k.x, k.y, '#5fe8ff', 45, 0.3);
        burst(k.x, k.y, '#9af0ff', 8, 150);
        if (k.dmg > 0) {
          for (const e of G.enemies) {
            if (e.hp > 0 && Math.hypot(e.x - k.x, e.y - k.y) <= 45 + ENEMIES[e.type].r) {
              e.stunT = Math.max(e.stunT, isBoss(e) ? k.stun * 0.4 : k.stun);
              damage(e, k.e === e ? k.dmg : k.dmg * 0.35, true, k.src);
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
    if (G.fx.length > 1500) G.fx.splice(0, G.fx.length - 1500);
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
    save.best[id] = save.best[id] || {};
    const prev = save.best[id][G.dif] || { won: false, wave: 0, lives: 0 };
    save.best[id][G.dif] = {
      won: prev.won || won,
      wave: Math.max(prev.wave, won ? TOTAL_WAVES : G.wave - 1),
      lives: won ? Math.max(prev.lives || 0, Math.ceil(G.lives)) : prev.lives || 0,
    };
    if (won) save.unlocked = Math.max(save.unlocked, Math.min(MAPS.length, G.mapIndex + 2));
    persist();
    $('resultTitle').textContent = won ? 'Nave-mãe protegida' : 'A nave-mãe caiu';
    $('resultTitle').className = won ? 'win' : 'lose';
    const next = won && G.mapIndex + 1 < MAPS.length ? `<p class="unlock">Novo setor liberado: <b>${MAPS[G.mapIndex + 1].name}</b></p>` : '';
    $('resultStats').innerHTML = `
      <div class="stats"><span>Ondas<b>${won ? TOTAL_WAVES : G.wave - 1}/${TOTAL_WAVES}</b></span>
      <span>Invasores<b>${G.kills}</b></span><span>Créditos ganhos<b>◆ ${G.earned}</b></span>
      <span>${DIFICULDADES[G.dif].name}<b>${Math.max(0, Math.ceil(G.lives))}</b></span></div>${next}`;
    setTimeout(() => showOnly('result'), 900);
  }

  // ---------- Desenho ----------
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
    g.drawImage(W.bg, 0, 0);
    for (const path of W.paths) Art.drawPathFlow(g, path, time, W.map);
    for (const pt of W.portals) Art.portal(g, pt[0], pt[1], time);
    Art.mothership(g, W.ship[0], W.ship[1], time, W.lives / (W.maxLives || START_LIVES), W.shipHit || 0);

    if (state === 'play') {
      for (const pd of G.puddles) Art.goo(g, pd.pts, time, pd.t / pd.max);
      // alcance e aura do defensor selecionado
      const s = G.sel;
      if (s) {
        rangeCircle(g, s.x, s.y, s.range, pathColor(s) || UNITS[s.type].color, true);
        if (s.aura) dashed(g, s.x, s.y, s.aura.range, '#5fe8ff');
        if (s.ab && s.type === 'viajante') dashed(g, s.x, s.y, s.ab.radius, '#c77dff');
      }
    }
    // invasores e defensores ordenados pela altura
    const list = [];
    for (const e of W.enemies) list.push({ y: e.y, e });
    if (state === 'play') for (const u of G.units) list.push({ y: u.y, u });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.e) Art.enemy(g, it.e, time);
      else Art.unit(g, it.u.type, it.u.x, it.u.y, it.u.angle, it.u.tier, time, it.u.recoil, G.sel === it.u, pathColor(it.u), pathLook(it.u), it.u.path !== null ? UNITS[it.u.type].paths[it.u.path].name : null);
    }
    if (state === 'play') {
      for (const e of G.enemies) {
        if (e.hp < e.maxHp && !isBoss(e)) hpBar(g, e);
        if (e.burnT > 0) Art.glow(g, e.x, e.y, ENEMIES[e.type].r * 1.4, '#ff5a1a', 0.35);
      }
      drawShots(g);
      drawFx(g);
      // fantasma do posicionamento
      if (G.place && G.hover) {
        const ok = canPlace(G.place, G.hover.x, G.hover.y) && G.money >= UNITS[G.place].cost;
        rangeCircle(g, G.hover.x, G.hover.y, UNITS[G.place].range, ok ? '#5fe8ff' : '#ff4a4a', false);
        g.globalAlpha = 0.75;
        Art.unit(g, G.place, G.hover.x, G.hover.y, -Math.PI / 2, 0, time, 0, false);
        g.globalAlpha = 1;
      }
      g.font = '800 20px "Barlow Condensed", sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = '#0a0e1e';
      for (const t of G.floats) {
        g.globalAlpha = Math.min(1, t.life * 2);
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
  function dashed(g, x, y, r, c) {
    g.setLineDash([6, 8]);
    g.strokeStyle = Art.rgba(c, 0.5);
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.stroke();
    g.setLineDash([]);
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
    const bosses = G.enemies.filter(isBoss);
    if (!bosses.length) return;
    const hp = bosses.reduce((a, e) => a + Math.max(0, e.hp), 0);
    const max = bosses.reduce((a, e) => a + e.maxHp, 0);
    // barra fina, no estilo do resto da interface
    const w = 460;
    const x = WORLD_W / 2 - w / 2;
    const y = 30;
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillRect(x - 6, y - 22, w + 12, 36);
    g.fillStyle = 'rgba(255,59,48,0.25)';
    g.fillRect(x, y, w, 6);
    g.fillStyle = '#ff3b30';
    g.fillRect(x, y, w * (hp / max), 6);
    g.strokeStyle = '#ffe81f';
    g.lineWidth = 1;
    g.strokeRect(x - 6, y - 22, w + 12, 36);
    g.font = '800 15px "Barlow Condensed", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#ffe81f';
    g.fillText(`C R U Z A D O R   A L I E N Í G E N A${bosses.length > 1 ? '  x' + bosses.length : ''}`, WORLD_W / 2, y - 6);
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
      } else if (s.kind === 'goo') {
        Art.glow(g, s.x, s.y, 20, '#7aff4a', 0.7);
        Art.ball(g, s.x, s.y, 8, '#7aff4a', 1.8);
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
        if (f.color.startsWith('rgba')) continue;
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
      } else if (f.kind === 'zap') {
        for (const [w, c] of [[6 * k + 2, Art.rgba(f.color, 0.6 * k)], [2, Art.rgba('#ffffff', k)]]) {
          g.strokeStyle = c;
          g.lineWidth = w;
          g.beginPath();
          g.moveTo(f.pts[0][0], f.pts[0][1]);
          for (let i = 1; i < f.pts.length; i++) {
            const [ax, ay] = f.pts[i - 1];
            const [bx, by] = f.pts[i];
            // raio em zigue-zague entre os pontos
            for (let s = 1; s <= 3; s++) {
              const tt = s / 3;
              const j = s < 3 ? (Math.random() - 0.5) * 16 : 0;
              g.lineTo(ax + (bx - ax) * tt + j, ay + (by - ay) * tt + j);
            }
          }
          g.stroke();
        }
        for (const [x, y] of f.pts) Art.glow(g, x, y, 14, f.color, k);
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
        Art.glow(g, f.x, f.y, 60 * k + 10, f.color || '#5fe8ff', k);
      }
    }
  }

  // ---------- Fundo animado dos menus ----------
  function makeDemo() {
    demo = Object.assign(makeLevel(0, 'normal'), { enemies: [], lives: START_LIVES, shipHit: 0, t: 0 });
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
      const p = posAt(demo.paths[0], e.dist);
      e.x = p.x; e.y = p.y; e.angle = p.a;
      if (e.dist >= demo.paths[0].total) e.hp = 0;
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
      useAbility('viajante');
    } else if (k === 'e') {
      useAbility('gosma');
    } else if (k >= '1' && k <= String(UNIT_ORDER.length)) {
      pickShop(UNIT_ORDER[+k - 1]);
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
  function leaveGame() {
    state = 'home';
    G = null;
    $('hud').classList.add('hidden');
    $('abilities').dataset.types = '';
    resize();
  }
  function goHome() {
    if (G) leaveGame();
    const won = MAPS.filter((m) => mapWon(m.id)).length;
    $('homeBest').textContent = won ? `Setores protegidos: ${won}/${MAPS.length}` : '';
    showOnly('home');
  }
  function mapWon(id) {
    const b = save.best[id] || {};
    return DIF_ORDER.some((d) => b[d] && b[d].won);
  }
  function openMaps() {
    if (G) leaveGame();
    const list = $('maplist');
    list.innerHTML = '';
    MAPS.forEach((m, i) => {
      const locked = i >= save.unlocked;
      const best = save.best[m.id] || {};
      const card = document.createElement('div');
      card.className = 'mapcard' + (locked ? ' locked' : '');
      card.style.setProperty('--c', m.accent);
      const difs = DIF_ORDER.map((d) => {
        const r = best[d];
        const mark = r ? (r.won ? '★' : `${r.wave}`) : '';
        return `<button class="dif" data-dif="${d}" style="--d:${DIFICULDADES[d].color}" ${locked ? 'disabled' : ''}>${DIFICULDADES[d].name}<i>${mark}</i></button>`;
      }).join('');
      card.innerHTML = `<div class="thumb">${locked ? '<span class="lock">Bloqueado</span>' : ''}</div>
        <div class="info"><b>${String(i + 1).padStart(2, '0')} · ${m.name}</b><small>${locked ? 'Vença o setor anterior em qualquer dificuldade.' : m.desc}</small>
        <div class="difs">${difs}</div></div>`;
      const thumb = card.querySelector('.thumb');
      const tc = document.createElement('canvas');
      thumb.prepend(tc);
      const show = (d) => {
        const src = Art.mapPreview(m, i, d);
        tc.width = src.width;
        tc.height = src.height;
        tc.getContext('2d').drawImage(src, 0, 0);
      };
      show('normal');
      for (const b of card.querySelectorAll('.dif')) {
        b.addEventListener('pointerenter', () => show(b.dataset.dif));
        b.addEventListener('focus', () => show(b.dataset.dif));
        b.addEventListener('click', () => {
          Sound.unlock();
          if (locked) { Sound.play('deny'); return; }
          newGame(i, b.dataset.dif);
        });
      }
      list.appendChild(card);
    });
    showOnly('maps');
  }

  // Alterna entre pixel art e arte vetorial (lembrado no save).
  function applyArtStyle() {
    const px = save.pixel !== false;
    Art.setPixel(px);
    for (const id of ['styleBtn', 'styleBtn2']) $(id).textContent = `Arte: ${px ? 'Pixel' : 'Vetorial'}`;
    if (demo) demo.bg = Art.buildBackground(demo.map, 0, demo.map.rotas.normal);
    if (G) {
      G.bg = Art.buildBackground(G.map, G.mapIndex, G.map.rotas[G.dif]);
      buildShop();
      if (G.sel) renderUnitPanel();
    }
  }
  function toggleArtStyle() {
    save.pixel = save.pixel === false;
    persist();
    applyArtStyle();
  }
  $('styleBtn').onclick = toggleArtStyle;
  $('styleBtn2').onclick = toggleArtStyle;

  $('playBtn').onclick = () => { Sound.unlock(); openMaps(); };
  $('howBtn').onclick = () => showOnly('how');
  $('howBack').onclick = () => showOnly('home');
  $('mapsBack').onclick = goHome;
  $('waveBtn').onclick = startWave;
  $('speedBtn').onclick = toggleSpeed;
  $('pauseBtn').onclick = togglePause;
  $('resumeBtn').onclick = togglePause;
  $('restartBtn').onclick = () => newGame(G.mapIndex, G.dif);
  $('quitBtn').onclick = openMaps;
  $('againBtn').onclick = () => newGame(G.mapIndex, G.dif);
  $('resultMaps').onclick = openMaps;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G && !G.over && !G.paused && state === 'play') togglePause();
  });

  // ganchos para testes automatizados
  window.__ndm = { get G() { return G; }, step: (dt) => update(dt), newGame, startWave, placeUnit, useAbility, buyTier, nextTier, sell, selectUnit, canPlace };

  Art.setPixel(save.pixel !== false);
  makeDemo();
  applyArtStyle();
  // redesenha o fundo quando as fontes da página terminarem de carregar (letreiros usam a fonte do tema)
  if (document.fonts) document.fonts.ready.then(() => { if (demo) demo.bg = Art.buildBackground(demo.map, 0, demo.map.rotas.normal); });
  resize();
  goHome();
  requestAnimationFrame(frame);
})();
