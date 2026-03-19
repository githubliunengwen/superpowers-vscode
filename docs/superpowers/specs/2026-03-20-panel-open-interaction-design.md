# Superpowers 面板首次点击打开交互设计

## 背景

当前扩展在左侧 Activity Bar 注册了 `superpowers-explorer` 视图容器，但编辑区里的面板是通过 `superpowers.openPanel` 命令创建的 `WebviewPanel`。

这导致交互被拆成了两步：

1. 第一次点击左侧 `Superpowers` 图标，只会切换到扩展自己的侧边栏容器。
2. 第二次点击 Explorer 区域里的树节点，才会在编辑区打开 `WebviewPanel`。

用户期望改成一步完成：第一次点击左侧图标，就直接在编辑区打开面板；左侧则回到默认的文件资源管理器。

## 目标

- 点击左侧 `Superpowers` 图标时，立即在编辑区打开 `Superpowers Explorer` 面板。
- 打开面板后，左侧自动切回默认 `File Explorer`。
- 保留现有树节点点击打开面板的能力，作为兼容兜底入口。

## 非目标

- 不改动面板内部的 UI 布局和数据展示逻辑。
- 不重构扫描器、TreeView 数据结构或 Webview 消息协议。
- 不移除现有的自定义视图容器。

## 根因分析

当前触发链路如下：

```text
点击 Activity Bar 的 Superpowers 图标
  -> VS Code 显示 superpowers-explorer 视图容器
  -> 用户点击树节点
  -> 执行 superpowers.openPanel
  -> 创建或显示 WebviewPanel
```

问题不在 `WebviewPanel` 本身，而在“显示视图容器”和“打开编辑区面板”之间缺少自动桥接逻辑。

## 设计方案

### 1. 监听视图可见性

在 `src/index.ts` 中保存 `createTreeView` 返回的 `TreeView` 实例，并监听它的可见性变化。

VS Code 没有提供“点击 Activity Bar 图标”的直接事件，因此这里使用 `TreeView.onDidChangeVisibility` 作为近似信号。

当 `treeView.visible` 变为 `true` 时，进入一个专门的自动打开流程，而不是直接复用所有入口共享的副作用逻辑。

这样可以把“点左侧图标”和“打开编辑区面板”串成一次操作。

### 2. 拆分自动入口和通用打开入口

保留 `superpowers.openPanel` 作为通用入口，只负责：

- 创建面板
- 或复用并聚焦已有面板
- 扫描并更新面板数据

新增一个只给自动流程使用的包装函数，例如 `openPanelFromActivityBar()`，负责：

- 调用 `superpowers.openPanel`
- 在成功后尝试切回默认 `File Explorer`

职责约束必须固定如下：

- `TreeView.onDidChangeVisibility` 只能调用 `openPanelFromActivityBar()`
- `openPanelFromActivityBar()` 独占 `isAutoOpeningPanel` 这类防重入状态
- `openPanelFromActivityBar()` 独占“切回 Explorer”的副作用
- `superpowers.openPanel` 不允许感知调用来源，也不允许包含“切回 Explorer”逻辑

这样树节点点击、命令面板执行等其他入口不会被附带“切回 Explorer”的副作用。

### 3. 打开面板后切回默认 Explorer

自动入口在 `superpowers.openPanel` 成功完成之后，再执行 VS Code 内置命令把侧边栏切回默认文件资源管理器。

实现阶段优先验证 `workbench.view.explorer` 是否满足需求。

降级策略如下：

- 先尝试执行 `workbench.view.explorer`
- 如果命令执行成功，左侧回到默认 `File Explorer`
- 如果命令不存在、抛出异常或执行后未达到预期，则忽略切回失败，但保留已经打开的编辑区面板
- 失败时只记录调试日志，不向用户弹错误提示
- 不允许因为切回 Explorer 失败而影响主流程

这里的“当前布局不支持切换”包括但不限于：侧边栏被隐藏、工作台布局被用户改为非常规位置、当前窗口状态导致 Explorer 视图未能按预期聚焦。

目标交互如下：

```text
点击 Activity Bar 的 Superpowers 图标
  -> 视图容器显示
  -> 自动执行 superpowers.openPanel
  -> 编辑区显示 WebviewPanel
  -> 左侧切回默认 File Explorer
```

这满足“第一次点就打开编辑区面板，同时 Explorer 回到默认 file explorer”的要求。

### 4. 自动触发边界

由于 `onDidChangeVisibility` 只是近似信号，需要明确以下边界：

- 用户点击左侧 `Superpowers` 图标导致视图显示时，应自动打开面板
- 扩展启动后如果 VS Code 因布局恢复而直接显示该视图，也允许自动打开一次面板
- 当代码主动切回默认 Explorer 时，不应导致再次自动打开
- 当面板已存在且用户再次点击 `Superpowers` 图标时，应只复用并聚焦已有面板，不创建新面板

事件边界表如下：

