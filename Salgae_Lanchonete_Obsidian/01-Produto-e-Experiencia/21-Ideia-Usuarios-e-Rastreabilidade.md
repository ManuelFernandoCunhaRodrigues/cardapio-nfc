---
titulo: "Ideia — usuários do painel e rastreabilidade"
area: Produto
tags:
  - produto
  - ideia
  - em-analise
atualizado: 2026-10-10
---
# Ideia — usuários do painel e rastreabilidade

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]] · [[20-Ideia-Pedido-pela-Mesa]]

> **Status: ideia registrada no planejamento. Não está aprovada para desenvolvimento.**
> Ela só entra em desenvolvimento quando o responsável disser, de forma explícita, que quer desenvolver esta ideia. Hoje existe um único papel (`admin`) e os usuários são criados direto no Supabase.

## O que foi pedido (2026-10-10)

Registro da conversa com o responsável, nas palavras dele organizadas:

1. **O administrador cria outros logins pelo próprio painel.** Não deve depender de alguém técnico entrar no Supabase.
2. **Haverá uma segunda categoria de login**, com nome ainda a definir. Quem tem esse login mexe no sistema: altera preços, adiciona e remove produtos e usa o painel em geral.
3. **Toda ação fica rastreável**, de qualquer perfil, inclusive do administrador. Exemplos: quem mudou um preço, quem adicionou um produto.
4. **A consulta desse histórico fica no painel e é só do administrador.**

## Como isso será tratado

Igual à [[20-Ideia-Pedido-pela-Mesa]]: Claude Code e Codex planejam em segundo plano, apresentam a explicação ao responsável, ele valida, e só então a proposta é detalhada neste arquivo. **Não vira código nesta etapa.**

## Perguntas em aberto

- Qual será o nome da segunda categoria (ex.: gerente, operador, equipe)?
- Ela pode **tudo** o que o administrador pode no catálogo, ou há algo reservado ao administrador além de criar logins e ver o histórico (ex.: dados da loja, excluir produto)?
- Quem cria o login define a senha, ou a pessoa recebe um convite por e-mail e cria a própria?
- O administrador pode desativar um login e trocar a senha de outra pessoa?
- Pode existir mais de um administrador?
- Por quanto tempo o histórico precisa ficar guardado?
- O histórico deve mostrar o valor antigo e o novo (ex.: preço de R$ 7,00 para R$ 7,50)?

## Proposta

_A preencher depois do planejamento e da validação do responsável._
