use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_accounts_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    account_type TEXT NOT NULL CHECK(account_type IN ('property', 'pension', 'investment', 'savings', 'mortgage', 'loan', 'credit_card')),
                    category TEXT NOT NULL CHECK(category IN ('asset', 'liability')),
                    institution TEXT,
                    description TEXT,
                    currency TEXT NOT NULL DEFAULT 'GBP',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_balance_entries_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS balance_entries (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    date TEXT NOT NULL,
                    balance REAL NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    UNIQUE(account_id, date)
                );

                CREATE INDEX IF NOT EXISTS idx_balance_entries_account_date
                ON balance_entries(account_id, date);

                CREATE INDEX IF NOT EXISTS idx_balance_entries_date
                ON balance_entries(date);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_milestones_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS milestones (
                    id TEXT PRIMARY KEY NOT NULL,
                    date TEXT NOT NULL,
                    label TEXT NOT NULL,
                    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE INDEX IF NOT EXISTS idx_milestones_date
                ON milestones(date);
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
