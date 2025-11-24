import { TaskType } from 'src/types';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

import { TaskType, AddableTask } from './types';
import { getDb } from './db';

// Determine dev mode: running via forge/vite dev server or not packaged
const isDev = !!(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL) || !app.isPackaged;

// For dev runs (npm start), use a temp DB file to avoid persistence
if (isDev) {
  try {
    const tmpRoot = path.join(os.tmpdir(), 'noncrast-dev-db');
    fs.mkdirSync(tmpRoot, { recursive: true });
    const tmpDb = path.join(tmpRoot, `noncrast-${process.pid}.db`);
    process.env.NONCRAST_DB_PATH = tmpDb;
    console.info("temp db path: ", tmpDb)
  } catch {
    // best-effort; fallback to default path if this fails
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function handleUpdateTaskStatus(event, id: TaskType['id'], status: TaskType['status']) {
  // Coerce id to number defensively
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return;
  getDb().updateTaskStatus(numericId, status);
}


const createWindow = () => {
  // Create the browser window.
  ipcMain.on('db:updateTaskStatus', handleUpdateTaskStatus)
  ipcMain.handle('db:getTasks', () => {
    return getDb().getAllTasks();
  });
  ipcMain.handle('db:createTask', (_event, input: AddableTask) => {
    return getDb().insertTask(input);
  });
  ipcMain.handle('db:updateTask', (_event, input: TaskType) => {
    return getDb().updateTask(input);
  })
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // In dev, seed some default tasks if DB is empty
  if (isDev) {
    try {
      const db = getDb();
      if (db.countTasks() === 0) {
        const { devTasks } = await import('./config/devTasks');
        devTasks.forEach((t: AddableTask) => {
          db.insertTask(t);
        });
      }
    } catch (err) {
      // ignore seed errors in dev to not block startup
      console.warn('Dev seed skipped:', err);
    }
  }
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
