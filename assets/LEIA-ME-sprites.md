# Sprites em pixel art

O jogo já vem com uma pixel art gerada por código (placeholders). Você pode trocar qualquer
personagem, invasor ou fundo por uma imagem sua (por exemplo, gerada no ChatGPT).

## Como adicionar uma imagem

1. Salve o arquivo **PNG com fundo transparente** em `assets/sprites/`, com o nome exato da lista abaixo.
2. Abra `assets/sprites/lista.js` e adicione o nome (sem `.png`) na lista:
   ```js
   window.SPRITES_DISPONIVEIS = [
     'unidade_soldado_e0',
     'inimigo_drone',
   ];
   ```
3. Recarregue o jogo. O que não estiver na lista continua com a arte do jogo.

## Formato

- **Personagens:** tira horizontal de **6 quadros de 64x64** (imagem final de 384x64), personagem
  **virado para a direita**, visto de cima levemente inclinado (como em jogos de estratégia).
  - Quadros 1 a 4: parado (respirando, balançando).
  - Quadros 5 e 6: atirando.
  - O jogo espelha a imagem quando o alvo está à esquerda.
- **Invasores:** tira de **4 quadros de 64x64** (256x64), virados para a direita, voando/andando.
- **Fundos de mapa:** uma imagem de **1280x720**, sem o caminho (o jogo desenha o caminho por cima).
- Tamanhos diferentes também funcionam, desde que os quadros sejam quadrados e lado a lado.

## Estágios de evolução

Cada personagem muda de aparência conforme evolui no caminho escolhido:

- `e0`: visual inicial (sem melhorias).
- `e1`: níveis 1 e 2 do caminho (pequenas mudanças, armadura com a cor do caminho).
- `e2`: níveis 3 e 4 (armadura mais pesada, arma maior, acessório do caminho).
- `e3`: nível 5, SUPER (bem mais imponente: asas de energia, armadura dourada, arma enorme).

Se faltar um arquivo, o jogo procura nesta ordem:

1. `unidade_<tipo>_<caminho>_<estagio>`;
2. `unidade_<tipo>_<estagio>`;
3. `unidade_<tipo>_e0`;
4. a arte gerada por código.

Por isso vale começar pelos `e0` de cada personagem e de cada invasor.

## Prompt sugerido para o ChatGPT

> Sprite sheet em pixel art, 6 quadros de 64x64 lado a lado numa única linha (imagem de 384x64),
> fundo transparente, personagem virado para a direita, visão de cima levemente inclinada,
> estilo sci-fi/space opera, contorno escuro de 1 pixel, paleta limitada e vibrante.
> Quadros 1-4: animação parado; quadros 5-6: disparando a arma.
> Personagem: [descreva, ex.: soldado estelar de armadura verde com rifle laser].

Para os estágios, peça o mesmo personagem "mais evoluído": nova armadura com a cor do caminho,
arma maior, acessórios (mochila de granadas, luneta, estandarte, capa...) e, no `e3`, asas de energia
e detalhes dourados.

## Lista de arquivos

**Viajante Espacial** (viajante)

- `unidade_viajante_e0` — visual inicial
- Pistoleiro: `unidade_viajante_pistoleiro_e1`, `unidade_viajante_pistoleiro_e2`, `unidade_viajante_pistoleiro_e3`
- Astro: `unidade_viajante_astro_e1`, `unidade_viajante_astro_e2`, `unidade_viajante_astro_e3`
- Explorador: `unidade_viajante_explorador_e1`, `unidade_viajante_explorador_e2`, `unidade_viajante_explorador_e3`

**Gosma Gigante** (gosma)

- `unidade_gosma_e0` — visual inicial
- Ácido: `unidade_gosma_acido_e1`, `unidade_gosma_acido_e2`, `unidade_gosma_acido_e3`
- Viscosa: `unidade_gosma_viscosa_e1`, `unidade_gosma_viscosa_e2`, `unidade_gosma_viscosa_e3`
- Mutante: `unidade_gosma_mutante_e1`, `unidade_gosma_mutante_e2`, `unidade_gosma_mutante_e3`

**Soldado Estelar** (soldado)

- `unidade_soldado_e0` — visual inicial
- Rajada: `unidade_soldado_rajada_e1`, `unidade_soldado_rajada_e2`, `unidade_soldado_rajada_e3`
- Precisão: `unidade_soldado_precisao_e1`, `unidade_soldado_precisao_e2`, `unidade_soldado_precisao_e3`
- Granadeiro: `unidade_soldado_granadeiro_e1`, `unidade_soldado_granadeiro_e2`, `unidade_soldado_granadeiro_e3`
- Comando: `unidade_soldado_comando_e1`, `unidade_soldado_comando_e2`, `unidade_soldado_comando_e3`

