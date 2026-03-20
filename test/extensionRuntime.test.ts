import { describe, expect, it } from 'vitest'
import { resolveExtensionUri } from '../src/extensionRuntime'

describe('resolveExtensionUri', () => {
  it('使用当前扩展 id 解析扩展 uri', () => {
    const extensionUri = { path: '/tmp/superpowers' } as any
    const calls: string[] = []

    const result = resolveExtensionUri({
      extensionId: 'cruldra.superpowers-vscode',
      getExtension: (id: string) => {
        calls.push(id)
        return { extensionUri }
      },
    })

    expect(calls).toEqual(['cruldra.superpowers-vscode'])
    expect(result).toBe(extensionUri)
  })
})
