import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

import { SETTINGS } from '../config/constants';
import { SettingsSchema, defaultSettings, Settings, SettingsUpdate } from './schema';

let cachedSettings: Settings | null = null;

function settingsPath(): string {
  const dir = app.getPath('userData');
  return path.join(dir, SETTINGS.file);
}

function persist(settings: Settings): Settings {
  const p = settingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
  cachedSettings = settings;
  return settings;
}

function readFromDisk(): Settings | null {
  try {
    const p = settingsPath();
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    return SettingsSchema.parse(parsed);
  } catch (err) {
    console.warn('[settings] failed to read settings, using defaults:', err);
    return null;
  }
}

export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings;
  const disk = readFromDisk();
  if (disk) {
    cachedSettings = disk;
    return disk;
  }
  return persist(defaultSettings);
}

export function updateSettings(update: SettingsUpdate): Settings {
  const merged = SettingsSchema.parse({
    ...getSettings(),
    ...update,
  });
  return persist(merged);
}

export function resetSettings(): Settings {
  return persist(defaultSettings);
}
