# Quick Command

VSCode extension that provides quick command buttons for the terminal. Click to send commands instantly.

## Core Features

### 1. Sidebar Panel (Activity Bar)
- Webview panel registered via `viewsContainers.activitybar`
- Renders HTML buttons using `@vscode/codicons` for icons
- Buttons split into **Global** (user-level) and **Workspace** (project-level) sections
- Group buttons display sub-commands inline with section title
- Single command buttons show in a flex-wrap row
- Green dot indicator on buttons with `execute: true`
- Click feedback animation (brief opacity change)

### 2. Status Bar Buttons
- Only shown for buttons whose `showIn` includes `"statusbar"`
- `StatusBarAlignment.Right` with high priority (10000-N) to appear on the left side of right-aligned area
- Group buttons show as dropdown (QuickPick), sub-commands whose `showIn` includes `"statusbar"` also appear individually
- Tooltip shows actual command (Markdown for groups)

### 3. Configuration

Two separate config keys to avoid VSCode's array-override behavior:

- `quickCommand.buttons` — `scope: application` (user-level, shared across all projects)
- `quickCommand.workspaceButtons` — `scope: resource` (workspace-level, current project only)

User buttons read via `config.inspect().globalValue` with fallback to `defaultValue`.

Button schema:
```json
{
  "label": "Dev",
  "icon": "play",
  "command": "npm run dev",
  "execute": false,
  "showIn": ["sidebar"],
  "group": [
    { "label": "Sub", "command": "cmd", "execute": true, "showIn": ["statusbar"] }
  ]
}
```

- `command`: string or string[] (multi-line, sent sequentially)
- `execute`: auto-press Enter after last line (default: false)
- `showIn`: controls sidebar / statusbar visibility; omitted means show everywhere

### 4. Panel Title Bar Actions
- Refresh button (navigation@0) — rebuilds all buttons from config
- New Terminal `+` (navigation@1) — opens a terminal in the panel
- `...` overflow menu: New Terminal in Editor Area (`1_terminal`), then Edit Settings (`2_settings`) — opens the global/project settings picker
- `quickCommand.openPanel` focuses `quickCommand.buttonsView.focus` (not the view container), so it works after the view is dragged elsewhere

## Technical Notes

- Built with esbuild, single bundle `dist/extension.js`
- Webview passes commands via JSON serialization (not string splitting)
- Dynamic disposables managed separately from `context.subscriptions` to avoid memory leak on rebuild
- `@vscode/codicons` dist files included in VSIX via `.vscodeignore` exception
- Minimum VSCode version: 1.85.0
- Activation: `onStartupFinished`
- npm package name: `quick-command`
- Display name: Quick Command

## Development

```bash
npm install
npm run build        # esbuild bundle
npm run watch        # esbuild watch mode
npx @vscode/vsce package   # create .vsix
```

Press F5 to launch Extension Development Host. Use `--profile-temp` in launch.json for fresh state each debug session.
