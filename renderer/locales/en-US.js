// ══════════════════════════════════════════════════════════════════
// PurrPat — Locale: English (US)
// ══════════════════════════════════════════════════════════════════
/* global _purrpatLocales */
_purrpatLocales['en-US'] = {

  // ── Setup ────────────────────────────────────────────────────────
  'setup.lang_label':      'Language:',
  'setup.welcome':         'Welcome to PurrPat!',
  'setup.subtitle':        'Connect your Twitch account to get started.',
  'setup.login_twitch':    'Login with Twitch',
  'setup.waiting_title':   'Waiting for authorization...',
  'setup.waiting_desc':    'The browser was opened. Authorize PurrPat on Twitch and come back here.',
  'setup.cancel':          'Cancel',

  // ── Tabs ─────────────────────────────────────────────────────────
  'tab.users':             'Users',
  'tab.preview':           'Customize',
  'tab.settings':          'Settings',
  'tab.extras':            'Extras',

  // ── About ────────────────────────────────────────────────────────
  'about.tagline':         'Made with 🐾 by <strong>Ayahoii</strong>',
  'about.desc':            'PurrPat is a pat pat bot for VTuber streamers on Twitch, integrated with VTube Studio for live reactions.',
  'about.github':          'GitHub',
  'about.twitter':         'X / Twitter',
  'extras.btn.about':      'About',
  'extras.btn.checkupdate': 'Check for Updates',
  'extras.back':           'Back',
  'update.checking':       'Checking for updates...',
  'update.available':      'New version available: v{v}',
  'update.downloading':    'Downloading update: {p}%',
  'update.ready':          'Update v{v} ready',
  'update.install':        'Install & Restart',

  // ── Customize ──────────────────────────────────────────────────
  'customize.webitem_note': '⚠️ WebItemActions already open in VTube Studio will not update in real time.',
  'customize.gif_section':  'Pat Pat',
  'customize.scale':        'Scale',
  'customize.fontsize':     'Font size',
  'customize.pos_y':        'Vertical position (px)',
  'customize.pos_x':        'Horizontal position (%)',
  'customize.reset':        'Reset Defaults',
  'customize.save':         'Save',
  'customize.saved':        '✓ Saved!',
  'customize.nickname_section': 'Nickname',
  'customize.glow':         'Glow',
  'customize.outline':      'Outline',
  'customize.show_icon':    'Platform icon',
  'customize.font':         'Font',
  'customize.test_color':   'Test color',

  // ── Dashboard ────────────────────────────────────────────────────
  'dashboard.port':         'Port:',
  'dashboard.last_patpats': 'Latest Pat Pats',
  'dashboard.empty_feed':   'No pat pats yet...',
  'dashboard.console':      'Console',
  'dashboard.console_clear':'Clear console',

  // ── Buttons ──────────────────────────────────────────────────────
  'btn.connect':    'Connect',
  'btn.disconnect': 'Disconnect',
  'btn.pause':      'Pause',
  'btn.resume':     'Resume',
  'btn.refresh':    'Refresh',
  'btn.import':     '+ Import',
  'btn.spawn':      'Spawn',
  'btn.ban':        'Ban',
  'btn.unban':      'Unban',
  'btn.remove':     'Remove',
  'btn.save_ok':    '✓ Saved!',

  // ── Pat Pats ─────────────────────────────────────────────────────
  'patpats.hint':           'Click the command field to define what word viewers type after <code>!pat</code>.',
  'patpats.loading':        'Loading...',
  'patpats.empty':          'No pat pats found.',
  'patpats.cmd_label':      'Command (!pat):',
  'patpats.cmd_placeholder':'e.g: pink',
  'patpats.cmd_ok':         'OK',

  // ── Users ────────────────────────────────────────────────────────
  'users.search':         'Search user...',  'users.web_item_mode':       '🔴 Web Item (VTuber Studio)',
  'users.web_item_experimental': 'Experimental: may cause performance loss in the model, especially with multiple Pat Pats displayed. Use only if you have a strong enough GPU.',
  'users.streamer_hint':       'Click to reveal',

  'settings.censor_users':      'Censor Users Tab',
  'settings.censor_users_hint': 'When opening the Users tab, the list will be blurred. Click the area to reveal.',  'users.col_user':       'User',
  'users.col_color':      'Color',
  'users.col_patpats':    'Pat Pats',
  'users.col_last_seen':  'Last seen',
  'users.col_status':     'Status',
  'users.col_actions':    'Actions',
  'users.empty':          'No users registered.',
  'users.status_active':  'Active',
  'users.status_banned':  'Banned',

  // ── Settings ─────────────────────────────────────────────────────
  'settings.section_twitch':         'Twitch',
  'settings.spawn_mode':             'Spawn Mode',
  'settings.spawn_mode_reward':      'By Redemption (Default)',
  'settings.spawn_mode_command':     'Command Only',
  'settings.spawn_mode_hint':        'In command mode, viewers switch via !pat using the gallery commands.',
  'settings.require_redeem':         'Require a redemption in the session before commands',
  'settings.reward_label':           'Twitch Redemption for Pat Pat',
  'settings.reward_hint':            'Select a redemption from your account without manually copying the ID.',
  'settings.cooldown':               'Warning cooldown (seconds)',
  'settings.section_vtuber':         'VTube Studio',
  'settings.vtuber_enabled':         'Auto spawn in VTube Studio',
  'settings.vtuber_port':            'API Port',
  'settings.vtuber_url':             'Web Item URL (overlay in VTube Studio)',
  'settings.vtuber_expression':      'Expression / Hotkey on spawn',
  'settings.vtuber_expression_help': 'How to create the expression in VTube Studio',
  'settings.vtuber_expression_hint': 'Select an expression whose type contains <strong>(WebItemAction)</strong>.',
  'settings.section_overlay':        'Web Item (VTuber Studio)',
  'settings.show_messages':          'Show user message',
  'settings.show_messages_experimental': 'Experimental: may cause performance loss in the model, especially with multiple Pat Pats displayed. Use only if you have a strong enough GPU.',
  'settings.msg_duration':           'Message duration (seconds)',
  'settings.overlay_url_label':      'Overlay URL for OBS/VTube Studio:',
  'settings.section_account':        'Twitch Account',
  'settings.logged_as':              'Logged in as:',
  'settings.logout_btn':             'Sign out / Switch account',
  'settings.save_btn':               'Save Settings',

  // ── Interface ────────────────────────────────────────────────
  'settings.section_interface':      'Interface',
  'settings.lang_label':             'Language',
  'settings.lang_hint':              'Choose the language for PurrPat interface.',

  // ── Dropdowns ────────────────────────────────────────────────────
  'dropdown.loading_rewards':     'Loading redemptions...',
  'dropdown.error_rewards':       'Failed to load redemptions',
  'dropdown.select_reward':       'Select a redemption...',
  'dropdown.no_expression':       'No expression',
  'dropdown.disabled':            '(disabled)',
  'dropdown.reward_not_found':    'Previously selected (not found): {id}',
  'dropdown.expression_not_found':'Previously selected (not found): {id}',

  // ── Tutorial ─────────────────────────────────────────────────────
  'tutorial.title':   '🎭 How to create a WebItemAction expression',
  'tutorial.close':   'Close',
  'tutorial.copy_url':'Copy URL',
  'tutorial.intro':   'No expression of type <strong>WebItemAction</strong> was found in the current model. Follow the steps below to create one:',
  'tutorial.step1':   'Spawn a <strong>Web Item</strong> in VTube Studio.',
  'tutorial.step2_a': 'Click the <strong>gear icon</strong> of the Web Item. In <strong>Initial URL</strong>, paste the overlay URL from this app:',
  'tutorial.step2_b': 'Click <strong>OK</strong>.',
  'tutorial.step3':   'Go to <strong>Hotkeys Settings &amp; Expressions</strong>.',
  'tutorial.step4':   'At the bottom of the hotkey list, click <strong>+</strong>.',
  'tutorial.step5':   'Under <strong>Choose Action</strong>, select <strong>Trigger Web Item Action</strong>.',
  'tutorial.step6':   'Set the expression and choose <strong>Spawn new</strong>.',
  'tutorial.step7':   'Rename the expression to <strong>PatPat</strong> for easy identification.',
  'tutorial.tip':     '💡 After creating, click <strong>Refresh</strong> in the expression list for it to appear here.',

  // ── Confirm / Prompt ─────────────────────────────────────────────
  'confirm.logout':   'Sign out of Twitch?',
  'confirm.delete':   'Remove "{name}"?',
  'confirm.remove_user':'Are you sure you want to remove user @{username}? All data and redemptions for this user will be permanently lost.',
  'confirm.unsaved_settings': 'You have unsaved changes in Settings.\n\nSave before leaving?',
  'prompt.ban_reason':'Ban reason for @{username} (optional):',

  // ── Log messages ─────────────────────────────────────────────────
  'log.auth_ok':            '✅ Authenticated as {name}!',
  'log.new_patpat':         '🐾 New pat pat: {user}',
  'log.gif_changed':        '🎨 {name} changed gif to: {gif}',
  'log.url_copied':         'URL copied to clipboard!',
  'log.url_copy_error':     'Error copying URL',
  'log.settings_saved':     'Settings saved.',
  'log.command_updated':    'Command updated: !pat {cmd} → {file}',
  'log.command_removed':    'Command updated: !pat (removed) → {file}',
  'log.no_webitem_action':  'No WebItemAction expression found. See the tutorial in the VTube Studio section.',
  'log.vtube_connect_hint': 'connect to VTube Studio to load.',
  'log.spawn_error':        'Spawn error: {error}',
  'log.delete_error':       'Error removing.',
  'log.user_removed':       '✓ User @{username} permanently removed.',
  'log.connect_error':      'Error: {error}',
  'log.vtuber_error':       'VTube Studio: {error}',
  'log.rewards_warn':       'Rewards: {error}',
  'log.expressions_warn':   'VTube Expressions: {error}',
};

