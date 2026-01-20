use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::State;

mod server_bridge;
use server_bridge::{GooseServerBridge, ServerStatus};

// Application state that holds the bridge to goose-server
pub struct AppState {
    bridge: Arc<Mutex<GooseServerBridge>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRequest {
    method: String,
    path: String,
    #[serde(default)]
    body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    status: u16,
    body: String,
}

// Get the status of the goose-server
#[tauri::command]
async fn get_server_status(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let bridge = state.bridge.lock().map_err(|e| e.to_string())?;
    Ok(bridge.status())
}

// Start the goose-server
#[tauri::command]
async fn start_server(
    state: State<'_, AppState>,
    working_dir: Option<String>,
) -> Result<String, String> {
    let mut bridge = state.bridge.lock().map_err(|e| e.to_string())?;
    bridge
        .start(working_dir)
        .await
        .map_err(|e| e.to_string())?;
    Ok("Server started successfully".to_string())
}

// Stop the goose-server
#[tauri::command]
async fn stop_server(state: State<'_, AppState>) -> Result<String, String> {
    let mut bridge = state.bridge.lock().map_err(|e| e.to_string())?;
    bridge.stop().await.map_err(|e| e.to_string())?;
    Ok("Server stopped successfully".to_string())
}

// Forward an API request to goose-server
#[tauri::command]
async fn api_request(
    state: State<'_, AppState>,
    request: ApiRequest,
) -> Result<ApiResponse, String> {
    let bridge = state.bridge.lock().map_err(|e| e.to_string())?;
    let base_url = bridge.base_url().ok_or("Server not started")?;
    
    // Build the full URL
    let url = format!("{}{}", base_url, request.path);
    
    // Create HTTP client
    let client = reqwest::Client::new();
    
    // Execute the request based on method
    let response = match request.method.to_uppercase().as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => {
            let mut req = client.post(&url);
            if let Some(body) = request.body {
                req = req.header("Content-Type", "application/json").body(body);
            }
            req.send().await
        }
        "PUT" => {
            let mut req = client.put(&url);
            if let Some(body) = request.body {
                req = req.header("Content-Type", "application/json").body(body);
            }
            req.send().await
        }
        "DELETE" => client.delete(&url).send().await,
        _ => return Err(format!("Unsupported HTTP method: {}", request.method)),
    }
    .map_err(|e| e.to_string())?;
    
    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;
    
    Ok(ApiResponse { status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    // Create the bridge to goose-server
    let bridge = Arc::new(Mutex::new(GooseServerBridge::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { bridge })
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            start_server,
            stop_server,
            api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
