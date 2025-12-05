export const DB = {
  filename: 'noncrast.db',
  location: 'userData',
  tables: {
    tasks: 'tasks',
    focusSessions: 'focus_sessions',
    interruptions: 'interruptions_table',
  },
} as const;

export const SETTINGS = {
  file: 'settings.json',
  channels: {
    get: 'settings:get',
    update: 'settings:update',
    reset: 'settings:reset',
  },
} as const;
