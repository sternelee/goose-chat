# Getting Started with goose-app

## Quick Navigation

**Project Location**: `/home/runner/work/goose-chat/goose-chat/ui/app/goose-app`

## Development Setup

### Prerequisites
Before starting development, ensure you have:
- Node.js (included, npm available)
- Rust toolchain (for Tauri backend)
- Required system dependencies (see notes below)

### Install & Run

```bash
# Navigate to project
cd /home/runner/work/goose-chat/goose-chat/ui/app/goose-app

# Dependencies are already installed, but you can reinstall if needed
npm install

# Start development server (Vite on port 1420)
npm run dev

# In another terminal, start Tauri desktop development
npm run tauri dev

# Build for production
npm run build

# Build desktop application
npm run tauri build
```

## Project Structure

### Frontend (React + TypeScript)
```
src/
├── App.tsx              # Main React component - customize here
├── App.css              # Application styles
├── main.tsx             # React DOM initialization
└── assets/              # Static assets (images, etc.)
```

### Backend (Rust + Tauri)
```
src-tauri/
├── src/
│   ├── main.rs          # Tauri application entry point
│   └── lib.rs           # Rust functions exposed as Tauri commands
├── Cargo.toml           # Rust dependencies (includes tauri-axum-htmx)
├── tauri.conf.json      # Tauri configuration
├── capabilities/        # Permission/security definitions
└── icons/               # Application icons for all platforms
```

### Configuration Files
```
├── package.json         # npm dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build tool configuration
├── index.html           # HTML entry point
└── .gitignore           # Git ignore rules
```

## Key Technologies

| Component | Technology | Version |
|-----------|-----------|---------|
| UI Framework | React | 19.1.0 |
| Language | TypeScript | 5.8.3 |
| Build Tool | Vite | 7.0.4 |
| Backend | Tauri + Rust | 2.x |
| Web Framework | tauri-axum-htmx | 0.1 |

## Common Development Tasks

### Modify React UI
Edit `src/App.tsx` to create your user interface.

Example:
```typescript
export function App() {
  return (
    <div className="container">
      <h1>My App</h1>
      <p>Your content here</p>
    </div>
  );
}
```

### Add Tauri Commands
Edit `src-tauri/src/lib.rs` to add Rust functions that can be called from React.

Example:
```rust
#[tauri::command]
fn my_command(name: &str) -> String {
    format!("Hello, {}!", name)
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![my_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Call Tauri Commands from React
```typescript
import { invoke } from "@tauri-apps/api/core";

async function callMyCommand() {
    const result = await invoke("my_command", { name: "World" });
    console.log(result);
}
```

### Update Configuration
Edit `src-tauri/tauri.conf.json` to:
- Change window size
- Update app title
- Configure build settings
- Adjust security policies

### Add Dependencies

**Frontend (npm)**:
```bash
npm install package-name
```

**Backend (Rust)**:
Edit `src-tauri/Cargo.toml` and add under `[dependencies]`:
```toml
package-name = "0.1"
```

## Integration with goose-server

The project is pre-configured with `tauri-axum-htmx` for easy integration with your goose-server backend.

### Setup Steps:

1. **Install the dependency** (already added to Cargo.toml)
2. **Configure endpoint** in Rust backend
3. **Add HTTP client code** in `src-tauri/src/lib.rs`
4. **Call from React** using Tauri commands

Example:
```rust
use tauri::http::Client;

#[tauri::command]
async fn fetch_from_server() -> Result<String, String> {
    // Make HTTP request to goose-server
    // Return result to React frontend
}
```

## Troubleshooting

### Module not found errors
- Run `npm install` to ensure all dependencies are installed
- Restart the development server

### TypeScript errors
- Check `tsconfig.json` configuration
- Ensure all imports are correctly typed
- Verify React component syntax

### Tauri build errors
- Check Rust syntax in `src-tauri/src/lib.rs`
- Verify Cargo.toml dependencies are correct
- Review the build error messages carefully

### Permission errors
- Update `src-tauri/capabilities/default.json`
- Add required capabilities for your features

## Build for Production

### Web-only build
```bash
npm run build
```
Output: `dist/` directory ready for deployment

### Desktop application build
```bash
npm run tauri build
```
Output: Executables in `src-tauri/target/release/`

### Cross-platform builds
The project supports:
- Linux (AppImage)
- macOS (DMG, App Bundle)
- Windows (NSIS, MSI)

Configure which platforms to build in `src-tauri/tauri.conf.json`.

## IDE Setup

### VS Code
The project includes VS Code settings in `.vscode/`.

Recommended extensions:
- Rust Analyzer (for Rust code)
- TypeScript Vue Plugin
- Thunder Client (API testing)

### TypeScript Support
TypeScript is configured with strict mode enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Performance Considerations

### Vite HMR
Hot module replacement is enabled for fast development:
- Dev server: port 1420
- HMR: port 1421
- Changes to React components reload instantly

### Build Optimization
- Tree shaking enabled
- Code splitting for large bundles
- Minification for production

### Tauri Performance
- Lightweight Rust runtime
- Native system integration
- Small app bundle size

## Security

### Default Security
- Content Security Policy (CSP) in development
- Capability-based permissions system
- Sandboxed renderer process

### Customization
Update security settings in:
- `src-tauri/capabilities/default.json` - Capabilities
- `src-tauri/tauri.conf.json` - CSP and security config

## API Reference

### Tauri API
```typescript
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-opener";
```

### Window Control
```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";
const window = getCurrentWindow();
await window.minimize();
```

### Filesystem
```typescript
import { readTextFile, writeFile } from "@tauri-apps/api/fs";
```

See https://tauri.app/develop/api for complete API documentation.

## Documentation

### Auto-generated Docs
- `PROJECT_SETUP.md` - Detailed setup information
- `TAURI_PROJECT_SUMMARY.md` - Complete project overview

### External Resources
- **Tauri**: https://tauri.app
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Vite**: https://vite.dev

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Tauri documentation: https://tauri.app/guides
3. Check React documentation: https://react.dev
4. Consult project-specific docs in `/ui/app/`

---

**Happy coding!** 🚀

Project initialized: 2025-01-20
Status: ✅ Ready for development
