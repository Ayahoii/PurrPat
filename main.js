const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawnSync } = require('child_process');
const express = require('express');
const { Server: SocketServer } = require('socket.io');
const { autoUpdater } = require('electron-updater');

const authManager = require('./src/authManager');
const twitchBot = require('./src/twitchBot');
const vtuberAPI = require('./src/vtuberStudioAPI');
const userManager = require('./src/userManager');
const settingsManager = require('./src/settingsManager');

const PATPATS_DIR = path.join(__dirname, 'public', 'patpats');

let mainWindow = null;
let widgetIO = null;
let _lastPreviewPayload = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function focusVTubeStudioWindow() {
  try {
    const script = [
      '$p = Get-Process | Where-Object { $_.ProcessName -match "VTube" -or $_.MainWindowTitle -match "VTube Studio" } | Select-Object -First 1',
      'if ($p -and $p.MainWindowHandle -ne 0) {',
      '  $code = @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class Win32Focus {',
      '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);',
      '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
      '}',
      '"@',
      '  if (-not ([System.Management.Automation.PSTypeName]"Win32Focus").Type) { Add-Type -TypeDefinition $code }',
      '  [Win32Focus]::ShowWindow($p.MainWindowHandle, 9)',
      '  [Win32Focus]::SetForegroundWindow($p.MainWindowHandle)',
      '}'
    ].join('\n');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { timeout: 5000, windowsHide: true });
  } catch (_) {
    // Se falhar silenciosamente, não interfere com a conexão
  }
}

function getErrorMessage(err) {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}

function setupAutoUpdater() {
  function sendUpdateStatus(data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', data);
    }
  }

  // Handlers sempre registrados (dev ou prod)
  ipcMain.handle('updater:check', () => {
    if (!app.isPackaged) return;
    autoUpdater.checkForUpdates().catch((err) => {
      sendLog(`Falha ao verificar atualizacoes: ${getErrorMessage(err)}`, 'warn');
    });
  });

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return;
    autoUpdater.quitAndInstall();
  });

  if (!app.isPackaged) {
    sendLog('Auto-update desativado no modo desenvolvimento.', 'info');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ state: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ state: 'none' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent || 0) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ state: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendLog(`Erro no sistema de update: ${getErrorMessage(err)}`, 'warn');
    sendUpdateStatus({ state: 'none' });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      sendLog(`Falha ao verificar atualizacoes: ${getErrorMessage(err)}`, 'warn');
    });
  }, 8000);
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#0d1117',
    title: 'PurrPat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state', { minimized: true });
    }
  });

  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state', { minimized: false });
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Widget server (OBS / VTube Studio overlay) ───────────────────────────────

function startWidgetServer() {
  const expressApp = express();
  const httpServer = http.createServer(expressApp);
  widgetIO = new SocketServer(httpServer);

  expressApp.use(express.static(path.join(__dirname, 'public')));

  // Compatibility endpoint queried by patpat.html
  expressApp.get('/last-patpat', (req, res) => {
    const settings = settingsManager.get();
    const last = twitchBot.getLastPatPat();
    res.json({ ...last, settings });
  });

  // Preview endpoint — returns only settings (no user), so patpat.html falls back to localStorage
  expressApp.get('/preview-patpat', (req, res) => {
    const settings = settingsManager.get();
    res.json({ settings });
  });

  expressApp.get('/patpat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patpat.html'));
  });

  widgetIO.on('connection', (socket) => {
    sendLog('Browser overlay conectado.', 'info');
    socket.emit('current_state', { lastPatPat: twitchBot.getLastPatPat(), settings: settingsManager.get() });
    // Re-send last preview payload to newly connected sockets (handles timing race)
    if (_lastPreviewPayload) {
      socket.emit('preview_patpat', _lastPreviewPayload);
    }
  });

  httpServer.listen(3000, () => {
    sendLog('Widget server ativo em http://localhost:3000/patpat', 'success');
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendLog(message, type = 'info') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', { message, type, timestamp: new Date().toISOString() });
  }
}

function sendStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', {
      twitch: twitchBot.isConnected(),
      paused: twitchBot.isPaused(),
      vtuber: vtuberAPI.isConnected(),
      auth: authManager.isAuthenticated(),
      username: authManager.getPublicCredentials().username
    });
  }
}

