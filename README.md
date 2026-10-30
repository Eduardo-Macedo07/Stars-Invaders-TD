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

## Setores e dificuldades

Seis setores, liberados em sequência (vencer um setor em qualquer dificuldade libera o próximo):

1. Cinturão de Asteroides
2. Estação Órbita-7
3. Cantina Estelar (um bar espacial)
4. Corrida Estelar (pista de corrida no espaço)
5. Deserto de Marte
6. Nebulosa Carmesim

Cada setor tem **três rotas** curvas, uma por dificuldade. Algumas se bifurcam ou têm várias entradas que se cruzam:

| Dificuldade | Rota | Créditos | Casco |
| --- | --- | --- | --- |
| Fácil | longa e sinuosa; invasores com menos vida | 750 | 150 |
| Normal | média | 650 | 100 |
| Difícil | curta e com **duas ou três entradas** | 800 | 80 |

A recarga das habilidades dos heróis só anda durante as ondas e acompanha a velocidade do jogo.

## Visual

- Interface minimalista em amarelo e preto, no estilo das aberturas de space opera.
- Personagens e invasores em **pixel art** (dá para trocar para arte vetorial no menu: "Arte: Pixel").
- A aparência de cada personagem muda bastante com a evolução: armadura na cor do caminho,
  ombreiras, arma maior e um acessório por caminho; no nível 5, asas de energia, halo e coroa.
- Dá para colocar suas próprias imagens (por exemplo, geradas no ChatGPT): veja
  [`assets/LEIA-ME-sprites.md`](assets/LEIA-ME-sprites.md).

## Estrutura

- `index.html`: telas e HUD
- `style.css`: visual sci-fi
- `js/data.js`: setores, defensores, invasores e ondas (bom lugar para balancear)
- `js/art.js`: todos os desenhos, feitos por código, e o modo pixel art
- `js/sprites.js` e `assets/sprites/`: imagens opcionais que substituem a arte gerada
- `js/audio.js`: efeitos e música gerados com Web Audio
- `js/game.js`: regras, laço do jogo e interface
