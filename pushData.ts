import { newDoc, serviceAccountAuth } from './google.ts'

import type { State } from './types.ts'

const DATE_KEY = 'Дата операции'
const SHEET = 'Данные по проектам'

const findNewRow = (rows: { get: (x: string) => unknown; rowNumber: number }[]) => {
  for (let i = 0; i < rows.length; i++) {
    const firstCol = rows[i].get(DATE_KEY)
    if (!firstCol) return rows[i].rowNumber
  }
  // If we ran out of rows, return last row number + 1
  return rows[rows.length - 1].rowNumber + 1
}

const dateToSerial = (input: string | undefined) => {
  if (!input) throw new Error()
  const date = new Date(input.split('.').reverse().join('-'))
  const converted = 25569.0 +
    ((date.getTime() - (date.getTimezoneOffset() * 60 * 1000)) / (1000 * 60 * 60 * 24))
  return converted
}

export const pushData = async (state: State, sheetId: string) => {
  const doc = newDoc(sheetId)
  await doc.loadInfo()

  const sheet = doc.sheetsByTitle[SHEET]
  // First 4 are for aggregations
  await sheet.loadHeaderRow(5)
  // First row index here is 6
  const rows = await sheet.getRows()

  const newRowNumber = findNewRow(rows)
  console.log('New row number:', newRowNumber)

  await sheet.loadCells(`A${newRowNumber}:L${newRowNumber}`)

  // number != index
  const newRowIx = newRowNumber - 1

  // ix starts at 1 cause for some reason table start with B instead of A lol
  const dateCell = sheet.getCell(newRowIx, 1)
  dateCell.numberValue = dateToSerial(state.date) // '01.01.2001' // date
  dateCell.numberFormat = { type: 'DATE', pattern: 'dd.mm.yyyy' }
  sheet.getCell(newRowIx, 2).stringValue = state.project // 'Bday' // project
  sheet.getCell(newRowIx, 3).stringValue = state.projectOwner // 'Iven' // project owner
  sheet.getCell(newRowIx, 4).stringValue = state.description // 'prazdnek' // description
  if (state.costOrIncome === 'cost') {
    sheet.getCell(newRowIx, 5).numberValue = state.costOrIncomeAmount // '500' // cost
  } else {
    sheet.getCell(newRowIx, 6).numberValue = state.costOrIncomeAmount // '1000' // income
  }
  // 7 is funds left, which is automatic
  sheet.getCell(newRowIx, 8).stringValue = state.costOrIncomeName // 'routine' // cost/income name

  // Upload the file to Google Drive
  if (state.docs) {
    const headers = await serviceAccountAuth.getRequestHeaders()

    const fileRes = await fetch(state.docs)

    const fileExtension = state.docs.split('.').pop()

    const metadata = {
      name: `${state.project}.${fileExtension}`,
      parents: [state.driveId],
    }

    const formData = new FormData()
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }),
    )
    formData.append('file', await fileRes.blob())

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers,
        body: formData,
      },
    )

    const json = await res.json() as { id: string; name: string }

    if (!res.ok) {
      console.error(json)
      throw new Error('Could not submit the document')
    }

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${json.id}?fields=webViewLink,webContentLink`,
      { headers },
    )
    const metaJson = await metaRes.json() as { webContentLink: string; webViewLink: string }

    sheet.getCell(newRowIx, 9).stringValue = metaJson.webViewLink // 'https://hello.world' // receipt
  } else {
    sheet.getCell(newRowIx, 9).stringValue = 'Скриншота нет'
  }

  await sheet.saveUpdatedCells()
}