**Técnica Criogênica** (crio)

- `unidade_crio_e0` — visual inicial
- Congelamento: `unidade_crio_congelamento_e1`, `unidade_crio_congelamento_e2`, `unidade_crio_congelamento_e3`
- Estilhaços: `unidade_crio_estilhacos_e1`, `unidade_crio_estilhacos_e2`, `unidade_crio_estilhacos_e3`
- Nevasca: `unidade_crio_nevasca_e1`, `unidade_crio_nevasca_e2`, `unidade_crio_nevasca_e3`
- Marca Criogênica: `unidade_crio_marca-criogenica_e1`, `unidade_crio_marca-criogenica_e2`, `unidade_crio_marca-criogenica_e3`

**Atiradora de Elite** (atiradora)

- `unidade_atiradora_e0` — visual inicial
- Calibre Pesado: `unidade_atiradora_calibre-pesado_e1`, `unidade_atiradora_calibre-pesado_e2`, `unidade_atiradora_calibre-pesado_e3`
- Cadência: `unidade_atiradora_cadencia_e1`, `unidade_atiradora_cadencia_e2`, `unidade_atiradora_cadencia_e3`
- Caçadora: `unidade_atiradora_cacadora_e1`, `unidade_atiradora_cacadora_e2`, `unidade_atiradora_cacadora_e3`
- Recompensa: `unidade_atiradora_recompensa_e1`, `unidade_atiradora_recompensa_e2`, `unidade_atiradora_recompensa_e3`

**Artilheiro Pesado** (artilheiro)

- `unidade_artilheiro_e0` — visual inicial
- Explosivos: `unidade_artilheiro_explosivos_e1`, `unidade_artilheiro_explosivos_e2`, `unidade_artilheiro_explosivos_e3`
- Lança-mísseis: `unidade_artilheiro_lanca-misseis_e1`, `unidade_artilheiro_lanca-misseis_e2`, `unidade_artilheiro_lanca-misseis_e3`
- Napalm: `unidade_artilheiro_napalm_e1`, `unidade_artilheiro_napalm_e2`, `unidade_artilheiro_napalm_e3`
- Abalo: `unidade_artilheiro_abalo_e1`, `unidade_artilheiro_abalo_e2`, `unidade_artilheiro_abalo_e3`

**Piromante** (piromante)

- `unidade_piromante_e0` — visual inicial
- Chama Azul: `unidade_piromante_chama-azul_e1`, `unidade_piromante_chama-azul_e2`, `unidade_piromante_chama-azul_e3`
- Combustão: `unidade_piromante_combustao_e1`, `unidade_piromante_combustao_e2`, `unidade_piromante_combustao_e3`
- Maçarico Longo: `unidade_piromante_macarico-longo_e1`, `unidade_piromante_macarico-longo_e2`, `unidade_piromante_macarico-longo_e3`
- Derretimento: `unidade_piromante_derretimento_e1`, `unidade_piromante_derretimento_e2`, `unidade_piromante_derretimento_e3`

**Engenheira Tesla** (tesla)

- `unidade_tesla_e0` — visual inicial
- Corrente: `unidade_tesla_corrente_e1`, `unidade_tesla_corrente_e2`, `unidade_tesla_corrente_e3`
- Sobrecarga: `unidade_tesla_sobrecarga_e1`, `unidade_tesla_sobrecarga_e2`, `unidade_tesla_sobrecarga_e3`
- Usina: `unidade_tesla_usina_e1`, `unidade_tesla_usina_e2`, `unidade_tesla_usina_e3`
- Bobina: `unidade_tesla_bobina_e1`, `unidade_tesla_bobina_e2`, `unidade_tesla_bobina_e3`

**Invasores**

- `inimigo_drone` — Drone Invasor
- `inimigo_interceptador` — Interceptador
- `inimigo_blindado` — Tanque Blindado
- `inimigo_enxame` — Mini-drone
- `inimigo_cruzador` — Cruzador Alienígena

**Fundos de mapa** (opcional, 1280x720, sem caminho desenhado)

- `mapa_asteroides` — Cinturão de Asteroides
- `mapa_estacao` — Estação Órbita-7
- `mapa_bar` — Cantina Estelar
- `mapa_corrida` — Corrida Estelar
- `mapa_marte` — Deserto de Marte
- `mapa_nebulosa` — Nebulosa Carmesim
