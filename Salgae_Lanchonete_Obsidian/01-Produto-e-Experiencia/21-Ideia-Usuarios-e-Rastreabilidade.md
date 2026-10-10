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

> **Status: ideia em análise. Nada aqui está aprovado nem em desenvolvimento.**
> Hoje existe um único papel (`admin`) e os usuários são criados direto no Supabase. Esta ideia só entra com a validação do responsável.

## O que foi pedido (2026-10-10)

Registro da conversa com o responsável, nas palavras dele organizadas:

1. **O administrador cria outros logins pelo próprio painel.** Não deve depender de alguém técnico entrar no Supabase.
2. **Haverá uma segunda categoria de login**, com nome ainda a definir. Quem tem esse login mexe no sistema: altera preços, adiciona e remove produtos e usa o painel em geral.
3. **Toda ação fica rastreável**, de qualquer perfil, inclusive do administrador. Exemplos: quem mudou um preço, quem adicionou um produto.
4. **A consulta desse histórico fica no painel e é só do administrador.**

## Complementos do responsável (2026-10-10, conversa de validação)

Depois de ouvir o resumo do planejamento, o responsável acrescentou um pedido novo:

5. **O administrador cria categorias de acesso próprias.** Além de "Administrador" e "Operador(a)", ele quer montar outras categorias conforme a necessidade de cada empresa ou serviço, escolhendo o que cada uma pode fazer. O sistema deve ser flexível: as categorias não vêm travadas de fábrica.
   - Exemplo dado por ele: uma categoria para **conferir a mesa**. Quem tem esse login só vê o que foi pedido na mesa, o valor e o número da mesa — e nada mais do painel.
   - Esse exemplo depende da [[20-Ideia-Pedido-pela-Mesa]], porque hoje não existe pedido no sistema.

## Como isso será tratado

Igual à [[20-Ideia-Pedido-pela-Mesa]]: Claude Code e Codex planejam em segundo plano, apresentam a explicação ao responsável, ele valida, e só então a proposta é detalhada neste arquivo. **Não vira código nesta etapa.**

## Perguntas em aberto

- Pode existir mais de um administrador?
- Nas categorias criadas pelo administrador, "criar logins" e "ver o histórico" continuam exclusivos do administrador, ou também podem ser liberados?
- A pessoa que confere a mesa vê **todas** as mesas ou só as que forem atribuídas a ela?
- O administrador também terá login por identificador, ou mantém um e-mail real para conseguir recuperar a própria senha sozinho?
- Convite por e-mail como forma opcional de criar login: **em aberto por decisão do responsável**. Depende de domínio próprio, de um serviço de envio de e-mail e de cada funcionário ter e-mail.

Respondidas em 2026-10-10:

- **Nome da segunda categoria:** Operador(a).
- **O que o operador pode:** tudo no painel, menos criar logins e ver o histórico.
- **Como o login é criado:** o administrador cria um login por **identificador** (não por e-mail), com **senha provisória** gerada pelo sistema; a pessoa troca a senha no primeiro acesso.
- **Tempo de guarda do histórico:** 24 meses.

Apresentadas no resumo e sem objeção do responsável (confirmar ao detalhar a proposta):

- O histórico mostra o valor antigo e o novo (ex.: preço de R$ 7,00 para R$ 7,50).
- O administrador desativa um login e gera nova senha provisória, sem nunca ver a senha definitiva de ninguém.
- "Excluir" vira "arquivar": o item some do cardápio, continua guardado e o administrador pode restaurar.

## Proposta

_A preencher depois do planejamento e da validação do responsável._
