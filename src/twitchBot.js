const { EventEmitter } = require('events');
const tmi = require('tmi.js');
const userManager = require('./userManager');
const settingsManager = require('./settingsManager');

const COLOR_GIF_MAP = {
  '#FF0000': 'pet_pink.gif',
  '#FF00FF': 'pet_pink.gif',
  '#0000FF': 'pet_blue.gif',
  '#FFFF00': 'pet_yellow.gif',
  '#FF1493': 'pet_pink.gif',
  '#00FFFF': 'pet_blue.gif',
  '#FFA500': 'pet_yellow.gif',
  '#800080': 'pet_purple.gif',
};

function colorToGif(color) {
  if (!color) return 'patpat.gif';
  const hex = color.startsWith('#') ? color.toUpperCase() : '#' + color.toUpperCase();
  return COLOR_GIF_MAP[hex] || 'patpat.gif';
}

function normalizeError(err) {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}

class TwitchBot extends EventEmitter {
  constructor() {
    super();
    this._client = null;
    this._connected = false;
    this._paused = false;
    this._commandCooldowns = {};
    this._lastPatPat = { user: '???', color: '#ffffff', message: '' };
    this._sessionRedeemedUsers = new Set();
    this._activePatpatByUser = new Map();
    this._sessionViewerData = new Map();
  }

  log(message, type = 'info') {
    this.emit('log', { message: `[Twitch] ${message}`, type });
  }

  isConnected() {
    return this._connected;
  }

  isPaused() {
    return this._paused;
  }

  pause() {
    this._paused = true;
    this.log('Bot pausado. Resgates e comandos ignorados até retomar.', 'warn');
    this.emit('status');
  }

  resume() {
    this._paused = false;
    this.log('Bot retomado.', 'success');
    this.emit('status');
  }

  getLastPatPat() {
    return this._lastPatPat;
  }

  setLastPatPat(payload) {
    this._lastPatPat = payload;
  }

  // Registra spawn manual na sessão para que !pat funcione sem precisar resgatar
  registerManualSpawn(username, gifFile) {
    const key = username.toLowerCase();
    this._sessionRedeemedUsers.add(key);
    this._activePatpatByUser.set(key, gifFile);
  }

  // Retorna dados ao vivo do viewer capturados do chat nesta sessão
  getSessionViewer(username) {
    return this._sessionViewerData.get(username.toLowerCase()) || null;
  }

  async connect({ accessToken, username, channel }) {
    if (this._client) {
      await this.disconnect();
    }

    if (!accessToken || !username) throw new Error('Token ou usuário não fornecido.');

    const channelName = channel || username;

    this._client = new tmi.Client({
      options: { debug: false },
      connection: { reconnect: true, secure: true },
      identity: {
        username,
        password: `oauth:${accessToken}`
      },
      channels: [channelName]
    });

    this._sessionRedeemedUsers.clear();
    this._activePatpatByUser.clear();

    this._client.on('chat', (ch, userstate, message, self) => {
      if (self) return;
      this._handleChatMessage(ch, userstate, message);
    });

    this._client.on('connected', () => {
      this._connected = true;
      this.log(`Conectado ao canal #${channelName}!`, 'success');
      this.emit('status', true);
    });

    this._client.on('disconnected', (reason) => {
      this._connected = false;
      this.log(`Desconectado: ${reason || 'sem motivo informado'}`, 'warn');
      this.emit('status', false);
    });

    try {
      await this._client.connect();
    } catch (err) {
      const msg = normalizeError(err);
      this.log(`Falha ao conectar: ${msg}`, 'error');
      throw new Error(msg);
    }
  }

  async disconnect() {
    if (this._client) {
      try {
        await this._client.disconnect();
      } catch (_) {}
      this._client = null;
      this._connected = false;
      this._sessionRedeemedUsers.clear();
      this._activePatpatByUser.clear();
      this._sessionViewerData.clear();
      this.emit('status', false);
    }
  }

  _buildPatPatPayload({ username, displayName, color, message, currentGif, isSubscriber = false }) {
    return {
      user: displayName,
      color: color || '#ffffff',
      message: message || '',
      platform: 'twitch',
      timestamp: Date.now(),
      currentGif,
      isSubscriber,
      username
    };
  }

  _replyWithCooldown(channel, username, text, cooldownMs) {
    const now = Date.now();
    if (now - (this._commandCooldowns[username] || 0) < cooldownMs) return;
    this._commandCooldowns[username] = now;
    if (this._client && text) {
      this._client.say(channel, text).catch(() => {});
    }
  }

