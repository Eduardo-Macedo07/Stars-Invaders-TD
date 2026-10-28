'use strict';

// Sons e música gerados na hora com a Web Audio (sem arquivos).
const Sound = (() => {
  let ac = null;
  let sfx;
  let mus;
  let noiseBuf;
  const last = {};

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.connect(ac.destination);
    sfx = ac.createGain();
    sfx.gain.value = 0.5;
    sfx.connect(comp);
    mus = ac.createGain();
    mus.gain.value = 0.22;
    mus.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(tick, 25);
  }

  function unlock() {
    init();
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function tone(o) {
    const t = ac.currentTime + (o.at || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.dest || sfx);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  function noise(o) {
    const t = ac.currentTime + (o.at || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.dest || sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }

  const SFX = {
    laser: [0.05, () => tone({ type: 'square', f0: 1400, f1: 500, dur: 0.08, vol: 0.05, lp: 3000 })],
    plasma: [0.06, () => { tone({ type: 'sawtooth', f0: 900, f1: 220, dur: 0.12, vol: 0.06, lp: 2200 }); }],
    rail: [0.1, () => { tone({ type: 'sawtooth', f0: 2400, f1: 200, dur: 0.25, vol: 0.07, lp: 4000 }); noise({ filter: 'highpass', f0: 3000, dur: 0.15, vol: 0.05 }); }],
    rocket: [0.08, () => noise({ f0: 800, f1: 2000, dur: 0.2, vol: 0.08 })],
    ice: [0.08, () => tone({ type: 'sine', f0: 1800, f1: 2600, dur: 0.12, vol: 0.05 })],
    boom: [0.06, () => { noise({ f0: 1600, f1: 80, dur: 0.4, vol: 0.18 }); tone({ type: 'sine', f0: 120, f1: 40, dur: 0.35, vol: 0.18 }); }],
    pop: [0.03, () => tone({ type: 'triangle', f0: 500, f1: 900, dur: 0.07, vol: 0.06 })],
    coin: [0.04, () => tone({ type: 'square', f0: 1320, dur: 0.06, vol: 0.03, lp: 4000 })],
    place: [0.1, () => { tone({ type: 'triangle', f0: 440, f1: 880, dur: 0.15, vol: 0.1 }); }],
    upgrade: [0.1, () => { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.15, vol: 0.08, at: i * 0.06 })); }],
    sell: [0.1, () => tone({ type: 'triangle', f0: 800, f1: 300, dur: 0.2, vol: 0.08 })],
    deny: [0.15, () => tone({ type: 'square', f0: 180, f1: 120, dur: 0.18, vol: 0.06, lp: 900 })],
    hit: [0.15, () => { noise({ f0: 600, f1: 100, dur: 0.3, vol: 0.15 }); tone({ type: 'sawtooth', f0: 160, f1: 60, dur: 0.3, vol: 0.1, lp: 600 }); }],
    wave: [0.5, () => { tone({ type: 'sawtooth', f0: 220, f1: 440, dur: 0.6, vol: 0.06, lp: 1200, attack: 0.1 }); tone({ type: 'sawtooth', f0: 330, f1: 660, dur: 0.6, vol: 0.05, lp: 1200, attack: 0.1 }); }],
    ability: [0.5, () => { noise({ filter: 'bandpass', f0: 300, f1: 3000, dur: 0.8, vol: 0.12 }); tone({ type: 'sawtooth', f0: 80, f1: 600, dur: 0.8, vol: 0.1, lp: 2000 }); }],
    win: [1, () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.1, at: i * 0.12 }))],
    lose: [1, () => [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.45, vol: 0.1, at: i * 0.18 }))],
  };

  function play(name) {
    if (!ac || ac.state !== 'running') return;
    const s = SFX[name];
    if (!s) return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < s[0]) return;
    last[name] = now;
    s[1]();
  }

  // Música ambiente: pads espaciais e um arpejo suave; mais intensa durante as ondas.
  const PROG = [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [-7, -3, 0, 3]];
  const hz = (s) => 220 * Math.pow(2, s / 12);
  let intense = false;
  let on = true;
  let step = 0;
  let next = 0;
  function tick() {
    if (!ac || ac.state !== 'running' || !on) return;
    const bpm = intense ? 112 : 84;
    const sd = 60 / bpm / 4;
    if (next < ac.currentTime) next = ac.currentTime + 0.05;
    while (next < ac.currentTime + 0.15) {
      const at = next - ac.currentTime;
      const bar = Math.floor(step / 16) % 4;
      const i = step % 16;
      const ch = PROG[bar];
      if (i === 0) {
        for (const n of ch) tone({ type: 'sawtooth', f0: hz(n - 12), dur: sd * 16, vol: 0.012, attack: 0.5, lp: 900, at, dest: mus });
        tone({ type: 'sine', f0: hz(ch[0] - 24), dur: sd * 16, vol: 0.08, attack: 0.3, at, dest: mus });
      }
      if (i % 2 === 0) tone({ type: 'triangle', f0: hz(ch[(i / 2) % 4] + 12), dur: sd * 1.8, vol: 0.025, at, dest: mus, lp: 2500 });
      if (intense) {
        if (i % 4 === 0) tone({ type: 'sine', f0: 130, f1: 45, dur: 0.15, vol: 0.2, at, dest: mus });
        if (i === 4 || i === 12) noise({ filter: 'bandpass', f0: 1800, dur: 0.1, vol: 0.06, at, dest: mus });
        if (i % 2 === 1) noise({ filter: 'highpass', f0: 7000, dur: 0.03, vol: 0.02, at, dest: mus });
      }
      next += sd;
      step = (step + 1) % 64;
    }
  }

  function setIntense(v) { intense = v; }
  function setMusic(v) { on = v; }

  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else ac.resume();
  });

  return { unlock, play, setIntense, setMusic };
})();
