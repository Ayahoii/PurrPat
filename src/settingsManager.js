const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'settings.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let settings = {
  showUserMessages: true,
  messageDuration: 10,
  patpatEnabled: true,
  patpatCommands: {},
  spawnMode: 'reward',
  commandModeRequireRedeem: true,
  commandCooldown: 30,
  vtubeStudioEnabled: false,
  vtubeStudioPort: 8001,
  vtubeStudioItemUrl: 'http://localhost:3000/patpat',
  vtubeExpressionHotkeyId: '',
  rewardId: '',
  gifScale: 1.0,
  nicknameFontSize: 28,
  nicknameOffsetY: 35,
  nicknameOffsetX: 50,
  nicknameGlow: true,
  nicknameOutline: true,
  nicknameFont: 'Arial',
  showPlatformIcon: true
};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      settings = { ...settings, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('[Settings] Erro ao carregar:', err.message);
  }
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('[Settings] Erro ao salvar:', err.message);
  }
}

load();

module.exports = {
  get: () => ({ ...settings }),
  set: (newSettings) => {
    if (!newSettings.patpatCommands) {
      newSettings.patpatCommands = settings.patpatCommands;
    }
    settings = { ...settings, ...newSettings };
    save();
    return { ...settings };
  },
  reload: load
};
