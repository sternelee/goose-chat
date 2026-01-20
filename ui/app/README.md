# Goose App - Tauri + React

A desktop application built with Tauri and React that provides a chat interface to interact with the goose-server.

## Architecture

This application follows the tauri-axum architecture pattern (without HTMX):
- **Frontend**: React with TypeScript and Vite
- **Backend**: Tauri (Rust) that manages and communicates with goose-server
- **Bridge**: Rust code that starts goose-server as a subprocess and forwards API requests

### Components

1. **Tauri Backend (`src-tauri/src/`)**
   - `lib.rs`: Main Tauri commands and application setup
   - `server_bridge.rs`: Manages the goose-server lifecycle and communication

2. **React Frontend (`src/`)**
   - `App.tsx`: Main chat interface
   - `App.css`: Styles for the application

## Development

### Prerequisites

- Rust (1.92+)
- Node.js (24+)
- goosed binary (from the main workspace)

### Building goosed

First, build the goosed server from the workspace root:

```bash
cd /home/runner/work/goose-chat/goose-chat
cargo build --release -p goose-server
```

The binary will be at `target/release/goosed`.

### Running the App

```bash
cd ui/app/goose-app
npm install
npm run tauri dev
```

### Building for Production

```bash
npm run tauri build
```

## Features

- Start/stop goose-server from the UI
- Monitor server status
- Chat interface for interacting with goose
- Reference design from the desktop Electron app

## Configuration

The application looks for the `goosed` binary in the following locations (in order):
1. `GOOSED_PATH` environment variable
2. In the system PATH
3. Next to the Tauri executable
4. In the workspace target directory (for development)

## API Integration

The Tauri backend provides these commands:
- `get_server_status`: Get the current status of goose-server
- `start_server`: Start the goose-server subprocess
- `stop_server`: Stop the goose-server subprocess
- `api_request`: Forward HTTP requests to goose-server

## Future Enhancements

- Full integration with goose-server API endpoints
- Session management
- File upload/attachment support
- Configuration UI for providers and models
- Multi-session support
