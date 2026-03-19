import { defineExtension } from 'reactive-vscode'
import * as vscode from 'vscode'
import { SuperpowersScanner } from './scanner'
import { SuperpowersTreeDataProvider } from './treeView'
import { SuperpowersPanel } from './webview/panel'

export const { activate, deactivate } = defineExtension(() => {
  const scanner = new SuperpowersScanner()
  const treeDataProvider = new SuperpowersTreeDataProvider()

  // 注册 TreeView
  vscode.window.createTreeView('superpowers-explorer', {
    treeDataProvider,
    showCollapseAll: false,
  })

  // 注册命令
  vscode.commands.registerCommand('superpowers.openPanel', async () => {
    const panel = SuperpowersPanel.createOrShow(vscode.extensions.getExtension('superpowers.superpowers-vscode')!.extensionUri)

    // 扫描并更新数据
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders && workspaceFolders.length > 0) {
      const data = await scanner.scan(workspaceFolders[0].uri.fsPath)
      panel.updateData(data)
    }
  })

  vscode.commands.registerCommand('superpowers.refresh', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders && workspaceFolders.length > 0) {
      const data = await scanner.scan(workspaceFolders[0].uri.fsPath)
      if (SuperpowersPanel.currentPanel) {
        SuperpowersPanel.currentPanel.updateData(data)
      }
    }
    treeDataProvider.refresh()
  })

  // TreeView 点击事件
  vscode.commands.registerCommand('superpowers.root', () => {
    vscode.commands.executeCommand('superpowers.openPanel')
  })
})