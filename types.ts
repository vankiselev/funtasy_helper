export type State = {
  stageNumber: number
  driveId: string
  date: string | undefined
  project: string | undefined
  projectOwner: string | undefined
  description: string | undefined
  costOrIncome: 'cost' | 'income' | undefined
  costOrIncomeAmount: number | undefined
  costOrIncomeName: string | undefined
  docs: string | undefined
}
