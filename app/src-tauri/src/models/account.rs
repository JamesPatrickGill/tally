use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AccountType {
    Property,
    Pension,
    Investment,
    Savings,
    Mortgage,
    Loan,
    CreditCard,
}

impl AccountType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AccountType::Property => "property",
            AccountType::Pension => "pension",
            AccountType::Investment => "investment",
            AccountType::Savings => "savings",
            AccountType::Mortgage => "mortgage",
            AccountType::Loan => "loan",
            AccountType::CreditCard => "credit_card",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "property" => Some(AccountType::Property),
            "pension" => Some(AccountType::Pension),
            "investment" => Some(AccountType::Investment),
            "savings" => Some(AccountType::Savings),
            "mortgage" => Some(AccountType::Mortgage),
            "loan" => Some(AccountType::Loan),
            "credit_card" => Some(AccountType::CreditCard),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AccountCategory {
    Asset,
    Liability,
}

impl AccountCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            AccountCategory::Asset => "asset",
            AccountCategory::Liability => "liability",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "asset" => Some(AccountCategory::Asset),
            "liability" => Some(AccountCategory::Liability),
            _ => None,
        }
    }
}

impl AccountType {
    pub fn category(&self) -> AccountCategory {
        match self {
            AccountType::Property
            | AccountType::Pension
            | AccountType::Investment
            | AccountType::Savings => AccountCategory::Asset,
            AccountType::Mortgage | AccountType::Loan | AccountType::CreditCard => {
                AccountCategory::Liability
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub account_type: AccountType,
    pub category: AccountCategory,
    pub institution: Option<String>,
    pub description: Option<String>,
    pub currency: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountInput {
    pub name: String,
    pub account_type: AccountType,
    pub institution: Option<String>,
    pub description: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountInput {
    pub name: Option<String>,
    pub institution: Option<String>,
    pub description: Option<String>,
    pub currency: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountWithBalance {
    #[serde(flatten)]
    pub account: Account,
    pub current_balance: f64,
    pub balance_date: Option<String>,
}
