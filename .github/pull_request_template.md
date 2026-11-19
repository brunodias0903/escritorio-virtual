<!--
Título obrigatório no padrão Conventional Commits, com até 100 caracteres:
  feat(scope): descreva a mudança
  fix(scope): descreva a correção
  chore(scope): descreva a manutenção
-->

## Contexto

<!-- Explique o problema, a motivação e o resultado esperado. -->

## Alterações

<!-- Liste objetivamente as principais mudanças (backend, frontend e/ou infra). -->

-

## Como testar

<!-- Forneça passos reproduzíveis, comandos e dados necessários. -->

1.

## Evidências e anexos

<!--
Arraste imagens, vídeos ou arquivos diretamente para a descrição do PR no GitHub
e adicione uma legenda explicando o cenário e o resultado esperado.

- Imagens: capturas das telas alteradas; inclua antes/depois quando útil.
- Vídeos: gravações dos fluxos, interações ou da reprodução de um problema.
- Outros anexos: logs, relatórios de testes ou saídas de smoke test.

Não inclua credenciais, segredos ou dados sensíveis nos anexos.
Use "Não se aplica" quando não houver evidências ou anexos pertinentes.
-->

## Riscos e rollback

<!-- Descreva impactos, riscos conhecidos (inclusive migrações de banco) e como reverter. -->

## Issue relacionada

<!-- Use "Closes #123", "Relates to #123" ou "Não se aplica". -->

## Checklist

- [ ] O título do PR e os commits seguem Conventional Commits.
- [ ] A alteração está restrita ao escopo descrito.
- [ ] Foram adicionados ou atualizados testes relevantes.
- [ ] `pnpm quality` passa localmente na raiz do monorepo.
- [ ] Migrações já aplicadas em `backend/migrations/` não foram editadas.
- [ ] Não foram incluídos segredos ou dados sensíveis.
- [ ] A documentação foi atualizada quando necessário.
- [ ] Mudanças visuais possuem evidências.
- [ ] Riscos e estratégia de rollback foram avaliados.
