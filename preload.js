const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('purrpat', {
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:get-status'),
    listRewards: () => ipcRenderer.invoke('twitch:list-rewards'),
    startTwitch: () => ipcRenderer.invoke('auth:start-twitch'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  bot: {
    connect: () => ipcRenderer.invoke('bot:connect'),
    disconnect: () => ipcRenderer.invoke('bot:disconnect'),
    pause: () => ipcRenderer.invoke('bot:pause'),
    resume: () => ipcRenderer.invoke('bot:resume')
  },
  vtuber: {
    connect: () => ipcRenderer.invoke('vtuber:connect'),
    disconnect: () => ipcRenderer.invoke('vtuber:disconnect'),
    listExpressions: () => ipcRenderer.invoke('vtuber:list-expressions')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (data) => ipcRenderer.invoke('settings:set', data)
  },
  users: {
    getAll: () => ipcRenderer.invoke('users:get-all'),
    ban: (username, reason) => ipcRenderer.invoke('users:ban', { username, reason }),
    unban: (username) => ipcRenderer.invoke('users:unban', { username }),
    delete: (username) => ipcRenderer.invoke('users:delete', username),
    spawnManual: (username) => ipcRenderer.invoke('patpat:spawn-manual', { username })
  },
  patpats: {
    getAll: () => ipcRenderer.invoke('patpats:get-all'),
    setCommand: (filename, command) => ipcRenderer.invoke('patpats:set-command', { filename, command }),
    importFiles: () => ipcRenderer.invoke('patpats:import'),
    delete: (filename) => ipcRenderer.invoke('patpats:delete', { filename })
  },
  preview: {
    spawn: (data) => ipcRenderer.invoke('preview:spawn', data)
  },
  customize: {
    previewUpdate: (data) => ipcRenderer.invoke('customize:preview-update', data),
    apply: (data) => ipcRenderer.invoke('customize:apply', data)
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, data) => callback(data));
  },
  off: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install')
  }
});
