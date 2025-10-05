// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//

use axum::routing::get;
use axum::Router;
use std::sync::Arc;
use tauri::{Builder, State};
use tauri_axum_htmx::{LocalRequest, LocalResponse};
use tokio::sync::Mutex;

struct AppState {
    router: Arc<Mutex<Router>>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = Router::new().route("/", get(|| async { "Hello, World!" }));

    let app_state = AppState {
        router: Arc::new(Mutex::new(app)),
    };

    Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![local_app_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
