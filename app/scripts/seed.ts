#!/usr/bin/env npx tsx

/**
 * Seed script for Tally development database
 *
 * Usage:
 *   npm run seed        # Seed the database
 *   npm run seed:clear  # Clear all data
 *
 * This script directly writes to the SQLite database file.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { homedir } from 'os';

// Database location
// Dev mode: ./dev-data/tally.db (local to repo)
// Prod mode: App data directory
const APP_ID = 'com.tally.app';
const DB_NAME = 'tally.db';

function getDevDbPath(): string {
  const devDataDir = join(__dirname, '..', 'dev-data');
  if (!existsSync(devDataDir)) {
    mkdirSync(devDataDir, { recursive: true });
  }
  return join(devDataDir, DB_NAME);
}

function getProdDbPath(): string {
  const platform = process.platform;
  let appDataDir: string;

  if (platform === 'darwin') {
    appDataDir = join(homedir(), 'Library', 'Application Support', APP_ID);
  } else if (platform === 'win32') {
    appDataDir = join(process.env.APPDATA || homedir(), APP_ID);
  } else {
    appDataDir = join(homedir(), '.local', 'share', APP_ID);
  }

  return join(appDataDir, DB_NAME);
}

function getDbPath(prod: boolean): string {
  return prod ? getProdDbPath() : getDevDbPath();
}

// Account types
type AccountType = 'property' | 'pension' | 'investment' | 'savings' | 'mortgage' | 'loan' | 'credit_card';
type Category = 'asset' | 'liability';

interface SeedAccount {
  name: string;
  account_type: AccountType;
  category: Category;
  institution: string;
  description: string;
  currency: string;
  initialBalance: number;
  monthlyChange: number;
  volatility: number;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  // Assets
  {
    name: 'Primary Residence',
    account_type: 'property',
    category: 'asset',
    institution: 'Manchester',
    description: '3 bed semi-detached',
    currency: 'GBP',
    initialBalance: 380000,
    monthlyChange: 1500,
    volatility: 0.3,
  },
  {
    name: 'Workplace Pension',
    account_type: 'pension',
    category: 'asset',
    institution: 'Aviva',
    description: 'DC Scheme',
    currency: 'GBP',
    initialBalance: 45000,
    monthlyChange: 800,
    volatility: 0.4,
  },
  {
    name: 'SIPP',
    account_type: 'pension',
    category: 'asset',
    institution: 'AJ Bell',
    description: 'Mixed funds',
    currency: 'GBP',
    initialBalance: 15000,
    monthlyChange: 350,
    volatility: 0.5,
  },
  {
    name: 'Stocks & Shares ISA',
    account_type: 'investment',
    category: 'asset',
    institution: 'Vanguard',
    description: 'Global All Cap',
    currency: 'GBP',
    initialBalance: 18000,
    monthlyChange: 450,
    volatility: 0.6,
  },
  {
    name: 'GIA',
    account_type: 'investment',
    category: 'asset',
    institution: 'Trading 212',
    description: 'Mixed stocks',
    currency: 'GBP',
    initialBalance: 8000,
    monthlyChange: 200,
    volatility: 0.7,
  },
  {
    name: 'Emergency Fund',
    account_type: 'savings',
    category: 'asset',
    institution: 'Marcus',
    description: '4.5% AER',
    currency: 'GBP',
    initialBalance: 12000,
    monthlyChange: 50,
    volatility: 0.05,
  },
  {
    name: 'Cash ISA',
    account_type: 'savings',
    category: 'asset',
    institution: 'Chip',
    description: '5.0% AER',
    currency: 'GBP',
    initialBalance: 5000,
    monthlyChange: 150,
    volatility: 0.05,
  },
  // Liabilities
  {
    name: 'Mortgage',
    account_type: 'mortgage',
    category: 'liability',
    institution: 'Nationwide',
    description: '4.2% fixed',
    currency: 'GBP',
    initialBalance: -220000,
    monthlyChange: 600,
    volatility: 0,
  },
  {
    name: 'Car Finance',
    account_type: 'loan',
    category: 'liability',
    institution: 'PCP',
    description: '36 months',
    currency: 'GBP',
    initialBalance: -12000,
    monthlyChange: 350,
    volatility: 0,
  },
];

const MILESTONES = [
  { monthsAgo: 18, label: 'Started tracking' },
  { monthsAgo: 14, label: 'ISA opened' },
  { monthsAgo: 8, label: 'Emergency fund complete' },
  { monthsAgo: 4, label: 'Pension increase' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function randomVariation(baseChange: number, volatility: number): number {
  if (volatility === 0) return baseChange;
  const variation = (Math.random() - 0.5) * 2 * volatility * Math.abs(baseChange);
  return baseChange + variation;
}

function initSchema(db: Database.Database) {
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      category TEXT NOT NULL,
      institution TEXT,
      description TEXT,
      currency TEXT NOT NULL DEFAULT 'GBP',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balance_entries (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      balance REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(account_id, date)
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_balance_entries_account_date ON balance_entries(account_id, date);
    CREATE INDEX IF NOT EXISTS idx_balance_entries_date ON balance_entries(date);
    CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);
  `);
}

function clearData(db: Database.Database) {
  db.exec('DELETE FROM balance_entries');
  db.exec('DELETE FROM milestones');
  db.exec('DELETE FROM accounts');
  console.log('Cleared all data');
}

function seedData(db: Database.Database) {
  const now = new Date();
  const startDate = addMonths(now, -24);
  const timestamp = now.toISOString();

  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, name, account_type, category, institution, description, currency, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertBalance = db.prepare(`
    INSERT INTO balance_entries (id, account_id, date, balance, notes, created_at)
    VALUES (?, ?, ?, ?, NULL, ?)
  `);

  const insertMilestone = db.prepare(`
    INSERT INTO milestones (id, date, label, account_id, created_at)
    VALUES (?, ?, ?, NULL, ?)
  `);

  let accountCount = 0;
  let balanceCount = 0;

  // Use a transaction for performance
  const seedAll = db.transaction(() => {
    for (const seedAccount of SEED_ACCOUNTS) {
      const accountId = randomUUID();

      insertAccount.run(
        accountId,
        seedAccount.name,
        seedAccount.account_type,
        seedAccount.category,
        seedAccount.institution,
        seedAccount.description,
        seedAccount.currency,
        timestamp,
        timestamp
      );
      accountCount++;

      // Generate monthly balance entries
      let currentBalance = seedAccount.initialBalance;
      let currentDate = new Date(startDate);

      while (currentDate <= now) {
        insertBalance.run(
          randomUUID(),
          accountId,
          formatDate(currentDate),
          Math.round(currentBalance * 100) / 100,
          timestamp
        );
        balanceCount++;

        const monthlyChange = randomVariation(seedAccount.monthlyChange, seedAccount.volatility);
        currentBalance += monthlyChange;

        if (seedAccount.initialBalance < 0) {
          currentBalance = Math.min(currentBalance, 0);
        }

        currentDate = addMonths(currentDate, 1);
      }
    }

    // Add milestones
    for (const milestone of MILESTONES) {
      insertMilestone.run(
        randomUUID(),
        formatDate(addMonths(now, -milestone.monthsAgo)),
        milestone.label,
        timestamp
      );
    }
  });

  seedAll();

  console.log(`Seeded ${accountCount} accounts with ${balanceCount} balance entries`);
  console.log(`Added ${MILESTONES.length} milestones`);
}

// Main
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const command = args.find(a => !a.startsWith('--')) || 'seed';

const dbPath = getDbPath(isProd);
console.log(`Database: ${dbPath} ${isProd ? '(PRODUCTION)' : '(dev)'}`);

if (!existsSync(dbPath) && isProd) {
  console.log('Production database does not exist. Nothing to clear.');
  process.exit(0);
}

const db = new Database(dbPath);

try {
  initSchema(db);

  if (command === 'clear') {
    clearData(db);
  } else if (command === 'seed') {
    // Check if data exists
    const count = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
    if (count.count > 0) {
      console.log('Database already has data. Clearing first...');
      clearData(db);
    }
    seedData(db);
  } else {
    console.log('Usage: npx tsx scripts/seed.ts [seed|clear] [--prod]');
    console.log('  seed   - Seed with sample data (default)');
    console.log('  clear  - Clear all data');
    console.log('  --prod - Target production database instead of dev');
  }
} finally {
  db.close();
}
