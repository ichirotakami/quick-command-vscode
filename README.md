# Quick Command

A VS Code extension that provides quick command buttons for the terminal. Define your frequently used commands, then execute them with a single click.

![Quick Command screenshot](https://raw.githubusercontent.com/kookob/quick-command-vscode/main/images/screenshot.png)

## Features

### Sidebar Panel

A dedicated sidebar panel in the Activity Bar displays all your configured command buttons. Buttons are organized into two sections:

- **Global** — User-level commands shared across all projects
- **Workspace** — Project-specific commands for the current workspace

Group commands are displayed with a section title and inline sub-command buttons. Single commands appear as individual buttons in a flex row.

### Key Features

- **Single Command** — Send a command to the active terminal with one click
- **Multi-line Commands** — Define an array of commands to send sequentially
- **Command Groups** — Organize related commands under a collapsible group
- **Execute Control** — Choose whether commands auto-execute (press Enter) or just type into the terminal for review
- **Two-level Config** — Global commands (user settings) + Workspace commands (project settings), merged and displayed together
- **Codicon Icons** — Full support for VS Code's built-in [codicon](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing) icon library
- **Visual Indicators** — Green text/icon on auto-execute buttons, click feedback animation
- **Tooltip Preview** — Hover over any button to see the actual command(s) it will send

## Configuration

Quick Command uses two configuration keys:

| Key | Scope | Description |
|-----|-------|-------------|
| `quickCommand.buttons` | User (global) | Commands shared across all projects |
| `quickCommand.workspaceButtons` | Workspace | Commands specific to the current project |

### Button Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | — | Button display text (required) |
| `icon` | `string` | `"terminal"` | [Codicon](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing) icon name, or one of this extension's built-in brand icons (see `src/icons/manifest.json`) |
| `command` | `string \| string[]` | — | Command(s) to send to terminal |
| `execute` | `boolean` | `false` | Auto-press Enter after sending |
| `group` | `SubCommand[]` | — | Sub-commands (makes this a group button) |

Sub-commands support `label`, `command`, and `execute`.

### Examples

**User Settings** (`settings.json`):

```json
{
  "quickCommand.buttons": [
    {
      "label": "Dev",
      "icon": "play",
      "command": "npm run dev",
      "execute": true
    },
    {
      "label": "Build",
      "icon": "package",
      "command": "npm run build"
    },
    {
      "label": "Git",
      "icon": "git-merge",
      "group": [
        { "label": "Pull", "command": "git pull", "execute": true },
        { "label": "Push", "command": "git push", "execute": true },
        { "label": "Status", "command": "git status" }
      ]
    }
  ]
}
```

**Workspace Settings** (`.vscode/settings.json`):

```json
{
  "quickCommand.workspaceButtons": [
    {
      "label": "Setup",
      "icon": "tools",
      "command": ["git pull", "npm install", "npm run build"],
      "execute": true
    },
    {
      "label": "Deploy",
      "icon": "rocket",
      "group": [
        { "label": "Staging", "command": "./deploy.sh staging", "execute": true },
        { "label": "Production", "command": "./deploy.sh prod" }
      ]
    }
  ]
}
```

### Multi-line Commands

Use a string array to send multiple commands sequentially:

```json
{
  "label": "Full Setup",
  "icon": "tools",
  "command": ["git pull", "npm install", "npm run build"],
  "execute": true
}
```

When `execute` is `true`, all lines are sent with Enter. When `false`, the last line is typed without Enter so you can review before executing.

### Execute Control

- `"execute": false` (default) — Command is typed into the terminal but not executed. You press Enter manually.
- `"execute": true` — Command is sent and executed immediately.

Buttons with `execute: true` show in green in the sidebar panel.

Use the `Settings` action to open a menu that can jump to global or project settings, or open the Codicon catalog in your browser.

## Panel Actions

The sidebar panel title bar has two action buttons:

- **Refresh** — Reload buttons from configuration
- **Settings** — Open Quick Command settings

## Common Codicon Icons

| Icon | Name | Icon | Name |
|------|------|------|------|
| ▶ | `play` | ■ | `debug-stop` |
| 📦 | `package` | 🧪 | `beaker` |
| 🚀 | `rocket` | ⚙ | `gear` |
| 🔀 | `git-merge` | 📋 | `output` |
| ⚡ | `zap` | 🔧 | `tools` |

Full list: [VS Code Codicon Reference](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing)

## License

Apache License 2.0 — see [LICENSE.md](LICENSE.md).
