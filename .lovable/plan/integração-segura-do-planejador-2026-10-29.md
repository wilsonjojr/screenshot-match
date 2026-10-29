# Integração segura do planejador

## Diagnóstico verificado
- O planejador atual usa armazenamento do navegador; ainda não possui autenticação nem persistência remota.
- O Lovable Cloud foi conectado nesta etapa. A consulta ao banco confirmou que não existem tabelas públicas do planejador para reutilizar.
- Os oito testes existentes passaram: sete regras do planejador e uma verificação da página inicial.
- Os formulários e algumas ações mostram sucesso imediatamente; precisam aguardar a gravação remota.
- Os identificadores atuais não são UUIDs. A migração precisa preservar as referências entre registros.
- Perfil confirmado: nome e avatar. A identidade visual atual será preservada.

## O que será implementado
1. **Acesso individual:** cadastro e login por e-mail/senha, confirmação de e-mail conforme a configuração existente, recuperação/redefinição de senha, restauração da sessão e logout com limpeza de dados em memória.
2. **Perfil:** nome e foto, com criação automática de perfil e armazenamento protegido da foto.
3. **Persistência:** matérias, tarefas e seus links, conclusões, pendências, metas, sessões, notificações e configurações associados exclusivamente à conta autenticada.
4. **Importação local:** detectar dados antigos no navegador, mostrar uma confirmação explícita e importar somente para a conta que confirmou. Manter os originais, preservar referências, evitar duplicações e permitir nova tentativa com resultado detalhado.
5. **Documentação:** criar os cinco documentos solicitados em `docs/`, atualizar `AGENTS.md` e registrar diferenças entre alterações propostas, executadas e verificadas.
6. **Validação:** executar testes existentes e novos, verificar os fluxos pela aplicação e testar isolamento com duas contas. Registrar como não verificado qualquer fluxo que depender de um link de e-mail ou configuração indisponível.

## Comportamentos preservados
- Semana de segunda-feira a domingo, cálculos atuais e progresso derivado dos registros.
- Histórico de conclusões, arquivamento/restauração de matérias e pausa das metas relacionadas.
- Metas encerradas mantêm seu progresso final; edição ou exclusão de registros não reescreve esse histórico.
- Temporizador, sessões, indicadores, exportações e notificações atuais.
- Não haverá importação automática entre contas, exclusão dos dados locais nem alteração silenciosa da confirmação de e-mail.

## Detalhes técnicos
- Manter TanStack Start/Router e o contrato do `PlannerProvider`, convertendo gravações em operações assíncronas confirmadas antes de exibir sucesso.
- Separar as páginas públicas de acesso das páginas privadas sob o layout autenticado; manter os endereços atuais do planejador sem duplicar a rota `/`.
- Criar migrações SQL versionadas com privilégios explícitos, RLS e integridade de propriedade nos relacionamentos. Usar o cliente autenticado nas operações comuns, sem privilégios administrativos no navegador.
- Preservar identificadores legados com um mapeamento estável e documentado durante a importação; não apagar conclusões órfãs que a lógica atual conserva.
- Aplicar alterações compostas de forma transacional quando necessário, para não gravar tarefa sem seu histórico ou encerrar meta sem sua notificação.
- Evitar sobrescritas entre dispositivos: gravar mudanças por registro, detectar conflitos e recarregar dados ao retomar a aplicação.
- Atualizar os tipos gerados após cada alteração de esquema e manter os segredos fora de arquivos públicos e documentação.

## Critérios de conclusão
- Uma gravação malsucedida não será apresentada como concluída.
- Atualizar a página ou entrar novamente recuperará os dados da conta, nunca de outra pessoa.
- As políticas serão verificadas contra leitura, alteração, exclusão e associação indevida entre duas contas.
- A documentação identificará resultados observados, limitações, ações externas necessárias e a próxima tarefa de continuidade.