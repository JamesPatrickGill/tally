mod db;
mod models;

pub use models::*;

#[cfg(debug_assertions)]
const DB_PATH: &str = concat!("sqlite:", env!("CARGO_MANIFEST_DIR"), "/../dev-data/tally.db");
#[cfg(not(debug_assertions))]
const DB_PATH: &str = "sqlite:tally.db";

#[tauri::command]
fn get_db_path() -> &'static str {
    DB_PATH
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_PATH, db::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![get_db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
