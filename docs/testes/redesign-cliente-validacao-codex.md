# Validação do plano de navegador do Claude

O plano cobre bem as rotas, estados, responsividade, acessibilidade e a regressão básica do painel.

## Falta

- Confirmar que todos os destaques ativos continuam acessíveis por rolagem manual, com `scroll-snap` e pontos, sem avanço automático.
- Conferir o marcador visual de produto sem foto nos cards, no detalhe e com estado indisponível.
- Testar que o card inteiro abre o detalhe, inclusive nome, foto, descrição e rodapé.
- Validar o segundo destaque como faixa separada e clicável.

## Ajustaria

- C16 não deve tratar a seta do card como alvo: ela é decorativa; o alvo é o card inteiro.
- C19 deve distinguir falha da aplicação de falha eventual de mídia externa. O requisito útil é não haver erro não tratado nem 4xx/5xx das rotas próprias.

## Exagero

- C20 (“não piorar” Lighthouse) é sensível ao banco, rede, máquina e baseline. Use-o como sinal comparativo, não como bloqueio binário; acessibilidade e ausência de regressão funcional continuam obrigatórias.
