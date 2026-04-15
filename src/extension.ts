import * as vscode from 'vscode';

type ShowInTarget = 'all' | 'sidebar' | 'statusbar';

interface SubCommand {
  label: string;
  command: string | string[];
  execute?: boolean;
  showIn?: ShowInTarget[];
}

interface ButtonConfig {
  label: string;
  icon?: string;
  command?: string | string[];
  execute?: boolean;
  showIn?: ShowInTarget[];
  group?: SubCommand[];
}

function shouldShowIn(target: ShowInTarget, item: { showIn?: ShowInTarget[] }): boolean {
  if (item.showIn === undefined) {
    return true;
  }
  return item.showIn.includes('all') || item.showIn.includes(target);
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
    const sections: string[] = [];
    let singleBtns: string[] = [];
    const flushSingles = () => {
      if (singleBtns.length > 0) {
        sections.push(`<div class="section"><div class="btn-row">${singleBtns.join('')}</div></div>`);
        singleBtns = [];
      }
    };

    buttons.forEach((btn) => {
      if (btn.group) {
        if (!shouldShowIn('sidebar', btn)) {
          return;
        }
        flushSingles();
        const subBtns = btn.group
          .filter((sub) => shouldShowIn('sidebar', sub))
          .map((sub) => {
            const cmdJson = JSON.stringify(sub.command);
            const tipStr = Array.isArray(sub.command) ? sub.command.join(' && ') : sub.command;
            const execFlag = sub.execute ? 'true' : 'false';
            return `<button class="btn btn-sub ${sub.execute ? 'btn-exec' : ''}" data-cmd='${escAttr(cmdJson)}' data-execute="${execFlag}" title="${escHtml(tipStr)}">${escHtml(sub.label)}${sub.execute ? '<span class="exec-dot"></span>' : ''}</button>`;
          })
          .join('');
        if (subBtns) {
          sections.push(`
            <div class="section">
              <div class="section-title">
                <span class="codicon codicon-${escHtml(btn.icon || 'list-flat')}"></span>
                ${escHtml(btn.label)}
              </div>
              <div class="btn-row">${subBtns}</div>
            </div>`);
        }
      } else {
        if (!shouldShowIn('sidebar', btn)) {
          return;
        }
        const cmdJson = JSON.stringify(btn.command || '');
        const tipStr = Array.isArray(btn.command) ? (btn.command as string[]).join(' && ') : btn.command || '';
        const execFlag = btn.execute ? 'true' : 'false';
        singleBtns.push(`
          <button class="btn ${btn.execute ? 'btn-exec' : ''}" data-cmd='${escAttr(cmdJson)}' data-execute="${execFlag}" title="${escHtml(tipStr)}">
            <span class="codicon codicon-${escHtml(btn.icon || 'terminal')}"></span>
            ${escHtml(btn.label)}${btn.execute ? '<span class="exec-dot"></span>' : ''}
          </button>`);
      }
    });
    flushSingles();
    return sections.join('<div class="divider"></div>');
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
        '<div class="empty">No commands configured. Click <span class="codicon codicon-gear"></span> above to add.</div>',
      );
    }
    const body = parts.join('<div class="divider thick"></div>');

    return /*html*/ `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="${codiconsUri}" rel="stylesheet" />
<style>
  body {
    margin: 0;
    padding: 8px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
  }
  .section {
    margin: 0;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 4px;
    padding: 0 2px;
  }
  .btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    line-height: 1.4;
    transition: opacity 0.15s;
  }
  .btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  .btn:active {
    opacity: 0.7;
  }
  .btn.sent {
    opacity: 0.5;
    pointer-events: none;
  }
  .btn-sub {
    padding: 3px 8px;
    font-size: 11px;
  }
  .exec-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--vscode-terminal-ansiGreen, #89d185);
    margin-left: 2px;
    vertical-align: middle;
  }
  .codicon {
    font-size: 14px;
  }
  .divider {
    height: 1px;
    background: var(--vscode-panel-border);
    margin: 8px 0;
  }
  .divider.thick {
    height: 2px;
    margin: 12px 0;
  }
  .group-header {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    opacity: 0.6;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .empty {
    opacity: 0.5;
    font-size: 12px;
    padding: 12px 0;
  }
</style>
</head>
<body>
  ${body}
<script>
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('.btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmdJson = btn.getAttribute('data-cmd');
      const execute = btn.getAttribute('data-execute') === 'true';
      if (cmdJson) {
        const command = JSON.parse(cmdJson);
        vscode.postMessage({ type: 'run', command, execute });
        // Visual feedback
        btn.classList.add('sent');
        setTimeout(() => btn.classList.remove('sent'), 300);
      }
    });
  });
</script>
</body>
</html>`;
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Main ────────────────────────────────────────────────────

let statusBarItems: vscode.StatusBarItem[] = [];
let dynamicDisposables: vscode.Disposable[] = [];
let viewProvider: QuickCommandViewProvider;

