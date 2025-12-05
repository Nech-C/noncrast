import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let userDataDir: string;

vi.mock('electron', () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

describe('logger', () => {
  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noncrast-logger-'));
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    vi.restoreAllMocks();
  });

  const loadLogger = async () => import('../src/logger').then((m) => m.logger);

  it('writes info logs with serialized data to file', async () => {
    const logger = await loadLogger();
    const logPath = logger.logFile;

    logger.info('hello', { a: 1 });

    const content = fs.readFileSync(logPath, 'utf-8');
    expect(content).toContain('INFO');
    expect(content).toContain('hello');
    expect(content).toContain('"a":1');
  });

  it('serializes errors safely when logging error level', async () => {
    const logger = await loadLogger();
    const logPath = logger.logFile;

    const err = new Error('boom');
    logger.error('failed', err);

    const content = fs.readFileSync(logPath, 'utf-8');
    expect(content).toContain('ERROR');
    expect(content).toContain('failed');
    expect(content).toContain('boom');
    expect(content).toMatch(/"message":/);
  });
});
