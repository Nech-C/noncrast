// db.ts
import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import Database from 'better-sqlite3';

import defaults from './config/defaults.json';
import { TaskType, AddableTask } from './types'


const q = (ident: string) => `"${String(ident).replace(/"/g, '""')}"`;

export class DbClient {
  private db: Database;
  private table: string;

  /**
   * Construct a DbClient.
   * @param dbPath - optional absolute or relative path to DB file. If omitted default
   *                 is built from electron.app.getPath(defaults.db.location)
   *                 and defaults.db.filename.
   *
   * Throws an Error if the database cannot be opened.
   */
  constructor(dbPath?: string) {
    const p = dbPath?.trim()
      ? path.resolve(dbPath)
      : path.join(app.getPath(defaults.db.location), defaults.db.filename);

    fs.mkdirSync(path.dirname(p), { recursive: true });

    try {
      this.db = new Database(p);
    } catch (err) {
      // Fail fast so no method runs with an invalid handle
      throw new Error(`Failed to init the database at ${p}: ${(err as Error).message}`);
    }

    // Pragmas before schema work
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this.table = q(defaults.db.tasks_table_name);

    // Schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INTEGER PRIMARY KEY,
        task_name TEXT,
        description TEXT,
        status TEXT CHECK(status IN ('todo','in-progress','done')) DEFAULT 'todo',
        created_at INTEGER,
        updated_at INTEGER,
        completed_at INTEGER,
        timespent INTEGER,
        timeset INTEGER,
        due INTEGER
      )
    `);

    // Lightweight migration: add 'due' column if missing in existing DBs
    try {
      const cols = this.db.prepare(`PRAGMA table_info(${this.table})`).all() as Array<{ name: string }>;
      const hasDue = cols?.some((c) => c.name === 'due');
      if (!hasDue) {
        this.db.exec(`ALTER TABLE ${this.table} ADD COLUMN due INTEGER`);
      }
    } catch (e) {
      // Ignore migration error to avoid blocking app start; schema already handles fresh DBs
    }
  }

  close() {
    this.db.close();
  }

  /**
   * Fetch a task by id
   * @param id Id of the task to fetch
   * @returns The task object or undefined
   */
  getTaskById(id: number): TaskType | undefined {
    return this.db
      .prepare(`SELECT * FROM ${this.table} WHERE id=@id LIMIT 1`)
      .get({ id }) as TaskType | undefined;
  }

  /**
   * Fetch tasks filtered by status, ordered by created_at desc.
   * @param status Target status
   * @returns The array of all specified tasks
   */
  getTasksByStatus(status: TaskType['status']): TaskType[] {
    return this.db
      .prepare(`SELECT * FROM ${this.table} WHERE status=@status ORDER BY created_at DESC`)
      .all({ status }) as TaskType[];
  }

  /**
   * 
   * @param input Task to be inserted
   * @returns The inserted task
   */
  insertTask(input: AddableTask): TaskType {
    const now = Date.now();
    const info = this.db.prepare(`
      INSERT INTO ${this.table} (
        task_name, description, status,
        created_at, updated_at, completed_at,
        timespent, timeset, due
      )
      VALUES (
        @task_name, @description, COALESCE(@status, 'todo'),
        @created_at, NULL, NULL,
        @timespent, @timeset, @due
      )
    `).run({
      task_name: input.task_name ?? null,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      created_at: now,
      timespent: input.timespent ?? 0,
      timeset: input.timeset ?? 0,
      due: input.due ?? null,
    });

    const task = this.getTaskById(Number(info.lastInsertRowid));
    if (!task) throw new Error('Insert succeeded but task not found (race or DB issue).');
    return task;
  }

  /**
   * 
   * @param id id of the task to update
   * @param status new status
   * @returns Updated Task or undefined
   */
  updateTaskStatus(id: number, status: TaskType['status']): TaskType | undefined {
    const now = Date.now();
    const res = this.db.prepare(`
      UPDATE ${this.table}
      SET status=@status,
          updated_at=@now,
          completed_at=CASE WHEN @status='done'
                            THEN COALESCE(completed_at, @now)
                            ELSE NULL END
      WHERE id=@id
    `).run({ id, status, now });

    return res.changes ? this.getTaskById(id) : undefined;
  }

  /**
   * 
   * @param id id of the task to delete
   * @returns true for successful deletion. false otherwise.
   */
  deleteTask(id: number): boolean {
    const res = this.db.prepare(`DELETE FROM ${this.table} WHERE id=@id`).run({ id });
    return res.changes > 0;
  }
}

let singleton: DbClient | null = null;

export function getDb(): DbClient {
  if (!singleton) singleton = new DbClient(process.env.NONCRAST_DB_PATH);
  return singleton;
}
export function closeDb() {
  if (singleton) { singleton.close(); singleton = null; }
}
