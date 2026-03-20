import type { PlanStatus } from './types'

export interface AutoOpenDecisionInput {
  isVisible: boolean
  wasVisible: boolean
  isAutoOpeningPanel: boolean
}

export interface PlanContextMenuVisibility {
  showNeedsTesting: boolean
  showCompleted: boolean
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

export function getPlanContextMenuVisibility(status: PlanStatus): PlanContextMenuVisibility {
  return {
    showNeedsTesting: status !== 'needsTesting',
    showCompleted: status !== 'completed',
  }
}
