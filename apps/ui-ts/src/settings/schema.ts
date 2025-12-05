// src/settings/schema.ts
import { z } from 'zod';

export const SettingsSchema = z.object({
  version: z.literal(0).default(0),
  
  // General
  endOfDay: z.int().max(23).min(0).default(0),

  // theme
  theme: z.enum(["light", "dark"]).default("light"), // TODO: implement dark theme

  // off-track
  enableDetection: z.boolean().default(true),
  interruptionDetectionIntervalS: z.number().min(1).default(1),
  interruptionThreshold: z.number().min(0).max(1).default(0.3),
  interruptionPauseTrigger: z.number().min(1).default(2),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsUpdate = Partial<Settings>;

export const defaultSettings: Settings = SettingsSchema.parse({});
