import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { Settings, defaultSettings, SettingsUpdate } from '../settings/schema';

type SettingsCtx = {
  settings: Settings;
  refresh: () => Promise<Settings>;
  update: (patch: SettingsUpdate) => Promise<Settings>;
  reset: () => Promise<Settings>;
};

const Ctx = createContext<SettingsCtx | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fetched = await window.noncrast?.getSettings?.();
        if (fetched && mounted) setSettings(fetched);
      } catch (err) {
        console.warn('Failed to load settings, using defaults', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function refresh() {
    const next = await window.noncrast?.getSettings?.();
    if (next) setSettings(next);
    return next ?? settings;
  }

  async function update(patch: SettingsUpdate) {
    const next = await window.noncrast?.updateSettings?.(patch);
    if (next) setSettings(next);
    return next ?? settings;
  }

  async function reset() {
    const next = await window.noncrast?.resetSettings?.();
    if (next) setSettings(next);
    return next ?? settings;
  }

  const value = useMemo<SettingsCtx>(() => ({
    settings,
    refresh,
    update,
    reset,
  }), [settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
