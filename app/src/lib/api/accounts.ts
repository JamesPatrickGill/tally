import { getDb } from './db';
import type {
  Account,
  AccountWithBalance,
  CreateAccountInput,
  UpdateAccountInput,
} from '$lib/types';
import { getCategoryForType } from '$lib/types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function getAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.select<Account[]>(
    'SELECT * FROM accounts WHERE is_active = 1 ORDER BY category, account_type, name'
  );
  return rows.map((row) => ({
    ...row,
    is_active: Boolean(row.is_active),
  }));
}

export async function getAccount(id: string): Promise<Account | null> {
  const db = await getDb();
  const rows = await db.select<Account[]>('SELECT * FROM accounts WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    is_active: Boolean(rows[0].is_active),
  };
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const db = await getDb();
  const id = generateId();
  const timestamp = now();
  const category = getCategoryForType(input.account_type);
  const currency = input.currency || 'GBP';

  await db.execute(
    `INSERT INTO accounts (id, name, account_type, category, institution, description, currency, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.name,
      input.account_type,
      category,
      input.institution || null,
      input.description || null,
      currency,
      timestamp,
      timestamp,
    ]
  );

  return {
    id,
    name: input.name,
    account_type: input.account_type,
    category,
    institution: input.institution || null,
    description: input.description || null,
    currency,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<Account | null> {
  const db = await getDb();
  const existing = await getAccount(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.institution !== undefined) {
    updates.push('institution = ?');
    values.push(input.institution);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.currency !== undefined) {
    updates.push('currency = ?');
    values.push(input.currency);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }

  if (updates.length === 0) return existing;

  const timestamp = now();
  updates.push('updated_at = ?');
  values.push(timestamp);
  values.push(id);

  await db.execute(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`, values);

  return getAccount(id);
}

export async function deleteAccount(id: string): Promise<void> {
  console.log('deleteAccount called with id:', id);
  const db = await getDb();
  // Delete balance entries first (SQLite foreign keys not enabled by default)
  console.log('Deleting balance entries...');
  await db.execute('DELETE FROM balance_entries WHERE account_id = ?', [id]);
  console.log('Deleting account...');
  await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
  console.log('Delete complete');
}

export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const db = await getDb();

  const rows = await db.select<
    (Account & { current_balance: number | null; balance_date: string | null })[]
  >(
    `SELECT
      a.*,
      b.balance as current_balance,
      b.date as balance_date
    FROM accounts a
    LEFT JOIN (
      SELECT account_id, balance, date
      FROM balance_entries
      WHERE (account_id, date) IN (
        SELECT account_id, MAX(date)
        FROM balance_entries
        GROUP BY account_id
      )
    ) b ON a.id = b.account_id
    WHERE a.is_active = 1
    ORDER BY a.category, a.account_type, a.name`
  );

  return rows.map((row) => ({
    ...row,
    is_active: Boolean(row.is_active),
    current_balance: row.current_balance ?? 0,
    balance_date: row.balance_date,
  }));
}
