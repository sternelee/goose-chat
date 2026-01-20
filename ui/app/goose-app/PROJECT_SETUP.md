# Goose App - Tauri + React + TypeScript Project Setup

## Project Overview

A new Tauri desktop application has been successfully created with the following technology stack:

- **Framework**: Tauri 2.x (Rust backend)
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7.x
- **Package Manager**: npm

## Directory Structure

```
/home/runner/work/goose-chat/goose-chat/ui/app/goose-app/
├── src/                          # React TypeScript source files
│   ├── App.tsx                   # Main React component
│   ├── App.css                   # Application styles
│   ├── main.tsx                  # React entry point
│   ├── vite-env.d.ts             # Vite type definitions
│   └── assets/                   # Static assets
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri main entry
│   │   └── lib.rs                # Rust library code
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   ├── build.rs                  # Build script
│   ├── capabilities/             # Permission definitions
│   └── icons/                    # App icons
├── public/                       # Static public files
├── dist/                         # Build output (generated)
├── node_modules/                 # npm dependencies
├── package.json                  # npm configuration
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
└── index.html                    # HTML entry point
```

## Installed Dependencies

### Frontend (package.json)
- **react**: ^19.1.0
- **react-dom**: ^19.1.0
- **@tauri-apps/api**: ^2 (Tauri JavaScript API)
- **@tauri-apps/plugin-opener**: ^2 (URL opener plugin)

### Backend (src-tauri/Cargo.toml)
- **tauri**: 2.x (Tauri framework)
- **tauri-plugin-opener**: 2 (Opener plugin)
- **serde**: 1.x (Serialization)
- **serde_json**: 1 (JSON support)
- **tauri-axum-htmx**: 0.1 (Web framework integration - added for goose-server bridge)

### Dev Dependencies
- **typescript**: ~5.8.3
- **vite**: ^7.0.4
- **@vitejs/plugin-react**: ^4.6.0
- **@tauri-apps/cli**: ^2
- **@types/react**: ^19.1.8
- **@types/react-dom**: ^19.1.6

## Key Configuration Files

### vite.config.ts
- React plugin enabled
- Configured for Tauri development
- Dev server on port 1420
- HMR (Hot Module Replacement) for development

### tsconfig.json
- Target: ES2020
- Strict mode enabled
- JSX: react-jsx

### tauri.conf.json
- App ID: `com.runner.goose-app`
- Window size: 800x600
- Build configuration for development and production

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Tauri commands
npm run tauri dev      # Start Tauri development
npm run tauri build    # Build application
npm run tauri android init  # Initialize Android support
```

## Next Steps

1. **Customize React Components**: Modify `src/App.tsx` to create the UI
2. **Add Tauri Commands**: Implement Rust functions in `src-tauri/src/main.rs`
3. **Setup goose-server Bridge**: Use `tauri-axum-htmx` to integrate with goose-server
4. **Add Icons**: Replace icon files in `src-tauri/icons/`
5. **Configure Permissions**: Update `src-tauri/capabilities/default.json` as needed

## Dependencies Note

The system may be missing some Linux prerequisites for Tauri development:
- webkit2gtk
- rsvg2

Install them according to: https://tauri.app/guides/prerequisites/#linux

## Project Setup Date

Created: 2025-01-20

## Status

✅ Project initialized successfully
✅ npm dependencies installed (72 packages)
✅ tauri-axum-htmx dependency added to Cargo.toml
✅ Ready for customization and development
