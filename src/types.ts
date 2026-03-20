export type PlanStatus = 'default' | 'needsTesting' | 'completed'

export interface SpecFile {
  name: string
  date: string
  title: string
  path: string
}

export interface PlanFile {
  name: string
  date: string
  title: string
  path: string
  status: PlanStatus
  progress: {
    completed: number
    total: number
  }
}

export interface SuperpowersData {
  specs: SpecFile[]
  plans: PlanFile[]
}

export interface GroupedFiles {
  [date: string]: SpecFile[] | PlanFile[]
}
