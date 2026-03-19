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