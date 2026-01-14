import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
let dbPath: string | null = null;

async function getDbPath(): Promise<string> {
  if (!dbPath) {
    if (import.meta.env.DEV) {
      // In dev mode, get path from backend (uses CARGO_MANIFEST_DIR)
      const { invoke } = await import('@tauri-apps/api/core');
      dbPath = await invoke<string>('get_db_path');
    } else {
      // In production, use app data directory
      dbPath = 'sqlite:tally.db';
    }
  }
  return dbPath;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    const path = await getDbPath();
    db = await Database.load(path);
  }
  return db;
}
