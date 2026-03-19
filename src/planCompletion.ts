export function markPlanContentAsCompleted(content: string): string {
  return content.replace(/^- \[ \]/gm, '- [x]')
}
