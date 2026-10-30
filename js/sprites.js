'use strict';

// ============================================================
// Sprites em pixel art (imagens em assets/sprites/).
// Só carrega os nomes listados em assets/sprites/lista.js; o que não existir
// continua usando a arte gerada por código (placeholders).
// Cada imagem é uma tira horizontal de quadros quadrados (ex.: 6 quadros de 64x64 = 384x64).
// ============================================================
const Sprites = (() => {
  const store = new Map(); // nome -> { img, frames, fw, fh }
  const listeners = [];

  function load() {
    const names = window.SPRITES_DISPONIVEIS || [];
    for (const name of names) {
      const img = new Image();
      img.onload = () => {
        const fh = img.height;
        const frames = Math.max(1, Math.round(img.width / fh));
        store.set(name, { img, frames, fw: img.width / frames, fh });
        for (const fn of listeners) fn(name);
      };
      img.onerror = () => console.warn(`Sprite não encontrado: assets/sprites/${name}.png`);
      img.src = `assets/sprites/${name}.png`;
    }
  }

  // Tira de quadros pelo primeiro nome da lista que estiver carregado.
  function sheet(...names) {
    for (const n of names) {
      const s = store.get(n);
      if (s) return s;
    }
    return null;
  }
  // Imagem inteira (ex.: fundo de mapa).
  function image(name) {
    const s = store.get(name);
    return s ? s.img : null;
  }
  function onLoad(fn) { listeners.push(fn); }

  // Nome do caminho sem acento, para os arquivos: "Precisão" -> "precisao".
  function slug(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  load();
  return { sheet, image, onLoad, slug };
})();
