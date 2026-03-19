import * as vscode from 'vscode'
import type { SuperpowersData } from '../types'

export class SuperpowersPanel {
  public static currentPanel: SuperpowersPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []

  public static createOrShow(extensionUri: vscode.Uri): SuperpowersPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (SuperpowersPanel.currentPanel) {
      SuperpowersPanel.currentPanel._panel.reveal(column)
      return SuperpowersPanel.currentPanel
    }

    const panel = vscode.window.createWebviewPanel(
      'superpowersExplorer',
      'Superpowers Explorer',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    )

    SuperpowersPanel.currentPanel = new SuperpowersPanel(panel, extensionUri)
    return SuperpowersPanel.currentPanel
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel
    this._extensionUri = extensionUri

    this._panel.webview.html = this._getHtmlContent()

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    this._panel.webview.onDidReceiveMessage(
      message => this._handleMessage(message),
      null,
      this._disposables,
    )
  }

  public updateData(data: SuperpowersData): void {
    this._panel.webview.postMessage({ type: 'updateData', data })
  }

  private _handleMessage(message: any): void {
    switch (message.command) {
      case 'openFile':
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.path))
        break
      case 'refresh':
        vscode.commands.executeCommand('superpowers.refresh')
        break
    }
  }

  private _getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Superpowers Explorer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
    h2 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 .count {
      font-weight: normal;
      color: var(--vscode-descriptionForeground);
    }
    .section {
      margin-bottom: 24px;
    }
    .date-group {
      margin-bottom: 16px;
    }
    .date-header {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      padding: 4px 8px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .file-list {
      list-style: none;
    }
    .file-item {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .file-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .file-title {
      font-size: 13px;
    }
    .progress {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .progress.complete {
      color: var(--vscode-testing-iconPassed);
    }
    .empty {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      padding: 8px 12px;
    }
    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .refresh-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .refresh-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="refresh-btn" onclick="refresh()">刷新</button>
  </div>
  
  <div class="section">
    <h2>📋 Specs <span class="count" id="specs-count">(0)</span></h2>
    <div id="specs-content"></div>
  </div>
  
  <div class="section">
    <h2>📋 Plans <span class="count" id="plans-count">(0)</span></h2>
    <div id="plans-content"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function renderFiles(files, containerId, type) {
      const container = document.getElementById(containerId);
      const countEl = document.getElementById(containerId.replace('-content', '-count'));
      
      if (!files || files.length === 0) {
        container.innerHTML = '<div class="empty">暂无文件</div>';
        countEl.textContent = '(0)';
        return;
      }
      
      countEl.textContent = '(' + files.length + ')';
      
      // 按日期分组
      const groups = {};
      files.forEach(file => {
        const date = file.date || '未知日期';
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(file);
      });
      
      let html = '';
      Object.keys(groups).sort().reverse().forEach(date => {
        html += '<div class="date-group">';
        html += '<div class="date-header">' + date + '</div>';
        html += '<ul class="file-list">';
        groups[date].forEach(file => {
          html += '<li class="file-item" onclick="openFile(\\'' + file.path + '\\')">';
          html += '<span class="file-title">' + file.title + '</span>';
          if (type === 'plan' && file.progress) {
            const cls = file.progress.completed === file.progress.total ? 'progress complete' : 'progress';
            html += '<span class="' + cls + '">[' + file.progress.completed + '/' + file.progress.total + ']</span>';
          }
          html += '</li>';
        });
        html += '</ul></div>';
      });
      
      container.innerHTML = html;
    }
    
    function openFile(path) {
      vscode.postMessage({ command: 'openFile', path });
    }
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'updateData') {
        renderFiles(message.data.specs, 'specs-content', 'spec');
        renderFiles(message.data.plans, 'plans-content', 'plan');
      }
    });
  </script>
</body>
</html>`
  }

  public dispose(): void {
    SuperpowersPanel.currentPanel = undefined

    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }
}