# Unitários do carrossel

Cobertos em `lib/menu/highlight-carousel.test.ts`, usando temporizadores falsos do Vitest:

- avanço após 6 segundos e ciclo do último para o primeiro;
- ausência de temporizador com zero ou um destaque;
- pausa e retomada por ponteiro/arraste, foco, aba oculta, fora da viewport e movimento reduzido;
- pausa explícita que persiste quando outra condição transitória acaba;
- decisão pura de ciclo/pausa;
- contador e limite do aviso do painel em 8 e 9 ativos.

Os testes de DOM, gesto real, `IntersectionObserver`, leitor de tela e ausência de JavaScript permanecem nos casos K1–K15 de navegador.
