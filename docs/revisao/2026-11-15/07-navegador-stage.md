# Teste no navegador — stage (develop, 0e8799a), 2026-11-15, 375x812 e 800px

- NAV-01 P1: produto mostra "Disponível agora" (selo verde) com a loja "Fechada" (domingo). Contradição na tela do produto (`/produto/coxinha-catupiry`).
- NAV-02 P1: logo do topo aparece com atraso (>2 s) no início, info e busca: `<img loading="lazy">` acima da dobra e `_next/image` pedindo w=1080 / w=3840 para exibir 79x44. Falta `priority`/`preload` e `sizes`.
- NAV-03 P1 (demo): quase todos os produtos usam a gota-placeholder; carrossel também. Numa demonstração parece inacabado. `Coxinha de frango` no stage tem foto de um carro (upload de teste).
- NAV-04 P2: dados de teste no stage público: "QA Teste Excluir" ("Descricao de teste editada", sem acento), "Coixinha de Carne".
- NAV-05 P2: tela de produto tem seta de voltar e um botão grande preto "Voltar" como ação principal; o maior botão da tela não faz nada novo. Melhor: ação útil (ex.: "Ver mais de Coxinhas" / chamar atendente / WhatsApp) ou botão secundário.
- NAV-06 P2: `/info` só tem horários; sem endereço, telefone/WhatsApp, mapa, formas de pagamento (dados da loja em branco por decisão; para demo, conteúdo de exemplo ajudaria). Botão (i) no topo leva à própria página em que se está.
- NAV-07 P3: `<title>` igual ("Salgaê Lanchonete") em `/`, `/info`, `/busca`, `/cardapio`; só o produto tem título próprio.
- NAV-08 P3: no computador o site é uma coluna de celular centralizada com laterais vazias; aceitável, mas pode ganhar layout de 2 colunas no cardápio.
- OK: busca sem acento ("camarao" acha "Camarão"), estado vazio bom, sem rolagem lateral, sem erro no console, alvos de toque >= 44 px no início, `lang=pt-BR`, h1 presente.
