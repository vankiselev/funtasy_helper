import { newDoc } from '../google.ts'

const SHEET = 'Справочник'
const PROJECT_KEY = 'Общая таблица проектов'

export const loadProjects = async (id: string) => {
  const doc = newDoc(id)
  await doc.loadInfo()

  const rows = await doc.sheetsByTitle[SHEET].getRows()

  const projects: string[] = []
  for (const r of rows) projects.push((r.get(PROJECT_KEY) as string).replaceAll('\n', '; '))
  return projects
}
