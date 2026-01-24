//! Goose Desktop App - Tauri Backend
//!
//! This module integrates the goose-server Axum routes with Tauri
//! using the tauri-axum bridge for local HTTP request handling.

use std::path::PathBuf;
use std::sync::Arc;

use axum::middleware;
use axum::Router;
use serde::{Deserialize, Serialize};
use tauri::{async_runtime::Mutex, AppHandle, Emitter, Manager, State};
use tauri_axum::{LocalRequest, LocalResponse};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::ShellExt;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

use goose_server::state::AppState;

/// Response for streaming requests
#[derive(Serialize, Deserialize)]
pub struct StreamResponse {
    pub request_id: String,
    pub status_code: u16,
}

/// Events for streaming SSE data
#[derive(Serialize, Deserialize, Clone)]
pub enum StreamEvent {
    Headers(std::collections::HashMap<String, String>),
    Chunk(Vec<u8>),
    End,
}

/// Application state shared across Tauri windows and commands
pub struct GooseAppState {
    /// The Axum router containing all goose-server routes
    pub router: Arc<Mutex<Router>>,
    /// The goose-server application state
    pub server_state: Arc<AppState>,
    /// The secret key for authentication
    pub secret_key: String,
}

/// Events that can be emitted from the backend
#[derive(Clone, Serialize, Deserialize)]
pub enum BackendEvent {
    ThemeChanged {
        theme: String,
        use_system_theme: bool,
    },
    AddExtension {
        extension_id: String,
    },
    FatalError {
        message: String,
    },
}

/// Initialize the goose-server backend
fn initialize_backend() -> anyhow::Result<(Arc<AppState>, Router, String)> {
    // Setup logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    info!("Initializing goose-server backend...");

    // Get or create secret key
    let secret_key = std::env::var("GOOSE_SERVER__SECRET_KEY").unwrap_or_else(|_| {
        // Generate a random secret key for local development
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        format!("local-{}", timestamp)
    });

    // Use a blocking task for async initialization
    let (server_state, router, secret_key) = std::thread::spawn(move || {
        tauri::async_runtime::block_on(async move {
            // Create the goose-server AppState
            let server_state = AppState::new().await?;
            info!("AppState created successfully");

            // Create CORS layer
            let cors = CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any);

            // Create the router with all goose-server routes
            let router = goose_server::routes::configure(server_state.clone(), secret_key.clone())
                .layer(middleware::from_fn_with_state(
                    secret_key.clone(),
                    goose_server::auth::check_token,
                ))
                .layer(cors);

            info!("goose-server routes configured successfully");

            Ok::<(Arc<AppState>, Router, String), anyhow::Error>((server_state, router, secret_key))
        })
    })
    .join()
    .map_err(|e| anyhow::anyhow!("Failed to join thread: {:?}", e))??;

    Ok((server_state, router, secret_key))
}

/// Tauri command to handle local HTTP requests
#[tauri::command]
async fn local_app_request(
    state: State<'_, GooseAppState>,
    local_request: LocalRequest,
) -> Result<LocalResponse, String> {
    let mut router = state.router.lock().await;

    // Process the request through the router
    // Note: We need to clone the response to satisfy lifetime requirements
    let response = local_request.send_to_router(&mut router).await;

    Ok(response)
}

/// Tauri command to handle local HTTP requests with SSE streaming support
/// This command streams the response body in chunks using Tauri events
#[tauri::command]
async fn local_app_request_streaming(
    state: State<'_, GooseAppState>,
    local_request: LocalRequest,
    app: AppHandle,
) -> Result<StreamResponse, String> {
    let mut router = state.router.lock().await;

    // Check if the request contains a pre-configured SSE channel
    let sse_channel = local_request
        .headers
        .get("X-SSE-Channel")
        .cloned()
        .ok_or_else(|| "Missing X-SSE-Channel header".to_string())?;

    // Remove the channel header before processing
    let mut local_request = local_request;
    local_request.headers.remove("X-SSE-Channel");

    // Process the request through the router with streaming
    let (status_code, headers, chunks) =
        local_request.send_to_router_streaming(&mut router).await?;

    // Send headers as the first event
    app.emit(
        &sse_channel,
        serde_json::json!({ "type": "Headers", "data": headers }),
    )
    .map_err(|e| format!("Failed to emit headers: {}", e))?;

    // Send each chunk as a separate event
    for chunk in chunks {
        app.emit(
            &sse_channel,
            serde_json::json!({ "type": "Chunk", "data": chunk }),
        )
        .map_err(|e| format!("Failed to emit chunk: {}", e))?;
    }

    // Send end event
    app.emit(&sse_channel, serde_json::json!({ "type": "End" }))
        .map_err(|e| format!("Failed to emit end: {}", e))?;

    Ok(StreamResponse {
        request_id: sse_channel,
        status_code,
    })
}

/// Tauri command to get the current secret key
#[tauri::command]
async fn get_secret_key(state: State<'_, GooseAppState>) -> Result<String, String> {
    Ok(state.secret_key.clone())
}

/// Tauri command to get server status
#[tauri::command]
async fn get_server_status() -> Result<String, String> {
    Ok("Server running".to_string())
}

/// Tauri command to get the current platform
#[tauri::command]
async fn get_platform() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

/// Tauri command to open external URLs
#[tauri::command]
async fn open_url(url: String, app: AppHandle) -> Result<(), String> {
    let opener = app.opener();
    opener
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {}", e))
}

/// ============================================================================
/// FILE SYSTEM COMMANDS
/// ============================================================================

