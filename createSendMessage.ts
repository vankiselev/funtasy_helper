import { TG_TOKEN } from './config.ts'

export const createSendMessage = (chatId: number) =>
async (
  text: string,
  options?: { [key: string]: unknown },
) => {
  if (Deno.env.get('DRY_MODE') === 'true') return

  const body = {
    chat_id: chatId,
    text,
    ...options,
  }

  const req = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
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
  }
}
