const fs = require('fs');
const path = require('path');

const { app } = require('electron');
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let users = {};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[Users] Erro ao carregar:', err.message);
    users = {};
  }
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('[Users] Erro ao salvar:', err.message);
  }
}

load();

module.exports = {
  getAll: () => users,
  get: (username) => users[username.toLowerCase()],

  touch: (username, displayName, color) => {
    const key = username.toLowerCase();
    if (!users[key]) {
      users[key] = {
        username: key,
        displayName: displayName || username,
        color: color || '#ffffff',
        isBanned: false,
        banReason: null,
        lastSeen: Date.now(),
        patCount: 0
      };
    } else {
      users[key].lastSeen = Date.now();
      users[key].patCount = (users[key].patCount || 0) + 1;
      if (color) users[key].color = color;
      if (displayName) users[key].displayName = displayName;
    }
    save();
    return users[key];
  },

  ban: (username, reason) => {
    const key = username.toLowerCase();
    if (users[key]) {
      users[key].isBanned = true;
      users[key].banReason = reason || 'Banido pelo admin';
      save();
      return true;
    }
    return false;
  },

  unban: (username) => {
    const key = username.toLowerCase();
    if (users[key]) {
      users[key].isBanned = false;
      users[key].banReason = null;
      save();
      return true;
    }
    return false;
  },

  setLastGif: (username, gif) => {
    const key = username.toLowerCase();
    if (users[key]) {
      users[key].lastGif = gif;
      save();
    }
  },

  getLastGif: (username) => {
    const key = username.toLowerCase();
    return users[key] ? (users[key].lastGif || null) : null;
  },

  isBanned: (username) => {
    const key = username.toLowerCase();
    return !!(users[key] && users[key].isBanned);
  },

  delete: (username) => {
    const key = username.toLowerCase();
    if (users[key]) {
      delete users[key];
      save();
      return true;
    }
    return false;
  }
};
