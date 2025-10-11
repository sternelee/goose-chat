// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use axum::Router;
use goose_server::state::AppState as ServerAppState;
use std::sync::Arc;
use tauri::{Builder, State};
use tauri_axum_htmx::{LocalRequest, LocalResponse};
use tokio::sync::Mutex;

struct AppState {
    router: Arc<Mutex<Router>>,
    #[allow(dead_code)]
    server_state: Arc<ServerAppState>,
}

#[tauri::command]
async fn local_app_request(
    state: State<'_, AppState>,
    local_request: LocalRequest,
) -> Result<LocalResponse, ()> {
    let mut router = state.router.lock().await;

    let response = local_request.send_to_router(&mut router).await;

    Ok(response)
}

#[tauri::command]
async fn get_config() -> Result<serde_json::Value, String> {
    println!("get_config command called");

    let provider = std::env::var("GOOSE_PROVIDER__TYPE").unwrap_or_else(|e| {
        println!("Failed to read GOOSE_PROVIDER__TYPE: {}, using default", e);
        "openai".to_string()
    });

    let model = std::env::var("GOOSE_PROVIDER__MODEL").unwrap_or_else(|e| {
        println!("Failed to read GOOSE_PROVIDER__MODEL: {}, using default", e);
        "gpt-3.5-turbo".to_string()
    });

    let config = serde_json::json!({
        "GOOSE_DEFAULT_PROVIDER": provider,
        "GOOSE_DEFAULT_MODEL": model,
        "GOOSE_API_HOST": "http://127.0.0.1",
        "GOOSE_PORT": 5000,
        "GOOSE_WORKING_DIR": std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("/")).to_string_lossy().to_string(),
        "GOOSE_ALLOWLIST_WARNING": false,
    });

    println!("Returning config: {}", config);
    Ok(config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    let server_state = ServerAppState::new()
        .await
        .expect("Failed to create server state");

    let app_router = Router::new().nest(
        "/api",
        goose_server::routes::configure(server_state.clone()),
    );

    let app_state = AppState {
        router: Arc::new(Mutex::new(app_router)),
        server_state,
    };

    Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![local_app_request, get_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