// ─── Bot / API event wiring ───────────────────────────────────────────────────

twitchBot.on('log', ({ message, type }) => sendLog(message, type));

twitchBot.on('status', () => sendStatus());

twitchBot.on('patpat', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('patpat-event', data);
  }
  if (widgetIO) widgetIO.emit('patpat', data);

  const settings = settingsManager.get();
  if (settings.vtubeStudioEnabled && vtuberAPI.isConnected()) {
    vtuberAPI.spawnWebItem(settings.vtubeStudioItemUrl || 'http://localhost:3000/patpat');
    if (settings.vtubeExpressionHotkeyId) {
      vtuberAPI.triggerExpression(settings.vtubeExpressionHotkeyId).catch((err) => {
        sendLog(`Falha ao acionar expressão: ${getErrorMessage(err)}`, 'warn');
      });
    }
  }
});

twitchBot.on('change-gif', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('change-gif', data);
  }
  if (widgetIO) widgetIO.emit('change_patpat_gif', data);
});

vtuberAPI.on('log', ({ message, type }) => sendLog(message, type));
vtuberAPI.on('status', () => sendStatus());
vtuberAPI.on('auth-request', () => focusVTubeStudioWindow());

// ─── IPC: Auth ────────────────────────────────────────────────────────────────

ipcMain.handle('open-external', (_e, url) => {
  // Only allow https URLs to prevent SSRF-style abuse
  if (typeof url === 'string' && url.startsWith('https://')) shell.openExternal(url);
});

ipcMain.handle('auth:get-status', () => ({
  authenticated: authManager.isAuthenticated(),
  credentials: authManager.getPublicCredentials()
}));

ipcMain.handle('twitch:list-rewards', async () => {
  try {
    const rewards = await authManager.listRewards();
    return { success: true, rewards };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), rewards: [] };
  }
});


