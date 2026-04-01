const { EventEmitter } = require('events');
const WebSocket = require('ws');

const PLUGIN_NAME = 'PurrPat';
const PLUGIN_DEVELOPER = 'Ayahoii';

class VTuberStudioAPI extends EventEmitter {
  constructor() {
    super();
    this._ws = null;
    this._authenticated = false;
    this._authToken = null;
    this._connecting = false;
    this._reconnectAttempts = 0;
    this._keepaliveInterval = null;
    this._port = 8001;
    this._pendingRequests = new Map();
  }

  log(message, type = 'info') {
    this.emit('log', { message: `[VTube Studio] ${message}`, type });
  }

  isConnected() {
    return this._authenticated && this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  setPort(port) {
    this._port = port || 8001;
  }

  connect(port) {
    if (port) this._port = port;
    const url = `ws://localhost:${this._port}`;

    return new Promise((resolve, reject) => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN && this._authenticated) {
        resolve(true);
        return;
      }
      if (this._connecting) {
        reject(new Error('Já está tentando conectar, aguarde.'));
        return;
      }

      this._connecting = true;
      this._reconnectAttempts = 0;

      if (this._ws) {
        this._ws.terminate();
        this._ws = null;
      }

      this.log(`Conectando em ${url}...`);
      const ws = new WebSocket(url);
      this._ws = ws;

      ws.on('open', () => {
        this.log('Conectado! Autenticando...', 'success');
        this._authenticate().then(() => {
          this._connecting = false;
          this._startKeepalive();
          resolve(true);
        }).catch((err) => {
          this._connecting = false;
          reject(err);
        });
      });

      ws.on('message', (data) => {
        try {
          this._handleMessage(JSON.parse(data.toString()));
        } catch (_) {}
      });

      ws.on('error', (err) => {
        this.log(`Erro de conexão: ${err.message}`, 'error');
        this._connecting = false;
        this._authenticated = false;
        this.emit('status', false);
        reject(err);
      });

      ws.on('close', () => {
        for (const [, pending] of this._pendingRequests) {
          pending.reject(new Error('Conexão com VTube Studio foi encerrada'));
        }
        this._pendingRequests.clear();
        this._stopKeepalive();
        this._authenticated = false;
        this._connecting = false;
        this.log('Desconectado.', 'warn');
        this.emit('status', false);
      });
    });
  }

  disconnect() {
    this._stopKeepalive();
    this._reconnectAttempts = 999; // prevent auto-reconnect
    for (const [, pending] of this._pendingRequests) {
      pending.reject(new Error('VTube Studio desconectado'));
    }
    this._pendingRequests.clear();
    if (this._ws) {
      this._ws.terminate();
      this._ws = null;
    }
    this._authenticated = false;
    this.emit('status', false);
  }

  _handleMessage(msg) {
    if (msg && msg.requestID && this._pendingRequests.has(msg.requestID)) {
      const pending = this._pendingRequests.get(msg.requestID);
      this._pendingRequests.delete(msg.requestID);
      pending.resolve(msg);
      return;
    }

    if (msg.messageType === 'AuthenticationTokenResponse') {
      this._authToken = msg.data.authenticationToken;
      this.log('Token de autenticação recebido.');
    } else if (msg.messageType === 'AuthenticationResponse') {
      this._authenticated = msg.data.authenticated;
      if (this._authenticated) {
        this.log('Autenticado! Plugin PurrPat ativo.', 'success');
        this.emit('status', true);
      } else {
        this.log('Falha na autenticação — aceite o plugin no VTube Studio.', 'error');
      }
    }
  }

  async _authenticate() {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não conectado');
    }

    if (!this._authToken) {
      this.emit('auth-request');
      this._ws.send(JSON.stringify({
        apiName: 'VTubeStudioPublicAPI',
        apiVersion: '1.0',
        requestID: 'PurrPatTokenRequest',
        messageType: 'AuthenticationTokenRequest',
        data: { pluginName: PLUGIN_NAME, pluginDeveloper: PLUGIN_DEVELOPER }
      }));
      await new Promise((r) => setTimeout(r, 2000));
    }

    this._ws.send(JSON.stringify({
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID: 'PurrPatAuthRequest',
      messageType: 'AuthenticationRequest',
      data: {
        pluginName: PLUGIN_NAME,
        pluginDeveloper: PLUGIN_DEVELOPER,
        authenticationToken: this._authToken
      }
    }));

    await new Promise((r) => setTimeout(r, 1000));
    return this._authenticated;
  }

  _startKeepalive() {
    this._stopKeepalive();
    this._keepaliveInterval = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.ping();
      }
    }, 30000);
  }

  _stopKeepalive() {
    if (this._keepaliveInterval) {
      clearInterval(this._keepaliveInterval);
      this._keepaliveInterval = null;
    }
  }

  _sendRequest(messageType, data = {}, timeoutMs = 4000) {
    if (!this.isConnected()) {
      return Promise.reject(new Error('VTube Studio não está conectado.'));
    }

    const requestID = `PurrPat_${messageType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID,
      messageType,
      data
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pendingRequests.delete(requestID);
        reject(new Error(`Timeout ao aguardar resposta de ${messageType}`));
      }, timeoutMs);

      this._pendingRequests.set(requestID, {
        resolve: (msg) => {
          clearTimeout(timeout);
          resolve(msg);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });

      this._ws.send(JSON.stringify(payload));
    });
  }

  async listExpressions() {
    const response = await this._sendRequest('HotkeysInCurrentModelRequest', {}, 6000);
    const list = response && response.data && Array.isArray(response.data.availableHotkeys)
      ? response.data.availableHotkeys
      : [];

    return list.map((item) => ({
      id: item.hotkeyID,
      name: item.name || item.hotkeyID,
      type: item.type || 'Unknown'
    }));
  }

  async triggerExpression(hotkeyId) {
    if (!hotkeyId) return;
    await this._sendRequest('HotkeyTriggerRequest', { hotkeyID: hotkeyId }, 4000);
    this.log(`Expressão acionada: ${hotkeyId}`, 'info');
  }

  // Spawna um web item no VTube Studio apontando para a URL do overlay.
  // No VTube Studio a URL é passada como fileName para ItemLoadRequest.
  spawnWebItem(itemUrl) {
    if (!this.isConnected()) {
      this.log('Não conectado — ignorando spawn.', 'warn');
      return;
    }
    if (!itemUrl) {
      this.log('URL do web item não configurada.', 'warn');
      return;
    }
    this._ws.send(JSON.stringify({
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID: `PurrPatSpawn_${Date.now()}`,
      messageType: 'ItemLoadRequest',
      data: {
        fileName: itemUrl,
        positionX: 0,
        positionY: 0,
        size: 0.32,
        rotation: 0,
        fadeTime: 0.5,
        order: 1,
        failIfOrderTaken: false,
        smoothing: 0,
        censored: false,
        flipped: false,
        locked: false,
        frameRate: 24,
        unloadWhenPluginDisconnects: true
      }
    }));
    this.log(`Web item spawnado: ${itemUrl}`, 'success');
  }
}

module.exports = new VTuberStudioAPI();
