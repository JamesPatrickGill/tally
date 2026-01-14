import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    // Get the database path from the backend (handles dev vs release paths)
    const dbPath = await invoke<string>('get_db_path');
    db = await Database.load(dbPath);
  }
  return db;
}
