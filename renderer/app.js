/* global purrpat, i18n */
'use strict';

// ═══════════════════════════════════════════════════════════════
// PurrPat — Renderer (app.js)
// ═══════════════════════════════════════════════════════════════

const App = {
  _patCount: 0,
  _allUsers: [],
  _currentStatus: { twitch: false, vtuber: false, auth: false, username: '' },

  // ── Init ──────────────────────────────────────────────────────
  async init() {
    App.tabs.init();
    App.log.init();
    App.updater.init();
    App.events.init();

    const { authenticated, credentials } = await purrpat.auth.getStatus();

    if (!authenticated) {
      document.getElementById('setup-overlay').classList.remove('hidden');
    } else {
      App.showApp();
      App.dashboard.loadStatus({ auth: true, username: credentials.username });
      App.settings.load();
    }
  },

  showApp() {
    document.getElementById('setup-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  },

  openLink(url) {
    if (typeof purrpat.openExternal === 'function') purrpat.openExternal(url);
  },

  copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  },

  // ── Tabs ──────────────────────────────────────────────────────
  tabs: {
    _current: null,
    _suspendedTab: null,
    _isSuspended: false,

    _unloadTab(name) {
      if (name === 'patpats') App.patpats.unload();
      if (name === 'users') App.users.unload();
      if (name === 'preview') App.customize.unload();
      if (name === 'extras') App.extras.reset();
    },

    _loadTab(name) {
      if (name === 'patpats') App.patpats.load();
      if (name === 'users') { App.users.load(); App.users.checkStreamerMode(); }
      if (name === 'settings') App.settings.load();
      if (name === 'preview') App.customize.load();
    },

    init() {
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => App.tabs.show(btn.dataset.tab));
      });
    },
    show(name) {
      // Unload heavy tabs on leave
      const prev = this._current;

      // Guard: ask to save if leaving settings with unsaved changes
      if (prev === 'settings' && App.settings._dirty) {
        const save = confirm(t('confirm.unsaved_settings'));
        if (save === null) return; // cancelled (shouldn't happen with confirm)
        if (save) {
          App.settings.save();
        }
        // if false: discard changes, proceed with tab switch
      }

      this._unloadTab(prev);

      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
      document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');
      document.getElementById(`tab-${name}`).classList.add('active');
      this._current = name;

      this._loadTab(name);
    },

    suspendActive() {
      if (this._isSuspended) return;
      const current = this._current;
      if (!current || current === 'dashboard') return;
      this._unloadTab(current);
      this._suspendedTab = current;
      this._isSuspended = true;
    },

    resumeActive() {
      if (!this._isSuspended) return;
      const tab = this._suspendedTab;
      this._suspendedTab = null;
      this._isSuspended = false;
      if (!tab || tab === 'dashboard') return;
      if (this._current !== tab) return;
      this._loadTab(tab);
    }
  },

  // ── Extras sub-pages ──────────────────────────────────────────
  extras: {
    showPage(name) {
      document.getElementById('extras-menu').style.display = 'none';
      document.querySelectorAll('.extras-page').forEach((p) => p.classList.remove('active'));
      const page = document.getElementById(`extras-page-${name}`);
      if (page) page.classList.add('active');
    },
    back() {
      document.querySelectorAll('.extras-page').forEach((p) => p.classList.remove('active'));
      document.getElementById('extras-menu').style.display = '';
    },
    reset() {
      document.querySelectorAll('.extras-page').forEach((p) => p.classList.remove('active'));
      const menu = document.getElementById('extras-menu');
      if (menu) menu.style.display = '';
    }
  },

  // ── Events (IPC from main) ────────────────────────────────────
  events: {
    init() {
      purrpat.on('log', (data) => App.log.add(data.message, data.type));

      purrpat.on('status-update', (data) => {
        App._currentStatus = { ...App._currentStatus, ...data };
        App.dashboard.updateStatus(data);
        if (data.vtuber) {
          App.settings.refreshExpressions(App._getValue('s-vtuber-expression')).catch(() => {});
        }
      });

      purrpat.on('patpat-event', (data) => {
        App._patCount++;
        document.getElementById('feed-count').textContent = App._patCount;
        App.dashboard.addFeedItem(data);
        App.log.add(t('log.new_patpat', { user: data.user }), 'success');
      });

      purrpat.on('change-gif', (data) => {
        App.log.add(t('log.gif_changed', { name: data.displayName, gif: data.gifFile }), 'info');
      });

      purrpat.on('auth-complete', (data) => {
        App.showApp();
        App.dashboard.loadStatus({ auth: true, username: data.username });
        App.settings.load();
        App.log.add(t('log.auth_ok', { name: data.displayName }), 'success');
      });

      purrpat.on('window-state', (data) => {
        if (data && data.minimized) App.tabs.suspendActive();
        else App.tabs.resumeActive();
      });

      purrpat.on('update-status', (data) => App.updater.onStatus(data));
    }
  },

  // ── Updater UI ──────────────────────────────────────────
  updater: {
    _banner: null,
    _bannerText: null,
    _installBtn: null,
    _checkBtn: null,
    init() {
      this._banner     = document.getElementById('update-banner');
      this._bannerText = document.getElementById('update-banner-text');
      this._installBtn = document.getElementById('update-install-btn');
      this._checkBtn   = document.getElementById('extras-check-update-btn');
    },
    onStatus(data) {
      const b = this._banner;
      const txt = this._bannerText;
      const btn = this._installBtn;
      const ckBtn = this._checkBtn;
      if (!b) return;
      switch (data.state) {
        case 'checking':
          b.style.display = '';
          b.className = 'update-banner update-banner--checking';
          txt.textContent = t('update.checking');
          btn.style.display = 'none';
          if (ckBtn) ckBtn.disabled = true;
          break;
        case 'available':
          b.style.display = '';
          b.className = 'update-banner update-banner--available';
          txt.textContent = t('update.available', { v: data.version });
          btn.style.display = 'none';
          break;
        case 'downloading':
          b.style.display = '';
          b.className = 'update-banner update-banner--available';
          txt.textContent = t('update.downloading', { p: data.percent });
          btn.style.display = 'none';
          break;
        case 'ready':
          b.style.display = '';
          b.className = 'update-banner update-banner--ready';
          txt.textContent = t('update.ready', { v: data.version });
          btn.style.display = '';
          if (ckBtn) ckBtn.disabled = false;
          break;
        default: // 'none'
          b.style.display = 'none';
          btn.style.display = 'none';
          if (ckBtn) ckBtn.disabled = false;
      }
    },
    checkManual() {
      purrpat.updater.check();
    },
    install() {
      purrpat.updater.install();
    }
  },

  // ── Log console ───────────────────────────────────────────────
  log: {
    _el: null,
    init() { this._el = document.getElementById('log-console'); },
    add(message, type = 'info') {
      if (!this._el) return;
      const now = new Date();
      const time = now.toLocaleTimeString(i18n.getLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const line = document.createElement('div');
      line.className = 'log-line';
      line.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${App._escHtml(message)}</span>`;
      this._el.appendChild(line);
      this._el.scrollTop = this._el.scrollHeight;
      // Keep max 300 lines
      while (this._el.children.length > 300) this._el.removeChild(this._el.firstChild);
    },
    clear() { if (this._el) this._el.innerHTML = ''; }
  },

  // ── Setup flow ────────────────────────────────────────────────
  setup: {
    async loginTwitch() {
      const errEl = document.getElementById('setup-error');
      errEl.classList.add('hidden');

      const result = await purrpat.auth.startTwitch();
      if (!result.success) {
        errEl.textContent = result.error || 'Erro desconhecido.';
        errEl.classList.remove('hidden');
        return;
      }

      document.getElementById('step-login').classList.add('hidden');
      document.getElementById('step-waiting').classList.remove('hidden');
    },

    cancelWait() {
      document.getElementById('step-waiting').classList.add('hidden');
      document.getElementById('step-login').classList.remove('hidden');
    }
  },

  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    async logout() {
      if (!confirm(t('confirm.logout'))) return;
      await purrpat.auth.logout();
      document.getElementById('app').classList.add('hidden');
      // Reset setup overlay
      document.getElementById('step-login').classList.remove('hidden');
      document.getElementById('step-waiting').classList.add('hidden');
      document.getElementById('setup-overlay').classList.remove('hidden');
    }
  },

  // ── Bot ───────────────────────────────────────────────────────
  bot: {
    async toggle() {
      const connected = App._currentStatus.twitch;
      const btn = document.getElementById('btn-bot-connect');
      btn.disabled = true;
      if (connected) {
        await purrpat.bot.disconnect();
      } else {
        const res = await purrpat.bot.connect();
        if (!res.success) App.log.add(t('log.connect_error', { error: res.error }), 'error');
      }
      btn.disabled = false;    },

    async togglePause() {
      const paused = App._currentStatus.paused;
      if (paused) {
        await purrpat.bot.resume();
      } else {
        await purrpat.bot.pause();
      }    }
  },

  // ── VTuber Studio ─────────────────────────────────────────────
  vtuber: {
    async toggle() {
      const connected = App._currentStatus.vtuber;
      const btn = document.getElementById('btn-vtuber-connect');
      btn.disabled = true;
      if (connected) {
        await purrpat.vtuber.disconnect();
      } else {
        const res = await purrpat.vtuber.connect();
        if (!res.success) App.log.add(t('log.vtuber_error', { error: res.error }), 'error');
      }
      btn.disabled = false;
    }
  },

  // ── Dashboard ─────────────────────────────────────────────────
  dashboard: {
    loadStatus(data) {
      App.dashboard.updateStatus(data);
    },

    updateStatus(data) {
      const s = App._currentStatus;

      // Twitch pill
      const twitchPill = document.getElementById('status-twitch');
      if (s.twitch) { twitchPill.classList.add('online'); } else { twitchPill.classList.remove('online'); }

      // VTuber Studio pill
      const vtuberPill = document.getElementById('status-vtuber');
      if (s.vtuber) { vtuberPill.classList.add('online'); } else { vtuberPill.classList.remove('online'); }

      // Bot card
      const twitchDot = document.getElementById('twitch-dot');
      if (s.twitch) { twitchDot.classList.add('online'); } else { twitchDot.classList.remove('online'); }
      document.getElementById('twitch-username').textContent = s.username || '—';
      document.getElementById('btn-bot-connect').textContent = s.twitch ? t('btn.disconnect') : t('btn.connect');

      const pauseActions = document.getElementById('pause-actions');
      const btnPause = document.getElementById('btn-bot-pause');
      if (s.twitch) {
        pauseActions.style.display = 'flex';
        btnPause.textContent = s.paused ? t('btn.resume') : t('btn.pause');
        btnPause.className = s.paused ? 'btn-primary' : 'btn-secondary';
      } else {
        pauseActions.style.display = 'none';
      }

      // VTuber card
      const vtuberDot = document.getElementById('vtuber-dot');
      if (s.vtuber) { vtuberDot.classList.add('online'); } else { vtuberDot.classList.remove('online'); }
      document.getElementById('btn-vtuber-connect').textContent = s.vtuber ? t('btn.disconnect') : t('btn.connect');

      // Settings account
      const nameEl = document.getElementById('s-account-name');
      if (nameEl) nameEl.textContent = s.username || '—';
    },

    addFeedItem(data) {
      const feed = document.getElementById('patpat-feed');
      const empty = feed.querySelector('.empty-state');
      if (empty) empty.remove();

      const time = new Date(data.timestamp || Date.now()).toLocaleTimeString(i18n.getLocale(), {
        hour: '2-digit', minute: '2-digit'
      });

      const item = document.createElement('div');
      item.className = 'feed-item';
      item.innerHTML = `
        <div class="feed-color-dot" style="background:${App._escHtml(data.color || '#fff')}"></div>
        <div style="flex:1;min-width:0">
          <div class="feed-user">${App._escHtml(data.user || '???')}</div>
          ${data.message ? `<div class="feed-msg">${App._escHtml(data.message)}</div>` : ''}
          <div class="feed-gif">🎨 ${App._escHtml(data.currentGif || 'patpat.gif')}</div>
        </div>
        <div class="feed-time">${time}</div>
      `;

      feed.insertBefore(item, feed.firstChild);
      while (feed.children.length > 20) feed.removeChild(feed.lastChild);
    }
  },

  // ── Pat Pats gallery ──────────────────────────────────────────
  patpats: {
    async load() {
      const gallery = document.getElementById('patpat-gallery');
      gallery.innerHTML = `<p class="empty-state">${t('patpats.loading')}</p>`;
      const items = await purrpat.patpats.getAll();

      if (!items || items.length === 0) {
        gallery.innerHTML = `<p class="empty-state">${t('patpats.empty')}</p>`;
        return;
      }

      gallery.innerHTML = '';
      items.forEach((item) => {
        gallery.appendChild(App.patpats._buildCard(item));
      });
    },

    _buildCard(item) {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.dataset.filename = item.filename;

      card.innerHTML = `
        <div class="gallery-img-wrap">
          <img src="${App._escHtml(item.url)}" alt="${App._escHtml(item.filename)}" loading="lazy" />
        </div>
        <div class="gallery-info">
          <div class="gallery-name">${App._escHtml(item.filename)}</div>
          <div class="gallery-cmd-label">${t('patpats.cmd_label')}</div>
          <div class="gallery-cmd-row">
            <span class="gallery-cmd-prefix">!pat</span>
            <input class="gallery-cmd-input" type="text" value="${App._escHtml(item.command)}"
              placeholder="${t('patpats.cmd_placeholder')}" data-file="${App._escHtml(item.filename)}" />
            <button class="gallery-cmd-save" onclick="App.patpats.saveCommand(this)">${t('patpats.cmd_ok')}</button>
          </div>
        </div>
        <div class="gallery-actions">
          <button class="btn-icon-danger" onclick="App.patpats.delete('${App._escHtml(item.filename)}', this)" title="${t('btn.remove')}">\uD83D\uDDD1</button>
        </div>
      `;

      return card;
    },

    async saveCommand(btn) {
      const input = btn.previousElementSibling;
      const filename = input.dataset.file;
      const command = input.value.trim().toLowerCase();
      btn.textContent = '...';
      await purrpat.patpats.setCommand(filename, command);
      btn.textContent = '\u2713';
      setTimeout(() => { btn.textContent = t('patpats.cmd_ok'); }, 1500);
      App.log.add(command ? t('log.command_updated', { cmd: command, file: filename }) : t('log.command_removed', { file: filename }), 'success');
    },

    async import() {
      const res = await purrpat.patpats.importFiles();
      if (res && res.success) {
        App.patpats.load();
      }
    },

    async delete(filename, btn) {
      if (!confirm(t('confirm.delete', { name: filename }))) return;
      btn.disabled = true;
      const res = await purrpat.patpats.delete(filename);
      if (res.success) {
        App.patpats.load();
      } else {
        App.log.add(res.error || t('log.delete_error'), 'error');
        btn.disabled = false;
      }
    },

    unload() {
      const gallery = document.getElementById('patpat-gallery');
      if (gallery) gallery.innerHTML = `<p class="empty-state">${t('patpats.loading')}</p>`;
    }
  },

  // ── Users ─────────────────────────────────────────────────────
  users: {
    async load() {
      App._allUsers = await purrpat.users.getAll();
      App.users.render(App._allUsers);
    },

    filter(query) {
      const q = query.toLowerCase();
      const filtered = App._allUsers.filter(
        (u) => u.username.includes(q) || (u.displayName || '').toLowerCase().includes(q)
      );
      App.users.render(filtered);
    },

    render(list) {
      const tbody = document.getElementById('users-tbody');
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${t('users.empty')}</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map((u) => `
        <tr>
          <td><strong>${App._escHtml(u.displayName || u.username)}</strong><br><small style="color:var(--text-dim)">@${App._escHtml(u.username)}</small></td>
          <td><span class="user-color-swatch" style="background:${App._escHtml(u.color || '#fff')}"></span></td>
          <td>${u.patCount || 0}</td>
          <td>${u.lastSeen ? new Date(u.lastSeen).toLocaleDateString(i18n.getLocale()) : '\u2014'}</td>
          <td><span class="badge ${u.isBanned ? 'badge-ban' : 'badge-ok'}">${u.isBanned ? t('users.status_banned') : t('users.status_active')}</span></td>
          <td>
            <button class="btn-spawn" style="font-size:12px;padding:4px 10px" onclick="App.users.spawnManual('${App._escHtml(u.username)}')">${t('btn.spawn')}</button>
            ${u.isBanned
              ? `<button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="App.users.unban('${App._escHtml(u.username)}')">${t('btn.unban')}</button>`
              : `<button class="btn-danger" style="font-size:12px;padding:4px 10px" onclick="App.users.ban('${App._escHtml(u.username)}')">${t('btn.ban')}</button>`
            }
            <button class="btn-danger" style="font-size:12px;padding:4px 10px;background:#c7392022;" onclick="App.users.remove('${App._escHtml(u.username)}')">${t('btn.remove')}</button>
          </td>
        </tr>
      `).join('');
    },

    async ban(username) {
      const reason = prompt(t('prompt.ban_reason', { username }));
      if (reason === null) return; // cancelled
      await purrpat.users.ban(username, reason);
      App.users.load();
    },

    async unban(username) {
      await purrpat.users.unban(username);
      App.users.load();
    },

    async remove(username) {
      const confirmed = confirm(t('confirm.remove_user', { username }));
      if (!confirmed) return;
      const result = await purrpat.users.delete(username);
      if (!result.success) {
        App.log.add(t('log.delete_error'), 'error');
        return;
      }
      App.users.load();
      App.log.add(t('log.user_removed', { username }), 'success');
    },

    async spawnManual(username) {
      const result = await purrpat.users.spawnManual(username);
      if (!result.success) App.log.add(t('log.spawn_error', { error: result.error || '' }), 'error');
    },

    checkStreamerMode() {
      const container = document.getElementById('users-table-container');
      if (!container) return;
      if (App._censorUsers) {
        container.classList.add('streamer-blur');
      } else {
        container.classList.remove('streamer-blur');
      }
    },

    unlockStreamerMode() {
      const container = document.getElementById('users-table-container');
      if (container) container.classList.remove('streamer-blur');
    },

    unload() {
      App._allUsers = [];
      const tbody = document.getElementById('users-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${t('users.empty')}</td></tr>`;
    }
  },

  // ── Personalizar ──────────────────────────────────────────────
  customize: {
    _spawnTimer: null,
    _liveTimer: null,
    _selectedGif: null,
    _defaults: { gifScale: 1.0, nicknameFontSize: 28, nicknameOffsetY: 35, nicknameOffsetX: 50, nicknameGlow: true, nicknameOutline: true, nicknameFont: 'Arial', showPlatformIcon: true },

    async load() {
      const wrap = document.getElementById('preview-frame-wrap');
      if (!wrap) return;

      // Populate sliders from saved settings
      const s = await purrpat.settings.get();
      App._setValue('cz-scale',   s.gifScale ?? 1.0);
      App._setValue('cz-fontsize', s.nicknameFontSize ?? 28);
      App._setValue('cz-pos-y',   s.nicknameOffsetY ?? 35);
      App._setValue('cz-pos-x',   s.nicknameOffsetX ?? 50);
      App._setChecked('cz-glow',       s.nicknameGlow ?? true);
      App._setChecked('cz-outline',     s.nicknameOutline ?? true);
      App._setChecked('cz-show-icon',   s.showPlatformIcon ?? true);
      App._setValue('cz-font',          s.nicknameFont || 'Arial');
      App._setValue('cz-test-color', '#9146ff');
      this._updateSliderLabels();

      // Load GIF picker
      await this._loadGifPicker();

      // Create fresh iframe (avoids navigation abort errors)
      const iframe = document.createElement('iframe');
      iframe.id = 'preview-frame';
      iframe.frameBorder = '0';
      iframe.setAttribute('allowtransparency', 'true');
      iframe.src = 'http://localhost:3000/patpat?preview=1';
      wrap.appendChild(iframe);

      // Attach slider listeners
      this._attachListeners();

      // Spawn preview after iframe Socket.IO connects
      this._spawnTimer = setTimeout(() => this._spawnPreview(), 1200);
    },

    unload() {
      if (this._spawnTimer) { clearTimeout(this._spawnTimer); this._spawnTimer = null; }
      if (this._liveTimer) { clearTimeout(this._liveTimer); this._liveTimer = null; }
      const iframe = document.getElementById('preview-frame');
      if (iframe) iframe.remove();
    },

    async _loadGifPicker() {
      const grid = document.getElementById('cz-gif-grid');
      if (!grid) return;
      grid.innerHTML = '';
      this._selectedGif = null;
      try {
        const patpats = await purrpat.patpats.getAll();
        if (!patpats.length) { grid.innerHTML = '<span class="cz-gif-empty">—</span>'; return; }
        patpats.forEach((p) => {
          const btn = document.createElement('button');
          btn.className = 'cz-gif-btn';
          btn.title = p.filename;
          btn.dataset.gif = p.filename;
          const img = document.createElement('img');
          img.src = p.url;
          img.alt = p.filename;
          btn.appendChild(img);
          btn.addEventListener('click', () => {
            grid.querySelectorAll('.cz-gif-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            this._selectedGif = p.filename;
            this._spawnPreview();
          });
          grid.appendChild(btn);
        });
        this._selectedGif = patpats[0].filename;
        grid.querySelector('.cz-gif-btn')?.classList.add('active');
      } catch (_) {
        grid.innerHTML = '<span class="cz-gif-empty">—</span>';
      }
    },

    _attachListeners() {
      ['cz-scale', 'cz-fontsize', 'cz-pos-y', 'cz-pos-x'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.oninput = () => {
          this._updateSliderLabels();
          this._debouncedLiveUpdate();
        };
      });
      ['cz-glow', 'cz-outline', 'cz-show-icon'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.onchange = () => this._debouncedLiveUpdate();
      });
      const fontSel = document.getElementById('cz-font');
      if (fontSel) fontSel.onchange = () => this._debouncedLiveUpdate();
      const colorPicker = document.getElementById('cz-test-color');
      if (colorPicker) colorPicker.oninput = () => this._debouncedLiveUpdate();
    },

    _updateSliderLabels() {
      const v = (id) => parseFloat(document.getElementById(id)?.value ?? 0);
      const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      set('cz-scale-val',    v('cz-scale').toFixed(2) + '×');
      set('cz-fontsize-val', Math.round(v('cz-fontsize')) + 'px');
      set('cz-pos-y-val',    Math.round(v('cz-pos-y')) + 'px');
      set('cz-pos-x-val',    Math.round(v('cz-pos-x')) + '%');
    },

    _debouncedLiveUpdate() {
      if (this._liveTimer) clearTimeout(this._liveTimer);
      this._liveTimer = setTimeout(() => this._sendLiveUpdate(), 80);
    },

    async _sendLiveUpdate() {
      await purrpat.customize.previewUpdate({
        gifScale:         parseFloat(document.getElementById('cz-scale')?.value ?? 1),
        nicknameFontSize: parseInt(document.getElementById('cz-fontsize')?.value ?? 28),
        nicknameOffsetY:  parseInt(document.getElementById('cz-pos-y')?.value ?? 35),
        nicknameOffsetX:  parseInt(document.getElementById('cz-pos-x')?.value ?? 50),
        nicknameGlow:     document.getElementById('cz-glow')?.checked ?? true,
        nicknameOutline:  document.getElementById('cz-outline')?.checked ?? true,
        nicknameFont:     document.getElementById('cz-font')?.value || 'Arial',
        showPlatformIcon: document.getElementById('cz-show-icon')?.checked ?? true,
        previewColor:     document.getElementById('cz-test-color')?.value || '#9146ff'
      });
    },

    _spawnPreview() {
      const username = App._currentStatus.username || 'preview';
      const color = document.getElementById('cz-test-color')?.value || '#9146ff';
      purrpat.preview.spawn({ username, displayName: username, color, gifFile: this._selectedGif || undefined });
    },

    reset() {
      const d = this._defaults;
      App._setValue('cz-scale',    d.gifScale);
      App._setValue('cz-fontsize', d.nicknameFontSize);
      App._setValue('cz-pos-y',    d.nicknameOffsetY);
      App._setValue('cz-pos-x',    d.nicknameOffsetX);
      App._setChecked('cz-glow',      d.nicknameGlow);
      App._setChecked('cz-outline',   d.nicknameOutline);
      App._setChecked('cz-show-icon', d.showPlatformIcon);
      App._setValue('cz-font',        d.nicknameFont);
      App._setValue('cz-test-color', '#9146ff');
      this._updateSliderLabels();
      this._sendLiveUpdate();
    },

    async save() {
      await purrpat.customize.apply({
        gifScale:         parseFloat(document.getElementById('cz-scale')?.value ?? 1),
        nicknameFontSize: parseInt(document.getElementById('cz-fontsize')?.value ?? 28),
        nicknameOffsetY:  parseInt(document.getElementById('cz-pos-y')?.value ?? 35),
        nicknameOffsetX:  parseInt(document.getElementById('cz-pos-x')?.value ?? 50),
        nicknameGlow:     document.getElementById('cz-glow')?.checked ?? true,
        nicknameOutline:  document.getElementById('cz-outline')?.checked ?? true,
        nicknameFont:     document.getElementById('cz-font')?.value || 'Arial',
        showPlatformIcon: document.getElementById('cz-show-icon')?.checked ?? true
      });
      const msg = document.getElementById('cz-saved-msg');
      if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 2500); }
    }
  },

  // ── Settings ──────────────────────────────────────────────────
  settings: {
    _rewardsLoaded: false,
    _expressionsLoaded: false,
    _dirty: false,
    _dirtyListenerAttached: false,

    async load() {
      this._dirty = false;
      const s = await purrpat.settings.get();
      App._setValue('s-spawn-mode', s.spawnMode || 'reward');
      App._setChecked('s-command-require-redeem', s.commandModeRequireRedeem !== false);
      App._setValue('s-reward-id', s.rewardId || '');
      App._setValue('s-cooldown', s.commandCooldown ?? 30);
      App._setChecked('s-vtuber-enabled', s.vtubeStudioEnabled ?? false);
      App._setValue('s-vtuber-port', s.vtubeStudioPort ?? 8001);
      App._setValue('s-vtuber-url', s.vtubeStudioItemUrl || 'http://localhost:3000/patpat');
      App._setValue('s-vtuber-expression', s.vtubeExpressionHotkeyId || '');
      App._setChecked('s-show-messages', s.showUserMessages ?? true);
      App._setValue('s-msg-duration', s.messageDuration ?? 10);
      document.getElementById('vtuber-port-display').textContent = s.vtubeStudioPort || 8001;

      // Sincronizar idioma da interface
      const interfaceLang = s.interfaceLanguage || 'pt-BR';
      App._setValue('s-interface-lang', interfaceLang);
      i18n.setLang(interfaceLang);

      // Sincronizar censura da aba de usuários
      App._censorUsers = s.censorUsersTab ?? false;
      App._setChecked('s-censor-users', App._censorUsers);

      const { credentials } = await purrpat.auth.getStatus();
      const nameEl = document.getElementById('s-account-name');
      if (nameEl) nameEl.textContent = credentials.username || '—';

      this._updateRewardSectionVisibility();
      this._updateMessageDurationVisibility();

      if (!this._rewardsLoaded) {
        await this.refreshRewards(s.rewardId || '');
      }
      if (!this._expressionsLoaded) {
        await this.refreshExpressions(s.vtubeExpressionHotkeyId || '');
      }

      // Listener para mudanças no modo de spawn
      const spawnModeSelect = document.getElementById('s-spawn-mode');
      if (spawnModeSelect && !spawnModeSelect._listenerAttached) {
        spawnModeSelect.addEventListener('change', () => this._updateRewardSectionVisibility());
        spawnModeSelect._listenerAttached = true;
      }

      // Listener para mudanças no idioma da interface
      const langSelect = document.getElementById('s-interface-lang');
      if (langSelect && !langSelect._listenerAttached) {
        langSelect.addEventListener('change', (e) => i18n.setLang(e.target.value));
        langSelect._listenerAttached = true;
      }

      // Listener para mudanças no toggle de exibir mensagem
      const showMessagesToggle = document.getElementById('s-show-messages');
      if (showMessagesToggle && !showMessagesToggle._listenerAttached) {
        showMessagesToggle.addEventListener('change', () => this._updateMessageDurationVisibility());
        showMessagesToggle._listenerAttached = true;
      }

      // Dirty tracking: mark dirty on any change inside the settings tab
      if (!this._dirtyListenerAttached) {
        const settingsTab = document.getElementById('tab-settings');
        if (settingsTab) {
          settingsTab.addEventListener('input',  () => { this._dirty = true; });
          settingsTab.addEventListener('change', () => { this._dirty = true; });
          this._dirtyListenerAttached = true;
        }
      }
    },

    _updateRewardSectionVisibility() {
      const spawnMode = App._getValue('s-spawn-mode') || 'reward';
      const rewardSection = document.getElementById('reward-section');
      if (!rewardSection) return;
      if (spawnMode === 'command') {
        rewardSection.classList.add('hidden');
      } else {
        rewardSection.classList.remove('hidden');
      }
    },

    _updateMessageDurationVisibility() {
      const showMessages = App._getChecked('s-show-messages');
      const durationGroup = document.getElementById('msg-duration-group');
      if (!durationGroup) return;
      if (showMessages) {
        durationGroup.classList.remove('hidden');
      } else {
        durationGroup.classList.add('hidden');
      }
    },

    async refreshRewards(selectedId = '') {
      const el = document.getElementById('s-reward-id');
      if (!el) return;
      el.innerHTML = `<option value="">${t('dropdown.loading_rewards')}</option>`;

      const result = await purrpat.auth.listRewards();
      if (!result.success) {
        el.innerHTML = `<option value="">${t('dropdown.error_rewards')}</option>`;
        App.log.add(t('log.rewards_warn', { error: result.error || '' }), 'warn');
        return;
      }

      const rewards = result.rewards || [];
      const options = [`<option value="">${t('dropdown.select_reward')}</option>`];
      rewards.forEach((reward) => {
        const selected = (selectedId && selectedId === reward.id) ? ' selected' : '';
        const disabled = reward.isEnabled ? '' : ` ${t('dropdown.disabled')}`;
        options.push(`<option value="${App._escHtml(reward.id)}"${selected}>${App._escHtml(reward.title)} - ${reward.cost} pts${disabled}</option>`);
      });
      el.innerHTML = options.join('');
      this._rewardsLoaded = true;

      if (selectedId && !rewards.some((r) => r.id === selectedId)) {
        const extra = document.createElement('option');
        extra.value = selectedId;
        extra.textContent = t('dropdown.reward_not_found', { id: selectedId });
        extra.selected = true;
        el.appendChild(extra);
      }
    },

    async refreshExpressions(selectedId = '') {
      const el = document.getElementById('s-vtuber-expression');
      if (!el) return;
      el.innerHTML = `<option value="">${t('dropdown.no_expression')}</option>`;

      const result = await purrpat.vtuber.listExpressions();
      if (!result.success) {
        App.log.add(t('log.expressions_warn', { error: result.error || t('log.vtube_connect_hint') }), 'warn');
        this._setExpressionTutorialVisible(false);
        this._expressionsLoaded = false;
        return;
      }

      const expressions = result.expressions || [];
      expressions.forEach((expr) => {
        const option = document.createElement('option');
        option.value = expr.id;
        option.textContent = `${expr.name} (${expr.type})`;
        if (selectedId && selectedId === expr.id) option.selected = true;
        el.appendChild(option);
      });

      if (selectedId && !expressions.some((e) => e.id === selectedId)) {
        const extra = document.createElement('option');
        extra.value = selectedId;
        extra.textContent = t('dropdown.expression_not_found', { id: selectedId });
        extra.selected = true;
        el.appendChild(extra);
      }

      const hasWebItemAction = expressions.some((expr) => {
        const typeText = String(expr.type || '').toLowerCase();
        const nameText = String(expr.name || '').toLowerCase();
        return typeText.includes('webitemaction') || nameText.includes('webitemaction');
      });

      // Só mostra o tutorial se o spawn automático estiver ativado
      const vtubeEnabled = App._getChecked('s-vtuber-enabled');
      const shouldShowTutorial = !hasWebItemAction && vtubeEnabled;
      this._setExpressionTutorialVisible(shouldShowTutorial);
      if (!hasWebItemAction && vtubeEnabled) {
        App.log.add(t('log.no_webitem_action'), 'warn');
      }

      this._expressionsLoaded = true;
    },

    toggleExpressionTutorial() {
      const modal = document.getElementById('vtube-tutorial-modal');
      if (!modal) return;
      modal.classList.toggle('hidden');
    },

    copyTutorialUrl() {
      const urlEl = document.getElementById('tutorial-url');
      if (!urlEl) return;
      const url = urlEl.textContent;
      navigator.clipboard.writeText(url).then(() => {
        App.log.add(t('log.url_copied'), 'success');
      }).catch(() => {
        App.log.add(t('log.url_copy_error'), 'error');
      });
    },
    _setExpressionTutorialVisible(visible) {
      const modal = document.getElementById('vtube-tutorial-modal');
      if (!modal) return;
      if (visible) modal.classList.remove('hidden');
      else modal.classList.add('hidden');
    },

    async save() {
      const newSettings = {
        spawnMode: App._getValue('s-spawn-mode') || 'reward',
        commandModeRequireRedeem: App._getChecked('s-command-require-redeem'),
        rewardId: App._getValue('s-reward-id'),
        commandCooldown: parseInt(App._getValue('s-cooldown')) || 30,
        vtubeStudioEnabled: App._getChecked('s-vtuber-enabled'),
        vtubeStudioPort: parseInt(App._getValue('s-vtuber-port')) || 8001,
        vtubeStudioItemUrl: App._getValue('s-vtuber-url'),
        vtubeExpressionHotkeyId: App._getValue('s-vtuber-expression'),
        showUserMessages: App._getChecked('s-show-messages'),
        messageDuration: parseInt(App._getValue('s-msg-duration')) || 10,
        interfaceLanguage: App._getValue('s-interface-lang') || 'pt-BR',
        censorUsersTab: App._getChecked('s-censor-users')
      };

      await purrpat.settings.set(newSettings);
      document.getElementById('vtuber-port-display').textContent = newSettings.vtubeStudioPort;

      this._dirty = false;
      const msg = document.getElementById('settings-saved-msg');
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2500);
      App.log.add(t('log.settings_saved'), 'success');
    }
  },

  // ── Helpers ───────────────────────────────────────────────────
  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },

  _setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  },

  _getChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  },

  _setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
