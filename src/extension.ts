import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import iconManifest from './icons/manifest.json';

interface SubCommand {
  label: string;
  command: string | string[];
  execute?: boolean;
}

interface ButtonConfig {
  label: string;
  icon?: string;
  command?: string | string[];
  execute?: boolean;
  group?: SubCommand[];
  section?: string;
}

// Brand icons that codicons doesn't cover. Defined once in src/icons/manifest.json
// (path data + font codepoint) and consumed from there both here and by
// scripts/build-icons.py, which regenerates media/fonts/quick-command-icons.woff
// and package.json's `contributes.icons` from the same file — see AGENTS.md.
// Rendered as inline SVG in the sidebar webview; also contributed as a font via
// `contributes.icons` in package.json (id below) so `$(themeIconId)` works in
// native UI like the status bar.
const CUSTOM_ICONS: Record<string, { svgPath: string; themeIconId: string }> = Object.fromEntries(
  Object.entries(iconManifest).map(([key, icon]) => [
    key,
    { svgPath: `<path d="${icon.svgPath}"/>`, themeIconId: icon.themeIconId },
  ]),
);

function renderIcon(name: string): string {
  const custom = CUSTOM_ICONS[name];
  if (custom) {
    return `<svg class="custom-icon" viewBox="0 0 24 24" fill="currentColor" overflow="visible" xmlns="http://www.w3.org/2000/svg">${custom.svgPath}</svg>`;
  }
  return `<span class="codicon codicon-${escHtml(name)}"></span>`;
}

// ─── WebviewView Provider ────────────────────────────────────

class QuickCommandViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'quickCommand.buttonsView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
      ],
    };

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'run') {
        sendToTerminal(msg.command, msg.execute ?? false);
      }
    });

    this.refresh();
  }

  refresh() {
    if (!this._view) {
      return;
    }
    this._view.webview.html = this._getHtml();
  }

  private _renderButtons(buttons: ButtonConfig[]): string {
    const blocks: string[] = [];
    let singleBtns: string[] = [];
    // Consecutive buttons sharing the same `section` get clustered under one
    // header; a new header starts whenever the section value changes (including
    // dropping back to no section), so array order is always what you see.
    let currentSection: string | undefined;
    const flushSingles = () => {
      if (singleBtns.length > 0) {
        blocks.push(`<div class="section"><div class="btn-row">${singleBtns.join('')}</div></div>`);
        singleBtns = [];
      }
    };

    buttons.forEach((btn) => {
      if (btn.section !== currentSection) {
        flushSingles();
        currentSection = btn.section;
      }
      if (btn.group) {
        const subItems = btn.group
          .map((sub) => {
            const cmdJson = JSON.stringify(sub.command);
            const tipStr = Array.isArray(sub.command) ? sub.command.join(' && ') : sub.command;
            const execFlag = sub.execute ? 'true' : 'false';
            return `<div class="dropdown-item ${sub.execute ? 'dropdown-item-exec' : ''}" data-cmd='${escAttr(cmdJson)}' data-execute="${execFlag}" data-tooltip="${escHtml(tipStr)}">${escHtml(sub.label)}</div>`;
          })
          .join('');
        if (subItems) {
          singleBtns.push(`
            <div class="dropdown-wrapper">
              <button class="btn dropdown-toggle">
                ${renderIcon(btn.icon || 'list-flat')}
                ${escHtml(btn.label)}
                <span class="codicon codicon-chevron-down toggle-arrow"></span>
              </button>
              <div class="dropdown-menu">${subItems}</div>
            </div>`);
        }
      } else {
        const cmdJson = JSON.stringify(btn.command || '');
        const tipStr = Array.isArray(btn.command) ? btn.command.join(' && ') : btn.command || '';
        const execFlag = btn.execute ? 'true' : 'false';
        singleBtns.push(`
          <button class="btn ${btn.execute ? 'btn-exec' : ''}" data-cmd='${escAttr(cmdJson)}' data-execute="${execFlag}" data-tooltip="${escHtml(tipStr)}">
            ${renderIcon(btn.icon || 'terminal')}
            ${escHtml(btn.label)}
          </button>`);
      }
    });
    flushSingles();
    return blocks.join('');
  }

  private _getHtml(): string {
    const codiconsUri = this._view!.webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'),
    );
    const { userButtons, workspaceButtons } = getAllButtons();

    const parts: string[] = [];
    if (userButtons.length > 0) {
      parts.push(
        `<div class="group-header"><span class="codicon codicon-account"></span> Global</div>${this._renderButtons(userButtons)}`,
      );
    }
    if (workspaceButtons.length > 0) {
      parts.push(
        `<div class="group-header"><span class="codicon codicon-folder"></span> Workspace</div>${this._renderButtons(workspaceButtons)}`,
      );
    }
    if (parts.length === 0) {
      parts.push(
        '<div class="empty">No commands configured. Open the <span class="codicon codicon-ellipsis"></span> menu and choose Edit Settings.</div>',
      );
    }
    const body = parts.join('<div class="divider thick"></div>');

    const templatePath = path.join(this._context.extensionPath, 'src', 'panel.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    return template.replace('{{codiconsUri}}', codiconsUri.toString()).replace('{{body}}', body);
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Main ────────────────────────────────────────────────────

let viewProvider: QuickCommandViewProvider;

export function activate(context: vscode.ExtensionContext) {
  viewProvider = new QuickCommandViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(QuickCommandViewProvider.viewType, viewProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quickCommand.openIconListing', () => {
      vscode.env.openExternal(
        vscode.Uri.parse('https://code.visualstudio.com/api/references/icons-in-labels#icon-listing'),
      );
    }),
    vscode.commands.registerCommand('quickCommand.refreshButtons', () => {
      rebuildAll();
    }),
    vscode.commands.registerCommand('quickCommand.newTerminal', () => {
      vscode.window.createTerminal().show();
    }),
    vscode.commands.registerCommand('quickCommand.newTerminalInEditor', () => {
      vscode.window.createTerminal({ location: vscode.TerminalLocation.Editor }).show();
    }),
    vscode.commands.registerCommand('quickCommand.openPanel', () => {
      // Focus the view itself rather than its original container, so this still
      // works after the user drags the view into the panel or secondary sidebar.
      vscode.commands.executeCommand(`${QuickCommandViewProvider.viewType}.focus`);
    }),
    vscode.commands.registerCommand('quickCommand.openSettings', async () => {
      const items = [
        { label: '$(account) Global Settings', description: 'quickCommand.buttons', action: 'open-user' as const },
        {
          label: '$(folder) Project Settings',
          description: 'quickCommand.workspaceButtons',
          action: 'open-workspace' as const,
        },
        {
          label: 'Browse Icons $(link-external)',
          description: 'Open the VS Code codicon icon listing in your browser',
          action: 'open-icons' as const,
        },
      ];
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Open settings or browse the codicon catalog',
      });
      if (!picked) {
        return;
      }
      switch (picked.action) {
        case 'open-user':
          await openSettingsJson('user');
          return;
        case 'open-workspace':
          await openSettingsJson('workspace');
          return;
        case 'open-icons':
          await vscode.commands.executeCommand('quickCommand.openIconListing');
          return;
      }
    }),
  );

  rebuildAll();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('quickCommand.buttons') || e.affectsConfiguration('quickCommand.workspaceButtons')) {
        rebuildAll();
      }
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      rebuildAll();
    }),
  );
}

function getAllButtons(): { userButtons: ButtonConfig[]; workspaceButtons: ButtonConfig[] } {
  const config = vscode.workspace.getConfiguration('quickCommand');
  const inspected = config.inspect<ButtonConfig[]>('buttons');
  // Use globalValue if user has set it, otherwise fall back to defaultValue
  const userButtons = inspected?.globalValue ?? inspected?.defaultValue ?? [];
  const workspaceButtons = config.get<ButtonConfig[]>('workspaceButtons', []);
  return { userButtons, workspaceButtons };
}

async function openSettingsJson(target: 'user' | 'workspace') {
  if (target === 'user') {
    await vscode.commands.executeCommand('workbench.action.openSettingsJson', {
      revealSetting: { key: 'quickCommand.buttons' },
    });
    return;
  }
  await vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile');
}

function rebuildAll() {
  viewProvider?.refresh();
}

function sendToTerminal(command: string | string[], execute = false) {
  let terminal = vscode.window.activeTerminal;
  if (!terminal) {
    terminal = vscode.window.createTerminal();
  }
  terminal.show(false);
  const lines = Array.isArray(command) ? command : [command];
  lines.forEach((line, i) => {
    const addNewLine = i < lines.length - 1 ? true : execute;
    terminal!.sendText(line, addNewLine);
  });
}

export function deactivate() {
}