/// Read a text file
#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file
#[tauri::command]
async fn write_file(file_path: String, content: String) -> Result<bool, String> {
    let path = PathBuf::from(&file_path);
    std::fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(true)
}

/// List files in a directory
#[tauri::command]
async fn list_files(dir_path: String) -> Result<Vec<String>, String> {
    let dir = std::path::Path::new(&dir_path);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut files = Vec::new();
    let entries = std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name() {
                if let Some(name_str) = name.to_str() {
                    files.push(name_str.to_string());
                }
            }
        }
    }

    Ok(files)
}

/// ============================================================================
/// CONFIGURATION COMMANDS
/// ============================================================================

/// Get settings from configuration
#[tauri::command]
async fn get_settings() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({}))
}

/// Save settings to configuration
#[tauri::command]
async fn save_settings(_settings: serde_json::Value) -> Result<(), String> {
    Ok(())
}

/// Get config value
#[tauri::command]
async fn get_config(_key: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!(null))
}

/// Get spellcheck state
#[tauri::command]
async fn get_spellcheck_state() -> Result<bool, String> {
    Ok(false)
}

/// Set spellcheck state
#[tauri::command]
async fn set_spellcheck(_enabled: bool) -> Result<(), String> {
    Ok(())
}

/// ============================================================================
/// RECIPE MANAGEMENT COMMANDS
/// ============================================================================

/// Check if recipe was accepted before
#[tauri::command]
async fn has_accepted_recipe_before(_recipe_hash: String) -> Result<bool, String> {
    Ok(false)
}

/// Record recipe hash
#[tauri::command]
async fn record_recipe_hash(_recipe_hash: String) -> Result<(), String> {
    Ok(())
}

/// ============================================================================
/// UI STATE COMMANDS
/// ============================================================================

/// Get menu bar icon state
#[tauri::command]
async fn get_menu_bar_icon() -> Result<bool, String> {
    Ok(true)
}

/// Set menu bar icon state
#[tauri::command]
async fn set_menu_bar_icon(_enabled: bool) -> Result<(), String> {
    Ok(())
}

/// Get dock icon state
#[tauri::command]
async fn get_dock_icon() -> Result<bool, String> {
    Ok(true)
}

/// Set dock icon state
#[tauri::command]
async fn set_dock_icon(_enabled: bool) -> Result<(), String> {
    Ok(())
}

/// Get wakelock state
#[tauri::command]
async fn get_wakelock() -> Result<bool, String> {
    Ok(false)
}

/// Set wakelock state
#[tauri::command]
async fn set_wakelock(_enabled: bool) -> Result<(), String> {
    Ok(())
}

/// Open notifications settings
#[tauri::command]
async fn open_notifications_settings(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        app.shell()
            .command("open")
            .args(["x-apple.systempreferences:com.apple.preference.notifications"])
            .spawn()
            .map_err(|e| format!("Failed to open notification settings: {}", e))?;
    }
    Ok(())
}

/// ============================================================================
/// EXTENSION COMMANDS
/// ============================================================================

/// Get allowed extensions
#[tauri::command]
async fn get_allowed_extensions() -> Result<Vec<String>, String> {
    Ok(vec![])
}

/// Add recent directory
#[tauri::command]
async fn add_recent_dir(_dir: String) -> Result<(), String> {
    Ok(())
}

/// ============================================================================
/// EVENT SYSTEM
/// ============================================================================

/// Subscribe to backend events
#[tauri::command]
async fn subscribe_events() -> Result<(), String> {
    Ok(())
}

/// Unsubscribe from backend events
#[tauri::command]
async fn unsubscribe_events() -> Result<(), String> {
    Ok(())
}

/// Emit backend event
#[tauri::command]
async fn emit_event(_event: String, _data: serde_json::Value) -> Result<(), String> {
    Ok(())
}

/// ============================================================================
/// WINDOW MANAGEMENT
/// ============================================================================

/// Create a new chat window
#[tauri::command]
async fn create_chat_window(
    _initial_message: Option<String>,
    _working_dir: Option<String>,
) -> Result<(), String> {
    Err("Multiple windows not supported yet".to_string())
}

/// Close the current window
#[tauri::command]
async fn close_window() -> Result<(), String> {
    Ok(())
}

/// Reload the application
#[tauri::command]
async fn reload_app() -> Result<(), String> {
    Ok(())
}

/// Get application version
#[tauri::command]
async fn get_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// ============================================================================
/// PLUGIN INITIALIZATION
/// ============================================================================

/// Tauri runner
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Initialize the backend (blocking on separate thread)
            let (server_state, router, secret_key) = initialize_backend()?;

            // Create the application state
            let state = GooseAppState {
                router: Arc::new(Mutex::new(router)),
                server_state,
                secret_key,
            };

            // Manage the state
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // HTTP bridge
            local_app_request,
            local_app_request_streaming,
            get_secret_key,
            get_server_status,
            open_url,
            // File system
            read_file,
            write_file,
            list_files,
            // Configuration
            get_settings,
            save_settings,
            get_config,
            get_spellcheck_state,
            set_spellcheck,
            // Recipe management
            has_accepted_recipe_before,
            record_recipe_hash,
            // UI state
            get_menu_bar_icon,
            set_menu_bar_icon,
            get_dock_icon,
            set_dock_icon,
            get_wakelock,
            set_wakelock,
            open_notifications_settings,
            // Extensions
            get_allowed_extensions,
            add_recent_dir,
            // Events
            subscribe_events,
            unsubscribe_events,
            emit_event,
            // Window management
            create_chat_window,
            close_window,
            reload_app,
            get_version,
            get_platform,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
