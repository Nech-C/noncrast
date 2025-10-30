// utils.ts
import os from 'os';
import fs from 'fs';
import path from 'path';

export function getTempDbPath(prefix="noncrast-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    dir,
    file: path.join(dir, "test.db"),
    cleanup: () => {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) {console.log(err)}
    }
  }
}
