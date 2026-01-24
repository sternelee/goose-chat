# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**goose** is a local, extensible AI agent that automates engineering tasks. Built in Rust with an Electron/React desktop frontend, goose integrates with any LLM provider and supports MCP (Model Context Protocol) servers for extensibility.

## Environment Setup

```bash
# Activate the hermit environment (isolates dependencies)
source bin/activate-hermit

# First-time build
cargo build
```

## Common Commands

### Build Commands
```bash
# Debug build
cargo build

# Release build
cargo build --release
just release-binary       # Release + OpenAPI generation

# UI only (uses pre-built binaries)
just run-ui-only
```

### Development Commands
```bash
# Full dev loop: build release + start desktop app
just run-ui

# Start just the server (for debugging backend)
export GOOSE_SERVER__SECRET_KEY=test
cargo run --package goose-server --bin goosed -- agent   # or: just run-server

# Start UI connected to external backend (for debugging)
just debug-ui                # Connects to localhost:3000
just debug-ui alpha          # With alpha features enabled
```

### Testing Commands
```bash
# Run all tests
cargo test

# Test specific crate
cargo test -p goose

# Record MCP integration tests (for regression testing)
just record-mcp-tests

# UI tests
cd ui/desktop && npm run test:run
cd ui/desktop && npm run test-e2e
```

### Code Quality Commands
```bash
# Format Rust code
cargo fmt

# Lint Rust code
./scripts/clippy-lint.sh

# Check UI code
cd ui/desktop && npm run lint:check
```

### OpenAPI Schema Regeneration
**IMPORTANT**: After any change to `crates/goose-server/src/routes/`, you must regenerate the OpenAPI schema:

```bash
just generate-openapi
```

This runs `cargo run -p goose-server --bin generate_schema` to write `ui/desktop/openapi.json`, then runs the UI's `generate-api` script to rebuild the TypeScript client from that spec.

**NEVER** edit `ui/desktop/openapi.json` manually.

## Architecture Overview

### Rust Workspace Structure

```
crates/
├── goose/               # Core AI agent logic
│   ├── agents/         # Agent orchestration, tool execution
│   ├── providers/      # LLM provider abstractions (OpenAI, Anthropic, etc.)
│   ├── config/         # Configuration, permissions, extensions
│   ├── session/        # Session management, chat history
│   └── conversation/   # Message types, conversation state
├── goose-cli/          # Command-line interface (binary: goose)
├── goose-server/       # Backend server (binary: goosed)
│   └── routes/         # HTTP/WebSocket API endpoints
├── goose-mcp/          # Built-in MCP server implementations
│   ├── developer/      # Code analysis, editing tools
│   ├── computercontroller/  # Document manipulation (PDF, DOCX, XLSX)
│   └── memory/         # Memory extension
├── goose-test/         # Test utilities and fixtures
└── goose-bench/        # Benchmarking tools
```

### Multi-Process Architecture

1. **Goosed Process** (`goosed`): Rust backend server listening on port 3000 (configurable via `GOOSE_PORT`)
2. **Main Process** (Electron): Handles OS integration, file system, native dialogs
3. **Renderer Process** (React UI): Web-based interface communicating with goosed
4. **MCP Processes**: Separate processes for tool extensions

### Communication Flow

```
User Input → CLI/UI → Agent → Provider → Tools → Response
```

The Agent (`crates/goose/src/agents/agent.rs`) orchestrates:
- Provider selection for LLM calls
- Tool execution via MCP protocol
- Session and conversation state management
- Permission checking for sensitive operations

### Key Architectural Patterns

#### Provider Pattern
All LLM providers implement the `Provider` trait (`crates/goose/src/providers/base.rs`). New providers can be added:
1. **Builtin**: Compiled into the binary (see `crates/goose/src/providers/`)
2. **Declarative**: TOML-based configuration in `crates/goose/src/providers/declarative/`
3. **Custom**: Dynamically loaded at runtime

#### Tool/Extension System
- Tools are exposed via MCP (Model Context Protocol)
- Built-in tools in `crates/goose-mcp/`
- External MCP servers can be loaded as extensions
- Permission system controls tool execution at runtime

#### Session Management
- SQLite persistence via `crates/goose/src/session/`
- `GOOSE_PATH_ROOT` env var isolates test environments
- Sessions store conversation history, tool results, and extension state

#### Configuration
- Credentials stored in platform keyring
- Provider configs in `~/.config/goose/`
- `GOOSE_PROVIDER` env var overrides provider selection
- Provider-specific env vars (e.g., `ANTHROPIC_API_KEY`)

## Code Style Standards

Follow the standards in `.github/copilot-instructions.md`:

- Use `anyhow::Result` for error handling
- Avoid `.context("Failed to X")` when error already describes failure
- Booleans default to `false`, not `Option<bool>`
- Write self-documenting code; prefer clear names over comments
- Only comment complex algorithms or non-obvious business logic ("why", not "what")
- Never add comments for: getters/setters, constructors, standard idioms, or self-evident operations
- Don't make things optional that don't need to be

## Environment Variables

### Common Development Variables
```bash
GOOSE_PORT=3000                      # Server port (default: 3000)
GOOSE_SERVER__SECRET_KEY=test        # Required for running goosed
GOOSE_PATH_ROOT=/tmp/goose-test      # Isolate test environment
GOOSE_PROVIDER=anthropic             # Override provider
GOOSE_RECORD_MCP=1                   # Record MCP test fixtures
```

### Provider Variables
```bash
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
DATABRICKS_HOST=...
```

## Entry Points

- **CLI**: `crates/goose-cli/src/main.rs`
- **Server**: `crates/goose-server/src/main.rs`
- **Agent**: `crates/goose/src/agents/agent.rs`
- **UI Main**: `ui/desktop/src/main.ts`

## Adding New Features

### New LLM Provider
1. Implement `Provider` trait in `crates/goose/src/providers/`
2. Add to `crates/goose/src/providers/mod.rs`
3. Update provider registration

### New Tool/Extension
1. Add to `crates/goose-mcp/` for built-in tools
2. Or create external MCP server
3. Register in extension configuration

### Server API Changes
1. Modify `crates/goose-server/src/routes/`
2. Run `just generate-openapi`
3. UI will use generated TypeScript client

### Testing New Features
1. Add tests to `crates/<crate>/tests/` directory
2. Update `goose-self-test.yaml` recipe
3. Rebuild: `cargo build -r`
4. Validate: `goose run --recipe goose-self-test.yaml`

## CI Pipeline

The CI runs (defined in `.github/workflows/ci.yml`):
- `cargo fmt --check` - Rust formatting
- `cargo test --jobs 2` - All tests
- `./scripts/clippy-lint.sh` - Clippy linting
- `just check-openapi-schema` - OpenAPI validation
- `npm ci && npm run lint:check` - UI linting
- `npm run test:run` - UI tests

## Important Constraints

- Never edit `ui/desktop/openapi.json` manually
- Never edit `Cargo.toml` directly; use `cargo add`
- Always run `cargo fmt` before committing
- Always run `./scripts/clippy-lint.sh` before PR
- In documentation (`documentation/docs` and `documentation/blog`), always refer to the project as "goose" (lowercase)
- No prerelease docs in `/documentation` - docs must stay in sync with released version
