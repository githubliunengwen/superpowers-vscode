const needsTestingMarker = '<!-- superpowers:needs-testing -->'

export function markPlanContentAsCompleted(content: string): string {
  return removeNeedsTestingMarker(content).replace(/^- \[ \]/gm, '- [x]')
}

export function markPlanContentAsNeedsTesting(content: string): string {
  const contentWithOpenTasks = content.replace(/^- \[x\]/gim, '- [ ]')

  if (contentWithOpenTasks.includes(needsTestingMarker))
    return contentWithOpenTasks

  const titleMatch = contentWithOpenTasks.match(/^# .*$/m)
  if (!titleMatch || titleMatch.index === undefined)
    return `${needsTestingMarker}\n${contentWithOpenTasks}`

  const insertIndex = titleMatch.index + titleMatch[0].length
  return `${contentWithOpenTasks.slice(0, insertIndex)}\n${needsTestingMarker}${contentWithOpenTasks.slice(insertIndex)}`
}

export function isPlanContentMarkedAsNeedsTesting(content: string): boolean {
  return content.includes(needsTestingMarker)
}

function removeNeedsTestingMarker(content: string): string {
  return content.replace(/^<!-- superpowers:needs-testing -->\n/gm, '').replace(/\n{3,}/g, '\n\n')
}

/**
 * 设置计划文件的状态
 * @param content 计划文件内容
 * @param status 状态: 'completed' | 'needsTesting' | 'default'
 * @returns 更新后的内容
 */
export function setPlanContentStatus(content: string, status: 'completed' | 'needsTesting' | 'default'): string {
  switch (status) {
    case 'completed':
      return markPlanContentAsCompleted(content)
    case 'needsTesting':
      return markPlanContentAsNeedsTesting(content)
    case 'default':
      return removeNeedsTestingMarker(content)
  }
}
