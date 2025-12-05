import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, beforeEach, afterEach, it, vi } from 'vitest';

import { SETTINGS } from '../src/config/constants';
import { defaultSettings } from '../src/settings/schema';

let userDataDir: string;

vi.mock('electron', () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

describe('settings/storage', () => {
  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noncrast-settings-'));
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  const loadStorage = async () => import('../src/settings/storage');

  it('writes defaults to disk when no settings exist', async () => {
    const { getSettings } = await loadStorage();

    const settings = getSettings();
    expect(settings).toEqual(defaultSettings);

    const filePath = path.join(userDataDir, SETTINGS.file);
    expect(fs.existsSync(filePath)).toBe(true);

    const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(disk).toEqual(defaultSettings);
  });

  it('merges updates and persists them', async () => {
    const { updateSettings } = await loadStorage();

    const updated = updateSettings({ theme: 'dark', endOfDay: 5 });
    expect(updated.theme).toBe('dark');
    expect(updated.endOfDay).toBe(5);
    expect(updated.enableDetection).toBe(defaultSettings.enableDetection);

    const filePath = path.join(userDataDir, SETTINGS.file);
    const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(disk.theme).toBe('dark');
    expect(disk.endOfDay).toBe(5);
  });

  it('resets to defaults', async () => {
    const { updateSettings, resetSettings } = await loadStorage();

    updateSettings({ theme: 'dark', endOfDay: 10 });
    const reset = resetSettings();
    expect(reset).toEqual(defaultSettings);

    const filePath = path.join(userDataDir, SETTINGS.file);
    const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(disk).toEqual(defaultSettings);
  });
});
