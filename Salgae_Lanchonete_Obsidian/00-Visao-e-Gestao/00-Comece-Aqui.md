---
titulo: "Salgaê Lanchonete — Cérebro do Projeto"
area: Gestao
tags:
  - gestao
  - projeto
atualizado: 2026-09-27
---
# Salgaê Lanchonete — Cérebro do Projeto

Esta pasta é a fonte de contexto do projeto **Salgaê Lanchonete**. Ela existe para que decisões, escopo, arquitetura e andamento não dependam de conversas isoladas. Abra a pasta inteira como um *vault* no Obsidian.

## Objetivo do produto

Construir um cardápio digital para uso **presencial** na Salgaê. Ao aproximar ou escanear um identificador NFC/QR Code, a pessoa abre rapidamente o catálogo público no celular. A equipe atualiza produtos, preços, disponibilidade, categorias e destaques em um painel administrativo.

O produto deve ser simples para o cliente, rápido para a lanchonete manter e seguro para operar.

## Navegação principal

- [[01-Visao-Geral]] — problema, proposta de valor e resultados esperados.
- [[02-Escopo-Atual]] — o que está dentro, fora e em aberto.
- [[03-Decisoes-do-Projeto]] — decisões que guiam o desenvolvimento.
- [[04-Experiencia-do-Cliente]] — fluxo no cardápio público.
- [[05-Painel-Administrativo]] — responsabilidades da área de gestão.
- [[06-Arquitetura-e-Stack]] — visão técnica e tecnologias.
- [[07-Modelo-de-Dados-Supabase]] — entidades e regras de dados.
- [[08-Imagens-e-Storage]] — política para fotos dos produtos.
- [[09-Ambientes-e-Deploy]] — homologação e produção.
- [[10-Git-e-Fluxo-de-Entrega]] — branches, PRs e publicação.
- [[11-Agentes-de-IA]] — colaboração entre Claude Code e Codex.
- [[12-Seguranca-e-Qualidade]] — controles mínimos antes do lançamento.
- [[13-Roadmap]] e [[14-Epicos-de-Desenvolvimento]] — plano de execução.
- [[15-Operacao-e-Manutencao]] — rotina após o lançamento.
- [[16-Identidade-Visual]] — marca, logotipo, cores e tom de voz.
- [[17-Design-System-UI]] — tokens, componentes e layout da interface.
- [[18-Prototipos-e-Telas]] — telas prototipadas, fluxos e divergências em aberto.

## Como usar este vault

1. Comece pelo [[01-Visao-Geral]] e pelo [[02-Escopo-Atual]] antes de propor uma funcionalidade.
2. Quando houver uma escolha que muda custo, experiência ou arquitetura, registre-a em [[03-Decisoes-do-Projeto]].
3. Para iniciar uma tarefa, consulte [[14-Epicos-de-Desenvolvimento]] e crie uma branch conforme [[10-Git-e-Fluxo-de-Entrega]].
4. Ao concluir uma entrega, atualize o status do épico e os itens de validação correspondentes.

> Regra de ouro: se uma decisão importante não está documentada, ela ainda pode ser esquecida. Documente antes de transformar em código.
