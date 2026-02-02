import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { seedAgents } from './db/seed-agents'

const DATABASE_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'moltymingle.sqlite')

let dbInstance: Database.Database | null = null

function runMigrations(db: Database.Database) {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)
  
  // Get applied migrations
  const appliedMigrations = db.prepare('SELECT name FROM __migrations').all() as { name: string }[]
  const appliedSet = new Set(appliedMigrations.map(m => m.name))
  
  // For now, we just have the initial schema
  const migrations = ['001_initial_schema.sql']
  const migrationsDir = join(process.cwd(), 'src', 'lib', 'db', 'migrations')
  
  for (const migration of migrations) {
    if (!appliedSet.has(migration)) {
      console.log(`Applying migration: ${migration}`)
      
      const sql = readFileSync(join(migrationsDir, migration), 'utf-8')
      db.exec(sql)
      
      db.prepare('INSERT INTO __migrations (name) VALUES (?)').run(migration)
      console.log(`Applied migration: ${migration}`)
    }
  }
  
  console.log('Database initialized')
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    
    dbInstance = new Database(DATABASE_PATH)
    // Enable foreign keys and WAL mode for better concurrency
    dbInstance.pragma('journal_mode = WAL')
    dbInstance.pragma('foreign_keys = ON')
    
    // Run migrations
    runMigrations(dbInstance)

    // Seed NPC agents
    seedAgents(dbInstance)
  }
  return dbInstance
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
