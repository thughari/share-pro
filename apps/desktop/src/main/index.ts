import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import path from 'node:path';

let mainWindow: BrowserWindow | undefined;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  }
}

ipcMain.handle('screen:sources', async () => desktopCapturer.getSources({
  types: ['screen', 'window'],
  thumbnailSize: { width: 320, height: 180 },
  fetchWindowIcons: true
}));

app.whenReady().then(createWindow);
