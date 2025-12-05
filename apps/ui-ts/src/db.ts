// db.ts
import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import Database from 'better-sqlite3';

import { DB } from './config/constants';
import { TaskType, AddableTask, FocusSession, Interruption, AddableInterruption } from './types'


const q = (ident: string) => `"${String(ident).replace(/"/g, '""')}"`;

export class DbClient {
  private db: Database.Database;
  private tasksTable: string;
  private focusSessionsTable: string;
  private interruptionsTable: string;

  /**
   * Construct a DbClient.
   * @param dbPath - optional absolute or relative path to DB file. If omitted default
   *                 is built from electron.app.getPath(DB.location)
   *                 and DB.filename.
   *
   * Throws an Error if the database cannot be opened.
   */
  constructor(dbPath?: string) {
    const p = dbPath?.trim()
      ? path.resolve(dbPath)
      : path.join(app.getPath(DB.location), DB.filename);

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

    this.tasksTable = q(DB.tables.tasks);

    // task Schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tasksTable} (
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

    this.focusSessionsTable = q(DB.tables.focusSessions);
    
    /**
     * About status:
     * active: timer is still on
     * completed: the session has been concluded. This scenario can happen when:
     * a) the time is up
     * b) the session(timer) is terminated early for any reason(e.g., finishing early)
     *  and the user wants to keep the time worked.
     * We only mark a session completed IF we want the time to count.
     * cancelled: the user doesn't want the session to be counted for whatever reason.
     */
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.focusSessionsTable} (
        id INTEGER PRIMARY KEY,
        task_id INTEGER REFERENCES ${this.tasksTable}(id),
        started_at INTEGER NOT NULL,  --ms
        ended_at INTEGER,  --ms
        planned_ms INTEGER,
        focus_ms INTEGER DEFAULT 0,
        status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
        notes TEXT
      );
    `)

    this.interruptionsTable = q(DB.tables.interruptions);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.interruptionsTable} (
        id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES ${this.focusSessionsTable}(id) ON DELETE CASCADE,
        occurred_at INTEGER NOT NULL,  -- ts
        duration_ms INTEGER NULL,  -- ms
        type TEXT NULL,
        note TEXT NULL,
        screenshot_uri TEXT NULL
      );
    `)

    // Lightweight migration: add 'due' column if missing in existing DBs
    try {
      const cols = this.db.prepare(`PRAGMA table_info(${this.tasksTable})`).all() as Array<{ name: string }>;
      const hasDue = cols?.some((c) => c.name === 'due');
      if (!hasDue) {
        this.db.exec(`ALTER TABLE ${this.tasksTable} ADD COLUMN due INTEGER`);
      }
    } catch (e) {
      // Ignore migration error to avoid blocking app start; schema already handles fresh DBs
    }

    // Migration: add screenshot_uri to interruptions if missing
    try {
      const cols = this.db.prepare(`PRAGMA table_info(${this.interruptionsTable})`).all() as Array<{ name: string }>;
      const hasShot = cols?.some((c) => c.name === 'screenshot_uri');
      if (!hasShot) {
        this.db.exec(`ALTER TABLE ${this.interruptionsTable} ADD COLUMN screenshot_uri TEXT`);
      }
    } catch (e) {
      // best effort; avoid crashing if migration fails
    }
  }

  close() {
    this.db.close();
  }


  /*---------------*/
  /* tasks related */
  /*---------------*/

  /**
   * 
   * @returns all tasks store in db
   */
  getAllTasks(): TaskType[] | undefined {
    try {
      const rows = this.db
        .prepare(`SELECT * FROM ${this.tasksTable} ORDER BY created_at DESC`)
        .all() as TaskType[];
      return rows;
    } catch (err) {
      console.error("Fail to fetch all tasks from db: ", err)
      return undefined;
    }
  }

  countTasks(): number {
    try {
      const row = this.db
        .prepare(`SELECT COUNT(*) AS c FROM ${this.tasksTable}`)
        .get() as { c: number } | undefined;
      return Number(row?.c ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Fetch a task by id
   * @param id Id of the task to fetch
   * @returns The task object or undefined
   */
  getTaskById(id: number): TaskType | undefined {
    return this.db
      .prepare(`SELECT * FROM ${this.tasksTable} WHERE id=@id LIMIT 1`)
      .get({ id }) as TaskType | undefined;
  }

  /**
   * Fetch tasks filtered by status, ordered by created_at desc.
   * @param status Target status
   * @returns The array of all specified tasks
   */
  getTasksByStatus(status: TaskType['status']): TaskType[] {
    return this.db
      .prepare(`SELECT * FROM ${this.tasksTable} WHERE status=@status ORDER BY created_at DESC`)
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
      INSERT INTO ${this.tasksTable} (
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
      UPDATE ${this.tasksTable}
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
   * Update the task in the database using its id
   * @param updatedTask the updated task
   */
  updateTask(updatedTask: TaskType) {
    if (!this.getTaskById(updatedTask.id)) {
      throw new Error('Task not found!');
    }
    const now = Date.now();
    updatedTask.updated_at = now;
    this.db.prepare(`
      UPDATE ${this.tasksTable}
      SET task_name=@task_name,
          description=@description,
          status=@status,
          created_at=@created_at,
          updated_at=@updated_at,
          completed_at=@completed_at,
          timespent=@timespent,
          timeset=@timeset,
          due=@due
      WHERE id=@id
    `).run(updatedTask);
  }

  /**
   * 
   * @param id id of the task to delete
   * @returns true for successful deletion. false otherwise.
   */
  deleteTask(id: number): boolean {
    const res = this.db.prepare(`DELETE FROM ${this.tasksTable} WHERE id=@id`).run({ id });
    return res.changes > 0;
  }


  /* ---------------------- */
  /* focus_sessions related */
  /* ---------------------- */

  /**
   * Create a new sesssion with an optional taskId
   * @param taskId the optional taskId to associate with the new session
   * @param plannedMs planned session time
   */
  createFocusSession(plannedMs: FocusSession['planned_ms'], taskId?: FocusSession['task_id']): FocusSession {
    const statement = this.db.prepare(`
      INSERT INTO ${this.focusSessionsTable} (
        task_id, started_at, planned_ms
      )
      VALUES (
        @task_id, @started_at, @planned_ms
      )
    `);

    const info = statement.run({
      task_id: taskId ?? null,
      started_at: Date.now(),
      planned_ms: plannedMs ?? 0,
    });

    const createdFocusSession = this.getFocusSessionById(Number(info.lastInsertRowid));

    if (!createdFocusSession) {
      throw new Error("");
    }

    return createdFocusSession;
  }

  /**
   * Get all focus sessions in the database
   * @returns all focus sessions
   */
  getAllFocusSessions(): FocusSession[] {
    return this.db.prepare(`
      SELECT *
      FROM ${this.focusSessionsTable}
    `).all();
  }

  /**
   * Get a session by its id
   * @param sessionId the id of the session
   * @returns the focus session with the id; undefined otherwise
   */
  getFocusSessionById(sessionId: FocusSession['id']): FocusSession | undefined {
    return this.db.prepare(`
      SELECT * 
      FROM ${this.focusSessionsTable}
      WHERE id=@id;
    `).get({ id: sessionId});
  }


  /**
   * Get focus sessions associated with a particular task
   * @param taskId task_id of the task
   * @returns all sessions associated with that task
   */
  getFocusSessionsByTask(taskId: FocusSession['task_id']): FocusSession[] {
    return this.db.prepare(`
      SELECT *
      FROM ${this.focusSessionsTable}
      WHERE task_id=@task_id;
    `).all({ task_id: taskId });
  }


  /**
   * Get sessions within a date range
   * @param start start timestamp in milliseconds
   * @param end end timestamp in milliseconds
   */
  getFocusSessionsByDateRange(start: number, end: number): FocusSession[] {
    return this.db.prepare(`
      SELECT *
      FROM ${this.focusSessionsTable}
      WHERE started_at BETWEEN @start AND @end;
    `).all({
      start,
      end
    });
  }

  updateFocusSession(updatedFocusSession: FocusSession): FocusSession | undefined {
    const existing = this.getFocusSessionById(updatedFocusSession.id);
    if (!existing) return undefined;

    // If caller marks a session done/cancelled without an end time, stamp it.
    const shouldClose = ['completed', 'cancelled'].includes(updatedFocusSession.status);
    const ended_at = updatedFocusSession.ended_at ?? (shouldClose ? Date.now() : null);

    this.db.prepare(`
      UPDATE ${this.focusSessionsTable}
      SET task_id=@task_id,
          started_at=@started_at,
          ended_at=@ended_at,
          planned_ms=@planned_ms,
          focus_ms=@focus_ms,
          status=@status,
          notes=@notes
      WHERE id=@id
    `).run({
      ...updatedFocusSession,
      ended_at,
      focus_ms: updatedFocusSession.focus_ms ?? 0,
      notes: updatedFocusSession.notes ?? null,
    });

    return this.getFocusSessionById(updatedFocusSession.id);
  }

  deleteFocusSessionByTask(taskId: FocusSession['task_id']): number {
    const res = this.db.prepare(`
      DELETE FROM ${this.focusSessionsTable}
      WHERE task_id=@task_id
    `).run({ task_id: taskId });

    return res.changes ?? 0;
  }

  /* -------------------- */
  /* interruptions related */
  /* -------------------- */

  getInterruptionsBySession(sessionId: number): Interruption[] {
    return this.db.prepare(`
      SELECT *
      FROM ${this.interruptionsTable}
      WHERE session_id=@session_id
      ORDER BY occurred_at ASC
    `).all({ session_id: sessionId }) as Interruption[];
  }

  getInterruptionById(id: number): Interruption | undefined {
    return this.db.prepare(`
      SELECT *
      FROM ${this.interruptionsTable}
      WHERE id=@id
      LIMIT 1
    `).get({ id }) as Interruption | undefined;
  }

  createInterruption(input: AddableInterruption): Interruption {
    const occurred_at = input.occurred_at ?? Date.now();

    const info = this.db.prepare(`
      INSERT INTO ${this.interruptionsTable} (
        session_id, occurred_at, duration_ms, type, note, screenshot_uri
      )
      VALUES (
        @session_id, @occurred_at, @duration_ms, @type, @note, @screenshot_uri
      )
    `).run({
      session_id: input.session_id,
      occurred_at,
      duration_ms: input.duration_ms ?? null,
      type: input.type ?? null,
      note: input.note ?? null,
      screenshot_uri: input.screenshot_uri ?? null,
    });

    const created = this.getInterruptionById(Number(info.lastInsertRowid));
    if (!created) throw new Error('Failed to create interruption record');
    return created;
  }

  updateInterruption(interruption: Interruption): Interruption | undefined {
    if (!this.getInterruptionById(interruption.id)) return undefined;

    this.db.prepare(`
      UPDATE ${this.interruptionsTable}
      SET session_id=@session_id,
          occurred_at=@occurred_at,
          duration_ms=@duration_ms,
          type=@type,
          note=@note,
          screenshot_uri=@screenshot_uri
      WHERE id=@id
    `).run({
      ...interruption,
      duration_ms: interruption.duration_ms ?? null,
      type: interruption.type ?? null,
      note: interruption.note ?? null,
      screenshot_uri: interruption.screenshot_uri ?? null,
    });

    return this.getInterruptionById(interruption.id);
  }

  deleteInterruption(id: number): boolean {
    const res = this.db.prepare(`
      DELETE FROM ${this.interruptionsTable}
      WHERE id=@id
    `).run({ id });

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
