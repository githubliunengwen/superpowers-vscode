export interface AutoOpenDecisionInput {
  isVisible: boolean
  wasVisible: boolean
  isAutoOpeningPanel: boolean
}

export function shouldAutoOpenPanel(input: AutoOpenDecisionInput): boolean {
  if (!input.isVisible)
    return false

  if (input.wasVisible)
    return false

  if (input.isAutoOpeningPanel)
    return false

  return true
}
