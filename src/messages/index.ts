/**
 * Catálogo centralizado de mensagens do BR-OpenSpec em Português Brasileiro.
 *
 * Este módulo reúne todas as mensagens exibidas ao usuário para facilitar
 * manutenção, revisão e consistência linguística.
 */

// ═══════════════════════════════════════════════════════════
// CLI — Descrições de comandos (src/cli/index.ts)
// ═══════════════════════════════════════════════════════════

export const CLI_DESCRIPTIONS = {
  root: 'Sistema de desenvolvimento orientado a especificações com IA',
  init: 'Inicializa o BR-OpenSpec no seu projeto',
  experimental: 'Alias para init (descontinuado)',
  update: 'Atualiza os arquivos de instruções do BR-OpenSpec',
  list: 'Lista itens (alterações por padrão). Use --specs para listar especificações.',
  view: 'Exibe um painel interativo de especificações e alterações',
  change: 'Gerencia propostas de alteração do BR-OpenSpec',
  changeShow: 'Exibe uma proposta de alteração em JSON ou markdown',
  changeList: 'Lista todas as alterações ativas (DESCONTINUADO: use "openspec list")',
  changeValidate: 'Valida uma proposta de alteração',
  archive: 'Arquiva uma alteração concluída e atualiza as especificações principais',
  spec: 'Gerencia e visualiza especificações do BR-OpenSpec',
  specShow: 'Exibe uma especificação específica',
  specList: 'Lista todas as especificações disponíveis',
  specValidate: 'Valida a estrutura de uma especificação',
  validate: 'Valida alterações e especificações',
  show: 'Exibe uma alteração ou especificação',
  feedback: 'Envia feedback sobre o BR-OpenSpec',
  completion: 'Gerencia autocomplete do shell para a CLI do BR-OpenSpec',
  completionGenerate: 'Gera script de autocomplete para um shell (saída no stdout)',
  completionInstall: 'Instala script de autocomplete para um shell',
  completionUninstall: 'Remove script de autocomplete de um shell',
  __complete: 'Saída de dados de autocomplete em formato legível por máquinas (uso interno)',
  status: 'Exibe o status de conclusão dos artefatos de uma alteração',
  instructions: 'Exibe instruções enriquecidas para criar um artefato ou aplicar tarefas',
  templates: 'Mostra os caminhos dos templates resolvidos para todos os artefatos de um esquema',
  schemas: 'Lista os esquemas de fluxo de trabalho disponíveis com descrições',
  new: 'Cria novos itens',
  newChange: 'Cria um novo diretório de alteração',
  // Opções globais
  noColor: 'Desativa cores na saída',
  tools: 'Configura ferramentas de IA não interativamente. Use "all", "none" ou uma lista separada por vírgula',
  force: 'Limpa arquivos legados automaticamente sem perguntar',
  profile: 'Sobrescreve o perfil da configuração global (core ou custom)',
};

