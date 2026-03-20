export function getSuperpowersPanelHtmlContent(): string {
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
    .file-item.completed .file-title {
      color: var(--vscode-testing-iconPassed);
    }
    .file-item.needs-testing .file-title {
      color: var(--vscode-testing-iconQueued);
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
    .progress.needs-testing {
      color: var(--vscode-testing-iconQueued);
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
    .context-menu {
      position: fixed;
      z-index: 1000;
      min-width: 160px;
      background: var(--vscode-menu-background);
      border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border));
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      padding: 4px 0;
    }
    .context-menu.hidden {
      display: none;
    }
    .context-menu-item {
      width: 100%;
      border: none;
      background: transparent;
      color: var(--vscode-menu-foreground);
      text-align: left;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
    }
    .context-menu-item:hover {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
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

  <div id="context-menu" class="context-menu hidden">
    <button id="needs-testing-plan-action" class="context-menu-item" type="button">标记为需要测试</button>
    <button id="complete-plan-action" class="context-menu-item" type="button">标记为已完成</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const contextMenu = document.getElementById('context-menu');
    const needsTestingPlanAction = document.getElementById('needs-testing-plan-action');
    const completePlanAction = document.getElementById('complete-plan-action');
    let contextMenuPlanPath = null;
    let contextMenuPlanStatus = 'default';

    function hideContextMenu() {
      contextMenu.classList.add('hidden');
      contextMenuPlanPath = null;
      contextMenuPlanStatus = 'default';
    }

    function getPlanContextMenuVisibility(status) {
      return {
        showNeedsTesting: status !== 'needsTesting',
        showCompleted: status !== 'completed',
      };
    }

    function syncContextMenuActions() {
      const visibility = getPlanContextMenuVisibility(contextMenuPlanStatus);
      needsTestingPlanAction.style.display = visibility.showNeedsTesting ? 'block' : 'none';
      completePlanAction.style.display = visibility.showCompleted ? 'block' : 'none';
    }

    function showContextMenu(event, path, status) {
      event.preventDefault();
      event.stopPropagation();
      contextMenuPlanPath = path;
      contextMenuPlanStatus = status || 'default';
      syncContextMenuActions();
      contextMenu.style.left = event.clientX + 'px';
      contextMenu.style.top = event.clientY + 'px';
      contextMenu.classList.remove('hidden');
    }

    needsTestingPlanAction.addEventListener('click', () => {
      if (!contextMenuPlanPath)
        return;

      vscode.postMessage({ command: 'markPlanNeedsTesting', path: contextMenuPlanPath });
      hideContextMenu();
    });

    completePlanAction.addEventListener('click', () => {
      if (!contextMenuPlanPath)
        return;

      vscode.postMessage({ command: 'completePlan', path: contextMenuPlanPath });
      hideContextMenu();
    });

    document.addEventListener('click', hideContextMenu);
    window.addEventListener('blur', hideContextMenu);
    window.addEventListener('resize', hideContextMenu);

    function renderFiles(files, containerId, type) {
      const container = document.getElementById(containerId);
      const countEl = document.getElementById(containerId.replace('-content', '-count'));

      if (!files || files.length === 0) {
        container.innerHTML = '<div class="empty">暂无文件</div>';
        countEl.textContent = '(0)';
        return;
      }

      countEl.textContent = '(' + files.length + ')';

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
          const isCompleted = type === 'plan' && file.status === 'completed';
          const isNeedsTesting = type === 'plan' && file.status === 'needsTesting';
          const classes = ['file-item'];
          if (type === 'plan') {
            classes.push('plan-item');
          }
          if (isCompleted) {
            classes.push('completed');
          }
          else if (isNeedsTesting) {
            classes.push('needs-testing');
          }
          const encodedPath = encodeURIComponent(file.path);
          html += '<li class="' + classes.join(' ') + '" onclick="openFile(\\'' + file.path + '\\')"';
          if (type === 'plan') {
            html += ' data-plan-path="' + encodedPath + '"';
            html += ' data-plan-status="' + file.status + '"';
          }
          html += '>';
          html += '<span class="file-title">' + file.title + '</span>';
          if (type === 'plan' && file.progress) {
            let cls = 'progress';
            if (isCompleted) {
              cls += ' complete';
            }
            else if (isNeedsTesting) {
              cls += ' needs-testing';
            }
            html += '<span class="' + cls + '">[' + file.progress.completed + '/' + file.progress.total + ']</span>';
          }
          html += '</li>';
        });
        html += '</ul></div>';
      });

      container.innerHTML = html;

      if (type === 'plan') {
        container.querySelectorAll('.plan-item').forEach(item => {
          item.addEventListener('contextmenu', event => {
            const encodedPath = item.getAttribute('data-plan-path');
            const planStatus = item.getAttribute('data-plan-status') || 'default';
            if (!encodedPath)
              return;

            showContextMenu(event, decodeURIComponent(encodedPath), planStatus);
          });
        });
      }
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
        hideContextMenu();
        renderFiles(message.data.specs, 'specs-content', 'spec');
        renderFiles(message.data.plans, 'plans-content', 'plan');
      }
    });
  </script>
</body>
</html>`
}
