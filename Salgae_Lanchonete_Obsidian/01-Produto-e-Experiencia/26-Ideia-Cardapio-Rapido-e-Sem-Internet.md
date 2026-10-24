---
titulo: "Ideia — cardápio rápido e sem internet (cache no navegador)"
area: Produto
tags:
  - produto
  - ideia
  - em-analise
atualizado: 2026-10-24
---
# Ideia — cardápio rápido e sem internet (cache no navegador)

Voltar: [[00-Comece-Aqui]] · Relacionado: [[04-Experiencia-do-Cliente]] · [[25-Mudanca-Separar-Backend-e-Frontend]] · [[12-Seguranca-e-Qualidade]]

> **Status: ideia registrada, em análise.** Só entra em desenvolvimento quando o responsável pedir de forma explícita.

## O que foi pedido (2026-10-24)

O responsável quer usar cache no navegador, com service worker, para **abrir o cardápio mais rápido e conseguir abri-lo sem internet**.

## Por que faz sentido

- O cliente abre o cardápio pelo QR Code ou pela tag NFC, muitas vezes com sinal fraco dentro da lanchonete. Com o service worker, a segunda visita abre na hora, sem esperar a rede.
- Sem internet, o cardápio mostra a última versão guardada no aparelho em vez de uma tela de erro.
- O site já tem `manifest` e a CSP já permite `worker-src 'self'`.

## Proposta inicial (Claude, a validar com o Codex)

- **Escopo do service worker:** o cardápio público. **Nada do `/admin`** é guardado (dados do painel e sessão nunca vão para o cache do aparelho).
- **Estratégias:**
  - Arquivos do build (`/_next/static`, ícones, fontes): guardados de vez, porque já mudam de nome a cada versão.
  - Páginas do cardápio: **rede primeiro**, com a versão guardada como reserva quando não houver internet ou a rede demorar. Assim o preço mostrado fica atualizado sempre que há sinal.
  - Fotos dos produtos (Storage do Supabase): guardadas com limite de quantidade e de idade.
  - Vídeos: não guardados (pesados demais para o aparelho).
- **Aviso na tela:** quando a página vier da cópia guardada, um selo discreto "Sem internet — cardápio de DD/MM às HH:MM; preços podem ter mudado".
- **Atualização:** cache com versão; a versão nova do site substitui o service worker antigo sem deixar o cliente preso numa versão velha. O próprio `sw.js` sai com `Cache-Control: no-cache`.
- **Ferramenta:** service worker escrito à mão (pequeno e fácil de explicar) ou Serwist, que a documentação do Next indica e tem exemplo com Turbopack — decidir na prova de conceito. O Next também tem o gancho experimental `useOffline` para mostrar o estado da conexão.
- **Testes:** Playwright consegue registrar o service worker e simular o aparelho sem internet (`context.setOffline(true)`): abrir o cardápio uma vez, desligar a rede, recarregar e conferir o cardápio e o selo.

## Onde entraria no plano

Na **Fase 3**, junto com o Motion: as duas são da experiência do cliente no navegador e mexem só no `apps/web`. Depois da separação os arquivos já estão no lugar definitivo, então nada é mudado duas vezes.

## Pontos de atenção

- **Preço desatualizado:** é o maior risco. Por isso páginas em "rede primeiro" e o selo com a data da cópia.
- **Navegação interna do Next:** a troca de tela dentro do site busca dados à parte (payload RSC), não só o HTML. Sem internet, essa troca precisa cair numa página guardada ou numa tela "sem conexão".
- **Status aberto/fechado:** continua calculado no aparelho pela hora; sem internet, vale a última configuração guardada da loja.
- **Pedido pela mesa ([[20-Ideia-Pedido-pela-Mesa]]):** se um dia existir, pedido não pode ser feito sem internet; o service worker não guarda envio de pedido.

## Perguntas em aberto

- Entra mesmo na Fase 3, ou antes?
- O selo de "sem internet" com a data serve, ou prefere outro texto?
- Instalar como aplicativo na tela inicial (`display: standalone`) também interessa, ou só o cache?
