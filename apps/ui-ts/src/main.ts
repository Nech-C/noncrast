import { app, BrowserWindow, ipcMain, desktopCapturer, Notification } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { Worker } from 'node:worker_threads';
import { logger } from './logger';

import { TaskType, AddableTask, FocusSession, Interruption, AddableInterruption } from './types';
import { getDb } from './db';
import { getSettings, resetSettings, updateSettings } from './settings/storage';
import { SETTINGS } from './config/constants';

let mainWindow: BrowserWindow | null = null;
let mlWorker: Worker | null = null;
let monitorInterval: NodeJS.Timeout | null = null; 
let nextJobId = 0;

// Determine dev mode: running via forge/vite dev server or not packaged
const isDev = !!(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL) || !app.isPackaged;

function resolveWorkerPath() {
  // In dev the file sits next to main bundle in .vite/build
  const devPath = path.join(__dirname, 'mlWorker.js');
  if (isDev) return devPath;

  // In packaged builds we unpack mlWorker.js (see forge.config.ts)
  const unpackedPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    '.vite',
    'build',
    'mlWorker.js',
  );
  if (fs.existsSync(unpackedPath)) return unpackedPath;

  // Fallback to whatever __dirname resolves to (in asar) if all else fails
  return devPath;
}

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

function createMLWorker() {
  if (mlWorker) return; // already created

  const workerPath = resolveWorkerPath(); // compiled location (unpacked in prod)
  logger.info('ML worker path resolved', workerPath);
  mlWorker = new Worker(workerPath);

  mlWorker.on('message', (msg: any) => {
    // Forward classification result to renderer
    if (mainWindow) {
      mainWindow.webContents.send('ml:result', msg);
      // 
      console.log('[ML result]', msg);
    }
  });

  mlWorker.on('error', (err) => {
    logger.error('[ML worker] error', {
      message: err?.message,
      stack: err?.stack,
      code: (err as any)?.code,
      name: err?.name,
    });
  });

  mlWorker.on('exit', (code) => {
    logger.warn('[ML worker] exited', { code });
    mlWorker = null;
  });
}

async function captureThumbnail(): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 224, height: 224 }, // good size for CLIP
  });

  const primary = sources[0];
  if (!primary) {
    throw new Error('No screen sources found');
  }

  logger.debug('[ML] captured thumbnail');
  return primary.thumbnail.toPNG(); // Buffer
}

function showNotification(title: string, body: string) {
  const notification = new Notification({
    title,
    body
  });

  notification.show();
}


function handleUpdateTaskStatus(event, id: TaskType['id'], status: TaskType['status']) {
  // Coerce id to number defensively
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return;
  getDb().updateTaskStatus(numericId, status);
}


const createWindow = () => {
  // Create the browser window.
  ipcMain.handle(SETTINGS.channels.get, () => {
    return getSettings();
  });
  ipcMain.handle(SETTINGS.channels.update, (_event, payload) => {
    return updateSettings(payload ?? {});
  });
  ipcMain.handle(SETTINGS.channels.reset, () => {
    return resetSettings();
  });

  ipcMain.on('db:updateTaskStatus', handleUpdateTaskStatus)
  ipcMain.handle('db:getTasks', () => {
    return getDb().getAllTasks();
  });
  ipcMain.handle('db:createTask', (_event, input: AddableTask) => {
    return getDb().insertTask(input);
  });
  ipcMain.handle('db:updateTask', (_event, input: TaskType) => {
    return getDb().updateTask(input);
  });
  ipcMain.handle('db:deleteTask', (_event, input: TaskType["id"]) => {
    return getDb().deleteTask(input);
  });

  ipcMain.handle('db:getFocusSessions', () => getDb().getAllFocusSessions());
  ipcMain.handle('db:getFocusSessionById', (_event, id: FocusSession['id']) => {
    return getDb().getFocusSessionById(Number(id));
  });
  ipcMain.handle('db:getFocusSessionsByTask', (_event, taskId: FocusSession['task_id']) => {
    return getDb().getFocusSessionsByTask(taskId);
  });
  ipcMain.handle('db:getFocusSessionsByDateRange', (_event, start: number, end: number) => {
    return getDb().getFocusSessionsByDateRange(start, end);
  });
  ipcMain.handle('db:createFocusSession', (_event, plannedMs: FocusSession['planned_ms'], taskId?: FocusSession['task_id']) => {
    return getDb().createFocusSession(plannedMs, taskId);
  });
  ipcMain.handle('db:updateFocusSession', (_event, session: FocusSession) => {
    return getDb().updateFocusSession(session);
  });
  ipcMain.handle('db:deleteFocusSessionsByTask', (_event, taskId: FocusSession['task_id']) => {
    return getDb().deleteFocusSessionByTask(taskId);
  });

  ipcMain.handle('db:getInterruptionsBySession', (_event, sessionId: Interruption['session_id']) => {
    return getDb().getInterruptionsBySession(Number(sessionId));
  });
  ipcMain.handle('db:getInterruptionById', (_event, id: Interruption['id']) => {
    return getDb().getInterruptionById(Number(id));
  });
  ipcMain.handle('db:createInterruption', (_event, input: AddableInterruption) => {
    return getDb().createInterruption(input);
  });
  ipcMain.handle('db:updateInterruption', (_event, input: Interruption) => {
    return getDb().updateInterruption(input);
  });
  ipcMain.handle('db:deleteInterruption', (_event, id: Interruption['id']) => {
    return getDb().deleteInterruption(Number(id));
  });

  ipcMain.handle('ml:startMonitoring', async () => {
    createMLWorker();

    if (monitorInterval) {
      // already running
      return true;
    }

    const settings = getSettings();
    if (!settings.enableDetection) {
      logger.info('[ML] detection disabled in settings; not starting');
      return false;
    }

    const intervalMs = Math.max(500, (settings.interruptionDetectionIntervalS ?? 5) * 1000);

    logger.info('[ML] starting monitoring interval', intervalMs);

    monitorInterval = setInterval(async () => {
      if (!mlWorker) return;
      try {
        const image = await captureThumbnail();
        const id = nextJobId++;

        mlWorker.postMessage({
          type: 'classify',
          id,
          image,
        });
        logger.debug('[ML] posted classify job', { id });
      } catch (err) {
        logger.error('[ML] capture or post failed', err);
      }
    }, intervalMs);

    return true;
  });
  
  ipcMain.handle('ml:stopMonitoring', async () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    return true;
  });

  ipcMain.handle('notify:sendNotification', async (_event, {title, body}: {title: string, body: string}) => {
    try {
      showNotification(title, body);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  });

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
  
  return mainWindow;
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
  mainWindow = createWindow();
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
    mainWindow = createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
