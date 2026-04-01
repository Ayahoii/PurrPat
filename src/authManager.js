const fs = require('fs');
const path = require('path');
const http = require('http');
const { EventEmitter } = require('events');

// ─── App credentials (seu app da Twitch) ────────────────────────
// Fluxo Implicit Grant — não precisa de Client Secret.
// Registre http://localhost:7478/auth/callback no seu app da Twitch.
const CLIENT_ID = 'mrqo53d9vjc0y9vxzy8n1xnijyltt1';
const REDIRECT_URI = 'http://localhost:7478/auth/callback';
const SCOPES = 'chat:read chat:edit channel:read:redemptions';
const CALLBACK_PORT = 7478;
// ────────────────────────────────────────────────────────────────

const DATA_FILE = path.join(__dirname, '..', 'data', 'auth.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class AuthManager extends EventEmitter {
  constructor() {
    super();
    this._data = {
      accessToken: '',
      username: '',
      displayName: ''
    };
    this._callbackServer = null;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        this._data = { ...this._data, ...raw };
      }
    } catch (err) {
      console.error('[Auth] Erro ao carregar auth.json:', err.message);
    }
  }

  _save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this._data, null, 2));
    } catch (err) {
      console.error('[Auth] Erro ao salvar auth.json:', err.message);
    }
  }

  isAuthenticated() {
    return !!this._data.accessToken;
  }

  getCredentials() {
    return { ...this._data, clientId: CLIENT_ID };
  }

  getPublicCredentials() {
    return {
      username: this._data.username,
      displayName: this._data.displayName,
      hasToken: !!this._data.accessToken
    };
  }

  // Retorna a URL do Twitch para o usuário autorizar (Implicit Grant)
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPES,
      force_verify: 'true'
    });
    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  // Servidor local que recebe o token via página de callback
  startCallbackServer(onSuccess) {
    if (this._callbackServer) return;

    this._callbackServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

      // A página de callback usa JS para ler o fragment (#) e postar o token aqui
      if (url.pathname === '/auth/token' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { token } = JSON.parse(body);
            if (!token) throw new Error('Token ausente');

            const userInfo = await this._fetchUserInfo(token);
            this._data.accessToken = token;
            this._data.username = userInfo.login;
            this._data.displayName = userInfo.display_name;
            this._save();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));

            if (onSuccess) onSuccess({ username: userInfo.login, displayName: userInfo.display_name });
          } catch (err) {
            console.error('[Auth] Erro ao processar token:', err.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }

      // Página de callback — lê o fragment e envia o token para /auth/token
      if (url.pathname === '/auth/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>PurrPat — Autenticando...</title>
<style>
  body{background:#0d1117;color:#e6edf3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;}
  h2{margin:0;font-size:22px;} p{color:#8b949e;margin:0;}
  .ok{color:#3fb950;} .err{color:#f85149;} .name{color:#58a6ff;font-weight:700;}
  .spin{width:36px;height:36px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:s .8s linear infinite;}
  @keyframes s{to{transform:rotate(360deg);}}
</style></head>
<body>
<div id="s" class="spin"></div>
<h2 id="msg">Autenticando...</h2>
<p id="sub">Aguarde um momento.</p>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const error = params.get('error');
  if (error || !token) {
    document.getElementById('s').style.display='none';
    document.getElementById('msg').className='err';
    document.getElementById('msg').textContent = error === 'access_denied' ? 'Autorização cancelada.' : 'Erro: ' + (error || 'Token não encontrado.');
    document.getElementById('sub').textContent = 'Feche esta aba e tente novamente.';
  } else {
    fetch('/auth/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token})
    }).then(r=>r.json()).then(data => {
      document.getElementById('s').style.display='none';
      if (data.ok) {
        document.getElementById('msg').className='ok';
        document.getElementById('msg').textContent = '✅ Autenticado com sucesso!';
        document.getElementById('sub').textContent = 'Pode fechar esta aba e voltar ao PurrPat.';
      } else {
        document.getElementById('msg').className='err';
        document.getElementById('msg').textContent = 'Erro: ' + (data.error || 'desconhecido');
      }
    }).catch(()=>{
      document.getElementById('msg').className='err';
      document.getElementById('msg').textContent = 'Falha ao comunicar com o PurrPat.';
    });
  }
<\/script>
</body></html>`);
        return;
      }

      res.writeHead(404);
      res.end();
    });

    this._callbackServer.listen(CALLBACK_PORT, () => {
      console.log(`[Auth] Servidor de callback ativo na porta ${CALLBACK_PORT}`);
    });

    this._callbackServer.on('error', (err) => {
      console.error('[Auth] Erro no servidor de callback:', err.message);
    });
  }

  async _fetchUserInfo(token) {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': CLIENT_ID
      }
    });
    const data = await res.json();
    if (!res.ok || !data.data || !data.data[0]) throw new Error('Falha ao buscar informações do usuário na Twitch');
    return data.data[0];
  }

  async listRewards() {
    if (!this._data.accessToken) throw new Error('Faça login na Twitch primeiro.');

    const me = await this._fetchUserInfo(this._data.accessToken);
    const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${encodeURIComponent(me.id)}`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`,
        'Client-Id': CLIENT_ID
      }
    });

    const data = await res.json();
    if (!res.ok) {
      const detail = data && data.message ? data.message : 'Falha ao listar resgates.';
      throw new Error(detail);
    }

    const rewards = Array.isArray(data.data) ? data.data : [];
    return rewards
      .map((r) => ({
        id: r.id,
        title: r.title,
        cost: r.cost,
        isEnabled: !!r.is_enabled
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }

  logout() {
    this._data.accessToken = '';
    this._data.username = '';
    this._data.displayName = '';
    this._save();
  }

  stopCallbackServer() {
    if (this._callbackServer) {
      this._callbackServer.close();
      this._callbackServer = null;
    }
  }
}

module.exports = new AuthManager();

