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
│   ├── bililoader-extension/       # Feature extensions (feed filter, stealth, bv2av, sleep time, etc.)
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
- `pageScripts` — Scripts injected into page world (before client JS)

Plugin lifecycle hooks:
- **Main:** `onBrowserWindowCreated(window, ctx)` — called when a new BrowserWindow is created
- **Renderer:** `onReady(ctx)`, `onPageLoaded(url)`, `onPageUnloaded()`, `onSettingsPageLoaded(view)`

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
- **No test framework** — testing is manual via MCP tools
- **Logging** via `electron-log` (imported as `logger.js`)
- **UI components** in `renderer/components/` follow a `BaseComponent` pattern wrapping Bilibili's native Vue components (VCheckbox, VRadioGroup, VDropdown, VButton, VTabs, etc.)
- File naming: lowercase with underscores for directories, camelCase or lowercase for files

### UI Component Pattern

Components extend `BaseComponent` and set:
- `_component` — Vue component constructor or object with `setup()` returning a render function
- `_props` — Vue component props
- `_slots` — Vue component slots
- `_wrapper_component` — Optional HTML wrapper element

**Important:** The renderer uses `Vue.render()` without app context, so Vue reactivity (ref/computed) does NOT trigger re-renders in custom render functions. Components relying on dynamic state must use direct DOM updates (see `Select.js`) or delegate state to native Vue components via `modelValue`/`onUpdate:modelValue` (see `Checkbox.js`).

Available native Vue components: `VCheckbox`, `VRadioGroup`, `VRadio`, `VButton`, `VDropdown`, `VTabs`.

### bililoader-extension Plugin

The main built-in plugin providing user-facing features. Feature code should go here, not in core:
- **Main process** (`main.js`): Hooks like stealth mode, sleep time override
- **Renderer** (`renderer.js`): Settings UI, page-level features
- **Modules** (`modules/`): Self-contained feature implementations (feed-filter, stealth, bv2av)

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

## Bilibili Client Internals

- **`biliApp`** global (main process) exposes services: `configService`, `storeService`, `reportService`, `windowService`, `windowFactory`, `playerService`, `notifyService`, `systemService`, `downloadService`, etc.
- **`biliApp.FALL_ASLEEP_TIME`** controls auto-sleep timeout (default 900000ms = 15min)
- **`biliBridgePc`** (renderer) provides `callNative`/`callNativeSync` for native calls
- Navigation: use Vue Router `$router.push()`, never `navigation.navigate()`
- Settings page URL: `index.html#/page/settings`
- Home page URL: `index.html#/page/home/recommends`

## Important Notes

- This is an early-stage personal project; APIs may change
- The project patches Electron's `app.asar` — changes to the Bilibili client version may require re-running setup
- The renderer uses Bilibili's bundled Vue 3.2.37 runtime (accessed via global `Vue` and `app` objects)
- IPC channel names follow the pattern `BiliLoader.BiliLoader.*`
