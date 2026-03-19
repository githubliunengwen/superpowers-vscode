import { describe, expect, it } from 'vitest'
import { markPlanContentAsCompleted } from '../src/planCompletion'
import { shouldAutoOpenPanel } from '../src/panelOpenInteraction'

describe('shouldAutoOpenPanel', () => {
  it('在新的可见切换时返回 true', () => {
    expect(shouldAutoOpenPanel({
      isVisible: true,
      wasVisible: false,
      isAutoOpeningPanel: false,
    })).toBe(true)
  })

  it('视图已经可见时返回 false', () => {
    expect(shouldAutoOpenPanel({
      isVisible: true,
      wasVisible: true,
      isAutoOpeningPanel: false,
    })).toBe(false)
  })

  it('自动打开流程执行中返回 false', () => {
    expect(shouldAutoOpenPanel({
      isVisible: true,
      wasVisible: false,
      isAutoOpeningPanel: true,
    })).toBe(false)
  })

  it('视图不可见时返回 false', () => {
    expect(shouldAutoOpenPanel({
      isVisible: false,
      wasVisible: false,
      isAutoOpeningPanel: false,
    })).toBe(false)
  })
})

describe('markPlanContentAsCompleted', () => {
  it('只把未完成的 todo 标记成已完成', () => {
    const content = `# Demo Plan

- [ ] task 1
- [x] task 2
- [ ] task 3`

    expect(markPlanContentAsCompleted(content)).toBe(`# Demo Plan

- [x] task 1
- [x] task 2
- [x] task 3`)
  })

  it('不改动非 todo 内容', () => {
    const content = `# Demo Plan

说明文字

- [ ] task 1
普通文本`

    expect(markPlanContentAsCompleted(content)).toBe(`# Demo Plan

说明文字

- [x] task 1
普通文本`)
  })
})
