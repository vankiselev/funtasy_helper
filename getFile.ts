import { TG_TOKEN } from './config.ts'

export const getFile = async (fileId: string) => {
  const body = {
    file_id: fileId,
  }

  const req = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/getFile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!req.ok) {
    console.error(await req.json())
    throw new Error('Could not get file info')
  }

  const json = await req.json() as { result: { file_path: string } }

  return `https://api.telegram.org/file/bot${TG_TOKEN}/${json.result.file_path}`
}
