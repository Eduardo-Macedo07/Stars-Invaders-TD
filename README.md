# Stars Invaders

Tower defense futurista feito em JavaScript puro e Canvas 2D, sem instalar nada.
Os invasores alienígenas saem de um portal e seguem uma rota fixa até a nave-mãe.
O jogador posiciona **personagens** (não torres) ao longo do caminho para impedir que eles cheguem.

## Como jogar

- Abra o `index.html` no navegador (funciona direto do arquivo ou pelo GitHub Pages).
- Você começa com **◆ 650 créditos** e **100 de casco** na nave-mãe.
- Escolha um defensor na loja da direita e toque num lugar livre fora do caminho.
- Cada invasor derrotado solta créditos. Ao vencer uma onda você ganha um bônus.
- Toque num defensor para abrir a **árvore de evolução** ou **vender** (devolve 70%).
- Vença as 20 ondas de um setor para liberar o próximo.

Atalhos: `Espaço` inicia a onda, `F` muda a velocidade (x1/x2/x3), `Q` usa a Chuva de Plasma,
`E` usa o Rio de Gosma, `1` a `8` escolhem o defensor e `Esc` pausa.

## Defensores

| Defensor | Custo | Papel |
| --- | --- | --- |
| Viajante Espacial | 400 | Herói de plasma. Habilidade **Chuva de Plasma** (`Q`): raios em área que atordoam. |
| Gosma Gigante | 450 | Heroína gelatinosa. Cospe gosma em área que deixa lento. Habilidade **Rio de Gosma** (`E`): cobre um trecho do caminho e paralisa quem passa. |
| Soldado Estelar | 100 | Básico e versátil. |
| Técnica Criogênica | 170 | Deixa os invasores lentos. |
| Atiradora de Elite | 240 | Alcance enorme, ignora blindagem. |
| Artilheiro Pesado | 280 | Foguetes com dano em área. |
| Piromante | 220 | Lança-chamas de curto alcance que deixa os inimigos queimando. |
| Engenheira Tesla | 300 | Raios que saltam entre vários invasores. |

Cada herói só pode ser posicionado uma vez.

## Árvore de evolução

- Cada soldado tem **4 caminhos** com **5 níveis**; cada herói tem **3 caminhos**.
- Só dá para seguir **um** caminho por defensor: ao comprar o 1º nível de um caminho, os outros são bloqueados.
- O **nível 5** dos soldados é uma **SUPER habilidade** (ex.: Bombardeio Orbital, Zero Absoluto,
  Canhão Ferroviário, Ogiva Nuclear, Tempestade Elétrica). O defensor fica maior, com aura e coroa.
- Os caminhos dos heróis dão buffs fortes no ataque ou na habilidade especial.

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