export const CLI_MESSAGES = {
  unknownError: 'Erro desconhecido',
  notADirectory: (path: string) => `O caminho "${path}" não é um diretório`,
  directoryWillBeCreated: (path: string) => `O diretório "${path}" não existe, ele será criado.`,
  cannotAccessPath: (path: string, err: string) => `Não foi possível acessar o caminho "${path}": ${err}`,
  experimentalDeprecated: 'Nota: "openspec experimental" está descontinuado. Use "openspec init" em vez disso.',
  error: (err: string) => `Erro: ${err}`,
  // Avisos de comandos descontinuados
  changeCommandsDeprecated: 'Aviso: Os comandos "openspec change ..." estão descontinuados. Prefira comandos iniciados por verbo (ex: "openspec list", "openspec validate --changes").',
  specCommandsDeprecated: 'Aviso: Os comandos "openspec spec ..." estão descontinuados. Prefira comandos iniciados por verbo (ex: "openspec show", "openspec validate --specs").',
  changeListDeprecated: 'Aviso: "openspec change list" está descontinuado. Use "openspec list".',
  projectLocalNotImplemented: 'Erro: Configuração local de projeto ainda não implementada',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Alteração (src/commands/change.ts)
// ═══════════════════════════════════════════════════════════

export const CHANGE_MESSAGES = {
  selectChangeToShow: 'Selecione uma alteração para exibir',
  noChangeSpecifiedNoActive: 'Nenhuma alteração especificada. Nenhuma alteração ativa encontrada.',
  noChangeSpecifiedAvailable: (ids: string) => `Nenhuma alteração especificada. IDs disponíveis: ${ids}`,
  hintViewChanges: 'Dica: use "openspec change list" para ver as alterações disponíveis.',
  changeNotFound: (name: string, path: string) => `Alteração "${name}" não encontrada em ${path}`,
  requirementsOnlyDeprecated: 'A flag --requirements-only está descontinuada; use --deltas-only em vez disso.',
  noItemsFound: 'Nenhum item encontrado.',
  selectChangeToValidate: 'Selecione uma alteração para validar',
  changeIsValid: (name: string) => `Alteração "${name}" é válida`,
  changeHasIssues: (name: string) => `Alteração "${name}" tem problemas`,
  nextSteps: 'Próximos passos:',
  ensureDeltasInSpecs: 'Certifique-se de que a alteração tenha deltas em specs/: use os cabeçalhos ## ADDED/MODIFIED/REMOVED/RENAMED Requirements',
  eachRequirementNeedsScenario: 'Cada requisito DEVE incluir pelo menos um bloco #### Scenario:',
  debugParsedDeltas: 'Depure os deltas analisados: openspec change show <id> --json --deltas-only',
  unableToRead: '(não foi possível ler)',
  tasks: (completed: number, total: number) => `[tarefas ${completed}/${total}]`,
  deltas: (count: number) => `[deltas ${count}]`,
};

// ═══════════════════════════════════════════════════════════
// Comandos — Especificação (src/commands/spec.ts)
// ═══════════════════════════════════════════════════════════

export const SPEC_MESSAGES = {
  selectSpecToShow: 'Selecione uma especificação para exibir',
  missingSpecId: 'Argumento obrigatório <spec-id> ausente',
  specNotFound: (id: string) => `Especificação '${id}' não encontrada em openspec/specs/${id}/spec.md`,
  requirementsAndRequirementConflict: 'As opções --requirements e --requirement não podem ser usadas juntas',
  requirementNotFound: (id: string) => `Requisito ${id} não encontrado`,
  specIsValid: (id: string) => `Especificação '${id}' é válida`,
  specHasIssues: (id: string) => `Especificação '${id}' tem problemas`,
  noItemsFound: 'Nenhum item encontrado.',
  requirementCount: (count: number) => `[requisitos ${count}]`,
  selectSpecToValidate: 'Selecione uma especificação para validar',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Exibir (src/commands/show.ts)
// ═══════════════════════════════════════════════════════════

export const SHOW_MESSAGES = {
  whatToShow: 'O que você gostaria de exibir?',
  optionChange: 'Alteração',
  optionSpec: 'Especificação',
  noChangesFound: 'Nenhuma alteração encontrada.',
  noSpecsFound: 'Nenhuma especificação encontrada.',
  pickChange: 'Escolha uma alteração',
  pickSpec: 'Escolha uma especificação',
  nothingToShow: 'Nada para exibir. Tente um dos seguintes:',
  showItemHint: '  openspec show <item>',
  showChangeHint: '  openspec change show',
  showSpecHint: '  openspec spec show',
  runInteractiveHint: 'Ou execute em um terminal interativo.',
  unknownItem: (name: string) => `Item desconhecido '${name}'`,
  didYouMean: (suggestions: string) => `Você quis dizer: ${suggestions}?`,
  ambiguousItem: (name: string) => `Item '${name}' é ambíguo e corresponde tanto a uma alteração quanto a uma especificação.`,
  passTypeHint: 'Passe --type change|spec, ou use: openspec change show / openspec spec show',
  ignoringFlags: (type: string, flags: string) => `Aviso: Ignorando flags que não se aplicam a ${type}: ${flags}`,
};

// ═══════════════════════════════════════════════════════════
// Comandos — Validar (src/commands/validate.ts)
// ═══════════════════════════════════════════════════════════

export const VALIDATE_MESSAGES = {
  whatToValidate: 'O que você gostaria de validar?',
  optionAll: 'Tudo (alterações + especificações)',
  optionAllChanges: 'Todas as alterações',
  optionAllSpecs: 'Todas as especificações',
  optionPickOne: 'Escolher uma alteração ou especificação específica',
  pickAnItem: 'Escolha um item',
  noItemsToValidate: 'Nenhum item encontrado para validar.',
  nothingToValidate: 'Nada para validar. Tente um dos seguintes:',
  validateAllHint: '  openspec validate --all',
  validateChangesHint: '  openspec validate --changes',
  validateSpecsHint: '  openspec validate --specs',
  validateItemHint: '  openspec validate <nome-do-item>',
  runInteractiveHint: 'Ou execute em um terminal interativo.',
  unknownItem: (name: string) => `Item desconhecido '${name}'`,
  didYouMean: (suggestions: string) => `Você quis dizer: ${suggestions}?`,
  ambiguousItem: (name: string) => `Item '${name}' é ambíguo e corresponde tanto a uma alteração quanto a uma especificação.`,
  passTypeHint: 'Passe --type change|spec, ou use: openspec change validate / openspec spec validate',
  changeIsValid: (id: string) => `Alteração '${id}' é válida`,
  specIsValid: (id: string) => `Especificação '${id}' é válida`,
  changeHasIssues: (id: string) => `Alteração '${id}' tem problemas`,
  specHasIssues: (id: string) => `Especificação '${id}' tem problemas`,
  nextStepsChange: 'Próximos passos:',
  ensureDeltasInSpecs: 'Certifique-se de que a alteração tenha deltas em specs/: use os cabeçalhos ## ADDED/MODIFIED/REMOVED/RENAMED Requirements',
  eachRequirementNeedsScenario: 'Cada requisito DEVE incluir pelo menos um bloco #### Scenario:',
  debugParsedDeltas: 'Depure os deltas analisados: openspec change show <id> --json --deltas-only',
  nextStepsSpec: 'Próximos passos:',
  ensurePurposeAndRequirements: 'Certifique-se de que a especificação inclua as seções ## Purpose e ## Requirements',
  requirementScenarioBullet: '- Cada requisito DEVE incluir pelo menos um bloco #### Scenario:',
  rerunWithJson: 'Execute novamente com --json para ver o relatório estruturado',
  validating: 'Validando...',
  validatingProgress: (current: number, total: number) => `Validando (${current}/${total})...`,
  noItemsFoundToValidate: 'Nenhum item encontrado para validar.',
  totals: (passed: number, failed: number, total: number) => `Totais: ${passed} aprovado(s), ${failed} reprovado(s) (${total} itens)`,
  passed: 'aprovado',
  failed: 'reprovado',
};

// ═══════════════════════════════════════════════════════════
// Core — Listar (src/core/list.ts)
// ═══════════════════════════════════════════════════════════

export const LIST_MESSAGES = {
  noChangesDir: "Diretório de alterações do BR-OpenSpec não encontrado. Execute 'openspec init' primeiro.",
  noActiveChanges: 'Nenhuma alteração ativa encontrada.',
  noSpecsFound: 'Nenhuma especificação encontrada.',
  changesHeader: 'Alterações:',
  specsHeader: 'Especificações:',
  relativeTime: {
    justNow: 'agora mesmo',
    minutesAgo: (m: number) => `${m}min atrás`,
    hoursAgo: (h: number) => `${h}h atrás`,
    daysAgo: (d: number) => `${d}d atrás`,
  },
  requirements: (count: number) => `requisitos ${count}`,
  statusLabels: {
    noTasks: 'sem-tarefas',
    complete: 'concluído',
    inProgress: 'em-andamento',
  },
};

// ═══════════════════════════════════════════════════════════
// Core — Visualizar (src/core/view.ts)
// ═══════════════════════════════════════════════════════════

export const VIEW_MESSAGES = {
  noOpenspecDir: 'Diretório openspec não encontrado',
  dashboardTitle: 'Painel BR-OpenSpec',
  draftChanges: 'Alterações em Rascunho',
  activeChanges: 'Alterações Ativas',
  completedChanges: 'Alterações Concluídas',
  specifications: 'Especificações',
  summary: 'Resumo:',
  specsSummary: (totalSpecs: number, totalRequirements: number) => `Especificações: ${totalSpecs} specs, ${totalRequirements} requisitos`,
  draftChangesCount: (count: number) => `Alterações em Rascunho: ${count}`,
  activeChangesCount: (count: number) => `Alterações Ativas: ${count} em andamento`,
  completedChangesCount: (count: number) => `Alterações Concluídas: ${count}`,
  taskProgress: (completed: number, total: number, percentage: number) => `Progresso de Tarefas: ${completed}/${total} (${percentage}% concluído)`,
  requirementLabel: (count: number) => count === 1 ? 'requisito' : 'requisitos',
  listHint: (cmd: string) => `Use ${cmd} para visualizações detalhadas`,
};

// ═══════════════════════════════════════════════════════════
// Core — Arquivar (src/core/archive.ts)
// ═══════════════════════════════════════════════════════════

export const ARCHIVE_MESSAGES = {
  noChangesDir: "Diretório de alterações do BR-OpenSpec não encontrado. Execute 'openspec init' primeiro.",
  changeNotFound: (name: string) => `Alteração '${name}' não encontrada.`,
  noChangeSelected: 'Nenhuma alteração selecionada. Cancelando.',
  noActiveChanges: 'Nenhuma alteração ativa encontrada.',
  selectChangeToArchive: 'Selecione uma alteração para arquivar',
  proposalWarnings: 'Avisos na proposta proposal.md (não bloqueante):',
  validationErrorsInDeltas: 'Erros de validação nos deltas da alteração:',
  validationFailed: 'Validação falhou. Corrija os erros antes de arquivar.',
  skipValidationHint: 'Para pular a validação (não recomendado), use a flag --no-validate.',
  skipValidationWarning: 'Aviso: Pular a validação pode arquivar especificações inválidas. Continuar? (s/N)',
  archiveCancelled: 'Arquivamento cancelado.',
  skipValidationLog: (timestamp: string, name: string) => `[${timestamp}] Validação ignorada para a alteração: ${name}`,
  affectedFiles: (path: string) => `Arquivos afetados: ${path}`,
  skipValidationFlagWarning: 'Aviso: Pular a validação pode arquivar especificações inválidas.',
  taskStatus: (status: string) => `Status das tarefas: ${status}`,
  incompleteTasksWarning: (count: number) => `Aviso: ${count} tarefa(s) incompleta(s) encontrada(s). Continuar?`,
  incompleteTasksContinuing: (count: number) => `Aviso: ${count} tarefa(s) incompleta(s) encontrada(s). Continuando devido à flag --yes.`,
  skipSpecUpdates: 'Ignorando atualizações de especificação (flag --skip-specs fornecida).',
  specsToUpdate: 'Especificações para atualizar:',
  specUpdateStatus: (capability: string, status: string) => `  ${capability}: ${status}`,
  proceedWithSpecUpdates: 'Prosseguir com as atualizações de especificação?',
  skipSpecUpdatesProceeding: 'Ignorando atualizações de especificação. Prosseguindo com o arquivamento.',
  validationErrorsInRebuiltSpec: (name: string) => `Erros de validação na especificação reconstruída para ${name} (as alterações não serão escritas):`,
  abortedNoChanges: 'Abortado. Nenhum arquivo foi alterado.',
  totals: (added: number, modified: number, removed: number, renamed: number) =>
    `Totais: + ${added}, ~ ${modified}, - ${removed}, → ${renamed}`,
  specsUpdatedSuccessfully: 'Especificações atualizadas com sucesso.',
  archiveAlreadyExists: (name: string) => `O arquivamento '${name}' já existe.`,
  changeArchived: (changeName: string, archiveName: string) => `Alteração '${changeName}' arquivada como '${archiveName}'.`,
};

// ═══════════════════════════════════════════════════════════
// Core — Inicializar (src/core/init.ts)
// ═══════════════════════════════════════════════════════════

export const INIT_MESSAGES = {
  welcomeTitle: 'Bem-vindo ao BR-OpenSpec',
  welcomeSubtitle: 'Um framework leve orientado a especificações',
  setupWillConfigure: 'Esta configuração irá configurar:',
  agentSkills: '  • Agent Skills para ferramentas de IA',
  slashCommands: '  • Comandos /opsx:*',
  quickStart: 'Início rápido após a configuração:',
  cmdNewChange: 'Criar uma alteração',
  cmdContinue: 'Próximo artefato',
  cmdApply: 'Implementar tarefas',
  pressEnter: 'Pressione Enter para selecionar ferramentas...',
  insufficientPermissions: (path: string) => `Permissões insuficientes para escrever em ${path}`,
  invalidProfile: (profile: string) => `Perfil inválido "${profile}". Perfis disponíveis: core, custom`,
  upgradeLegacyPrompt: 'Atualizar e limpar arquivos legados?',
  initializationCancelled: 'Inicialização cancelada.',
  skipPromptHint: 'Execute com --force para pular esta pergunta, ou remova manualmente os arquivos legados.',
  cleaningLegacy: 'Limpando arquivos legados...',
  legacyCleaned: 'Arquivos legados limpos',
  noToolsDetected: (tools: string) => `Nenhuma ferramenta detectada e nenhuma flag --tools fornecida. Ferramentas válidas:\n  ${tools}\n\nUse --tools all, --tools none, ou --tools claude,cursor,...`,
  noToolsAvailable: 'Nenhuma ferramenta disponível para geração de skills.',
  selectToolsPrompt: (count: number) => `Selecione as ferramentas para configurar (${count} disponíveis)`,
  selectAtLeastOneTool: 'Selecione pelo menos uma ferramenta',
  atLeastOneToolRequired: 'Pelo menos uma ferramenta deve ser selecionada',
  toolsOptionRequired: 'A opção --tools requer um valor. Use "all", "none", ou uma lista de IDs separada por vírgula.',
  toolsOptionRequiresToolId: 'A opção --tools requer pelo menos um ID de ferramenta quando não usar "all" ou "none".',
  cannotCombineReservedValues: 'Não é possível combinar valores reservados "all" ou "none" com IDs de ferramentas específicos.',
  invalidTools: (invalid: string, available: string) => `Ferramenta(s) inválida(s): ${invalid}. Valores disponíveis: ${available}`,
  unknownTool: (toolId: string, validTools: string) => `Ferramenta desconhecida '${toolId}'. Ferramentas válidas:\n  ${validTools}`,
  toolNoSkillSupport: (toolId: string, validTools: string) => `Ferramenta '${toolId}' não suporta geração de skills.\nFerramentas com suporte a geração de skills:\n  ${validTools}`,
  creatingStructure: 'Criando estrutura do BR-OpenSpec...',
  structureCreated: 'Estrutura do BR-OpenSpec criada',
  settingUp: (name: string) => `Configurando ${name}...`,
  setupComplete: (name: string) => `Configuração concluída para ${name}`,
  setupFailed: (name: string) => `Falha na configuração de ${name}`,
  setupCompleteTitle: 'Configuração do BR-OpenSpec Concluída',
  created: (names: string) => `Criados: ${names}`,
  refreshed: (names: string) => `Atualizados: ${names}`,
  failed: (errors: string) => `Falhas: ${errors}`,
  commandsSkipped: (tools: string) => `Comandos ignorados para: ${tools} (sem adaptador)`,
  removedCommands: (count: number) => `Removidos: ${count} arquivos de comando (entrega: skills)`,
  removedSkills: (count: number) => `Removidos: ${count} diretórios de skill (entrega: commands)`,
  configCreated: (schema: string) => `Config: openspec/config.yaml (schema: ${schema})`,
  configExists: (name: string) => `Config: openspec/${name} (existe)`,
  configSkipped: 'Config: ignorado (modo não interativo)',
  gettingStarted: 'Início rápido:',
  startFirstChangePropose: (cmd: string) => `Inicie sua primeira alteração: ${cmd}`,
  startFirstChangeNew: (cmd: string) => `Inicie sua primeira alteração: ${cmd}`,
  configureWorkflowsHint: "Execute 'openspec config profile' para configurar seus fluxos de trabalho.",
  learnMore: (url: string) => `Saiba mais: ${url}`,
  feedback: (url: string) => `Feedback:   ${url}`,
  restartIDE: 'Reinicie sua IDE para que os comandos de barra tenham efeito.',
  configuredPreselected: (names: string) => `BR-OpenSpec configurado: ${names} (pré-selecionado)`,
  detectedToolsLabel: (names: string, label: string) => `Diretórios de ferramentas detectados: ${names} (${label})`,
  preselectedFirstTime: 'pré-selecionado para configuração inicial',
  notPreselected: 'não pré-selecionado',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Ferramentas (src/commands/tools.ts)
// ═══════════════════════════════════════════════════════════

export const TOOLS_MESSAGES = {
  notInitialized: 'Este projeto não foi inicializado com o BR-OpenSpec.\n  Execute `openspec init` primeiro.',
  noToolsToAdd: 'Nenhuma ferramenta especificada para adicionar.',
  noToolsToRemove: 'Nenhuma ferramenta especificada para remover.',
  adding: (name: string) => `Adicionando ${name}...`,
  added: (name: string) => `Adicionado ${name}`,
  failedToAdd: (name: string) => `Falha ao adicionar ${name}`,
  addedList: (names: string) => `Adicionados: ${names}`,
  failedList: (items: string) => `Falhas: ${items}`,
  restartIDE: 'Reinicie sua IDE para que os comandos de barra tenham efeito.',
  removing: (name: string) => `Removendo ${name}...`,
  removed: (name: string) => `Removido ${name}`,
  failedToRemove: (name: string) => `Falha ao remover ${name}`,
  removedList: (names: string) => `Removidos: ${names}`,
  removedCounts: (skills: number, commands: number) => `  ${skills} diretório(s) de skill e ${commands} arquivo(s) de comando removidos`,
  currentlyConfigured: (names: string) => `Configurados atualmente: ${names}`,
  noToolsConfigured: 'Nenhuma ferramenta configurada atualmente.',
  selectToolsToConfigure: (count: number) => `Selecione as ferramentas para configurar (${count} disponíveis)`,
  noChanges: 'Nenhuma alteração.',
  description: 'Adiciona ou remove configurações de IDE/Agente de Código. Exibe uma lista de verificação interativa quando nenhuma flag é fornecida.',
  addOption: 'Adiciona ferramentas (IDs separados por vírgula ou "all")',
  removeOption: 'Remove ferramentas (IDs separados por vírgula ou "all")',
  cannotAddAndRemoveSame: (tools: string) => `Não é possível adicionar e remover as mesmas ferramentas: ${tools}`,
  noFlagNonInteractive: 'Nenhuma flag --add ou --remove foi fornecida e o terminal não é interativo.\n  Use --add <ferramentas> ou --remove <ferramentas> para operar não interativamente.',
  cannotCombineReserved: 'Não é possível combinar valores reservados "all" ou "none" com IDs de ferramentas específicos.',
  invalidTools: (invalid: string, available: string) => `Ferramenta(s) inválida(s): ${invalid}. Disponíveis: ${available}`,
};

// ═══════════════════════════════════════════════════════════
// Comandos — Configuração (src/commands/config.ts)
// ═══════════════════════════════════════════════════════════

export const CONFIG_MESSAGES = {
  viewAndModify: 'Visualiza e modifica a configuração global do BR-OpenSpec',
  showLocation: 'Mostra o caminho do arquivo de configuração',
  showAllSettings: 'Mostra todas as configurações atuais',
  getValue: 'Obtém um valor específico (raw, scriptável)',
  setValue: 'Define um valor (coerção de tipos automática)',
  removeKey: 'Remove uma chave (reverte para o padrão)',
  resetConfig: 'Restaura a configuração para os padrões',
  openInEditor: 'Abre a configuração no $EDITOR',
  configureProfile: 'Configura o perfil do fluxo de trabalho (seletor interativo ou atalho de preset)',
  schemaDescription: 'Descrição do esquema:',
  selectArtifacts: 'Selecione os artefatos para incluir:',
  setAsDefaultSchema: 'Definir como esquema padrão do projeto?',
  resetConfirm: 'Restaurar todas as configurações para os padrões?',
  whatToConfigure: 'O que você deseja configurar?',
  deliveryMode: 'Modo de entrega (como os fluxos de trabalho são instalados):',
  selectWorkflows: 'Selecione os fluxos de trabalho a tornar disponíveis:',
  applyChangesNow: 'Aplicar alterações a este projeto agora?',
  profileSettings: 'Configurações de perfil:',
  invalidConfigKey: (key: string, reason: string) => `Chave de configuração inválida "${key}".${reason}`,
  useConfigList: 'Use "openspec config list" para ver as chaves disponíveis.',
  passAllowUnknown: 'Passe --allow-unknown para ignorar esta verificação.',
  invalidConfiguration: (error: string) => `Configuração inválida - ${error}`,
  setKeyValue: (key: string, value: string) => `Definido ${key} = ${value}`,
  unsetKey: (key: string) => `Removido ${key} (revertido para o padrão)`,
  keyNotSet: (key: string) => `Chave "${key}" não estava definida`,
  resetAllRequired: 'Erro: A flag --all é obrigatória para reset',
  resetUsage: 'Uso: openspec config reset --all [-y]',
  resetCancelled: 'Reset cancelado.',
  configurationReset: 'Configuração restaurada para os padrões',
  noEditorConfigured: 'Erro: Nenhum editor configurado',
  setEditorEnv: 'Defina a variável de ambiente EDITOR ou VISUAL para o seu editor preferido',
  editorExample: 'Exemplo: export EDITOR=vim',
  configFileNotFound: (path: string) => `Erro: Arquivo de configuração não encontrado em ${path}`,
  invalidJson: (path: string) => `Erro: JSON inválido em ${path}`,
  unableToValidateConfig: (error: string) => `Erro: Não foi possível validar a configuração - ${error}`,
  configUpdated: 'Configuração atualizada. Execute `openspec update` nos seus projetos para aplicar.',
  unknownProfilePreset: (preset: string) => `Erro: Preset de perfil desconhecido "${preset}". Presets disponíveis: core`,
  interactiveModeRequired: 'Modo interativo necessário. Use `openspec config profile core` ou defina a configuração via ambiente/flags.',
  currentProfileSettings: 'Configurações atuais do perfil',
  profileLabel: (profile: string | undefined, source: string) => `  perfil: ${profile ?? '?'} ${source}`,
  deliveryLabel: (delivery: string | undefined, source?: string) => source ? `  entrega: ${delivery ?? '?'} ${source}` : `  Entrega: ${delivery ?? '?'}`,
  workflowsLabel: (summary: string) => `  Fluxos de trabalho: ${summary}`,
  coreWorkflowsNote: (workflows: string) => `  fluxos: ${workflows} (do perfil core)`,
  explicitWorkflowsNote: (workflows: string) => `  fluxos: ${workflows} (explícito)`,
  noWorkflowsNote: '  fluxos: (nenhum)',
  deliveryHelp: '  Entrega = onde os fluxos de trabalho são instalados (skills, commands, ou both)',
  workflowsHelp: '  Fluxos de trabalho = quais ações estão disponíveis (propose, explore, apply, etc.)',
  deliveryAndWorkflows: 'Entrega e fluxos de trabalho',
  deliveryAndWorkflowsDesc: 'Atualiza modo de instalação e ações disponíveis juntos',
  deliveryOnly: 'Apenas entrega',
  deliveryOnlyDesc: 'Altera onde os fluxos de trabalho são instalados',
  workflowsOnly: 'Apenas fluxos de trabalho',
  workflowsOnlyDesc: 'Altera quais ações de fluxo de trabalho estão disponíveis',
  keepCurrentSettings: 'Manter configurações atuais (sair)',
  keepCurrentSettingsDesc: 'Sair sem alterar a configuração',
  noConfigChanges: 'Nenhuma alteração na configuração.',
  warningGlobalConfigNotApplied: 'Aviso: A configuração global não foi aplicada a este projeto. Execute `openspec update` para sincronizar.',
  bothSkillsAndCommands: 'Ambos (skills + commands)',
  bothSkillsAndCommandsDesc: 'Instala fluxos de trabalho como skills e comandos de barra',
  skillsOnly: 'Apenas skills',
  skillsOnlyDesc: 'Instala fluxos de trabalho apenas como skills',
  commandsOnly: 'Apenas commands',
  commandsOnlyDesc: 'Instala fluxos de trabalho apenas como comandos de barra',
  currentSuffix: ' [atual]',
  configChanges: 'Alterações na configuração:',
  updateFailed: '`openspec update` falhou. Execute-o manualmente para aplicar as alterações do perfil.',
  configProfileCancelled: 'Configuração de perfil cancelada.',
  spaceToToggle: 'Espaço para alternar, Enter para confirmar',
  configScopeOption: 'Escopo da configuração (apenas "global" suportado atualmente)',
  forceStringOption: 'Força o valor a ser armazenado como string',
  allowUnknownOption: 'Permite definir chaves desconhecidas',
  resetAllOption: 'Restaura toda a configuração (obrigatório)',
  skipConfirmationOption: 'Ignora prompts de confirmação',
  outputAsJson: 'Saída como JSON',
  // Workflow names
  workflowProposeName: 'Propor alteração',
  workflowProposeDesc: 'Cria proposta, design e tarefas a partir de uma solicitação',
  workflowExploreName: 'Explorar ideias',
  workflowExploreDesc: 'Investiga um problema antes da implementação',
  workflowNewName: 'Nova alteração',
  workflowNewDesc: 'Cria um scaffold de alteração rapidamente',
  workflowContinueName: 'Continuar alteração',
  workflowContinueDesc: 'Retoma o trabalho em uma alteração existente',
  workflowApplyName: 'Aplicar tarefas',
  workflowApplyDesc: 'Implementa as tarefas da alteração atual',
  workflowFastForwardName: 'Avanço rápido',
  workflowFastForwardDesc: 'Executa um fluxo de implementação mais rápido',
  workflowSyncName: 'Sincronizar specs',
  workflowSyncDesc: 'Sincroniza artefatos da alteração com as especificações',
  workflowArchiveName: 'Arquivar alteração',
  workflowArchiveDesc: 'Finaliza e arquiva uma alteração concluída',
  workflowBulkArchiveName: 'Arquivamento em massa',
  workflowBulkArchiveDesc: 'Arquiva múltiplas alterações concluídas juntas',
  workflowVerifyName: 'Verificar alteração',
  workflowVerifyDesc: 'Executa verificações contra uma alteração',
  workflowOnboardName: 'Onboarding',
  workflowOnboardDesc: 'Fluxo de onboarding guiado para o BR-OpenSpec',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Esquema (src/commands/schema.ts)
// ═══════════════════════════════════════════════════════════

export const SCHEMA_MESSAGES = {
  manageWorkflows: 'Gerencia esquemas de fluxo de trabalho [experimental]',
  showResolve: 'Mostra de onde um esquema é resolvido',
  validateStructure: 'Valida a estrutura de um esquema e seus templates',
  copySchema: 'Copia um esquema existente para o projeto para customização',
  createSchema: 'Cria um novo esquema local para o projeto',
  schemaNotFound: 'schema.yaml não encontrado',
  failedToReadFile: (err: string) => `Falha ao ler o arquivo: ${err}`,
  parseError: (err: string) => `Erro de análise: ${err}`,
  templateNotFound: (template: string, artifact: string) => `Arquivo de template '${template}' não encontrado para o artefato '${artifact}'`,
  noProjectSchemasDir: 'Nenhum diretório de esquemas do projeto encontrado',
  experimentalWarning: 'Nota: Os comandos de esquema são experimentais e podem mudar.',
  listAllSchemasOption: 'Lista todos os esquemas com suas fontes de resolução',
  noSchemasFound: 'Nenhum esquema encontrado.',
  projectSchemasHeader: 'Esquemas do projeto:',
  userSchemasHeader: 'Esquemas do usuário:',
  packageSchemasHeader: 'Esquemas do pacote:',
  shadowsLabel: (sources: string) => ` (shadows: ${sources})`,
  schemaNameRequired: 'Erro: Nome do esquema é obrigatório (ou use --all para listar todos os esquemas)',
  schemaNotFoundError: (name: string) => `Erro: Esquema '${name}' não encontrado`,
  availableSchemas: (schemas: string) => `Esquemas disponíveis: ${schemas}`,
  schemaLabel: (name: string) => `Esquema: ${name}`,
  sourceLabel: (source: string) => `Fonte: ${source}`,
  pathLabel: (path: string) => `Caminho: ${path}`,
  shadowsHeader: 'Shadows:',
  shadowEntry: (source: string, path: string) => `  ${source}: ${path}`,
  verboseOption: 'Mostra etapas detalhadas de validação',
  validatingEntry: (name: string) => `Validando ${name}...`,
  noSchemasInProject: 'Nenhum esquema encontrado no projeto.',
  validationResultsHeader: 'Resultados da Validação:',
  validationStatus: (valid: boolean, name: string) => `  ${valid ? '✓' : '✗'} ${name}`,
  issueLine: (level: string, message: string) => `    ${level}: ${message}`,
  schemaIsValid: (name: string) => `✓ Esquema '${name}' é válido`,
  schemaHasErrors: (name: string) => `✗ Esquema '${name}' tem erros:`,
  forceOption: 'Sobrescreve o destino existente',
  invalidSchemaName: (name: string) => `Nome de esquema inválido '${name}'. Use kebab-case (ex: my-workflow)`,
  schemaNamesKebabCase: 'Nomes de esquema devem ser kebab-case (ex: my-workflow)',
  schemaSourceNotFound: (source: string) => `Esquema '${source}' não encontrado`,
  schemaAlreadyExists: (name: string) => `Esquema '${name}' já existe`,
  suggestionForceOverwrite: 'Use --force para sobrescrever',
  schemaAlreadyExistsAt: (name: string, path: string) => `Erro: Esquema '${name}' já existe em ${path}`,
  removingExistingSchema: (name: string) => `Removendo esquema existente '${name}'...`,
  forkingSchema: (source: string, dest: string) => `Copiando '${source}' para '${dest}'...`,
  forkedSchema: (source: string, dest: string) => `Copiado '${source}' para '${dest}'`,
  sourceLabel2: (path: string, location: string) => `Fonte: ${path} (${location})`,
  destinationLabel: (path: string) => `Destino: ${path}`,
  customizeSchemaAt: 'Agora você pode customizar o esquema em:',
  forkFailed: 'Falha na cópia',
  descriptionOption: 'Descrição do esquema',
  defaultOption: 'Define como esquema padrão do projeto',
  noDefaultOption: 'Não perguntar para definir como padrão',
  forceOption2: 'Sobrescreve o esquema existente',
  suggestionForkOrForce: 'Use --force para sobrescrever ou "openspec schema fork" para copiar',
  atLeastOneArtifact: 'Erro: Pelo menos um artefato deve ser selecionado',
  unknownArtifact: (id: string) => `Artefato desconhecido '${id}'`,
  validArtifacts: (ids: string) => `Artefatos válidos: ${ids}`,
  creatingSchema: (name: string) => `Criando esquema '${name}'...`,
  schemaCreated: (name: string) => `Criado esquema '${name}'`,
  schemaCreatedAt: (path: string) => `Esquema criado em: ${path}`,
  artifactsLabel: (ids: string) => `Artefatos: ${ids}`,
  setAsDefaultSchemaLabel: 'Definido como esquema padrão do projeto.',
  nextStepsHeader: 'Próximos passos:',
  editSchemaYaml: (path: string) => `  1. Edite ${path}/schema.yaml para customizar artefatos`,
  modifyTemplates: '  2. Modifique templates no diretório do esquema',
  useWithSchema: (name: string) => `  3. Use com: openspec new --schema ${name}`,
  creationFailed: 'Falha na criação',
  outputAsJson: 'Saída como JSON',
  checkingSchemaExists: '  Verificando se schema.yaml existe...',
  parsingYaml: '  Analisando YAML...',
  validatingSchemaStructure: '  Validando estrutura do esquema...',
  checkingTemplateFiles: '  Verificando arquivos de template...',
  dependencyGraphPassed: '  Validação do grafo de dependências passou (via parseSchema)',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Completions (src/commands/completion.ts)
// ═══════════════════════════════════════════════════════════

export const COMPLETION_MESSAGES = {
  removeConfigConfirm: (path: string) => `Remover a configuração do BR-OpenSpec de ${path}?`,
  shellNotSupported: (shell: string, supported: string) => `Erro: Shell '${shell}' ainda não é suportado. Suportados atualmente: ${supported}`,
  couldNotDetectShell: 'Erro: Não foi possível detectar o shell automaticamente. Especifique o shell explicitamente.',
  usageCompletion: (operation: string) => `Uso: openspec completion ${operation} [shell]`,
  currentlySupported: (supported: string) => `Suportados atualmente: ${supported}`,
  installingCompletion: (shell: string) => `Instalando script de autocomplete para ${shell}...`,
  installSuccess: (message: string) => `✓ ${message}`,
  installedTo: (path: string) => `  Instalado em: ${path}`,
  backupCreated: (path: string) => `  Backup criado: ${path}`,
  configFileConfigured: (path: string) => `  ${path} configurado automaticamente`,
  restartShell: (cmd: string) => `Reinicie o shell ou execute: ${cmd}`,
  installFailed: (message: string) => `✗ ${message}`,
  failedToInstall: (error: string) => `✗ Falha ao instalar script de autocomplete: ${error}`,
  uninstallCancelled: 'Desinstalação cancelada.',
  uninstallingCompletion: (shell: string) => `Desinstalando script de autocomplete para ${shell}...`,
  uninstallSuccess: (message: string) => `✓ ${message}`,
  uninstallFailed: (message: string) => `✗ ${message}`,
  failedToUninstall: (error: string) => `✗ Falha ao desinstalar script de autocomplete: ${error}`,
  activeChange: 'alteração ativa',
  specification: 'especificação',
  archivedChange: 'alteração arquivada',
  bashCompletionNotDetected: '⚠️  Aviso: pacote bash-completion não detectado',
  bashCompletionRequired: 'O script de autocomplete requer bash-completion para funcionar.',
  installWith: 'Instale-o com:',
  addToBashProfile: 'Depois adicione ao seu ~/.bash_profile:',
  warningSkippingProfile: (path: string, err: string) => `Aviso: Ignorando ${path}: ${err}`,
  warningCouldNotConfigure: (path: string, err: string) => `Aviso: Não foi possível configurar ${path}: ${err}`,
  warningCouldNotRead: (path: string, err: string) => `Aviso: Não foi possível ler ${path}: ${err}`,
  warningStartMarkerWithoutEnd: (path: string) => `Aviso: Marcador de início encontrado mas sem marcador de fim em ${path}`,
  warningCouldNotClean: (path: string, err: string) => `Aviso: Não foi possível limpar ${path}: ${err}`,
};

// ═══════════════════════════════════════════════════════════
// Comandos — Feedback (src/commands/feedback.ts)
// ═══════════════════════════════════════════════════════════

export const FEEDBACK_MESSAGES = {
  submitFeedback: 'Envia feedback sobre o BR-OpenSpec',
  githubCliNotFound: '⚠️  GitHub CLI não encontrado. Submissão manual necessária.',
  githubAuthRequired: '⚠️  Autenticação do GitHub necessária. Submissão manual necessária.',
  formattedFeedbackHeader: '\n--- FEEDBACK FORMATADO ---',
  titleLabel: (title: string) => `Título: ${title}`,
  labelsFeedback: 'Labels: feedback',
  bodyLabel: '\nCorpo:',
  endFeedback: '\n--- FIM DO FEEDBACK ---\n',
  submitManually: 'Por favor, envie seu feedback manualmente:',
  autoSubmitHint: '\nPara envio automático no futuro: gh auth login',
  feedbackSubmitted: '\n✓ Feedback enviado com sucesso!',
  issueUrl: (url: string) => `URL da Issue: ${url}\n`,
  feedbackTitle: (message: string) => `Feedback: ${message}`,
  submittedVia: 'Enviado via BR-OpenSpec CLI',
  versionLabel: (version: string) => `- Versão: ${version}`,
  platformLabel: (platform: string) => `- Plataforma: ${platform}`,
  timestampLabel: (timestamp: string) => `- Timestamp: ${timestamp}`,
};

// ═══════════════════════════════════════════════════════════
// UI / Tela de boas-vindas (src/ui/welcome-screen.ts)
// ═══════════════════════════════════════════════════════════

export const UI_MESSAGES = {
  welcomeTitle: 'Bem-vindo ao BR-OpenSpec',
  welcomeSubtitle: 'Um framework leve orientado a especificações',
  setupWillConfigure: 'Esta configuração irá configurar:',
  agentSkills: '  • Agent Skills para ferramentas de IA',
  slashCommands: '  • Comandos /opsx:*',
  quickStart: 'Início rápido após a configuração:',
  cmdNewChange: 'Criar uma alteração',
  cmdContinue: 'Próximo artefato',
  cmdApply: 'Implementar tarefas',
  pressEnter: 'Pressione Enter para selecionar ferramentas...',
};

// ═══════════════════════════════════════════════════════════
// Prompts — Seleção múltipla com busca (src/prompts/searchable-multi-select.ts)
// ═══════════════════════════════════════════════════════════

export const PROMPT_MESSAGES = {
  invalid: 'Inválido',
  none: '(nenhum)',
  noneSelected: '(nenhum selecionado)',
  selected: 'Selecionados:',
  search: 'Buscar:',
  typeToFilter: 'digite para filtrar',
  navigate: 'navegar',
  toggle: 'alternar',
  remove: 'remover',
  confirm: 'confirmar',
  noMatches: 'Nenhuma correspondência',
  configured: '(configurado)',
  detected: '(detectado)',
  refresh: '(atualizar)',
  selectedLabel: '(selecionado)',
};

// ═══════════════════════════════════════════════════════════
// Utilitários
// ═══════════════════════════════════════════════════════════

export const UTILS_MESSAGES = {
  failedToReadTasks: (path: string, err: unknown) => `Falha ao ler o arquivo de tarefas em ${path}: ${err}`,
};

// ═══════════════════════════════════════════════════════════
// Core — Atualizar (src/core/update.ts)
// ═══════════════════════════════════════════════════════════

export const UPDATE_MESSAGES = {
  noOpenspecDir: "Diretório do BR-OpenSpec não encontrado. Execute 'openspec init' primeiro.",
  noConfiguredTools: 'Nenhuma ferramenta configurada encontrada.',
  runInitHint: 'Execute "openspec init" para configurar ferramentas.',
  forceUpdating: (count: number, tools: string) => `Forçando atualização de ${count} ferramenta(s): ${tools}`,
  updatingTool: (name: string) => `Atualizando ${name}...`,
  updatedTool: (name: string) => `Atualizado ${name}`,
  failedToUpdate: (name: string) => `Falha ao atualizar ${name}`,
  updated: (tools: string, version: string) => `✓ Atualizados: ${tools} (v${version})`,
  failed: (errors: string) => `✗ Falhas: ${errors}`,
  removedCommands: (count: number) => `Removidos: ${count} arquivos de comando (entrega: skills)`,
  removedSkills: (count: number) => `Removidos: ${count} diretórios de skill (entrega: commands)`,
  removedDeselectedCommands: (count: number) => `Removidos: ${count} arquivos de comando (fluxos de trabalho desselecionados)`,
  removedDeselectedSkills: (count: number) => `Removidos: ${count} diretórios de skill (fluxos de trabalho desselecionados)`,
  gettingStarted: 'Início rápido:',
  cmdNew: '  /opsx:new       Iniciar uma nova alteração',
  cmdContinue: '  /opsx:continue  Criar o próximo artefato',
  cmdApply: '  /opsx:apply     Implementar tarefas',
  learnMore: (url: string) => `Saiba mais: ${url}`,
  restartIDE: 'Reinicie sua IDE para que as alterações tenham efeito.',
  allUpToDate: (count: number, version: string) => `✓ Todas as ${count} ferramenta(s) estão atualizadas (v${version})`,
  toolsList: (tools: string) => `  Ferramentas: ${tools}`,
  useForceHint: 'Use --force para atualizar os arquivos mesmo assim.',
  updatingPlan: (count: number, updates: string) => `Atualizando ${count} ferramenta(s): ${updates}`,
  alreadyUpToDate: (tools: string) => `Já atualizadas: ${tools}`,
  detectedNewTools: (noun: string, names: string, pronoun: string) => `Detectadas novas ${noun}: ${names}. Execute 'openspec init' para adicionar ${pronoun}.`,
  toolNoun: 'ferramenta',
  toolsNoun: 'ferramentas',
  it: 'ela',
  them: 'elas',
  extraWorkflowsNote: (count: number) => `Nota: ${count} fluxos de trabalho extras não estão no perfil (use \`openspec config profile\` para gerenciar)`,
  cleaningLegacy: 'Limpando arquivos legados...',
  legacyCleaned: 'Arquivos legados limpos',
  forceLegacyHint: '⚠ Execute com --force para limpar automaticamente arquivos legados, ou execute de forma interativa.',
  upgradeLegacyPrompt: 'Atualizar e limpar arquivos legados?',
  skippingLegacyCleanup: 'Ignorando limpeza de legados. Continuando com a atualização de skills...',
  toolsDetectedFromLegacy: 'Ferramentas detectadas de artefatos legados:',
  setupSkillsFor: (tools: string) => `Configurando skills para: ${tools}`,
  selectToolsNewSkillSystem: 'Selecione as ferramentas para configurar com o novo sistema de skills:',
  skippingToolSetup: 'Ignorando configuração de ferramentas.',
  settingUp: (name: string) => `Configurando ${name}...`,
  setupComplete: (name: string) => `Configuração concluída para ${name}`,
  failedToSetup: (name: string) => `Falha ao configurar ${name}`,
};

// ═══════════════════════════════════════════════════════════
// Utilitários — Progresso de Tarefas (src/utils/task-progress.ts)
// ═══════════════════════════════════════════════════════════

export const TASK_PROGRESS_MESSAGES = {
  noTasks: 'Sem tarefas',
  complete: '✓ Concluído',
  tasksCount: (completed: number, total: number) => `${completed}/${total} tarefas`,
};

// ═══════════════════════════════════════════════════════════
// Utilitários — Sistema de Arquivos (src/utils/file-system.ts)
// ═══════════════════════════════════════════════════════════

export const FILE_SYSTEM_MESSAGES = {
  endMarkerBeforeStart: (filePath: string) => `Estado de marcador inválido em ${filePath}. O marcador final aparece antes do inicial.`,
  invalidMarkerState: (filePath: string, startFound: boolean, endFound: boolean) => `Estado de marcador inválido em ${filePath}. Marcador inicial encontrado: ${startFound}, Marcador final encontrado: ${endFound}`,
  unableToCheckFileExists: (filePath: string, error: string) => `Não foi possível verificar se o arquivo existe em ${filePath}: ${error}`,
  unableToCheckDirExists: (dirPath: string, error: string) => `Não foi possível verificar se o diretório existe em ${dirPath}: ${error}`,
  pathComponentNotDir: (dirPath: string) => `Componente do caminho ${dirPath} existe mas não é um diretório`,
  errorCheckingDir: (dir: string, error: string) => `Erro ao verificar diretório ${dir}: ${error}`,
  unableToDetermineWritePermissions: (filePath: string, error: string) => `Não foi possível determinar permissões de escrita para ${filePath}: ${error}`,
  insufficientPermissions: (dirPath: string, error: string) => `Permissões insuficientes para escrever em ${dirPath}: ${error}`,
  couldNotCleanUpTestFile: (filePath: string, error: string) => `Não foi possível limpar arquivo de teste ${filePath}: ${error}`,
};

// ═══════════════════════════════════════════════════════════
// Core — Validação (src/core/validation/validator.ts)
// ═══════════════════════════════════════════════════════════

export const VALIDATOR_MESSAGES = {
  unknownError: 'Erro desconhecido',
  duplicateRequirementAdded: (name: string) => `Requisito duplicado em ADDED: "${name}"`,
  missingRequirementTextAdded: (name: string) => `ADDED "${name}" está sem texto de requisito`,
  missingShallOrMustAdded: (name: string) => `ADDED "${name}" deve conter SHALL ou MUST`,
  missingScenarioAdded: (name: string) => `ADDED "${name}" deve incluir pelo menos um cenário`,
  duplicateRequirementModified: (name: string) => `Requisito duplicado em MODIFIED: "${name}"`,
  missingRequirementTextModified: (name: string) => `MODIFIED "${name}" está sem texto de requisito`,
  missingShallOrMustModified: (name: string) => `MODIFIED "${name}" deve conter SHALL ou MUST`,
  missingScenarioModified: (name: string) => `MODIFIED "${name}" deve incluir pelo menos um cenário`,
  duplicateRequirementRemoved: (name: string) => `Requisito duplicado em REMOVED: "${name}"`,
  duplicateFromRenamed: (name: string) => `FROM duplicado em RENAMED: "${name}"`,
  duplicateToRenamed: (name: string) => `TO duplicado em RENAMED: "${name}"`,
  requirementInModifiedAndRemoved: (name: string) => `Requisito presente em MODIFIED e REMOVED: "${name}"`,
  requirementInModifiedAndAdded: (name: string) => `Requisito presente em MODIFIED e ADDED: "${name}"`,
  requirementInAddedAndRemoved: (name: string) => `Requisito presente em ADDED e REMOVED: "${name}"`,
  modifiedReferencesOldRenamed: (to: string) => `MODIFIED referencia nome antigo de RENAMED. Use o novo cabeçalho para "${to}"`,
  renamedToCollidesAdded: (to: string) => `RENAMED TO colide com ADDED para "${to}"`,
  deltaSectionsEmpty: (sections: string) => `Seções de delta ${sections} foram encontradas, mas nenhuma entrada de requisito foi analisada. Certifique-se de que cada seção inclua pelo menos um bloco "### Requirement:" (REMOVED pode usar sintaxe de lista com marcadores).`,
  noDeltaSectionsFound: 'Nenhuma seção de delta encontrada. Adicione cabeçalhos como "## ADDED Requirements" ou mova notas que não sejam deltas para fora de specs/.',
};

// ═══════════════════════════════════════════════════════════
// Comandos — Workflow (src/commands/workflow/*.ts)
// ═══════════════════════════════════════════════════════════

export const WORKFLOW_MESSAGES = {
  // instructions.ts
  generatingInstructions: 'Gerando instruções...',
  missingArtifactArgument: (artifacts: string) => `Argumento obrigatório <artifact> ausente. Artefatos válidos:\n  ${artifacts}`,
  artifactNotFound: (artifactId: string, schemaName: string, artifacts: string) => `Artefato '${artifactId}' não encontrado no esquema '${schemaName}'. Artefatos válidos:\n  ${artifacts}`,
  unmetDependenciesWarning: 'Este artefato possui dependências não satisfeitas. Complete-as primeiro ou prossiga com cautela.',
  missingDependencies: (deps: string) => `Pendentes: ${deps}`,
  createArtifactTask: (artifactId: string, changeName: string) => `Crie o artefato ${artifactId} para a alteração "${changeName}".`,
  readFilesForContext: 'Leia estes arquivos para contexto antes de criar este artefato:',
  writeTo: (filePath: string) => `Escreva em: ${filePath}`,
  unlocksArtifacts: (artifacts: string) => `Completar este artefato habilita: ${artifacts}`,
  generatingApplyInstructions: 'Gerando instruções de aplicação...',
  cannotApplyMissingArtifacts: (artifacts: string) => `Não é possível aplicar esta alteração ainda. Artefatos ausentes: ${artifacts}.\nUse a skill openspec-continue-change para criar os artefatos ausentes primeiro.`,
  missingTrackingFile: (filename: string) => `O arquivo ${filename} está ausente e deve ser criado.\nUse openspec-continue-change para gerar o arquivo de rastreamento.`,
  trackingFileNoTasks: (filename: string) => `O arquivo ${filename} existe mas não contém tarefas.\nAdicione tarefas a ${filename} ou regenere-o com openspec-continue-change.`,
  allTasksComplete: 'Todas as tarefas estão concluídas! Esta alteração está pronta para ser arquivada.\nConsidere executar testes e revisar as alterações antes de arquivar.',
  allArtifactsCompleteProceed: 'Todos os artefatos necessários estão completos. Prossiga com a implementação.',
  readContextAndWorkTasks: 'Leia os arquivos de contexto, trabalhe nas tarefas pendentes, marque como concluído conforme avança.\nPare se encontrar bloqueios ou precisar de esclarecimentos.',
  applyTitle: (changeName: string) => `## Aplicar: ${changeName}`,
  schemaLabel: (schemaName: string) => `Esquema: ${schemaName}`,
  blockedTitle: '### ⚠️ Bloqueado',
  missingArtifactsLabel: (artifacts: string) => `Artefatos ausentes: ${artifacts}`,
  createMissingFirst: 'Use a skill openspec-continue-change para criá-los primeiro.',
  contextFilesTitle: '### Arquivos de Contexto',
  progressTitle: '### Progresso',
  progressComplete: (complete: number, total: number) => `${complete}/${total} concluído`,
  progressCompleteWithCheck: (complete: number, total: number) => `${complete}/${total} concluído ✓`,
  tasksTitle: '### Tarefas',
  instructionTitle: '### Instrução',
  // new-change.ts
  missingNameArgument: 'Argumento obrigatório <name> ausente',
  creatingChange: (name: string, schema: string) => `Criando alteração '${name}'${schema}...`,
  createdChange: (name: string, schema: string) => `Alteração '${name}' criada em openspec/changes/${name}/ (esquema: ${schema})`,
  failedToCreateChange: (name: string) => `Falha ao criar alteração '${name}'`,
  // schemas.ts
  availableSchemas: 'Esquemas disponíveis:',
  projectLabel: ' (projeto)',
  userOverrideLabel: ' (substituição de usuário)',
  artifactsLabel: (artifacts: string) => `Artefatos: ${artifacts}`,
  // shared.ts
  noChangesFound: 'Nenhuma alteração encontrada. Crie uma com: openspec new change <nome>',
  missingChangeOption: (available: string) => `Opção obrigatória --change ausente. Alterações disponíveis:\n  ${available}`,
  invalidChangeName: (name: string, error: string) => `Nome de alteração inválido '${name}': ${error}`,
  changeNotFoundNoChanges: (name: string) => `Alteração '${name}' não encontrada. Nenhuma alteração existe. Crie uma com: openspec new change <nome>`,
  changeNotFound: (name: string, available: string) => `Alteração '${name}' não encontrada. Alterações disponíveis:\n  ${available}`,
  schemaNotFound: (name: string, available: string) => `Esquema '${name}' não encontrado. Esquemas disponíveis:\n  ${available}`,
  // status.ts
  loadingChangeStatus: 'Carregando status da alteração...',
  noActiveChanges: 'Nenhuma alteração ativa. Crie uma com: openspec new change <nome>',
  changeLabel: (name: string) => `Alteração: ${name}`,
  schemaLabel2: (name: string) => `Esquema: ${name}`,
  progressArtifacts: (done: number, total: number) => `Progresso: ${done}/${total} artefatos concluídos`,
  allArtifactsComplete: 'Todos os artefatos concluídos!',
  blockedBy: (deps: string) => ` (bloqueado por: ${deps})`,
  // templates.ts
  loadingTemplates: 'Carregando templates...',
  schemaLabel3: (name: string) => `Esquema: ${name}`,
  sourceLabel: (source: string) => `Fonte: ${source}`,
};


// ═══════════════════════════════════════════════════════════
// Core — Migração (src/core/migration.ts)
// ═══════════════════════════════════════════════════════════

export const MIGRATION_MESSAGES = {
  migrated: (count: number) => `Migrado: perfil customizado com ${count} fluxos de trabalho`,
  newInThisVersion: "Novo nesta versão: /opsx:propose. Experimente 'openspec config profile core' para a experiência simplificada.",
};

// ═══════════════════════════════════════════════════════════
// Core — Configuração do Projeto (src/core/project-config.ts)
// ═══════════════════════════════════════════════════════════

export const PROJECT_CONFIG_MESSAGES = {
  invalidSchemaField: "Campo 'schema' inválido na configuração (deve ser uma string não vazia)",
  contextTooLarge: (size: string, limit: string) => `Contexto muito grande (${size}KB, limite: ${limit}KB)`,
  ignoringContextField: 'Ignorando campo de contexto',
  invalidContextField: "Campo 'context' inválido na configuração (deve ser string)",
  emptyRulesForArtifact: (artifactId: string) => `Algumas regras para '${artifactId}' são strings vazias, ignorando-as`,
  rulesMustBeArrayOfStrings: (artifactId: string) => `Regras para '${artifactId}' devem ser um array de strings, ignorando as regras deste artefato`,
  invalidRulesField: "Campo 'rules' inválido na configuração (deve ser um objeto)",
};
