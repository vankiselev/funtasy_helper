import { newDoc } from '../google.ts'

const SHEET = 'Справочник'
const TYPE_COLUMN = 'Статья'

export const loadCostOrIncomeTypes = async (id: string) => {
  const doc = newDoc(id)
  await doc.loadInfo()

  const rows = await doc.sheetsByTitle[SHEET].getRows()
  const types: string[] = []
  for (const r of rows) {
    const column = r.get(TYPE_COLUMN)
    if (column) types.push(column)
    else break
  }
  return types
}
