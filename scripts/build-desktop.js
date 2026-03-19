#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 开始构建桌面应用...');

// 1. 构建Web应用
console.log('📦 构建Web应用...');
execSync('npm run build', { stdio: 'inherit' });

// 2. 创建Electron目录和文件
console.log('⚡ 设置Electron环境...');
const electronDir = path.join(__dirname, '../electron');
if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

// 3. 创建主进程文件
const mainJs = `
const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let tray = null;
let isQuitting = false;

function getIconPath() {
  return path.join(__dirname, '../dist/icon.png');
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) return;

  tray = new Tray(getIconPath());
  tray.setToolTip('GitHub Stars Manager');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => showWindow(),
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));

  tray.on('double-click', () => showWindow());
  tray.on('click', () => showWindow());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: getIconPath(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('activate', () => {
  if (mainWindow) {
    showWindow();
  } else {
    createWindow();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
`;

fs.writeFileSync(path.join(electronDir, 'main.js'), mainJs);

// 4. 创建Electron package.json
const electronPackageJson = {
  name: 'github-stars-manager-desktop',
  version: '1.0.0',
  description: 'GitHub Stars Manager Desktop App',
  main: 'main.js',
  author: 'GitHub Stars Manager',
  license: 'MIT'
};

fs.writeFileSync(
  path.join(electronDir, 'package.json'), 
  JSON.stringify(electronPackageJson, null, 2)
);

// 5. 安装Electron依赖
console.log('📥 安装Electron依赖...');
try {
  execSync('npm install --save-dev electron electron-builder', { stdio: 'inherit' });
} catch (error) {
  console.error('安装依赖失败:', error.message);
  process.exit(1);
}

// 6. 构建应用
console.log('🔨 构建桌面应用...');
try {
  execSync('npx electron-builder', { stdio: 'inherit' });
  console.log('✅ 桌面应用构建完成！');
  console.log('📁 构建文件位于 release/ 目录');
} catch (error) {
  console.error('构建失败:', error.message);
  process.exit(1);
}