ipcMain.handle('auth:start-twitch', async () => {
  try {
    const url = authManager.getAuthUrl();
    shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auth:logout', () => {
  twitchBot.disconnect();
  authManager.logout();
  sendStatus();
  return { success: true };
});

// ─── IPC: Bot ─────────────────────────────────────────────────────────────────

ipcMain.handle('bot:connect', async () => {
  try {
    const auth = authManager.getCredentials();
    if (!auth.accessToken) throw new Error('Você precisa fazer login com a Twitch primeiro.');
    await twitchBot.connect(auth);
    sendStatus();
    return { success: true };
  } catch (err) {
    const message = getErrorMessage(err);
    sendLog(`Erro ao conectar bot: ${message}`, 'error');
    return { success: false, error: message };
  }
});

ipcMain.handle('bot:disconnect', async () => {
  await twitchBot.disconnect();
  sendStatus();
  return { success: true };
});

ipcMain.handle('bot:pause', () => {
  twitchBot.pause();
  sendStatus();
  return { success: true };
});

ipcMain.handle('bot:resume', () => {
  twitchBot.resume();
  sendStatus();
  return { success: true };
});

// ─── IPC: VTuber Studio ───────────────────────────────────────────────────────

ipcMain.handle('vtuber:connect', async () => {
  try {
    const settings = settingsManager.get();
    await vtuberAPI.connect(settings.vtubeStudioPort || 8001);
    sendStatus();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vtuber:disconnect', () => {
  vtuberAPI.disconnect();
  sendStatus();
  return { success: true };
});

ipcMain.handle('vtuber:list-expressions', async () => {
  try {
    const expressions = await vtuberAPI.listExpressions();
    return { success: true, expressions };
  } catch (err) {
    return { success: false, error: getErrorMessage(err), expressions: [] };
  }
});

// ─── IPC: Settings ────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => settingsManager.get());

ipcMain.handle('settings:set', (_e, newSettings) => {
  settingsManager.set(newSettings);
  return { success: true };
});

// ─── IPC: Users ───────────────────────────────────────────────────────────────

ipcMain.handle('users:get-all', () => Object.values(userManager.getAll()));

ipcMain.handle('users:ban', (_e, { username, reason }) => {
  const ok = userManager.ban(username, reason);
  if (ok) sendLog(`Usuário banido: ${username}`, 'warn');
  return { success: ok };
});

ipcMain.handle('users:unban', (_e, { username }) => {
  const ok = userManager.unban(username);
  if (ok) sendLog(`Usuário desbanido: ${username}`, 'success');
  return { success: ok };
});

ipcMain.handle('users:delete', (_e, username) => {
  const ok = userManager.delete(username);
  if (ok) {
    sendLog(`Usuário removido permanentemente: ${username}`, 'warn');
    if (widgetIO) widgetIO.emit('user-removed', { username });
  }
  return { success: ok };
});

// ─── IPC: Preview ─────────────────────────────────────────────────────────────

ipcMain.handle('preview:spawn', (_e, { username, displayName, color, gifFile: chosenGif }) => {
  if (!widgetIO) return { success: false, error: 'Widget server não iniciado' };
  const settings = settingsManager.get();
  let gifFile = chosenGif;
  if (!gifFile) {
    const files = fs.readdirSync(PATPATS_DIR).filter((f) => /\.(gif|png)$/i.test(f));
    const cmds = settings.patpatCommands || {};
    const pool = Object.values(cmds).length > 0 ? Object.values(cmds) : files;
    gifFile = pool.length > 0 ? pool[0] : 'pet_blue.gif';
  }

  _lastPreviewPayload = {
    user: displayName || username || 'preview',
    username: username || 'preview',
    color: color || '#9146ff',
    message: '',
    platform: 'twitch',
    timestamp: Date.now(),
    currentGif: gifFile,
    isSubscriber: false,
    isPreview: true
  };
  widgetIO.emit('preview_patpat', _lastPreviewPayload);
  return { success: true };
});

ipcMain.handle('customize:preview-update', (_e, data) => {
  if (widgetIO) widgetIO.emit('customize_preview', data);
  return { success: true };
});

ipcMain.handle('customize:apply', (_e, data) => {
  const { gifScale, nicknameFontSize, nicknameOffsetY, nicknameOffsetX, nicknameGlow, nicknameOutline, nicknameFont, showPlatformIcon } = data;
  settingsManager.set({ gifScale, nicknameFontSize, nicknameOffsetY, nicknameOffsetX, nicknameGlow, nicknameOutline, nicknameFont, showPlatformIcon });
  if (widgetIO) widgetIO.emit('customize_apply', { gifScale, nicknameFontSize, nicknameOffsetY, nicknameOffsetX, nicknameGlow, nicknameOutline, nicknameFont, showPlatformIcon });
  return { success: true };
});


ipcMain.handle('patpat:spawn-manual', (_e, { username }) => {
  const user = Object.values(userManager.getAll()).find((u) => u.username === username);
  if (!user) return { success: false, error: 'Usuário não encontrado' };
  const settings = settingsManager.get();

  // Usa dados ao vivo da sessão (sub, cor atual) se disponível
  const liveData = twitchBot.getSessionViewer(username);
  const color = (liveData && liveData.color) || user.color || '#ffffff';
  const isSubscriber = liveData ? liveData.isSubscriber : false;
  const displayName = (liveData && liveData.displayName) || user.displayName || user.username;

  // Usa o gif salvo do usuário; fallback para o primeiro gif disponivel
  const savedGif = user.lastGif;
  let gifFile = savedGif;
  if (!gifFile) {
    const files = fs.readdirSync(PATPATS_DIR).filter((f) => /\.(gif|png)$/i.test(f));
    const cmds = settings.patpatCommands || {};
    const pool = Object.values(cmds).length > 0 ? Object.values(cmds) : files;
    gifFile = pool.length > 0 ? pool[0] : 'pet_blue.gif';
  }
  const payload = {
    user: displayName,
    username: user.username,
    color,
    message: '',
    platform: 'twitch',
    timestamp: Date.now(),
    currentGif: gifFile,
    isSubscriber
  };
  // Registra sessão no bot para que !pat funcione após spawn manual
  twitchBot.registerManualSpawn(user.username, gifFile);
  twitchBot.setLastPatPat(payload);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('patpat-event', payload);
  if (widgetIO) widgetIO.emit('new_patpat', payload);
  if (settings.vtubeStudioEnabled && vtuberAPI.isConnected()) {
    vtuberAPI.spawnWebItem(settings.vtubeStudioItemUrl || 'http://localhost:3000/patpat');
    if (settings.vtubeExpressionHotkeyId) {
      vtuberAPI.triggerExpression(settings.vtubeExpressionHotkeyId).catch((err) => {
        sendLog(`Falha ao acionar expressão: ${getErrorMessage(err)}`, 'warn');
      });
    }
  }
  sendLog(`Pat Pat manual para @${user.username} (GIF: ${gifFile})`, 'success');
  return { success: true };
});

// ─── IPC: Pat Pats gallery ────────────────────────────────────────────────────

ipcMain.handle('patpats:get-all', () => {
  const files = fs.readdirSync(PATPATS_DIR).filter((f) => /\.(gif|png)$/i.test(f));
  const settings = settingsManager.get();
  const gifToCmd = {};
  for (const [cmd, gif] of Object.entries(settings.patpatCommands || {})) {
    gifToCmd[gif] = cmd;
  }
  return files.map((filename) => ({
    filename,
    command: gifToCmd[filename] || '',
    url: `http://localhost:3000/patpats/${filename}`
  }));
});

ipcMain.handle('patpats:set-command', (_e, { filename, command }) => {
  const settings = settingsManager.get();
  const cmds = { ...settings.patpatCommands };
  for (const [cmd, gif] of Object.entries(cmds)) {
    if (gif === filename) delete cmds[cmd];
  }
  if (command && command.trim()) {
    cmds[command.trim().toLowerCase()] = filename;
  }
  settingsManager.set({ patpatCommands: cmds });
  return { success: true };
});

ipcMain.handle('patpats:import', async () => {
  if (!mainWindow) return { success: false };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar Pat Pat',
    filters: [{ name: 'Imagem', extensions: ['gif', 'png'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled) return { success: false, canceled: true };

  const imported = [];
  for (const filePath of result.filePaths) {
    const filename = path.basename(filePath);
    fs.copyFileSync(filePath, path.join(PATPATS_DIR, filename));
    imported.push(filename);
  }
  sendLog(`${imported.length} pat pat(s) importado(s): ${imported.join(', ')}`, 'success');
  return { success: true, imported };
});

ipcMain.handle('patpats:delete', (_e, { filename }) => {
  const filePath = path.join(PATPATS_DIR, filename);
  if (!fs.existsSync(filePath)) return { success: false, error: 'Arquivo não encontrado.' };
  fs.unlinkSync(filePath);
  const settings = settingsManager.get();
  const cmds = { ...settings.patpatCommands };
  for (const [cmd, gif] of Object.entries(cmds)) {
    if (gif === filename) delete cmds[cmd];
  }
  settingsManager.set({ patpatCommands: cmds });
  sendLog(`Pat Pat removido: ${filename}`, 'info');
  return { success: true };
});

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  startWidgetServer();
  setupAutoUpdater();

  authManager.startCallbackServer(({ username, displayName }) => {
    sendLog(`✅ Autenticado como ${displayName}!`, 'success');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-complete', { username, displayName });
    }
    sendStatus();

    // Auto-connect bot after successful auth
    setTimeout(async () => {
      try {
        const auth = authManager.getCredentials();
        await twitchBot.connect(auth);
        sendStatus();
      } catch (err) {
        sendLog(`Falha ao conectar bot: ${err.message}`, 'error');
      }
    }, 1000);
  });

  // Auto-connect if already authenticated
  if (authManager.isAuthenticated()) {
    setTimeout(async () => {
      try {
        await twitchBot.connect(authManager.getCredentials());
        sendLog('Reconectado automaticamente à Twitch.', 'success');
        sendStatus();
      } catch (err) {
        sendLog(`Falha ao reconectar na Twitch: ${err.message}`, 'warn');
      }

      try {
        const settings = settingsManager.get();
        await vtuberAPI.connect(settings.vtubeStudioPort || 8001);
      } catch (_) {
        sendLog('VTube Studio não encontrado — conecte manualmente quando estiver aberto.', 'warn');
      }
    }, 2500);
  }
});

app.on('window-all-closed', async () => {
  await twitchBot.disconnect();
  vtuberAPI.disconnect();
  authManager.stopCallbackServer();
  app.quit();
});
