# Repository Guidelines

## Project Structure & Module Organization
`src/extension.ts` is the main extension entry and owns command registration, status bar items, configuration parsing, and webview wiring. `src/panel.html` is the sidebar webview template. Built output goes to `dist/extension.js` and should be treated as generated code. Root-level assets such as `icon.png`, `icon.svg`, and `README*.md` support packaging and marketplace documentation. `.vscode/launch.json` contains local extension-host settings.

## Build, Test, and Development Commands
- `npm run build`: bundle `src/extension.ts` into `dist/extension.js` with esbuild.
- `npm run watch`: rebuild on change during local development.
- `npm run package`: production bundle with minification.

Open this folder in VS Code and press `F5` to launch an Extension Development Host for manual testing. After changing contribution points in `package.json`, restart the host instead of relying on hot reload.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation and semicolons, matching the existing codebase. Prefer small helper functions over deep nesting. Use `camelCase` for variables/functions, `PascalCase` for types/classes, and keep VS Code command IDs in the `quickCommand.*` namespace. Keep HTML template changes minimal and avoid embedding large inline scripts in `extension.ts`.

## Testing Guidelines
There is currently no automated test suite in this repository. Validate changes manually in the Extension Development Host:
- verify sidebar rendering and dropdown behavior
- verify status bar buttons, tooltips, and theme-dependent colors
- verify user/workspace settings changes trigger refresh correctly

If you add tests later, place them under `src/test/` and keep test file names aligned with the source module, for example `extension.test.ts`.

## Commit & Pull Request Guidelines
Recent history uses short imperative English summaries such as `Update version...` and `Initial release...`. Prefer Conventional Commits going forward, for example `feat: add execute color for status bar buttons`. Keep each commit scoped to one logical change.

Pull requests should include a concise description, note any `package.json` contribution changes, and attach screenshots or GIFs for UI-facing updates such as sidebar or status bar changes. Mention manual verification steps in the PR body.

## Configuration Notes
This extension reads `quickCommand.buttons` and `quickCommand.workspaceButtons` from VS Code settings. Preserve backward compatibility for these schemas when changing configuration fields.
