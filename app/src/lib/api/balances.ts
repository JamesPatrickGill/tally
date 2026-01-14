import { getDb } from './db';
import type { BalanceEntry, CreateBalanceInput, ChartDataPoint, NetWorthStats } from '$lib/types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export async function getBalances(
  accountId: string,
  fromDate?: string,
  toDate?: string
): Promise<BalanceEntry[]> {
  const db = await getDb();

  let query = 'SELECT * FROM balance_entries WHERE account_id = ?';
  const params: string[] = [accountId];

  if (fromDate) {
    query += ' AND date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND date <= ?';
    params.push(toDate);
  }

  query += ' ORDER BY date DESC';

  return db.select<BalanceEntry[]>(query, params);
}

export async function getLatestBalance(accountId: string): Promise<BalanceEntry | null> {
  const db = await getDb();
  const rows = await db.select<BalanceEntry[]>(
    'SELECT * FROM balance_entries WHERE account_id = ? ORDER BY date DESC LIMIT 1',
    [accountId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function setBalance(input: CreateBalanceInput): Promise<BalanceEntry> {
  const db = await getDb();
  const id = generateId();
  const timestamp = now();

  // Use INSERT OR REPLACE to handle unique constraint on (account_id, date)
  await db.execute(
    `INSERT INTO balance_entries (id, account_id, date, balance, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id, date) DO UPDATE SET
       balance = excluded.balance,
       notes = excluded.notes`,
    [id, input.account_id, input.date, input.balance, input.notes || null, timestamp]
  );

  // Fetch the actual record (might have different id if it was an update)
  const rows = await db.select<BalanceEntry[]>(
    'SELECT * FROM balance_entries WHERE account_id = ? AND date = ?',
    [input.account_id, input.date]
  );

  return rows[0];
}

export async function deleteBalance(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM balance_entries WHERE id = ?', [id]);
}

export async function getAllBalancesForDateRange(
  fromDate: string,
  toDate: string
): Promise<BalanceEntry[]> {
  const db = await getDb();
  return db.select<BalanceEntry[]>(
    'SELECT * FROM balance_entries WHERE date >= ? AND date <= ? ORDER BY date',
    [fromDate, toDate]
  );
}

export async function getChartData(
  fromDate: string,
  toDate: string
): Promise<ChartDataPoint[]> {
  const db = await getDb();

  // Get all balances with account info, ordered by account and date
  const rows = await db.select<Array<{
    account_id: string;
    date: string;
    balance: number;
    category: string;
  }>>(
    `SELECT be.account_id, be.date, be.balance, a.category
     FROM balance_entries be
     JOIN accounts a ON be.account_id = a.id
     WHERE a.is_active = 1
     ORDER BY be.account_id, be.date`,
    []
  );

  // Get unique dates within range
  const allDates = [...new Set(rows.map(r => r.date))]
    .filter(d => d >= fromDate && d <= toDate)
    .sort();

  if (allDates.length === 0) return [];

  // Build a map of account_id -> sorted balance entries
  const accountBalances = new Map<string, Array<{ date: string; balance: number; category: string }>>();
  for (const row of rows) {
    if (!accountBalances.has(row.account_id)) {
      accountBalances.set(row.account_id, []);
    }
    accountBalances.get(row.account_id)!.push({
      date: row.date,
      balance: row.balance,
      category: row.category,
    });
  }

  // For each date, calculate totals using the most recent balance for each account
  const result: ChartDataPoint[] = [];

  for (const date of allDates) {
    let assets = 0;
    let liabilities = 0;

    for (const [, entries] of accountBalances) {
      // Find the most recent entry on or before this date
      let latestEntry: { balance: number; category: string } | null = null;
      for (const entry of entries) {
        if (entry.date <= date) {
          latestEntry = entry;
        } else {
          break;
        }
      }

      if (latestEntry) {
        if (latestEntry.category === 'asset') {
          assets += latestEntry.balance;
        } else {
          liabilities += Math.abs(latestEntry.balance);
        }
      }
    }

    result.push({
      date,
      assets,
      liabilities,
      netWorth: assets - liabilities,
    });
  }

  return result;
}

export async function getNetWorthStats(): Promise<NetWorthStats> {
  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

  // Get all historical data
  const allData = await getChartData('2000-01-01', today.toISOString().split('T')[0]);

  if (allData.length === 0) {
    return {
      ytdChange: 0,
      ytdChangePercent: 0,
      monthlyAvgChange: 0,
      allTimeHigh: 0,
      allTimeHighDate: today.toISOString().split('T')[0],
      oneYearReturn: 0,
      oneYearReturnPercent: 0,
    };
  }

  const currentNetWorth = allData[allData.length - 1].netWorth;

  // Find YTD start value (closest to Jan 1)
  const ytdStartPoint = allData.find(d => d.date >= yearStart) || allData[0];
  const ytdChange = currentNetWorth - ytdStartPoint.netWorth;
  const ytdChangePercent = ytdStartPoint.netWorth !== 0
    ? (ytdChange / Math.abs(ytdStartPoint.netWorth)) * 100
    : 0;

  // Find 1Y start value
  const oneYearPoint = allData.find(d => d.date >= oneYearAgoStr) || allData[0];
  const oneYearReturn = currentNetWorth - oneYearPoint.netWorth;
  const oneYearReturnPercent = oneYearPoint.netWorth !== 0
    ? (oneYearReturn / Math.abs(oneYearPoint.netWorth)) * 100
    : 0;

  // Calculate all-time high
  let allTimeHigh = allData[0].netWorth;
  let allTimeHighDate = allData[0].date;
  for (const point of allData) {
    if (point.netWorth > allTimeHigh) {
      allTimeHigh = point.netWorth;
      allTimeHighDate = point.date;
    }
  }

  // Calculate monthly average change
  let totalMonthlyChange = 0;
  for (let i = 1; i < allData.length; i++) {
    totalMonthlyChange += allData[i].netWorth - allData[i - 1].netWorth;
  }
  const monthlyAvgChange = allData.length > 1 ? totalMonthlyChange / (allData.length - 1) : 0;

  return {
    ytdChange,
    ytdChangePercent: Math.round(ytdChangePercent * 10) / 10,
    monthlyAvgChange: Math.round(monthlyAvgChange),
    allTimeHigh,
    allTimeHighDate,
    oneYearReturn,
    oneYearReturnPercent: Math.round(oneYearReturnPercent * 10) / 10,
  };
}
