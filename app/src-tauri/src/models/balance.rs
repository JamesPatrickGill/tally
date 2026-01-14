use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceEntry {
    pub id: String,
    pub account_id: String,
    pub date: String,
    pub balance: f64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBalanceInput {
    pub account_id: String,
    pub date: String,
    pub balance: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBalanceInput {
    pub balance: Option<f64>,
    pub notes: Option<String>,
}
