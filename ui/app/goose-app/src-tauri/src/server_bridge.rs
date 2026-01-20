use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServerStatus {
    Stopped,
    Starting,
    Running { base_url: String },
    Error { message: String },
}

pub struct GooseServerBridge {
    status: ServerStatus,
    process: Option<Arc<Mutex<Child>>>,
    base_url: Option<String>,
}

impl GooseServerBridge {
    pub fn new() -> Self {
        Self {
            status: ServerStatus::Stopped,
            process: None,
            base_url: None,
        }
    }

    pub fn status(&self) -> ServerStatus {
        self.status.clone()
    }

    pub fn base_url(&self) -> Option<String> {
        self.base_url.clone()
    }

    pub async fn start(&mut self, working_dir: Option<String>) -> Result<()> {
        if matches!(self.status, ServerStatus::Running { .. }) {
            return Ok(());
        }

        self.status = ServerStatus::Starting;

        // Find goosed binary - look in common locations
        let goosed_path = self.find_goosed_binary()?;
        
        tracing::info!("Starting goosed from: {:?}", goosed_path);

        // Start goosed process
        let mut cmd = Command::new(&goosed_path);
        cmd.arg("agent")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Set working directory if provided
        if let Some(dir) = working_dir {
            cmd.current_dir(dir);
        }

        // Set environment variable for random port
        cmd.env("GOOSE_SERVER__HOST", "127.0.0.1");
        cmd.env("GOOSE_SERVER__PORT", "0"); // Use random available port

        let child = cmd
            .spawn()
            .context("Failed to start goosed process")?;

        self.process = Some(Arc::new(Mutex::new(child)));

        // Wait for server to be ready and discover its port
        // For now, we'll use a default port - in production this should be discovered
        // from the server's output or a status file
        let port = std::env::var("GOOSE_SERVER_PORT").unwrap_or_else(|_| "8000".to_string());
        let base_url = format!("http://127.0.0.1:{}", port);

        // Give the server a moment to start
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        self.base_url = Some(base_url.clone());
        self.status = ServerStatus::Running { base_url };

        tracing::info!("goosed server started successfully");
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<()> {
        if let Some(process) = self.process.take() {
            let mut child = process.lock().await;
            child.kill().context("Failed to kill goosed process")?;
            tracing::info!("goosed server stopped");
        }

        self.status = ServerStatus::Stopped;
        self.base_url = None;
        Ok(())
    }

    fn find_goosed_binary(&self) -> Result<PathBuf> {
        // Try multiple locations in order of preference
        let possible_paths = vec![
            // 1. Environment variable
            std::env::var("GOOSED_PATH").ok().map(PathBuf::from),
            // 2. In PATH
            which::which("goosed").ok(),
            // 3. Next to the Tauri executable
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.join("goosed"))),
            // 4. In the workspace target directory (for development)
            std::env::current_dir()
                .ok()
                .map(|p| p.join("../../../target/release/goosed")),
            std::env::current_dir()
                .ok()
                .map(|p| p.join("../../../target/debug/goosed")),
        ];

        for path in possible_paths.into_iter().flatten() {
            if path.exists() {
                return Ok(path);
            }
        }

        anyhow::bail!("Could not find goosed binary. Please ensure it is built and in PATH, or set GOOSED_PATH environment variable")
    }
}

impl Drop for GooseServerBridge {
    fn drop(&mut self) {
        if let Some(process) = &self.process {
            // Best effort cleanup - we can't await in Drop
            if let Ok(mut child) = process.try_lock() {
                let _ = child.kill();
            }
        }
    }
}