  _handleChatMessage(channel, userstate, message) {
    const username = userstate['username'];
    const displayName = userstate['display-name'] || username;
    const settings = settingsManager.get();
    const rewardId = settings.rewardId || '';
    const spawnMode = settings.spawnMode || 'reward';
    const requireRedeem = settings.commandModeRequireRedeem !== false;
    const cooldownMs = (settings.commandCooldown || 30) * 1000;
    const key = username.toLowerCase();
    const color = userstate['color'] || '#ffffff';
    const isSubscriber = !!userstate['subscriber'];

    userManager.touch(username, displayName, color);
    if (userManager.isBanned(username)) return;
    if (this._paused) return;

    // Atualiza dados ao vivo do viewer na sessão
    this._sessionViewerData.set(key, {
      username: key,
      displayName,
      color,
      isSubscriber: !!userstate['subscriber'],
      isMod: !!userstate['mod'],
      updatedAt: Date.now()
    });

    // ── Channel Point Redemption ────────────────────────────────
    if (rewardId && userstate['custom-reward-id'] === rewardId) {
      const savedGif = userManager.getLastGif(username);
      const gifFile = savedGif || colorToGif(color);

      this._sessionRedeemedUsers.add(key);

      if (spawnMode === 'reward') {
        // Já tem pat pat ativo nesta sessão — só troca o gif se diferente
        if (this._activePatpatByUser.has(key)) {
          const current = this._activePatpatByUser.get(key);
          if (current !== gifFile) {
            this._activePatpatByUser.set(key, gifFile);
            this.emit('change-gif', { username, displayName, gifFile });
          }
        } else {
          // Primeira vez na sessão — spawna
          this._activePatpatByUser.set(key, gifFile);
          const payload = this._buildPatPatPayload({ username, displayName, color, message, currentGif: gifFile, isSubscriber });
          this._lastPatPat = payload;
          this.log(`Novo pat pat por resgate: ${displayName} (GIF: ${gifFile})`, 'success');
          this.emit('patpat', { ...payload });
        }
      } else {
        // Modo command: resgate só desbloqueia, não spawna
        if (!this._activePatpatByUser.has(key)) {
          this._activePatpatByUser.set(key, gifFile);
        }
        this.log(`${displayName} desbloqueou pat pat na sessão (modo comando).`, 'info');
      }
      return;
    }

    // ── !pat commands ───────────────────────────────────────────
    if (!message.startsWith('!pat')) return;

    const commandPart = message.substring(4).trim().toLowerCase();

    // Reset
    if (commandPart === 'reset') {
      if (!this._activePatpatByUser.has(key)) return;
      this._activePatpatByUser.set(key, 'patpat.gif');
      this.emit('change-gif', { username, displayName, gifFile: 'patpat.gif' });
      return;
    }

    if (!commandPart) return;

    const commandKey = Object.keys(settings.patpatCommands || {}).find(
      (k) => k.toLowerCase() === commandPart
    );

    if (!commandKey) {
      const validCmds = Object.keys(settings.patpatCommands || {});
      if (validCmds.length > 0) {
        this._replyWithCooldown(
          channel, key,
          `@${displayName}, comando inválido! Disponíveis: !pat ${validCmds.join(', !pat ')}, !pat reset`,
          cooldownMs
        );
      }
      return;
    }

    const gifFile = settings.patpatCommands[commandKey];

    // Modo reward: !pat NUNCA spawna — só muda gif de sessão ativa
    if (spawnMode === 'reward') {
      if (!this._activePatpatByUser.has(key)) {
        this._replyWithCooldown(
          channel, key,
          `@${displayName}, resgate o Pat Pat primeiro para depois escolher o tipo com !pat.`,
          cooldownMs
        );
        return;
      }
      const current = this._activePatpatByUser.get(key);
      if (current === gifFile) return;
      this._activePatpatByUser.set(key, gifFile);
      userManager.setLastGif(username, gifFile);
      this.log(`${displayName} trocou pat pat para: ${commandKey}`);
      this.emit('change-gif', { username, displayName, gifFile });
      return;
    }

    // Modo command
    if (requireRedeem && !this._sessionRedeemedUsers.has(key)) {
      this._replyWithCooldown(
        channel, key,
        `@${displayName}, você precisa resgatar o Pat Pat uma vez para desbloquear os comandos nesta sessão.`,
        cooldownMs
      );
      return;
    }

    const current = this._activePatpatByUser.get(key);
    if (current === gifFile) return;

    this._activePatpatByUser.set(key, gifFile);
    this.log(`${displayName} trocou pat pat para: ${commandKey}`);

    if (current === undefined) {
      // Primeira vez na sessão — spawna
      const payload = this._buildPatPatPayload({ username, displayName, color, message: `!pat ${commandKey}`, currentGif: gifFile, isSubscriber });
      this._lastPatPat = payload;
      this.emit('patpat', { ...payload });
    } else {
      this.emit('change-gif', { username, displayName, gifFile });
    }
  }
}

module.exports = new TwitchBot();
