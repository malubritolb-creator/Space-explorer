# Star Vanguard Siege

Shooter espacial em HTML5 Canvas com cinco fases, inspirado no gênero arcade de naves.

## Como jogar

Abra `index.html` em um navegador ou rode `python -m http.server 8000` e acesse `http://localhost:8000`.

## Controles

- `WASD` ou setas: mover
- `Espaço`: atirar
- `Enter`: avançar depois de concluir uma fase
- `R`: reiniciar depois de perder ou vencer

## Fases

1. Cinco inimigos normais.
2. Cinco inimigos normais e três naves laranjas com dois pontos de vida.
3. Um mini-chefe com barra de vida e tiros em leque.
4. Cinco normais, três inimigos laranjas de dois pontos de vida e três blindados de três pontos de vida.
5. Chefão final com o dobro da vida do mini-chefe, tiros em leque, invocação de kamikazes em duplas e laser com aviso visual antes do disparo.

Inimigos normais valem 5 pontos; inimigos de duas vidas, 10; blindados de três vidas, 15; mini-chefe, 20. Cada inimigo destruído toca um efeito sonoro de explosão (o áudio é ativado após uma interação com o jogo, conforme as regras do navegador).
