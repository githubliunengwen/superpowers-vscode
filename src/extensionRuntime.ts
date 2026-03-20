import type * as vscode from 'vscode'

export interface ResolveExtensionUriDeps {
  extensionId: string
  getExtension: (id: string) => { extensionUri: vscode.Uri } | undefined
}

export function resolveExtensionUri(deps: ResolveExtensionUriDeps): vscode.Uri {
  const extension = deps.getExtension(deps.extensionId)
  if (!extension)
    throw new Error(`无法找到扩展: ${deps.extensionId}`)

  return extension.extensionUri
}
