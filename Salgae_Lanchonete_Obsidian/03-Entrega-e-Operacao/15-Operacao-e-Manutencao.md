---
titulo: "Operação e manutenção"
area: Operacao
tags:
  - operacao
  - entrega
atualizado: 2026-11-16
---
# Operação e manutenção

Voltar: [[00-Comece-Aqui]] · Checklist: [[12-Seguranca-e-Qualidade]]

> O sistema é uma demonstração para clientes, com hospedagem gratuita ([[03-Decisoes-do-Projeto]]). A rotina que vale hoje é a de demonstração, logo abaixo. A rotina da lanchonete fica como referência para quando um cliente real usar o sistema.

## Rotina de demonstração

### Antes de demonstrar (de preferência na véspera)

- conferir no painel do Supabase se `SALGAE-PRODUCTION` está ativo; se estiver pausado, restaurar o projeto (leva alguns minutos);
- abrir `https://salgae-producao.vercel.app/api/health` e ver `{"status":"ok"}`;
- abrir `/cardapio`, a Início, um produto com vídeo e a Info, e conferir que nenhum item de teste aparece;
- entrar no painel e conferir Resumo, Produtos e Loja; a Loja deve estar em "Seguir os horários abaixo";
- testar o QR Code da produção (`docs/qr/salgae-producao-vercel-app.png`) com a câmera de um celular, em rede móvel.

### Durante

- cliente: QR Code → Início → Cardápio → produto com vídeo → Busca → Info;
- painel: mudar um preço e ver no cardápio, marcar um item como **Em falta hoje**, esconder e mostrar uma categoria, fechar e abrir a loja pela pílula do topo;
- anotar cada alteração; no editor, não usar o Voltar do navegador (não pergunta antes de descartar).

### Depois

- desfazer preços, situações, categorias e destaques alterados;
- apagar o que foi criado só para mostrar;
- voltar a Loja para "Seguir os horários abaixo";
- conferir `/cardapio` de novo e sair do painel no aparelho usado.

Roteiro completo, com o estado dos ambientes e os workflows, em `docs/publicacao-producao.md`.

### Entre uma demonstração e outra

- o workflow **Ambientes no ar** faz ping no `/api/health` a cada 2 dias e avisa por e-mail se algum ambiente cair. Ele só roda sozinho depois de chegar à `main`; até lá, a pausa do banco precisa ser conferida à mão antes de demonstrar;
- a cópia semanal do banco da produção depende dos segredos do GitHub, ainda não cadastrados ([[09-Ambientes-e-Deploy]]).

## Rotina da lanchonete (referência)

### Antes de abrir

- conferir itens indisponíveis e preços especiais;
- verificar se destaques ainda são válidos;
- abrir o cardápio em um celular real.

### Durante o dia

- marcar o item como **Em falta hoje** assim que acabar;
- preferir **Escondido** a excluir;
- registrar qualquer comportamento estranho para investigação.

### Ao encerrar campanhas

- excluir ou esconder destaque vencido;
- conferir se links, textos e imagens ainda correspondem ao produto;
- revisar itens que ficaram indisponíveis por tempo prolongado.

## Rotina técnica periódica

- revisar erros e acessos anormais (os erros saem como uma linha JSON nos logs da Vercel);
- verificar backups e capacidade do banco/Storage (no plano gratuito não há backup diário; ver a cópia semanal em [[09-Ambientes-e-Deploy]]);
- revisar os PRs do Dependabot, abertos toda segunda-feira para a `develop`;
- conferir arquivos sem referência, com processo seguro;
- atualizar dependências de segurança de forma planejada;
- revisar usuários administrativos e remover acessos que não são mais necessários;
- testar a recuperação de uma versão estável periodicamente.

## Incidente: o que fazer

1. Identificar se o impacto é público, administrativo ou apenas em homologação.
2. Preservar evidências: horário, URL, usuário, ação e mensagem apresentada.
3. Se produção estiver comprometida, restaurar a última versão estável quando isso reduzir o impacto.
4. Corrigir e validar primeiro em homologação.
5. Registrar causa, correção e prevenção em [[03-Decisoes-do-Projeto]] ou em um relatório de incidente.

## Evolução guiada por uso real

Após o lançamento, registrar pedidos recorrentes da equipe e dificuldades observadas no atendimento. Priorizar melhorias que reduzam erros operacionais ou tornem o cardápio mais fácil de usar. Recursos maiores — como pedidos digitais ou delivery — exigem nova análise de escopo, fluxo e operação antes de entrar no roadmap.
