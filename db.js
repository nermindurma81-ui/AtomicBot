import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, 'atomicbot.db');

let db;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      role TEXT DEFAULT 'user',
      usage_limit INTEGER DEFAULT -1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      messages TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      prompt TEXT NOT NULL,
      model TEXT DEFAULT 'openrouter/mistralai/mistral-7b-instruct:free',
      active INTEGER DEFAULT 1,
      last_run DATETIME,
      next_run DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS vps_instances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT DEFAULT 'railway',
      status TEXT DEFAULT 'stopped',
      config TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );


    CREATE TABLE IF NOT EXISTS installed_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, pack_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      plan TEXT,
      result TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);


  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userColumns.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  }
  if (!userColumns.includes('usage_limit')) {
    db.exec("ALTER TABLE users ADD COLUMN usage_limit INTEGER DEFAULT -1");
  }

  // Legacy skill ID migration (backward compatibility with older releases)
  // Remove potential duplicates first to avoid UNIQUE(user_id, pack_id, skill_id) conflicts.
  db.prepare(`
    DELETE FROM installed_skills
    WHERE skill_id = 'claude-opus-max-skill'
      AND EXISTS (
        SELECT 1
        FROM installed_skills current
        WHERE current.user_id = installed_skills.user_id
          AND current.pack_id = installed_skills.pack_id
          AND current.skill_id = 'claude-opus-max'
      )
  `).run();
  db.prepare(`
    DELETE FROM installed_skills
    WHERE skill_id = 'codex-engineer-skill'
      AND EXISTS (
        SELECT 1
        FROM installed_skills current
        WHERE current.user_id = installed_skills.user_id
          AND current.pack_id = installed_skills.pack_id
          AND current.skill_id = 'codex-engineer'
      )
  `).run();
  db.prepare("UPDATE installed_skills SET skill_id = 'claude-opus-max' WHERE skill_id = 'claude-opus-max-skill'").run();
  db.prepare("UPDATE installed_skills SET skill_id = 'codex-engineer' WHERE skill_id = 'codex-engineer-skill'").run();

  console.log('Database initialized');
}
