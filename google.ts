import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

import { GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL } from './config.ts'

export const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
})

export const newDoc = (docId: string) => new GoogleSpreadsheet(docId, serviceAccountAuth)
