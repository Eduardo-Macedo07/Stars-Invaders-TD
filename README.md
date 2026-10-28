# Defensores da Nave-Mãe

Tower defense futurista feito em JavaScript puro e Canvas 2D, sem instalar nada.
Os invasores alienígenas saem de um portal e seguem uma rota fixa até a nave-mãe.
O jogador posiciona **personagens** (não torres) ao longo do caminho para impedir que eles cheguem.

## Como jogar

- Abra o `index.html` no navegador (funciona direto do arquivo ou pelo GitHub Pages).
- Você começa com **◆ 650 créditos** e **100 de casco** na nave-mãe.
- Escolha um defensor na loja da direita e toque num lugar livre fora do caminho.
- Cada invasor derrotado solta créditos. Ao vencer uma onda você ganha um bônus.
- Toque num defensor para **melhorar** (até o nível 3) ou **vender** (devolve 70%).
- Vença as 20 ondas de um setor para liberar o próximo.

Atalhos: `Espaço` inicia a onda, `F` muda a velocidade (x1/x2/x3), `Q` usa a habilidade do herói,
`1` a `5` escolhem o defensor, `U` melhora o selecionado e `Esc` pausa.

## Defensores

| Defensor | Custo | Papel |
| --- | --- | --- |
| Viajante Espacial | 400 | Herói: muito dano e a habilidade **Chuva de Plasma** (dano em área e atordoamento). Só um por partida. |
| Soldado Estelar | 100 | Básico, barato, pouco dano. |
| Técnica Criogênica | 170 | Deixa os invasores lentos. |
| Atiradora de Elite | 240 | Alcance enorme, ignora blindagem. |
| Artilheiro Pesado | 280 | Foguetes com dano em área. |

## Invasores

Drones, interceptadores rápidos, tanques blindados, enxames de mini-drones e o
**Cruzador Alienígena**, chefão das ondas 10, 15 e 20.

## Setores

1. Cinturão de Asteroides
2. Estação Órbita-7
3. Nebulosa Carmesim

## Estrutura

- `index.html`: telas e HUD
- `style.css`: visual sci-fi
- `js/data.js`: setores, defensores, invasores e ondas (bom lugar para balancear)
- `js/art.js`: todos os desenhos, feitos por código
- `js/audio.js`: efeitos e música gerados com Web Audio
- `js/game.js`: regras, laço do jogo e interface
