import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { Worker } from 'node:worker_threads';

import { TaskType, AddableTask, FocusSession, Interruption, AddableInterruption } from './types';
import { getDb } from './db';

let mainWindow: BrowserWindow | null = null;
let mlWorker: Worker | null = null;
let monitorInterval: NodeJS.Timeout | null = null;
let nextJobId = 0;

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

function createMLWorker() {
  if (mlWorker) return; // already created

  const workerPath = path.join(__dirname, 'mlWorker.js'); // compiled location
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
    console.error('[ML worker] error:', err);
  });

  mlWorker.on('exit', (code) => {
    console.log('[ML worker] exited with code', code);
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

  return primary.thumbnail.toPNG(); // Buffer
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

    console.log('[ML] starting monitoring interval');

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
        console.log('[ML] posted classify job', id);
      } catch (err) {
        console.error('[ML] capture or post failed:', err);
      }
    }, 5000); // every 5 secs

    return true;
  });
  
  ipcMain.handle('ml:stopMonitoring', async () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    return true;
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
