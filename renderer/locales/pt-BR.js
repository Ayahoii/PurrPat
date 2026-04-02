// ══════════════════════════════════════════════════════════════════
// PurrPat — Locale: Português (Brasil)
// ══════════════════════════════════════════════════════════════════
/* global _purrpatLocales */
_purrpatLocales['pt-BR'] = {

  // ── Setup ────────────────────────────────────────────────────────
  'setup.lang_label':      'Idioma:',
  'setup.welcome':         'Bem-vindo ao PurrPat!',
  'setup.subtitle':        'Conecte sua conta da Twitch para começar.',
  'setup.login_twitch':    'Login com a Twitch',
  'setup.waiting_title':   'Aguardando autorização...',
  'setup.waiting_desc':    'O navegador foi aberto. Autorize o PurrPat na Twitch e volte aqui.',
  'setup.cancel':          'Cancelar',

  // ── Tabs ─────────────────────────────────────────────────────────
  'tab.users':             'Usuários',
  'tab.preview':           'Personalizar',
  'tab.settings':          'Configurações',
  'tab.extras':            'Extras',

  // ── Sobre ────────────────────────────────────────────────────────
  'about.tagline':         'Feito com 🐾 por <strong>Ayahoii</strong>',
  'about.desc':            'PurrPat é um bot de pat pat para streamers VTubers no Twitch, integrado com VTube Studio para reações ao vivo.',
  'about.github':          'GitHub',
  'about.twitter':         'X / Twitter',
  'extras.btn.about':      'Sobre',
  'extras.btn.checkupdate': 'Verificar Atualizações',
  'extras.back':           'Voltar',
  'update.checking':       'Verificando atualizações...',
  'update.available':      'Nova versão disponível: v{v}',
  'update.downloading':    'Baixando atualização: {p}%',
  'update.ready':          'Atualização v{v} pronta',
  'update.install':        'Instalar e Reiniciar',

  // ── Personalizar ─────────────────────────────────────────────
  'customize.webitem_note': '⚠️ WebItemActions já abertos no VTube Studio não atualizam em tempo real.',
  'customize.gif_section':  'Pat Pat',
  'customize.scale':        'Escala',
  'customize.fontsize':     'Tamanho da fonte',
  'customize.pos_y':        'Posição vertical (px)',
  'customize.pos_x':        'Posição horizontal (%)',
  'customize.reset':        'Resetar Padrão',
  'customize.save':         'Salvar',
  'customize.saved':        '✓ Salvo!',
  'customize.nickname_section': 'Nickname',
  'customize.glow':         'Brilho',
  'customize.outline':      'Contorno',
  'customize.show_icon':    'Ícone da plataforma',
  'customize.font':         'Fonte',
  'customize.test_color':   'Cor de teste',

  // ── Dashboard ────────────────────────────────────────────────────
  'dashboard.port':         'Porta:',
  'dashboard.last_patpats': 'Últimos Pat Pats',
  'dashboard.empty_feed':   'Nenhum pat pat ainda...',
  'dashboard.console':      'Console',
  'dashboard.console_clear':'Limpar console',

  // ── Botões ───────────────────────────────────────────────────────
  'btn.connect':    'Conectar',
  'btn.disconnect': 'Desconectar',
  'btn.pause':      'Pausar',
  'btn.resume':     'Retomar',
  'btn.refresh':    'Atualizar',
  'btn.import':     '+ Importar',
  'btn.spawn':      'Spawnar',
  'btn.ban':        'Banir',
  'btn.unban':      'Desbanir',
  'btn.remove':     'Remover',
  'btn.save_ok':    '✓ Salvo!',

  // ── Pat Pats ─────────────────────────────────────────────────────
  'patpats.hint':           'Clique no campo de comando para definir qual palavra viewers digitam após <code>!pat</code>.',
  'patpats.loading':        'Carregando...',
  'patpats.empty':          'Nenhum pat pat encontrado.',
  'patpats.cmd_label':      'Comando (!pat):',
  'patpats.cmd_placeholder':'ex: rosa',
  'patpats.cmd_ok':         'OK',

  // ── Usuários ─────────────────────────────────────────────────────
  'users.search':         'Pesquisar usuário...',  'users.web_item_mode':       '🔴 Web Item (VTuber Studio)',
  'users.web_item_experimental': 'Experimental: pode causar perda de desempenho no modelo, principalmente se tiver múltiplos Pat Pats exibidos. Use somente se tiver uma GPU forte suficiente.',
  'users.streamer_hint':       'Clique para revelar',

  'settings.censor_users':      'Censurar aba de Usuários',
  'settings.censor_users_hint': 'Ao abrir a aba de Usuários, a lista fica borrada. Clique na área para revelar.',  'users.col_user':       'Usuário',
  'users.col_color':      'Cor',
  'users.col_patpats':    'Pat Pats',
  'users.col_last_seen':  'Visto por último',
  'users.col_status':     'Status',
  'users.col_actions':    'Ações',
  'users.empty':          'Nenhum usuário registrado.',
  'users.status_active':  'Ativo',
  'users.status_banned':  'Banido',

  // ── Configurações ────────────────────────────────────────────────
  'settings.section_twitch':         'Twitch',
  'settings.spawn_mode':             'Modo de Spawn',
  'settings.spawn_mode_reward':      'Por Resgate (Padrão)',
  'settings.spawn_mode_command':     'Somente por Comando',
  'settings.spawn_mode_hint':        'No modo comando, viewers trocam via !pat usando os comandos da galeria.',
  'settings.require_redeem':         'Exigir um resgate na sessão antes dos comandos',
  'settings.reward_label':           'Resgate Twitch para Pat Pat',
  'settings.reward_hint':            'Selecione um resgate da sua conta sem copiar ID manualmente.',
  'settings.cooldown':               'Cooldown dos avisos (segundos)',
  'settings.section_vtuber':         'VTube Studio',
  'settings.vtuber_enabled':         'Spawn automático no VTube Studio',
  'settings.vtuber_port':            'Porta da API',
  'settings.vtuber_url':             'URL do Web Item (overlay no VTube Studio)',
  'settings.vtuber_expression':      'Expressão / Hotkey ao spawnar',
  'settings.vtuber_expression_help': 'Como criar a expressão no VTube Studio',
  'settings.vtuber_expression_hint': 'Selecione uma expressão cujo tipo contenha <strong>(WebItemAction)</strong>.',
  'settings.section_overlay':        'Web Item (VTuber Studio)',
  'settings.show_messages':          'Exibir mensagem do usuário',
  'settings.show_messages_experimental': 'Experimental: pode causar perda de desempenho no modelo, principalmente se tiver múltiplos Pat Pats exibidos. Use somente se tiver uma GPU forte suficiente.',
  'settings.msg_duration':           'Duração da mensagem (segundos)',
  'settings.overlay_url_label':      'URL do overlay para OBS/VTube Studio:',
  'settings.section_account':        'Conta Twitch',
  'settings.logged_as':              'Logado como:',
  'settings.logout_btn':             'Sair / Trocar conta',
  'settings.save_btn':               'Salvar Configurações',

  // ── Interface ────────────────────────────────────────────────
  'settings.section_interface':      'Interface',
  'settings.lang_label':             'Idioma',
  'settings.lang_hint':              'Escolha o idioma da interface do PurrPat.',

  // ── Dropdowns ────────────────────────────────────────────────────
  'dropdown.loading_rewards':     'Carregando resgates...',
  'dropdown.error_rewards':       'Falha ao carregar resgates',
  'dropdown.select_reward':       'Selecione um resgate...',
  'dropdown.no_expression':       'Nenhuma expressão',
  'dropdown.disabled':            '(desativado)',
  'dropdown.reward_not_found':    'Selecionado anteriormente (não encontrado): {id}',
  'dropdown.expression_not_found':'Selecionada anteriormente (não encontrada): {id}',

  // ── Tutorial ─────────────────────────────────────────────────────
  'tutorial.title':   '🎭 Como criar expressão WebItemAction',
  'tutorial.close':   'Fechar',
  'tutorial.copy_url':'Copiar URL',
  'tutorial.intro':   'Nenhuma expressão do tipo <strong>WebItemAction</strong> foi encontrada no modelo atual. Siga os passos abaixo para criar uma:',
  'tutorial.step1':   'Spawne um <strong>Web Item</strong> no VTube Studio.',
  'tutorial.step2_a': 'Clique na <strong>engrenagem</strong> do Web Item. Em <strong>Initial URL</strong>, coloque a URL do overlay configurada neste app:',
  'tutorial.step2_b': 'Clique em <strong>OK</strong>.',
  'tutorial.step3':   'Vá em <strong>Hotkeys Settings &amp; Expressions</strong>.',
  'tutorial.step4':   'No final da lista de hotkeys, clique em <strong>+</strong>.',
  'tutorial.step5':   'Em <strong>Escolher Ação</strong>, selecione <strong>Trigger Web Item Action</strong>.',
  'tutorial.step6':   'Defina a expressão e escolha <strong>Spawn new</strong>.',
  'tutorial.step7':   'Renomeie a expressão para <strong>PatPat</strong> para facilitar identificação.',
  'tutorial.tip':     '💡 Depois de criar, clique em <strong>Atualizar</strong> na lista de expressões para ela aparecer aqui.',

  // ── Confirm / Prompt ─────────────────────────────────────────────
  'confirm.logout':   'Sair da conta Twitch?',
  'confirm.delete':   'Remover "{name}"?',
  'confirm.remove_user':'Tem certeza que deseja remover o usuário @{username}? Todos os dados e resgates deste usuário serão perdidos permanentemente.',
  'confirm.unsaved_settings': 'Você tem alterações não salvas nas configurações.\n\nDeseja salvar antes de sair?',
  'prompt.ban_reason':'Motivo do banimento de @{username} (opcional):',

  // ── Mensagens de log ─────────────────────────────────────────────
  'log.auth_ok':            '✅ Autenticado como {name}!',
  'log.new_patpat':         '🐾 Novo pat pat: {user}',
  'log.gif_changed':        '🎨 {name} trocou gif para: {gif}',
  'log.url_copied':         'URL copiada para a área de transferência!',
  'log.url_copy_error':     'Erro ao copiar URL',
  'log.settings_saved':     'Configurações salvas.',
  'log.command_updated':    'Comando atualizado: !pat {cmd} → {file}',
  'log.command_removed':    'Comando atualizado: !pat (removido) → {file}',
  'log.no_webitem_action':  'Nenhuma expressão WebItemAction encontrada. Veja o tutorial na seção VTube Studio.',
  'log.vtube_connect_hint': 'conecte no VTube Studio para carregar.',
  'log.spawn_error':        'Erro ao spawnar: {error}',
  'log.delete_error':       'Erro ao remover.',
  'log.user_removed':       '✓ Usuário @{username} removido permanentemente.',
  'log.connect_error':      'Erro: {error}',
  'log.vtuber_error':       'VTube Studio: {error}',
  'log.rewards_warn':       'Rewards: {error}',
  'log.expressions_warn':   'Expressões VTube: {error}',
};