export function activate(context: vscode.ExtensionContext) {
  viewProvider = new QuickCommandViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(QuickCommandViewProvider.viewType, viewProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('quickCommand.refreshButtons', () => {
      rebuildAll();
    }),
    vscode.commands.registerCommand('quickCommand.openSettings', async () => {
      const items = [
        { label: '$(account) Global Settings', description: 'quickCommand.buttons', target: 'user' },
        { label: '$(folder) Workspace Settings', description: 'quickCommand.workspaceButtons', target: 'workspace' },
      ];
      const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select which settings to edit' });
      if (!picked) {
        return;
      }
      if (picked.target === 'user') {
        vscode.commands.executeCommand('workbench.action.openSettingsJson', {
          revealSetting: { key: 'quickCommand.buttons' },
        });
      } else {
        vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile');
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

function rebuildAll() {
  // Dispose old resources (managed separately, not in context.subscriptions)
  statusBarItems.forEach((item) => item.dispose());
  statusBarItems = [];
  dynamicDisposables.forEach((d) => d.dispose());
  dynamicDisposables = [];

  const { userButtons, workspaceButtons } = getAllButtons();
  const allButtons = [...userButtons, ...workspaceButtons];

  const MAX_STATUSBAR_ITEMS = 10;
  let topCount = 0;
  let cmdIndex = 0;

  allButtons.forEach((btn) => {
    if (topCount >= MAX_STATUSBAR_ITEMS) { return; }
    if (!shouldShowIn('statusbar', btn)) { return; }

    if (btn.group) {
      const commandId = `quickCommand.run.${cmdIndex}`;
      const cmdDisp = vscode.commands.registerCommand(commandId, () => showGroupPick(btn.group!));
      dynamicDisposables.push(cmdDisp);

      const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000 - cmdIndex);
      const iconStr = btn.icon ? `$(${btn.icon}) ` : '';
      item.text = `${iconStr}${btn.label} $(chevron-down)`;
      item.command = commandId;
      const lines = btn.group.map((sub) => {
        const cmdStr = Array.isArray(sub.command) ? sub.command.join(' && ') : sub.command;
        return `- \`${sub.label}: ${cmdStr}\``;
      });
      item.tooltip = new vscode.MarkdownString(lines.join('\n'), true);
      item.show();
      statusBarItems.push(item);
      topCount++;
      cmdIndex++;

      // Sub-commands pinned to statusbar don't count toward the limit
      btn.group.forEach((sub) => {
        if (!shouldShowIn('statusbar', sub)) { return; }
        const subCommandId = `quickCommand.run.${cmdIndex}`;
        const subDisp = vscode.commands.registerCommand(subCommandId, () =>
          sendToTerminal(sub.command, sub.execute ?? false),
        );
        dynamicDisposables.push(subDisp);

        const subItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000 - cmdIndex);
        const subExecDot = sub.execute ? ' $(circle-filled)' : '';
        subItem.text = `${sub.label}${subExecDot}`;
        subItem.command = subCommandId;
        const subCmdStr = Array.isArray(sub.command) ? sub.command.join(' && ') : sub.command;
        subItem.tooltip = subCmdStr + (sub.execute ? ' (auto-execute)' : ' (type only)');
        subItem.show();
        statusBarItems.push(subItem);
        cmdIndex++;
      });
    } else {
      const commandId = `quickCommand.run.${cmdIndex}`;
      const cmdDisp = vscode.commands.registerCommand(commandId, () => executeButton(btn));
      dynamicDisposables.push(cmdDisp);

      const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000 - cmdIndex);
      const iconStr = btn.icon ? `$(${btn.icon}) ` : '';
      const execDot = btn.execute ? ' $(circle-filled)' : '';
      item.text = `${iconStr}${btn.label}${execDot}`;
      item.command = commandId;
      const cmdStr = Array.isArray(btn.command) ? btn.command.join(' && ') : btn.command || '';
      item.tooltip = cmdStr + (btn.execute ? ' (auto-execute)' : ' (type only)');
      item.show();
      statusBarItems.push(item);
      topCount++;
      cmdIndex++;
    }
  });

  viewProvider?.refresh();
}

function executeButton(btn: ButtonConfig) {
  if (btn.command) {
    sendToTerminal(btn.command, btn.execute ?? false);
  } else if (btn.group) {
    showGroupPick(btn.group);
  }
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

async function showGroupPick(group: SubCommand[]) {
  const items = group.map((g) => ({
    label: g.label,
    description: Array.isArray(g.command) ? g.command.join(' && ') : g.command,
    _sub: g,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a command to run' });
  if (picked) {
    sendToTerminal(picked._sub.command, picked._sub.execute ?? false);
  }
}

export function deactivate() {
  statusBarItems.forEach((item) => item.dispose());
  dynamicDisposables.forEach((d) => d.dispose());
}
