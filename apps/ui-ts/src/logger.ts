import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

// Simple file + console logger for main process.
// Writes to %appdata%/noncrast/logs/YYYY-MM-DD.log on Windows.

const logDir = path.join(app.getPath('userData'), 'logs');
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  /* ignore */
}

const logFile = path.join(
  logDir,
  `${new Date().toISOString().slice(0, 10)}.log`,
);

function write(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: any) {
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${msg}${
    data === undefined ? '' : ` ${safeStringify(data)}`
  }\n`;

  // Mirror to console for dev/DevTools visibility
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(line.trim());

  try {
    fs.appendFileSync(logFile, line);
  } catch (err) {
    console.error('Failed to write log file', err);
  }
}

function safeStringify(value: any) {
  try {
    if (value instanceof Error) {
      return JSON.stringify({
        message: value.message,
        stack: value.stack,
        code: (value as any).code,
      });
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

export const logger = {
  info: (msg: string, data?: any) => write('info', msg, data),
  warn: (msg: string, data?: any) => write('warn', msg, data),
  error: (msg: string, data?: any) => write('error', msg, data),
  debug: (msg: string, data?: any) => write('debug', msg, data),
  logFile,
};
