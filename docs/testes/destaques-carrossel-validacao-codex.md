# Validação do plano de navegador

O plano K1–K15 cobre o comportamento relevante e deve ser executado no desenvolvimento e no stage.

- Falta registrar se o teste de aba oculta foi automatizado (por exemplo, CDP) ou feito manualmente, pois navegadores podem limitar temporizadores em segundo plano.
- Falta confirmar em leitor de tela real que a região educada anuncia apenas ações de ponto/seta, não a rolagem automática.
- K12 é correto, mas LCP deve ser interpretado por medição comparativa; várias imagens lazy não garantem por si só uma melhoria mensurável.
- K15 é válido para vazamentos; "nenhum temporizador ativo" deve ser verificado após navegação/desmontagem, não por uma inspeção estática de rede.

Não há itens errados. A auditoria completa de acessibilidade e LCP/CLS no K15 é mais ampla que a aceitação funcional, mas apropriada antes do merge em stage.
