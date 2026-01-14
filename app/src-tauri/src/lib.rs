mod db;
mod models;

pub use models::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Use local dev-data directory in debug mode, app data directory in release
    #[cfg(debug_assertions)]
    let db_path = "sqlite:./dev-data/tally.db";
    #[cfg(not(debug_assertions))]
    let db_path = "sqlite:tally.db";

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_path, db::get_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
