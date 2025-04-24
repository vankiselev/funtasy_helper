import { newDoc } from '../google.ts'

import { EMPLOYEES_SHEET } from '../config.ts'

const TG_KEY = 'Telegram ID'
const URL_KEY = 'Ссылка на отчет'
const DRIVE_KEY = 'Files Folder'

type Employee = { sheetId: string; driveId: string }

export const loadEmployees = async () => {
  if (!EMPLOYEES_SHEET) throw new Error()

  const doc = newDoc(EMPLOYEES_SHEET)
  await doc.loadInfo()

  const rows = await doc.sheetsByTitle.Сотрудники.getRows()

  const employees: Record<number, Employee> = {}
  for (let i = 0; i < rows.length; i++) {
    const tgId = rows[i].get(TG_KEY)
    const driveLink = rows[i].get(DRIVE_KEY) as string
    if (!tgId || !driveLink) continue
    const parsedTgId = Number.parseInt(tgId)

    // https://docs.google.com/spreadsheets/d/ *** /edit?usp=drive_link
    const sheetLink = rows[i].get(URL_KEY) as string
    if (!sheetLink) throw new Error()
    const sheetId = sheetLink.split('https://docs.google.com/spreadsheets/d/')[1].split('/edit')[0]

    // https://drive.google.com/drive/folders/ ***
    // biome-ignore lint: fine
    const driveId = driveLink.split('/').pop()!.split('?')[0]
    if (!driveId) throw new Error()

    employees[parsedTgId] = { sheetId, driveId }
  }
  return employees
}
