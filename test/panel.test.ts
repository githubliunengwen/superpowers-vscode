import { describe, expect, it } from 'vitest'
import { getSuperpowersPanelHtmlContent } from '../src/webview/html'

describe('getSuperpowersPanelHtmlContent', () => {
  it('在 webview 脚本中内联菜单状态函数', () => {
    const html = getSuperpowersPanelHtmlContent()

    expect(html).toContain('function getPlanContextMenuVisibility(status)')
  })
})
