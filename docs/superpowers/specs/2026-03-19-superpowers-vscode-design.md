# Superpowers VS Code 插件设计文档

## 概述

一个 VS Code 插件，用于展示和管理项目中由 superpowers 生成的 specs 和 plans 文档。

## 功能需求

1. **左侧菜单**: 在活动栏注册一个图标，点击后打开主面板
2. **主面板**: Webview 面板，分两栏展示 specs 和 plans
3. **文件扫描**: 自动扫描工作区中 `docs/superpowers/` 目录下的文件
4. **右键菜单**: 预留扩展点，支持对 spec/plan 执行操作

## 架构设计

### 目录结构

```
src/
├── index.ts              # 插件入口，注册扩展
├── treeView.ts           # 左侧 TreeView 实现
├── webview/
│   ├── provider.ts       # WebviewProvider 实现
│   ├── panel.html        # Webview HTML 模板
│   └── styles.css        # Webview 样式
├── scanner.ts            # 文件扫描逻辑
└── types.ts              # TypeScript 类型定义
```

### 组件说明

#### 1. TreeView (treeView.ts)

在 VS Code 活动栏注册一个自定义视图容器和树视图。

```typescript
// 视图容器 ID
const VIEW_CONTAINER_ID = 'superpowers-explorer';

// 树视图 ID
const TREE_VIEW_ID = 'superpowers-projects';
```

**功能**:
- 显示当前工作区中的项目列表
- 点击项目项时打开/聚焦 Webview 面板

#### 2. Webview Provider (webview/provider.ts)

实现 `WebviewViewProvider` 接口，管理 Webview 生命周期和内容更新。

```typescript
class SuperpowersWebviewProvider implements WebviewViewProvider {
  private _view?: WebviewView;
  
  // 加载 HTML 内容
  private _getHtmlContent(webview: Webview): string;
  
  // 更新面板数据
  public updateData(data: SuperpowersData): void;
  
  // 处理来自 Webview 的消息
  private _handleMessage(message: any): void;
}
```

#### 3. 文件扫描器 (scanner.ts)

扫描工作区中的 superpowers 文件。

```typescript
interface SpecFile {
  name: string;           // 文件名
  date: string;           // 日期 (YYYY-MM-DD)
  title: string;          // 从文件内容提取的标题
  path: string;           // 完整路径
}

interface PlanFile {
  name: string;           // 文件名
  date: string;           // 日期 (YYYY-MM-DD)
  title: string;          // 从文件内容提取的标题
  path: string;           // 完整路径
  progress: {
    completed: number;    // 已完成任务数
    total: number;        // 总任务数
  };
}

interface SuperpowersData {
  specs: SpecFile[];
  plans: PlanFile[];
}

class SuperpowersScanner {
  // 扫描指定目录
  public async scan(rootPath: string): Promise<SuperpowersData>;
  
  // 解析 spec 文件，提取标题
  private _parseSpec(content: string): { title: string };
  
  // 解析 plan 文件，提取标题和进度
  private _parsePlan(content: string): { title: string; progress: { completed: number; total: number } };
}
```

### 数据流

```
工作区打开
    ↓
TreeView 初始化
    ↓
触发文件扫描
    ↓
解析 specs 和 plans
    ↓
发送数据到 Webview
    ↓
渲染面板
```

## UI 设计

### Webview 布局

```
┌─────────────────────────────────────┐
│  Superpowers Explorer              │
├─────────────────────────────────────┤
│  📋 Specs (5)                       │
│  ─────────────────────────────────  │
│  ▼ 2026-03-19                      │
│    ├─ chat-archive-sdk-design      │
│    └─ customer-profile-frontend    │
│  ▼ 2026-03-18                      │
│    └─ customer-profile-refactor    │
├─────────────────────────────────────┤
│  📋 Plans (4)                       │
│  ─────────────────────────────────  │
│  ▼ 2026-03-19                      │
│    ├─ chat-archive-sdk      [3/7]  │
│    ├─ customer-list-permission[5/5]│
│    └─ customer-profile-frontend[2/8]│
│  ▼ 2026-03-18                      │
│    └─ customer-profile-refactor[7/7]│
└─────────────────────────────────────┘
```

### 样式规范

使用 VS Code 主题变量确保与编辑器风格一致：

```css
:root {
  --vscode-foreground: var(--vscode-foreground);
  --vscode-panel-background: var(--vscode-panel-background);
  --vscode-list-hoverBackground: var(--vscode-list-hoverBackground);
  --vscode-list-activeSelectionBackground: var(--vscode-list-activeSelectionBackground);
}
```

## 文件解析逻辑

### Spec 文件解析

文件命名格式: `YYYY-MM-DD-<name>-design.md`

```typescript
// 提取标题: 第一个 H1 标题
const titleMatch = content.match(/^# (.+)$/m);
const title = titleMatch ? titleMatch[1] : fileName;
```

### Plan 文件解析

文件命名格式: `YYYY-MM-DD-<name>.md`

```typescript
// 提取标题: 第一个 H1 标题
const titleMatch = content.match(/^# (.+)$/m);
const title = titleMatch ? titleMatch[1] : fileName;

// 计算进度: 统计 `- [x]` 和 `- [ ]` 数量
const completed = (content.match(/^- \[x\]/gim) || []).length;
const total = (content.match(/^- \[[ x]\]/gim) || []).length;
```

## 扩展点

### 右键菜单

在 `package.json` 中贡献菜单项：

```json
{
  "contributes": {
    "menus": {
      "view/item/context": [
        {
          "command": "superpowers.executePlan",
          "when": "view == superpowers-plans",
          "group": "inline"
        }
      ]
    }
  }
}
```

预留命令：
- `superpowers.openSpec`: 打开 spec 文件
- `superpowers.openPlan`: 打开 plan 文件
- `superpowers.executePlan`: 执行 plan（预留）

## 激活事件

```json
{
  "activationEvents": [
    "onView:superpowers-explorer",
    "onCommand:superpowers.refresh"
  ]
}
```

## 依赖

- `reactive-vscode`: 用于简化 VS Code API 调用
- 无其他运行时依赖

## 实现优先级

1. **P0**: TreeView 注册和 Webview 基础框架
2. **P1**: 文件扫描和解析逻辑
3. **P2**: Webview UI 渲染（按日期分组、进度显示）
4. **P3**: 右键菜单和命令注册

## 测试策略

1. **单元测试**: 文件解析逻辑（scanner.ts）
2. **集成测试**: TreeView 和 Webview 交互
3. **手动测试**: 在真实项目中验证功能
