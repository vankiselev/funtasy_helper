import { createSendMessage } from './createSendMessage.ts'
import {
  loadCostOrIncomeTypes,
  loadEmployees,
  loadProjectOwners,
  loadProjects,
} from './dataLoaders/index.ts'
import { pushData } from './pushData.ts'
import { getFile } from './getFile.ts'

import type { State } from './types.ts'

import {
  EMPLOYEES_SHEET,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  TG_TOKEN,
} from './config.ts'

const makeReplies = (replies: string[]) => ({
  reply_markup: { keyboard: replies.map((x) => [x]), one_time_keyboard: true },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    console.log('Not POST, ignoring')
    return new Response('done')
  }

  if (!EMPLOYEES_SHEET || !GOOGLE_PRIVATE_KEY || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !TG_TOKEN) {
    console.error('Bad config')
    // Don't retriger when bot is back up
    return new Response('done')
  }

  const body = await req.json()

  if (!body.message) {
    console.log('Not a message update, ignoring')
    return new Response('done')
  }

  const chatId = body.message.chat.id as number
  console.log(`Message from chat ${chatId}`)
  const sendMessage = createSendMessage(chatId)

  const sayLoading = async () => await sendMessage('Загружаю данные из таблиц...')

  if (!body.message.text && !body.message.photo && !body.message.document) {
    console.log('Not a supported message type, ignoring')
    return new Response('done')
  }

  const employees = await loadEmployees()
  const employeesTgIds = Object.keys(employees).map((x) => Number.parseInt(x))

  if (!employeesTgIds.includes(chatId)) {
    console.log(chatId, 'is not in the allowlist')
    await sendMessage('У тебя нет доступа к этому боту :(')
    return new Response('done')
  }

  const employeeSheet = employees[chatId].sheetId
  console.log('employee sheet', employeeSheet)

  const kv = await Deno.openKv()

  let state: State = (await kv.get([chatId])).value as State

  const resetState = () => {
    state = {
      stageNumber: 0,
      driveId: employees[chatId].driveId,
      date: undefined,
      project: undefined,
      projectOwner: undefined,
      description: undefined,
      costOrIncome: undefined,
      costOrIncomeAmount: undefined,
      costOrIncomeName: undefined,
      docs: undefined,
    }
    console.debug('state reset')
  }

  const saveState = async () => await kv.set([chatId], state)

  const askToCheck = async () => {
    await sendMessage('Проверьте что всё хорошо или начните заново:')
    await sendMessage(
      Object.values(state)
        .slice(2)
        // Display in Russian
        .map((x) => x === 'income' ? 'Приход' : x === 'cost' ? 'Расход' : x)
        // Censor the link
        .map((x) => typeof x === 'string' && x.includes('api.telegram.org') ? 'Файл загружен' : x)
        .join('\n'),
      makeReplies(['Отправить', '/new']),
    )
  }

  if (state && state.stageNumber === 8 && !body.message.text) {
    if (body.message.photo) {
      const photoVariations = body.message.photo as { file_id: string }[]
      const bestVariation = photoVariations.slice(-1)[0] // Highest resolution
      state.docs = await getFile(bestVariation.file_id)
    }

    if (body.message.document) {
      const fileId = body.message.document.file_id as string
      state.docs = await getFile(fileId)
    }

    state.stageNumber++
    await saveState()
    console.debug(chatId, state)

    // pre-next stage
    await askToCheck()

    return new Response('done')
  }

  // Here we know for sure this update is text (body.message.text)

  const text = body.message.text as string
  console.debug(text)

  if (text === '/start') {
    await sendMessage('Привет! Я готов, пришли /new чтобы начать заявку.')
    return new Response('done')
  }

  if (text === '/new') {
    resetState()
    await saveState()

    const dateSuggestions: string[] = []

    for (let i = 0; i < 5; i++) {
      const date = new Date()
      date.setDate(new Date().getDate() - i)
      dateSuggestions.push(date.toLocaleDateString('ru'))
    }

    await sendMessage('Дата Заявки (Например 01.01.2001):', makeReplies(dateSuggestions))
    return new Response('done')
  }

  if (!state) {
    console.log('no state for', chatId)
    await sendMessage('Нет заявки в процессе, начни новую через /new')
    return new Response('done')
  }

  // Skip stage 1 if exact project is sent and not a date
  if (state.stageNumber === 1) {
    const projects = await loadProjects(employeeSheet)
    if (projects.find((x) => x === text)) state.stageNumber++
  }

  try {
    switch (state.stageNumber) {
      case 0: {
        state.date = text
        //
        await sayLoading()
        const projects = await loadProjects(employeeSheet)
        const suggestions = projects.slice(0, 7)
        await sendMessage('Дата Проекта (Например 0401):', makeReplies(suggestions))
        break
      }
      case 1: {
        await sayLoading()
        const projects = await loadProjects(employeeSheet)
        const splitWithDate = projects.map((x) => [x.slice(0, 4), x.slice(5)])
        const foundByDate = splitWithDate.filter((x) => x[0] === text)
        if (!foundByDate.length) {
          await sendMessage('Проектов не найдено :(')
          return new Response('done')
        }
        const joined = foundByDate.map((x) => x.join(' '))
        await sendMessage('Название Проекта', makeReplies(joined))
        await sendMessage(joined.join('\n'))
        break
      }
      case 2: {
        state.project = text.replaceAll('; ', '\n')
        //
        await sayLoading()
        const projectOwners = await loadProjectOwners(employeeSheet)
        await sendMessage('Владелец Проекта:')
        await sendMessage(projectOwners.join('\n'), makeReplies(projectOwners))
        break
      }
      case 3: {
        state.projectOwner = text
        //
        await sendMessage('Описание:')
        break
      }
      case 4: {
        state.description = text
        //
        await sendMessage('Расход или Приход', makeReplies(['Расход', 'Приход']))
        break
      }
      case 5: {
        const lowered = text.toLowerCase()
        if (lowered !== 'расход' && lowered !== 'приход') {
          await sendMessage('Неправильный Вариант')
          return new Response('done')
        }
        state.costOrIncome = lowered === 'расход' ? 'cost' : 'income'
        //
        await sendMessage('Сумма (Например 100 без букв):')
        break
      }
      case 6: {
        state.costOrIncomeAmount = Number.parseFloat(text)
        //
        await sayLoading()
        const costOrIncomeTypes = await loadCostOrIncomeTypes(employeeSheet)
        await sendMessage('Тип Расхода/Прихода:')
        await sendMessage(costOrIncomeTypes.join('\n'), makeReplies(costOrIncomeTypes))
        break
      }
      case 7: {
        state.costOrIncomeName = text
        //
        await sendMessage(
          'Приложите фото чека или файл, если есть:',
          makeReplies(['Чека Нет']),
        )
        break
      }
      case 8: {
        await askToCheck()
        break
      }
      case 9: {
        if (text.toLowerCase() === 'отправить') {
          await pushData(state, employeeSheet)
          await sendMessage('Данные отправлены! Новый запрос: /new')
        }
        break
      }
      default:
        await sendMessage('Ошибка выбора этапа')
        return new Response('done')
    }

    state.stageNumber++

    if (state.stageNumber === 10) resetState()

    await saveState()

    // Don's expose bot tokens
    state.docs = 'hidden'
    console.debug(chatId, state)
  } catch (e: unknown) {
    console.error(e)
    await sendMessage('Ошибка :(')
  }

  return new Response('done')
})
