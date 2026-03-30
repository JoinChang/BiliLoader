# CLAUDE.md

## Project Overview

BiliLoader is a plugin loader for the Bilibili PC desktop client (Electron-based). It injects into the client's startup process and provides a plugin system with three execution contexts: main process, preload, and renderer. Includes an MCP server for debugging via Chrome DevTools Protocol.

**Language:** JavaScript (CommonJS in Node.js, ES modules in renderer)
**Runtime:** Electron (Node.js + Chromium)
**License:** MIT

## Repository Structure

```
BiliLoader/
├── packages/
│   ├── core/               # Core plugin loader (main package)
│   │   └── src/
│   │       ├── entry.js            # Main entry point
│   │       ├── renderer.js         # Renderer process init
│   │       ├── logger.js           # Logging utilities
│   │       ├── init/               # Initialization (config, preload, updater)
│   │       ├── hooks/              # Electron BrowserWindow & preload hooks
│   │       ├── plugin_loader/      # Plugin discovery & loading (manifest, main, preload, renderer)
│   │       ├── protocol_scheme/    # Custom protocol handlers
│   │       └── renderer/           # UI components, views, utils, styles
│   └── mcp/                # MCP debugging server
│       ├── index.js                # Server entry
│       ├── cdp.js                  # Chrome DevTools Protocol client
│       ├── danmaku.js              # Live danmaku WebSocket client
│       ├── tools.js                # Tool definitions & dispatch
│       └── handlers/               # Tool implementations (page, network, live, main-process)
├── plugins/                # Built-in plugins
│   ├── bililoader-extension/       # Feature extensions (bv2av, stealth, URL cleaning)
│   └── theme-fix/                  # Theme switching fix
├── scripts/
│   └── install.js          # Setup & injection script
├── .mcp.json               # MCP server configuration
└── package.json            # Root workspace
```

## Key Architecture

### Bootstrap Sequence

1. `scripts/install.js` patches the Bilibili client's `app.asar`, replacing `index.js` with a bootstrap loader
2. Bootstrap loads `packages/core/src/entry.js`
3. Entry initializes: logger → config → MCP server (if enabled) → global `BiliLoader` object → plugin manifests → window hooks → original app

### Plugin System

Plugins live in the data directory (`%APPDATA%\BiliLoader` on Windows, `~/.config/BiliLoader` on Linux/macOS) and define a `manifest.json` with:
- `main.js` — Electron main process (full Node.js access)
- `preload.js` — Preload bridge between main and renderer
- `renderer.js` — Browser context (ES module, limited access)

### Global API

`globalThis.BiliLoader` exposes paths, versions, plugin metadata, and IPC-bridged API methods (config read/write, shell operations, relaunch, update).

### MCP Server

Connects to Electron's CDP on a configurable port (default 9222). Provides tools for page navigation, DOM queries, JS execution, network interception, screenshots, and live danmaku capture.

## Development Commands

```bash
npm run setup    # Install and inject BiliLoader into the Bilibili client
```

There is no build step — source files are loaded directly by the Electron runtime.

## Code Conventions

- **No build system** — Plain JavaScript, no transpilation or bundling
- **CommonJS** (`require`/`module.exports`) in Node.js contexts (main process, preload)
- **ES modules** (`import`/`export`) in renderer process files
- **Comments** are often in Chinese (项目面向中文用户)
- **No linter or formatter** configured — follow existing code style
- **No test framework** — testing is manual
- **Logging** via `electron-log` (imported as `logger.js`)
- **UI components** in `renderer/components/` follow a `BaseComponent` pattern wrapping Bilibili's native Vue components
- File naming: lowercase with underscores for directories, camelCase or lowercase for files

## Configuration

Default config (`config.json` in data directory):
```json
{
  "enabled": true,
  "blockAppUpdate": true,
  "enableMcpServer": false,
  "mcpDebugPort": 9222
}
```

## Important Notes

- This is an early-stage personal project; APIs may change
- The project patches Electron's `app.asar` — changes to the Bilibili client version may require re-running setup
- The renderer uses Bilibili's bundled Vue runtime (accessed via `vueRuntime.js` utility)
- IPC channel names follow the pattern `BiliLoader.BiliLoader.*`
