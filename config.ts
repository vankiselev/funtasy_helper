import '@std/dotenv/load'

export const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
export const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')

export const TG_TOKEN = Deno.env.get('TG_TOKEN')

export const EMPLOYEES_SHEET = Deno.env.get('EMPLOYEES_SHEET')