| 触发来源 | 现象 | 是否自动打开 |
| --- | --- | --- |
| 用户点击 Activity Bar 的 `Superpowers` 图标 | `visible` 从 `false` 变为 `true` | 是 |
| VS Code 布局恢复导致该视图初始可见 | 初始化后出现 `visible=true` | 是，但只允许一次 |
| 自动流程内部调用切回 Explorer | 可能伴随后续可见性变化 | 否，必须忽略 |
| 代码主动 `reveal` 或其他程序化显示该视图 | `visible` 变为 `true` | 否，默认忽略，除非明确来自自动入口 |
| 视图本来已可见又重复收到 `visible=true` | 重复事件 | 否，直接忽略 |

为避免把程序化显示误判成用户点击，自动入口需要额外结合本地状态判断，只处理“当前不在自动流程中，且这是一次新的显示切换”的情况。

### 5. 防止重复触发

“视图显示 -> 打开面板 -> 切回 Explorer”是连续动作，期间可能出现重复触发 `openPanel` 的风险。

因此需要增加一个轻量但明确的状态机，例如：

- 自动打开流程开始前判断：如果 `isAutoOpeningPanel === true`，直接返回
- 自动打开流程开始前判断：如果 `treeView.visible !== true`，直接返回
- 自动打开流程开始前标记 `isAutoOpeningPanel = true`
- 自动打开流程内部先检查 `SuperpowersPanel.currentPanel`
- 若已有面板，则只复用并聚焦，不再创建新实例
- 使用 `try/finally` 清理 `isAutoOpeningPanel`
- 若可见性事件因为切回 Explorer 再次触发，在标记未清理前必须直接忽略

这个状态只用于抑制自动流程中的重复调用，不影响用户手动点击树节点再次打开面板。

### 6. 保留现有兜底入口

`src/treeView.ts` 中树节点上的 `superpowers.openPanel` 命令继续保留。

这样即使自动触发流程因为 VS Code 生命周期或时序问题未执行，用户仍然可以通过树节点手动打开面板。

## 涉及文件

- 修改 `src/index.ts`
  - 保存 `TreeView` 实例
  - 监听 `onDidChangeVisibility`
  - 在自动打开流程中执行 `superpowers.openPanel`
  - 增加自动打开流程的防重入控制
- 可能修改 `src/webview/panel.ts`
  - 如果需要，将“显示面板”和“切回 Explorer”的职责拆分得更清晰
- 保持 `src/treeView.ts` 现有树节点命令不变

## 测试设计

### 自动化测试

优先补一个围绕入口流程的行为测试，覆盖以下场景：

1. 当 `superpowers-explorer` 首次变为可见时，会触发 `superpowers.openPanel`
2. 自动触发流程只执行一次，不会因为切回 Explorer 而重复打开
3. 树节点命令仍然可以单独触发 `superpowers.openPanel`
4. 面板已存在时，再次触发自动流程只会复用已有面板
5. 自动切回 Explorer 失败时，面板仍然成功显示
6. 面板关闭后，再次点击左侧图标仍可重新打开
7. 启动恢复或布局恢复导致视图可见时，最多只自动打开一次，不会进入循环

如果当前仓库还没有 VS Code 视图相关测试基础设施，可以先抽出一个可测试的小函数，把“是否应该自动打开”的判断逻辑独立出来做单元测试。

如果具备 Extension Host 测试条件，则需要至少补一个集成级验证，确认：

- 可见性事件触发后命令调用顺序正确
- `WebviewPanel` 仍保持单例行为
- 切回 Explorer 不会引发第二次打开
- 树节点入口和命令面板入口不会触发“切回 Explorer”副作用
- 自动入口在已有面板时会复用并聚焦，而不是新建实例

### 手动验证

在 VS Code Extension Host 中验证：

1. 关闭已有 `Superpowers Explorer` 面板
2. 点击左侧 `Superpowers` 图标
3. 确认编辑区立即出现 `Superpowers Explorer`
4. 确认左侧显示的是默认 `File Explorer`
5. 再次点击 `Superpowers` 图标，确认行为稳定且不会闪烁或重复打开多个面板
6. 关闭面板后再次点击 `Superpowers` 图标，确认还能正常重新打开
7. 在切回 Explorer 命令失效或被注释的情况下，确认面板仍能打开，只有侧边栏回退失效

## 风险与处理

### 风险 1：内置 Explorer 命令名称不准确

VS Code 内置命令需要用实际可用的命令名实现。如果目标命令在当前版本不可用，需要在实现阶段先用最小验证确认。

### 风险 2：可见性事件时序和预期不一致

如果 `onDidChangeVisibility` 的触发顺序和假设不一致，先通过日志和集成测试确认真实事件序列，再补一轮针对性的规则修正。实现阶段不预设额外时序补丁，避免在没有证据的情况下扩大逻辑复杂度。

### 风险 3：自动切回 Explorer 后造成再次触发

通过轻量防重入状态避免循环调用；同时保留日志或断点位置，便于后续调试时确认事件顺序。

## 成功标准

- 用户第一次点击左侧 `Superpowers` 图标，就能在编辑区看到面板。
- 用户不需要再点一次 Explorer 区域。
- 左侧最终停留在默认 `File Explorer`。
- 不会重复创建多个面板，也不会出现明显闪烁。
