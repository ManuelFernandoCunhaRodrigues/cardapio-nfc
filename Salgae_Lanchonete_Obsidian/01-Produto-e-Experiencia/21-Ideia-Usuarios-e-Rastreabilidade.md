---
titulo: "Ideia — usuários do painel e rastreabilidade"
area: Produto
tags:
  - produto
  - ideia
  - planejamento
atualizado: 2026-10-10
---
# Ideia — usuários do painel e rastreabilidade

Voltar: [[00-Comece-Aqui]] · Relacionado: [[05-Painel-Administrativo]] · [[20-Ideia-Pedido-pela-Mesa]]

> **Status: ideia registrada no planejamento. Não está aprovada para desenvolvimento.**
> Ela só entra em desenvolvimento quando o responsável disser, de forma explícita, que quer desenvolver esta ideia. Hoje existe um único papel (`admin`) e os usuários são criados direto no Supabase.
>
> Este registro existe para a ideia poder ser entregue a outra pessoa que vá desenvolvê-la.

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

## Como isso foi tratado

1. Claude Code e Codex planejaram juntos, em duas rodadas.
2. O planejamento foi apresentado ao responsável, que respondeu às perguntas em 2026-10-10.
3. O responsável pediu para **só registrar**: a ideia não vai para desenvolvimento agora.
4. No fim de todas as ideias, ele dirá quais podem ser desenvolvidas e quais ficam só no planejamento.

## Respostas do responsável (2026-10-10)

| Pergunta | Resposta |
| --- | --- |
| O nome "operador" serve para a segunda categoria? | **Sim.** |
| O operador pode mexer também nos dados da loja (endereço, horários, contatos)? | **Sim.** |
| Os funcionários entram com e-mail ou com nome de usuário? | **Nome de usuário**, criado pelo administrador. |
| Pode existir mais de um administrador? | **Não.** Há um único administrador. |
| Por quanto tempo o histórico fica guardado? | **1 ano.** |

## Planejamento registrado (2026-10-10)

> Resultado das duas rodadas entre Claude Code e Codex e das respostas do responsável. É um plano, não uma especificação aprovada. Onde está escrito **incerto**, falta teste ou confirmação.

### Como funciona

1. **O administrador cria os logins pelo painel.** Ninguém precisa entrar no Supabase.
2. Ao criar um login, ele escolhe o **nome de usuário** e o nome da pessoa.
3. O sistema gera uma **senha provisória** e mostra uma única vez ao administrador, que entrega à pessoa.
4. No primeiro acesso, a pessoa é **obrigada a trocar a senha** antes de usar qualquer outra tela.
5. O administrador pode **desativar** um login e **gerar nova senha provisória**. A senha antiga nunca é mostrada de novo.
6. Senha provisória não usada expira; o administrador gera outra.

### Os dois tipos de login

| Área do painel | Operador | Só o administrador |
| --- | --- | --- |
| Produtos, preços, categorias, disponibilidade, ordem, destaques, fotos e vídeos | Cria, edita, ativa, desativa e arquiva | Restaura item arquivado |
| Dados da loja (identidade, endereço, contatos, horários, aviso) | Altera tudo | — |
| Logins | Sem acesso | Cria, desativa e gera nova senha |
| Histórico | Sem acesso | Consulta |

Existe **um único administrador**. Todos os outros logins são operadores.

### "Excluir" vira "arquivar"

O item arquivado some do cardápio, mas não é apagado. Só o administrador restaura. Assim o histórico não perde o que foi removido, e um engano tem volta.

### Histórico

- **Toda alteração fica registrada**, de qualquer login, inclusive do administrador.
- Cada registro guarda **quem fez, quando, em qual item e o antes e depois** (por exemplo, "Preço: R$ 7,00 → R$ 7,50").
- O registro é feito pelo próprio banco, na mesma operação da alteração. Se o registro falhar, a alteração não acontece.
- Ninguém edita nem apaga o histórico pelo painel, nem o administrador.
- A **tela de histórico é só do administrador**, com filtro por pessoa, período, ação e item.
- O histórico fica guardado por **1 ano**. Registros mais antigos são removidos.
- Senhas e códigos de acesso nunca entram no histórico.

### Fora do primeiro corte

- Registro de entrada e saída do painel (login e logout).
- Registro de envio e remoção de arquivos de foto e vídeo. A troca da foto no produto continua aparecendo.
- Limpeza automática dos registros com mais de 1 ano. No começo a limpeza pode ser manual.
- Cópia do histórico fora do servidor.

### Limites que precisam ser conhecidos

- **Quem tem acesso direto ao servidor ou ao banco consegue mexer no histórico.** O bloqueio vale para os logins do painel.
- **Com um único administrador, perder o acesso dele trava a gestão de logins.** A recuperação passa por quem cuida do servidor. O login do administrador deve ter um e-mail real para recuperação de senha.
- **Operador que esquece a senha depende do administrador.** Como o login é por nome de usuário, não há recuperação por e-mail.

### Notas técnicas para quem for desenvolver

- Papéis: `admin` e `operator`. Hoje `profiles.role` só aceita `admin`, e `private.is_admin()` decide as regras de acesso.
- Garantir no banco que só existe um administrador ativo.
- O login do Supabase exige e-mail ou telefone. Para nome de usuário, o sistema precisa mapear o nome para um identificador interno que não seja um endereço de e-mail entregável nem recuperável por terceiros. **Incerto:** validar a forma exata na versão do Supabase em uso.
- A criação de logins usa a credencial administrativa do Supabase, que fica só no servidor. Um único módulo de servidor lê esse segredo e confere, no banco, que quem pediu é o administrador antes de cada comando.
- A obrigação de trocar a senha fica gravada no banco e é conferida no servidor e nas regras de acesso. Esconder o menu não basta.
- O histórico usa gatilhos do banco nas tabelas de categorias, produtos, destaques, dados da loja e perfis. Os registros que as telas gravam hoje por conta própria saem, para não duplicar.
- Hoje as telas já gravam um registro simples (quem, ação, item), sem o antes e depois e sem tela de consulta. Entrada e saída do painel não são registradas.
- Arquivar usa data e autor do arquivamento no item; substitui as exclusões físicas atuais.
- Testes mínimos: operador e administrador geram registro correto; só o administrador lê; operador e visitante não leem, não forjam e não apagam; falha do registro desfaz a alteração.

### Relação com o pedido pela mesa

Se as duas ideias forem desenvolvidas, esta vem antes: ela cria a base de papéis e de histórico que os papéis de atendente e cozinha de [[20-Ideia-Pedido-pela-Mesa]] vão usar.
