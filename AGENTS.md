# Repository Guidelines

## Project Structure & Module Organization
`src/extension.ts` is the main extension entry and owns command registration, status bar items, configuration parsing, and webview wiring. `src/panel.html` is the sidebar webview template. Built output goes to `dist/extension.js` and should be treated as generated code. Root-level assets such as `icon.png` and `README*.md` support packaging and marketplace documentation. `.vscode/launch.json` contains local extension-host settings.

## Build, Test, and Development Commands
- `npm run build`: bundle `src/extension.ts` into `dist/extension.js` with esbuild.
- `npm run watch`: rebuild on change during local development.
- `npm run package`: production bundle with minification.
- `npm run icons:build` (requires `pip3 install fonttools`): regenerate `media/fonts/quick-command-icons.woff` and `package.json`'s `contributes.icons` from `src/icons/manifest.json`.

Open this folder in VS Code and press `F5` to launch an Extension Development Host for manual testing. After changing contribution points in `package.json`, restart the host instead of relying on hot reload.

## Custom Brand Icons
`src/icons/manifest.json` is the single source of truth for non-codicon icons (dbt, knight, docker, pre-commit, ...) — each entry is `{ themeIconId, description, codepoint, svgPath }`, where `svgPath` is path data already normalized to a 24x24 viewBox. `extension.ts` imports this file directly to build `CUSTOM_ICONS` for the sidebar webview, so it's always in sync automatically. The font and `package.json`'s `contributes.icons` are the two artifacts VS Code requires to be static files, so they can't be read at runtime — run `npm run icons:build` after editing the manifest (adding/changing/removing an icon) to regenerate both, then `npm run build`.

To add a new icon: source the brand's actual SVG path (official site/repo, not a redistributed icon pack — check for trademark/removal history first, e.g. via the project's own asset repo), normalize it to a 24x24 viewBox with a small margin (~0.3-0.4 units), add an entry to the manifest with the next unused codepoint (`\E900`, `\E901`, ... sequential), then run `npm run icons:build && npm run build`.

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
