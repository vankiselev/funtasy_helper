import { newDoc } from '../google.ts'

const SHEET = 'Справочник'
const OWNERS_COLUMN = 'Кошельки для  отчетов сотрудникам'

export const loadProjectOwners = async (id: string) => {
  const doc = newDoc(id)
  await doc.loadInfo()

  const rows = await doc.sheetsByTitle[SHEET].getRows()
  const owners: string[] = []
  for (const r of rows) {
    const column = r.get(OWNERS_COLUMN)
    if (column) owners.push(column)
    else break
  }
  return owners
}
